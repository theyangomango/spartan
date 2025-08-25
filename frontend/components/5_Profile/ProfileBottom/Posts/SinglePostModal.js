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
import ViewWorkoutBottomSheet from "../../../1_Feed/ViewWorkout/ViewWorkoutBottomSheet";

const { width: SW, height: SH } = Dimensions.get("window");
const TARGET_Y = getScrollTargetPosition(SW, SH);
const dyn = getFeedHeaderStyles(SW, SH);

const FADE_DUR = 160;
const FOCUS_EXTRA_DROP = 12; // sit slightly lower

export default function SinglePostModal({ visible, post, onClose }) {
    const fade = useRef(new Animated.Value(0)).current;

    // ❤️ double-tap like burst
    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;
    const lastTapRef = useRef(0);

    // Re-mount & gate the sheet's visibility so its own effect runs
    const [mountCommentsSheet, setMountCommentsSheet] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
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
            fade.setValue(0);
            Animated.timing(fade, { toValue: 1, duration: FADE_DUR, useNativeDriver: true }).start();

            // force remount so the sheet's internal useEffect runs fresh
            sheetKeyRef.current += 1;
            setCommentsExpandFlag(false);
            setMountCommentsSheet(true);
            setSheetVisible(false);

            // critical: wait until after the fade completes + a frame to ensure layout is settled
            if (openTimer.current) clearTimeout(openTimer.current);
            openTimer.current = setTimeout(() => {
                requestAnimationFrame(() => setSheetVisible(true)); // triggers snapToIndex(0) inside the sheet
            }, FADE_DUR + 20); // ~180ms total
        } else {
            Animated.timing(fade, { toValue: 0, duration: FADE_DUR, useNativeDriver: true }).start(onClose);
            if (openTimer.current) {
                clearTimeout(openTimer.current);
                openTimer.current = null;
            }
            setSheetVisible(false);
            setMountCommentsSheet(false);
        }
    }, [visible]);

    const close = () => {
        if (openTimer.current) {
            clearTimeout(openTimer.current);
            openTimer.current = null;
        }
        Animated.timing(fade, { toValue: 0, duration: FADE_DUR, useNativeDriver: true }).start(onClose);
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
            <View pointerEvents="box-none" style={styles.topBar}>
                <TouchableOpacity onPress={close} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={dyn.iconSize} color="#fff" />
                </TouchableOpacity>
            </View>

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
                                // When user taps the comment icon in PostFooter, expand to 92% via the flag
                                openCommentsModal={() => setCommentsExpandFlag((f) => !f)}
                                openShareModal={() => { }}
                                toViewProfile={() => { }}
                                openViewWorkoutModal={() => { }}
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
            <ViewWorkoutBottomSheet
                workout={post?.workout ?? null}
                viewWorkoutBottomSheetExpandFlag={false}
            />
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
