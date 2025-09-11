// SinglePostModal.js
import React, { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import getScrollTargetPosition from "../../../../helper/getScrollTargetPosition";
import { getFeedHeaderStyles } from "../../../../helper/getFeedHeaderStyles";
import Post from "../../../1_Feed/Posts/Post";
import CommentsBottomSheet from "../../../1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../../../1_Feed/SharePost/ShareBottomSheet";
import FeedWorkoutViewerSheet from "../../../1_Feed/ViewWorkout/FeedWorkoutViewerSheet";

const { width: SW, height: SH } = Dimensions.get("window");
const TARGET_Y = getScrollTargetPosition(SW, SH);
const dyn = getFeedHeaderStyles(SW, SH);

const FADE_DUR = 160;
const SHEET_CLOSE_DUR = 280; // approximate BottomSheet close duration
const FOCUS_EXTRA_DROP = 12; // sit slightly lower

export default function SinglePostModal({ visible, post, onClose, onOpenWorkout }) {
    const fade = useRef(new Animated.Value(0)).current;
    const isClosingRef = useRef(false);

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
            Animated.timing(fade, { toValue: 1, duration: FADE_DUR, useNativeDriver: true }).start();

            // force remount so the sheet's internal useEffect runs fresh
            sheetKeyRef.current += 1;
            setCommentsExpandFlag(false);
            setMountCommentsSheet(true);
            setSheetVisible(false);

            // show the sheet almost immediately so its animation lines up with fade
            if (openTimer.current) clearTimeout(openTimer.current);
            openTimer.current = setTimeout(() => {
                requestAnimationFrame(() => setSheetVisible(true)); // triggers snapToIndex(0) inside the sheet
            }, 20);
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

        // 2) fade out backdrop, post, and close button
        Animated.timing(fade, { toValue: 0, duration: FADE_DUR, useNativeDriver: true }).start();

        // 3) after sheet close duration, notify parent to unmount modal
        setTimeout(() => {
            onClose && onClose();
            isClosingRef.current = false;
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

            {/* Top bar — ONLY way to close */}
            <Animated.View pointerEvents="box-none" style={[styles.topBar, { opacity: fade }] }>
                <TouchableOpacity onPress={close} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={dyn.iconSize} color="#fff" />
                </TouchableOpacity>
            </Animated.View>

            {/* Focused post (slightly lower) */}
            <Animated.View style={[styles.stage, { opacity: fade }]}>
                <View style={[styles.focusSlot, { top: TARGET_Y - 15 + FOCUS_EXTRA_DROP }]}>
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
                    isVisible={sheetVisible}                    // flips true after fade -> sheet snaps to 35.5%
                    postData={post}
                    commentsBottomSheetExpandFlag={commentsExpandFlag} // toggle -> expand to 92%
                    toViewProfile={() => { }}
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
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
    topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 40, paddingHorizontal: 14, zIndex: 100 },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    stage: { flex: 1 },
    focusSlot: { position: "absolute", left: 0, width: "100%" },
    heart: { position: "absolute", top: "35%", left: "50%", marginLeft: -42, marginTop: -42 },
});
