// components/Tracking/Group/GroupHeader.jsx
import React, { useEffect, useRef, memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import scaleSize from "../../../../helper/scaleSize";
import * as Haptics from "expo-haptics";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Copy } from "iconsax-react-native";
import FastImage from "react-native-fast-image";
import TimerDisplay from "../TimerDisplay";
import theme from "../../../../theme/mfpDark";

const scaledSize = (size) => scaleSize(size);

// Small helper so "", "  ", null, undefined are treated as no-URI
const normalizeUri = (u) => {
    const s = (u ?? "").toString().trim();
    return s.length ? s : null;
};

const GroupHeader = ({
    viewingSelf,
    overlayPfp,
    onOpenMenu,
    onLongPressInvite,
    onFinish,
    onCheer,
    onCopyTemplate,
    countdown,
    onAddTime,
    timerRef,
    headerStyle,
    onBack,
    onPressPfp, // when pfpOnLeft, navigate to profile
    disableGroupPress, // optional; default disables when !viewingSelf
    inActiveGroup = false, // when in a real group with others
    // When true, render PFP on the left, right next to the back chevron.
    // Used when viewing a friend's past workout (not ongoing).
    pfpOnLeft = false,
}) => {
    const disableGroup = disableGroupPress ?? !viewingSelf;

    // --- Keep track of the last known-good, non-empty URI ---
    const lastGoodPfpRef = useRef(normalizeUri(overlayPfp));
    const pendingErrorRef = useRef(false); // if image errors, keep last good instead of clearing

    useEffect(() => {
        const next = normalizeUri(overlayPfp);
        // Only update if we actually have a non-empty value and we didn't just hit an onError
        if (next && !pendingErrorRef.current) {
            lastGoodPfpRef.current = next;
        }
        // Reset the error flag if the parent gives us a new non-empty URI
        if (next) pendingErrorRef.current = false;
    }, [overlayPfp]);

    // Prefer the current overlayPfp if it's non-empty on this render; otherwise use the last good one.
    // This fixes the initial render showing a default/placeholder when the async hook resolves.
    const pfpToShow = normalizeUri(overlayPfp) || lastGoodPfpRef.current;

    const inviteGradientColors = ["#6B3A1F", "#251F30"];
    const inviteLabel = inActiveGroup ? "Switch" : "Invite";

    // Show timer on the left only when viewing self. When spectating (any case),
    // UI should match spectating mode with a back chevron (modes 3 & 4).
    const showTimerLeft = !!viewingSelf;

    // Wrap press handlers with haptics
    const withHaptics = (fn) => () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {} finally { try { fn?.(); } catch {} } };

    return (
        <View style={[styles.container, headerStyle]}>
            {/* Left: timer (self/participating) OR back chevron + optional PFP */}
            <View style={[styles.leftWrap, (!showTimerLeft) && styles.leftRow]}>
                {showTimerLeft ? (
                    <RNBounceable style={styles.rest_timer_ctnr} onPress={onAddTime ? withHaptics(onAddTime) : undefined}>
                        <View style={styles.iconWrapper}>
                            <MaterialCommunityIcons name="timer-outline" size={scaledSize(24)} color="#FFFFFF" />
                            {countdown > 0 && (
                                <Text style={styles.countdownText}>
                                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                                </Text>
                            )}
                        </View>
                    </RNBounceable>
                ) : (
                    <>
                        <Pressable onPress={onBack ? withHaptics(onBack) : undefined} style={styles.backBtn} hitSlop={8}>
                            <MaterialCommunityIcons name="chevron-left" size={scaledSize(26)} color={theme.textPrimary} />
                        </Pressable>
                        {pfpOnLeft && (
                            <Pressable onPress={onPressPfp ? withHaptics(onPressPfp) : undefined} hitSlop={8}>
                                <View style={[styles.pfpWrap, styles.pfpLeftWrap, styles.pfpFriendRing]}>
                                    {pfpToShow ? (
                                        <FastImage
                                            source={{
                                                uri: pfpToShow,
                                                priority: FastImage.priority.normal,
                                                cache: FastImage.cacheControl.immutable,
                                            }}
                                            style={styles.pfp}
                                            resizeMode={FastImage.resizeMode.cover}
                                            onError={() => { pendingErrorRef.current = true; }}
                                        />
                                    ) : (
                                        <View style={[styles.pfp, { backgroundColor: "#EEE" }]} />
                                    )}
                                </View>
                            </Pressable>
                        )}
                    </>
                )}
            </View>

            {/* Center: live workout timer — hidden when viewing others */}
            {viewingSelf && (
                <View style={styles.timer_text_ctnr} pointerEvents="none">
                    <TimerDisplay timerRef={timerRef} />
                </View>
            )}

            {/* Right: ONLY PFP (no friends icon) + Finish/Cheer */}
            <View style={styles.header_right}>
                {!pfpOnLeft && (
                    <Pressable
                        disabled={disableGroup}
                        onPress={disableGroup ? undefined : (onOpenMenu ? withHaptics(onOpenMenu) : undefined)}
                        onLongPress={disableGroup ? undefined : (onLongPressInvite ? withHaptics(onLongPressInvite) : undefined)}
                        style={[styles.inviteBtnWrapper, disableGroup && { opacity: 0.9 }]}
                    >
                        <LinearGradient
                            colors={inviteGradientColors}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={[styles.pfpBtn, !viewingSelf && styles.pfpFriend]}
                        >
                            <Text style={[styles.inviteText, !viewingSelf && styles.inviteTextMuted]}>{inviteLabel}</Text>
                            <View style={[styles.pfpWrap, !viewingSelf && styles.pfpFriendRing]}>
                                {pfpToShow ? (
                                    <FastImage
                                        source={{
                                            uri: pfpToShow,
                                            priority: FastImage.priority.normal,
                                            cache: FastImage.cacheControl.immutable,
                                        }}
                                        style={styles.pfp}
                                        resizeMode={FastImage.resizeMode.cover}
                                        onError={() => {
                                            // If an image fails (e.g., token rotation), keep the last good URI
                                            // and avoid flipping to placeholder for a frame.
                                            pendingErrorRef.current = true;
                                        }}
                                    />
                                ) : (
                                    <View style={[styles.pfp, { backgroundColor: "#EEE" }]} />
                                )}
                            </View>
                        </LinearGradient>
                    </Pressable>
                )}

                {viewingSelf ? (
                    onFinish ? (
                        <RNBounceable onPress={withHaptics(onFinish)} style={styles.finish_btn}>
                            <Text style={styles.finish_btn_text}>Finish</Text>
                        </RNBounceable>
                    ) : null
                ) : (
                    onCheer ? (
                        <RNBounceable onPress={withHaptics(onCheer)} style={styles.cheer_btn}>
                            <MaterialCommunityIcons name="arm-flex" size={scaledSize(18)} color="#ffffff" />
                            <Text style={styles.cheer_btn_text}>Cheer</Text>
                        </RNBounceable>
                    ) : (
                        <RNBounceable onPress={onCopyTemplate ? withHaptics(onCopyTemplate) : undefined} style={styles.copy_btn}>
                            <Copy size={scaledSize(20)} color="#ffffff" variant='Linear' />
                            <Text style={styles.copy_btn_text}>Copy Template</Text>
                        </RNBounceable>
                    )
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftWrap: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
    leftRow: { flexDirection: "row", alignItems: "center", gap: scaledSize(10) },
    backBtn: {
        width: scaledSize(36),
        height: scaledSize(36),
        borderRadius: scaledSize(12),
        backgroundColor: theme.field,
        alignItems: "center",
        justifyContent: "center",
    },
    rest_timer_ctnr: {
        alignItems: "center",
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(12),
        backgroundColor: theme.restPillBg,
    },
    iconWrapper: { flexDirection: "row", alignItems: "center" },
    countdownText: {
        fontSize: scaleSize(12),
        color: '#FFFFFF',
        fontFamily: "Outfit_700Bold",
        marginLeft: scaledSize(10),
    },

    // Center timer
    timer_text_ctnr: { position: "absolute", left: 0, right: 0 },

    header_right: { flexDirection: "row", alignItems: "center", flexShrink: 0 },

    // Invite button with trailing avatar
    inviteBtnWrapper: {
        borderRadius: scaledSize(10),
        overflow: 'hidden',
        flexShrink: 0,
    },
    pfpBtn: {
        flexDirection: "row",
        alignItems: "center",
        height: scaledSize(38),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(12),
    },
    pfpFriend: { opacity: 0.85 },

    pfpWrap: {
        width: scaledSize(23),
        aspectRatio: 1,
        borderRadius: scaledSize(16),
        backgroundColor: theme.surface,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: scaleSize(2) },
        elevation: 2,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        marginLeft: scaledSize(8),
    },
    pfpLeftWrap: { width: scaledSize(28), height: scaledSize(28) },
    pfpFriendRing: { borderColor: theme.primary },
    pfp: { width: "100%", height: "100%", borderRadius: scaledSize(20) },

    inviteText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: theme.textPrimary,
        includeFontPadding: false,
    },
    inviteTextMuted: {
        color: theme.textSecondary,
    },


    // Self: Finish
    finish_btn: {
        width: scaledSize(83),
        height: scaledSize(34),
        borderRadius: scaledSize(10),
        backgroundColor: theme.successButton,
        justifyContent: "center",
        alignItems: "center",
    },
    finish_btn_text: {
        fontFamily: "Mulish_800ExtraBold",
        fontSize: scaleSize(12),
        color: "#ffffff",
    },

    // Viewing: sleeker Cheer pill
    cheer_btn: {
        height: scaledSize(34),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(10),
        backgroundColor: theme.primary,
        flexDirection: "row",
        alignItems: "center",
        gap: scaledSize(6),
        shadowColor: theme.primary,
        shadowOpacity: 0.25,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    cheer_btn_text: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11.5),
        color: "#ffffff",
        includeFontPadding: false,
    },
    // Copy template button – slightly darker blue than primary for better balance
    copy_btn: {
        height: scaledSize(34),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(12),
        // Darken brand blue further per feedback
        backgroundColor: '#166CC9',
        flexDirection: "row",
        alignItems: "center",
        gap: scaledSize(6),
        shadowColor: '#166CC9',
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 3,
    },
    copy_btn_text: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11.5),
        color: "#ffffff",
        includeFontPadding: false,
    },
});

export default memo(GroupHeader);
