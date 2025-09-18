// SinglePostModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Easing,
} from "react-native";
import { Animated as RNAnimated } from "react-native";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing as REAEasing } from 'react-native-reanimated';
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
    const isClosingRef = useRef(false);
    // Reanimated shared values for backdrop/topbar fade and stage translate
    const fadeSV = useSharedValue(0);
    const translateYSV = useSharedValue(0);
    const [collapseSignal, setCollapseSignal] = useState(0);
    const [reopenSignal, setReopenSignal] = useState(0);
    // Reanimated progress for comments sheet and unfocus gesture (0..1)
    const interactiveProgressSV = useSharedValue(0);
    // Focus mode progress (0..1) so children can fade in with focus
    const focusModeSV = useSharedValue(0);
    // Focused post entrance fade (one-shot)
    const stageOpacitySV = useSharedValue(0);
    const STAGE_FADE_DUR = 260;

    // ❤️ double-tap like burst
    const heartScale = useRef(new RNAnimated.Value(0)).current;
    const heartOpacity = useRef(new RNAnimated.Value(0)).current;
    const triggerHeart = React.useCallback(() => {
        try { heartScale.stopAnimation?.(); heartOpacity.stopAnimation?.(); } catch {}
        heartScale.setValue(0.2);
        heartOpacity.setValue(0.9);
        RNAnimated.parallel([
            RNAnimated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
            RNAnimated.timing(heartOpacity, {
                toValue: 0,
                duration: 650,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [heartScale, heartOpacity]);

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
    // Match Post.js body height exactly to ensure gesture overlay alignment
    const postHeight = SW / POST_AR;
    const postBottomY = postTop + postHeight;
    const containerHeight = SH - containerTop;
    const openPositionPx = Math.max(0, Math.min(containerHeight, containerHeight - (postBottomY - containerTop)));
    // Map: every 4px finger up -> 1px sheet collapse
    // Slightly more sensitive than before: require less drag distance
    const FULL_GESTURE_PX = Math.max(96, Math.min(SH * 0.18, 200));
    const interactiveScaleSlow = useMemo(() => {
        const denom = Math.max(1, openPositionPx || 1);
        return FULL_GESTURE_PX / (4 * denom);
    }, [openPositionPx]);

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
            fadeSV.value = 0;
            translateYSV.value = 0;
            interactiveProgressSV.value = 0;
            fadeSV.value = withTiming(1, { duration: 200, easing: REAEasing.out(REAEasing.cubic) });
            // fade in the focused post content more noticeably
            stageOpacitySV.value = 0;
            stageOpacitySV.value = withTiming(1, { duration: STAGE_FADE_DUR, easing: REAEasing.out(REAEasing.cubic) });
            // drive focus progress for children (e.g., footer info panel)
            focusModeSV.value = 0;
            focusModeSV.value = withTiming(1, { duration: STAGE_FADE_DUR, easing: REAEasing.out(REAEasing.cubic) });
            // small settle-in lift
            translateYSV.value = 10;
            translateYSV.value = withTiming(0, { duration: 180, easing: REAEasing.out(REAEasing.cubic) });

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

        // 1) drive the comments sheet to fully collapse in sync via shared progress
        try {
            const targetProgress = Math.max(1, 1 / Math.max(0.0001, interactiveScaleSlow));
            interactiveProgressSV.value = withTiming(targetProgress, { duration: 220, easing: REAEasing.out(REAEasing.cubic) });
        } catch {}
        // keep sheet mounted/visible until the modal finishes closing to keep visuals in sync

        // 2) animate stage up and fade out backdrop/top bar
        try { translateYSV.value = withTiming(-SH, { duration: 220 }); } catch {}
        fadeSV.value = withTiming(0, { duration: FADE_DUR });
        // indicate leaving focus
        try { focusModeSV.value = withTiming(0, { duration: 160 }); } catch {}

        // 3) after sheet close duration, notify parent to unmount modal
        setTimeout(() => {
            onClose && onClose();
            isClosingRef.current = false;
        }, SHEET_CLOSE_DUR);
    };

    // no-op here; replaced with Gesture.Tap double-tap handler via triggerHeart

    // Upward pan-to-close gesture implemented with Reanimated + Gesture Handler
    const panGesture = useMemo(() => {
        let started = false;
        return Gesture.Pan()
            .minPointers(1)
            .maxPointers(1)
            // Require a small vertical move; allow any X jitter
            .activeOffsetY([-6, 6])
            .shouldCancelWhenOutside(false)
            .cancelsTouchesInView(true)
            .simultaneousWithExternalGesture(Gesture.Native())
            .onBegin(() => {
                started = false;
                // reset interactive progress
                interactiveProgressSV.value = 0;
            })
            .onUpdate((e) => {
                if (!visible) return;
                if (!started) {
                    started = true;
                }
                const ty = Math.min(0, e.translationY);
                const dyUp = -ty; // positive upwards drag in px
                // continuous progress; allow >1 so sheet can reach 0px when p*scale >= 1
                let pCont = dyUp / FULL_GESTURE_PX;
                if (pCont < 0) pCont = 0;
                interactiveProgressSV.value = pCont;
                // Fade backdrop/topbar with an eased curve (more gradual early on)
                let p = dyUp / FULL_GESTURE_PX;
                if (p < 0) p = 0; else if (p > 1) p = 1;
                fadeSV.value = 1 - Math.pow(p, FADE_EASE_POWER);
                // slide following the finger but slightly slower
                const raw = ty * 0.7; // slightly closer to finger (70%)
                const capped = raw < -SH ? -SH : raw; // don't exceed screen
                translateYSV.value = Math.min(0, capped); // only move up (negative)
            })
            .onEnd((e) => {
                if (!visible) return;
                const ty = Math.min(0, e.translationY);
                let p = (-ty) / FULL_GESTURE_PX;
                if (p < 0) p = 0; else if (p > 1) p = 1;
                const shouldClose = p > 0.12 || (e.velocityY || 0) < -500;
                if (shouldClose) {
                    runOnJS(close)();
                } else {
                    // cancel: restore visuals and reopen comments sheet
                    fadeSV.value = withTiming(1, { duration: 160 });
                    translateYSV.value = withTiming(0, { duration: 190 });
                    interactiveProgressSV.value = withTiming(0, { duration: 190 });
                }
            })
            .onFinalize(() => {
                started = false;
            });
    }, [visible]);

    // Keep gestures simple to avoid conflicts: pan only

    // Reanimated styles
    const backdropStyle = useAnimatedStyle(() => ({ opacity: fadeSV.value }));
    const topBarStyle = useAnimatedStyle(() => ({ opacity: fadeSV.value }));
    const stageStyle = useAnimatedStyle(() => ({ opacity: stageOpacitySV.value, transform: [{ translateY: translateYSV.value }] }));

    if (!visible || !post) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={close} // Android hardware back
        >
            <GestureDetector gesture={panGesture}>
            <Reanimated.View style={{ flex: 1 }}>
                    {/* Dim backdrop (non-interactive) */}
                    <Reanimated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
                    {/* Top bar — ONLY way to close (positioned to match Profile/ViewProfile headers) */}
                    <Reanimated.View
                        pointerEvents="box-none"
                        style={[
                            styles.topBar,
                            topBarStyle,
                            {
                                paddingTop: insets.top + scaleSize(6), // match header padding
                                paddingHorizontal: scaleSize(22),       // match header horizontal inset
                            },
                        ]}
                    >
                        <TouchableOpacity onPress={close} style={styles.backBtn} activeOpacity={0.8}>
                            <Ionicons name="chevron-back" size={dyn.iconSize} color="#fff" />
                        </TouchableOpacity>
                    </Reanimated.View>
                    {/* Focused post (slightly lower). Slides up when unfocusing */}
                    <Reanimated.View style={[styles.stage, stageStyle]}>
                        <View style={[styles.focusSlot, { top: scaleSize(TARGET_Y - 15 + FOCUS_EXTRA_DROP) }]}>
                            <View>
                                <Post
                                        data={post}
                                        index={0}
                                        isFocused
                                        isSomePostFocused
                                        shouldPlay
                                        focusModeSV={focusModeSV}
                                        interactiveUnfocusSV={interactiveProgressSV}
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
                                <RNAnimated.View
                                    pointerEvents="none"
                                    style={[
                                        styles.heart,
                                        { opacity: heartOpacity, transform: [{ scale: heartScale }] },
                                    ]}
                                >
                                    <Ionicons name="heart" size={84} color="#ff3b30" />
                                </RNAnimated.View>
                            </View>
                        </View>
                    </Reanimated.View>
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
                            interactiveProgressSV={interactiveProgressSV}
                            interactiveScale={interactiveScaleSlow}
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
            </Reanimated.View>
            </GestureDetector>
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
