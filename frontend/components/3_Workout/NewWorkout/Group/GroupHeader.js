// components/Tracking/Group/GroupHeader.jsx
import React, { useEffect, useRef, memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import scaleSize, { ts } from "../../../../helper/scaleSize";
import * as Haptics from "expo-haptics";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Copy } from "iconsax-react-native";
import FastImage from "react-native-fast-image";
import TimerDisplay from "../TimerDisplay";
import theme from "../../../../theme/mfpDark";
import { activeWorkoutHighlight } from "../activeWorkoutColors";

const scaledSize = (size) => scaleSize(size);

// Small helper so "", "  ", null, undefined are treated as no-URI
const normalizeUri = (u) => {
    const s = (u ?? "").toString().trim();
    return s.length ? s : null;
};

const GroupHeader = ({
    viewingSelf,
    overlayPfp,
    pfpIdentity = null,
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
    disableGroupPress, // optional; default disables when not rendering the self layout
    inActiveGroup = false, // when in a real group with others
    // When true, render PFP on the left, right next to the back chevron.
    // Used when viewing a friend's past workout (not ongoing).
    pfpOnLeft = false,
    // When true, force the "self" layout (rest timer + invite/switch) even if viewing another participant.
    forceSelfHeader = false,
}) => {
    const selfLayout = forceSelfHeader || viewingSelf;
    const disableGroup = disableGroupPress ?? !selfLayout;
    const identityKey = pfpIdentity == null ? "__none__" : String(pfpIdentity);

    // --- Keep track of the last known-good, non-empty URI ---
    const lastGoodPfpRef = useRef(normalizeUri(overlayPfp));
    const pendingErrorRef = useRef(false); // if image errors, keep last good instead of clearing
    const identityKeyRef = useRef(identityKey);

    useEffect(() => {
        if (identityKeyRef.current !== identityKey) {
            identityKeyRef.current = identityKey;
            lastGoodPfpRef.current = normalizeUri(overlayPfp);
            pendingErrorRef.current = false;
        }
    }, [identityKey, overlayPfp]);

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

    const inviteLabel = inActiveGroup ? "Switch" : "Invite";

    // Show timer on the left only when viewing self. When spectating (any case),
    // UI should match spectating mode with a back chevron (modes 3 & 4).
    const showTimerLeft = !!selfLayout;
    const normalizedPfpOnLeft = !selfLayout && pfpOnLeft;

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
                        {normalizedPfpOnLeft && (
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
            {selfLayout && (
                <View style={styles.timer_text_ctnr} pointerEvents="none">
                    <TimerDisplay timerRef={timerRef} />
                </View>
            )}

            {/* Right: ONLY PFP (no friends icon) + Finish/Cheer */}
            <View style={styles.header_right}>
                {!normalizedPfpOnLeft && (
                    <RNBounceable
                        disabled={disableGroup}
                        onPress={disableGroup ? undefined : (onOpenMenu ? withHaptics(onOpenMenu) : undefined)}
                        onLongPress={disableGroup ? undefined : (onLongPressInvite ? withHaptics(onLongPressInvite) : undefined)}
                        style={[styles.invite_btn, disableGroup && styles.invite_btn_disabled]}
                        activeScale={disableGroup ? 1 : 0.96}
                    >
                        <Text style={styles.invite_btn_text}>{inviteLabel}</Text>
                    </RNBounceable>
                )}

                {selfLayout ? (
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
        fontSize: scaleSize(13.5),
        color: '#FFFFFF',
        fontFamily: "Outfit_700Bold",
        marginLeft: scaledSize(10),
    },

    // Center timer
    timer_text_ctnr: { position: "absolute", left: 0, right: 0 },

    header_right: { flexDirection: "row", alignItems: "center", flexShrink: 0 },

    invite_btn: {
        flexShrink: 0,
        paddingVertical: scaledSize(7),
        paddingHorizontal: scaledSize(20),
        borderRadius: scaledSize(24),
        backgroundColor: activeWorkoutHighlight(),
        justifyContent: "center",
        alignItems: "center",
        shadowColor: activeWorkoutHighlight(),
        shadowOpacity: 0.22,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 4,
    },
    invite_btn_disabled: {
        opacity: 0.55,
    },
    invite_btn_text: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(12.5),
        color: "#FFFFFF",
        includeFontPadding: false,
    },

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
