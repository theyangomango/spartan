// SinglePostModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    View,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    StyleSheet,
    Dimensions,
    Easing,
} from "react-native";
import { PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import getScrollTargetPosition from "../../../../helper/getScrollTargetPosition";
import { getFeedHeaderStyles } from "../../../../helper/getFeedHeaderStyles";
import Post from "../../../1_Feed/Posts/Post";
import CommentsBottomSheet from "../../../1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../../../1_Feed/SharePost/ShareBottomSheet";
import FeedWorkoutViewerSheet from "../../../1_Feed/ViewWorkout/FeedWorkoutViewerSheet";

import scaleSize from "../../../../helper/scaleSize";

const { width: SW, height: SH } = Dimensions.get("window");
const TARGET_Y = getScrollTargetPosition(SW, SH);
const dyn = getFeedHeaderStyles(SW, SH);

const FADE_DUR = 160;
const FADE_EASE_POWER = 3; // >1 keeps the backdrop darker longer during drag
const SHEET_CLOSE_DUR = 280; // approximate BottomSheet close duration
const FOCUS_EXTRA_DROP = 12; // sit slightly lower

export default function SinglePostModal({ visible, post, onClose, onOpenWorkout }) {
    const insets = useSafeAreaInsets();
    const fade = useRef(new Animated.Value(0)).current;
    const isClosingRef = useRef(false);
    const dragProgressRef = useRef(0); // 0..1 during interactive upward pan
    const [dragProgress, setDragProgress] = useState(0);
    const [collapseSignal, setCollapseSignal] = useState(0);
    const [reopenSignal, setReopenSignal] = useState(0);
    const slideY = useRef(new Animated.Value(0)).current; // negative -> slide up
    const stageFade = useRef(new Animated.Value(0)).current; // fades the focused post in
    const STAGE_FADE_DUR = 260;

    // ❤️ double-tap like burst
    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;
    const lastTapRef = useRef(0);

    // Re-mount & gate the sheet's visibility so its own effect runs
    const [mountCommentsSheet, setMountCommentsSheet] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    // Local workout viewer state so the post remains focused behind the sheet
    const [viewerWorkout, setViewerWorkout] = useState(null);
    const [viewerToggle, setViewerToggle] = useState(false);
    const [commentsExpandFlag, setCommentsExpandFlag] = useState(false);
    const sheetKeyRef = useRef(0);
    const openTimer = useRef(null);

    // Compute exact open position for the comments sheet so its top matches
    // the bottom of the focused post, regardless of device.
    const POST_AR = 0.8; // keep in sync with Post.js AR
    const containerTop = scaleSize(85); // must match CommentsBottomSheet styles.container.top
    const postTop = scaleSize(TARGET_Y - 15 + FOCUS_EXTRA_DROP);
    const postHeight = scaleSize(SW / POST_AR);
    const postBottomY = postTop + postHeight;
    const containerHeight = SH - containerTop;
    const openPositionPx = Math.max(0, Math.min(containerHeight, containerHeight - (postBottomY - containerTop)));

    useEffect(() => {
        // cleanup any pending timers on unmount or visibility flip
        return () => {
            if (openTimer.current) {
                clearTimeout(openTimer.current);
                openTimer.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (visible) {
            // reset + fade in
            isClosingRef.current = false;
            fade.setValue(0);
            slideY.setValue(0);
            Animated.timing(fade, { toValue: 1, duration: FADE_DUR, useNativeDriver: true }).start();
            // fade in the focused post content more noticeably
            stageFade.setValue(0);
            Animated.timing(stageFade, { toValue: 1, duration: STAGE_FADE_DUR, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

            // force remount so the sheet's internal useEffect runs fresh
            sheetKeyRef.current += 1;
            setCommentsExpandFlag(false);
            setMountCommentsSheet(false); // mount a bit later to avoid jank
            setSheetVisible(false);

            // Mount + show the sheet shortly after fade starts to reduce jank
            if (openTimer.current) clearTimeout(openTimer.current);
            openTimer.current = setTimeout(() => {
                try {
                    setMountCommentsSheet(true);
                    requestAnimationFrame(() => setSheetVisible(true)); // triggers snapToIndex(0) inside the sheet
                } catch {
                    setMountCommentsSheet(true);
                    setSheetVisible(true);
                }
            }, Math.max(60, Math.floor(FADE_DUR * 0.6))); // ~60-100ms
        } else {
            // If parent forces invisible, just clear timers
            if (openTimer.current) {
                clearTimeout(openTimer.current);
                openTimer.current = null;
            }
        }
    }, [visible]);

    const close = () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        if (openTimer.current) {
            clearTimeout(openTimer.current);
            openTimer.current = null;
        }

        // 1) trigger comments sheet to slide down
        setSheetVisible(false);
        // ensure sheet collapses if not already
        setCollapseSignal(Date.now());

        // 2) animate stage up and fade out backdrop/top bar
        try { Animated.timing(slideY, { toValue: -SH, duration: 220, useNativeDriver: true }).start(); } catch {}
        Animated.timing(fade, { toValue: 0, duration: FADE_DUR, useNativeDriver: true }).start();

        // 3) after sheet close duration, notify parent to unmount modal
        setTimeout(() => {
            onClose && onClose();
            isClosingRef.current = false;
            // reset progress for next open
            dragProgressRef.current = 0;
            try { setDragProgress(0); } catch {}
        }, SHEET_CLOSE_DUR);
    };

    const onMediaTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 260) {
            heartScale.setValue(0.2);
            heartOpacity.setValue(0.9);
            Animated.parallel([
                Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
                Animated.timing(heartOpacity, {
                    toValue: 0,
                    duration: 650,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start();
        }
        lastTapRef.current = now;
    };

    // Upward pan-to-close gesture, mirroring Feed behavior
    const panHandlers = useMemo(() => {
        const TAN35 = 0.700; // tan(35deg)
        const MIN_MOVE = 4;
        const ANGLE_MARGIN = 6;
        const FULL_GESTURE_PX = Math.max(120, Math.min(SH * 0.22, 220));
        const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
        let started = false;
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onPanResponderGrant: () => {
                started = false;
            },
            onMoveShouldSetPanResponder: (_, g) => {
                if (!visible) return false;
                if (g.numberActiveTouches > 1) return false;
                const { dx, dy } = g;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                if (adx < MIN_MOVE && ady < MIN_MOVE) return false;
                return dy < 0 && (ady > TAN35 * adx + ANGLE_MARGIN);
            },
            onMoveShouldSetPanResponderCapture: (_, g) => {
                if (!visible) return false;
                if (g.numberActiveTouches > 1) return false;
                const { dx, dy, vy } = g;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                if (adx < MIN_MOVE && ady < MIN_MOVE) return false;
                if (dy < 0 && vy <= -0.4) return true; // prefer fast flicks
                return dy < 0 && (ady > TAN35 * adx + ANGLE_MARGIN);
            },
            onPanResponderMove: (_, g) => {
                if (!visible) return;
                if (!started) {
                    started = true;
                    // collapse the sheet immediately so drag feels responsive
                    setCollapseSignal(Date.now());
                }
                const progress = clamp01((-g.dy) / FULL_GESTURE_PX);
                dragProgressRef.current = progress;
                try { setDragProgress(progress); } catch {}
                // Fade backdrop/topbar with an eased curve (more gradual early on)
                try { fade.setValue(1 - Math.pow(progress, FADE_EASE_POWER)); } catch {}
                // slide following the finger but slightly slower
                try {
                    const raw = g.dy * 0.6; // slower than finger (60%)
                    const capped = raw < -SH ? -SH : raw; // don't exceed screen
                    slideY.setValue(Math.min(0, capped)); // only move up (negative)
                } catch {}
            },
            onPanResponderTerminationRequest: () => true,
            onPanResponderRelease: (_, g) => {
                if (!visible) return;
                const progress = dragProgressRef.current || 0;
                const shouldClose = progress > 0.18 || (g.vy || 0) <= -0.35;
                if (shouldClose) {
                    close();
                } else {
                    // cancel: restore visuals and reopen comments sheet
                    Animated.parallel([
                        Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
                        Animated.timing(slideY, { toValue: 0, duration: 190, useNativeDriver: true }),
                    ]).start();
                    try { setReopenSignal(Date.now()); } catch {}
                    dragProgressRef.current = 0;
                    try { setDragProgress(0); } catch {}
                }
            },
            onPanResponderTerminate: () => {
                // treat as cancel
                if (!visible) return;
                Animated.parallel([
                    Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
                    Animated.timing(slideY, { toValue: 0, duration: 190, useNativeDriver: true }),
                ]).start();
                try { setReopenSignal(Date.now()); } catch {}
                dragProgressRef.current = 0;
                try { setDragProgress(0); } catch {}
            },
            onShouldBlockNativeResponder: () => false,
        });
    }, [visible]);

    if (!visible || !post) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={close} // Android hardware back
        >
            {/* Dim backdrop (non-interactive) */}
            <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: fade }]} />
            {/* Top bar — ONLY way to close (positioned to match Profile/ViewProfile headers) */}
            <Animated.View
                pointerEvents="box-none"
                style={[
                    styles.topBar,
                    {
                        paddingTop: insets.top + scaleSize(6), // match header padding
                        paddingHorizontal: scaleSize(22),       // match header horizontal inset
                        opacity: fade,
                    },
                ]}
            >
                <TouchableOpacity onPress={close} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={dyn.iconSize} color="#fff" />
                </TouchableOpacity>
            </Animated.View>
            {/* Focused post (slightly lower). Slides up when unfocusing */}
            <Animated.View style={[styles.stage, { opacity: stageFade, transform: [{ translateY: slideY }] }]} {...panHandlers.panHandlers}>
                <View style={[styles.focusSlot, { top: scaleSize(TARGET_Y - 15 + FOCUS_EXTRA_DROP) }]}>
                    <TouchableWithoutFeedback onPress={onMediaTap}>
                        <View>
                            <Post
                                data={post}
                                index={0}
                                isFocused
                                isSomePostFocused
                                shouldPlay
                                handleFocusPost={() => { }}
                                onSwipeUnfocus={close}
                                // When user taps the comment icon in PostFooter, expand to 92% via the flag
                                openCommentsModal={() => setCommentsExpandFlag((f) => !f)}
                                openShareModal={() => { }}
                                toViewProfile={() => { }}
                                openViewWorkoutModal={() => {
                                    try {
                                        const w = post?.workout;
                                        if (!w) return;
                                        // Normalize minimal fields expected by NewWorkoutModal
                                        const fallback = {
                                            wid: w?.wid || w?.id,
                                            creatorUID: w?.creatorUID || w?.creatorUid || post?.uid || (global?.userData?.uid || ''),
                                            created: w?.created || w?.createdAt || Date.now(),
                                            exercises: Array.isArray(w?.exercises) ? w.exercises : [],
                                            duration: w?.duration,
                                            volume: w?.volume,
                                            reps: w?.reps,
                                            PBs: w?.PBs ?? w?.pbs ?? 0,
                                            templateName: w?.templateName || w?.template?.name,
                                        };
                                        const wk = { ...fallback, ...w };
                                        // Open workout viewer INSIDE this modal, keeping the post focused behind
                                        setViewerWorkout(wk);
                                        setViewerToggle((t) => !t);
                                    } catch {}
                                }}
                            />

                            {/* ❤️ burst */}
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.heart,
                                    { opacity: heartOpacity, transform: [{ scale: heartScale }] },
                                ]}
                            >
                                <Ionicons name="heart" size={84} color="#ff3b30" />
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </Animated.View>
            {/* Bottom sheets (mounted inside modal so they're above everything) */}
            {mountCommentsSheet && (
                <CommentsBottomSheet
                    key={`comments-${sheetKeyRef.current}-${post?.pid ?? "x"}`}
                    isVisible={sheetVisible}                    // flips true after fade -> sheet snaps to computed px
                    postData={post}
                    commentsBottomSheetExpandFlag={commentsExpandFlag} // toggle -> expand to 92%
                    toViewProfile={() => { }}
                    collapseSignal={collapseSignal}
                    reopenSignal={reopenSignal}
                    interactiveProgress={dragProgress}
                    interactiveScale={0.6}
                    openPositionPx={openPositionPx}
                />
            )}
            <ShareBottomSheet
                shareBottomSheetExpandFlag={false}
                shareBottomSheetCloseFlag={false}
            />
            {/* Workout viewer mounted inside the modal so it appears above the focused post */}
            {viewerWorkout && (
                <FeedWorkoutViewerSheet
                    expandToggle={viewerToggle}
                    workout={viewerWorkout}
                    friendUid={String(post?.uid || viewerWorkout?.creatorUID || viewerWorkout?.creatorUid || '')}
                    friendPfp={post?.pfp || viewerWorkout?.pfp || viewerWorkout?.pfpUrl || null}
                    onClose={() => setViewerWorkout(null)}
                />
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.75)" },
    topBar: { position: "absolute", top: -scaleSize(6), left: 0, right: 0, paddingTop: scaleSize(40), paddingHorizontal: scaleSize(14), zIndex: 100 },
    backBtn: {
        width: scaleSize(44), height: scaleSize(44), borderRadius: scaleSize(22),
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    stage: { flex: 1 },
    focusSlot: { position: "absolute", left: 0, width: "100%" },
    heart: { position: "absolute", top: "35%", left: "50%", marginLeft: scaleSize(-42), marginTop: scaleSize(-42) },
});
