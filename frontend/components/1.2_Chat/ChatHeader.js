// components/1.2_Chat/ChatHeader.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { usePfp } from "../../helper/usePFPs";
import scaleSize, { ts } from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";
import VerifiedHandle from "../common/VerifiedHandle";
import useUserVerified from "../../hooks/useUserVerified";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";

const HAIRLINE = theme.hairline;
const BG = theme.bg;
const BACK_ICON_COLOR = theme.textSecondary;

const BACK_GUTTER = 18;
const SINGLE_PFP_SIZE = scaleSize(34);
const SINGLE_PFP_RADIUS = Math.round(SINGLE_PFP_SIZE / 2);
const STACKED_PFP_SIZE = scaleSize(28);
const STACKED_PFP_RADIUS = Math.round(STACKED_PFP_SIZE / 2);
const STACKED_OFFSET = scaleSize(4);
const AVATAR_BORDER = Math.max(1, scaleSize(1));

const sanitizeHandle = (user) => {
    const base = typeof user?.handle === "string" ? user.handle : "";
    const trimmed = base.replace(/^@+/, "").trim();
    if (trimmed) return trimmed;
    const name = typeof user?.name === "string" ? user.name.trim() : "";
    return name || "Friend";
};

const ChatHeaderHandle = ({ participant, textStyle, containerStyle }) => {
    const handle = participant?.handle ?? "Friend";
    const user = participant?.user ?? null;
    const fallbackVerified = Boolean(user?.isVerified ?? user?.verified);
    const uid = user?.uid ? String(user.uid) : "";
    const isVerified = useUserVerified(uid, fallbackVerified);
    const rankTierKey = (() => {
        const candidates = [
            user?.rankTier,
            user?.currentRank?.tier,
            user?.currentRank?.rankTier,
            user?.rank?.tier,
            user?.rank?.rankTier,
        ];
        for (const val of candidates) {
            if (typeof val === "string" && val.trim()) return val.trim().toLowerCase();
        }
        return null;
    })();
    const rankTheme = (() => {
        const key = rankTierKey || "gold";
        return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.gold;
    })();
    const handleColor = (() => {
        const bronzeAccent =
            rankTierKey === "bronze"
                ? (Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : "#b94f1f")
                : null;
        const candidates = [
            bronzeAccent,
            Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : null,
            Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[2] : null,
            rankTheme?.borderColor,
            rankTheme?.titleSecondaryColor,
        ];
        for (const c of candidates) {
            if (typeof c === "string" && c.trim()) return c;
        }
        return theme.textPrimary;
    })();
    const flattened = StyleSheet.flatten(textStyle) || {};
    const fontSize = Number(flattened.fontSize) || ts(13);
    const iconOffset = -Math.round(fontSize * 0.14); // tighten alignment with baseline
    const iconSize = Math.max(14, Math.round(fontSize * 1.2));

    return (
        <VerifiedHandle
            handle={handle}
            isVerified={isVerified}
            textStyle={[textStyle, { color: handleColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
            containerStyle={containerStyle}
            iconSize={iconSize}
            iconStyle={{ marginTop: iconOffset }}
        />
    );
};

const ChatHeader = ({ usersExcludingSelf = [], toMessages, onPressParticipant }) => {
    const navigation = useNavigation();
    const participantsMeta = React.useMemo(() => (
        usersExcludingSelf.map((user, idx) => {
            const handle = sanitizeHandle(user);
            const uid = user?.uid ? String(user.uid) : "";
            return {
                key: uid || `participant-${idx}`,
                handle,
                user,
            };
        })
    ), [usersExcludingSelf]);
    const handlesLabel = participantsMeta.map((p) => p.handle).join(", ");
    const u0 = usersExcludingSelf[0] || null;
    const u1 = usersExcludingSelf[1] || null;
    const fallback0 = resolvePhotoURL(u0, "");
    const fallback1 = resolvePhotoURL(u1, "");
    const p0 = usePfp(
        u0?.uid || null,
        u0?.pfpVersion ?? 0,
        fallback0
    );
    const p1 = usePfp(
        u1?.uid || null,
        u1?.pfpVersion ?? 0,
        fallback1
    );

    const onBack = () => {
        if (typeof toMessages === "function") toMessages();
        else navigation.goBack();
    };

    const hasHandles = handlesLabel.length > 0;
    const primaryLabel = hasHandles ? handlesLabel : "Direct Message";
    const firstParticipant = participantsMeta[0] || null;
    const isSingleConversation = participantsMeta.length === 1;
    const canOpenProfile = isSingleConversation && typeof onPressParticipant === "function";

    const headerContent = (
        <>
            <View style={styles.pfpContainer}>
                {usersExcludingSelf.length > 1 ? (
                    <>
                        {p0 ? (
                            <FastImage source={{ uri: p0 }} style={[styles.pfp, styles.pfpTL]} />
                        ) : (
                            <View style={[styles.pfp, styles.pfpTL, styles.pfpPh]} />
                        )}
                        {p1 ? (
                            <FastImage source={{ uri: p1 }} style={[styles.pfp, styles.pfpBR]} />
                        ) : (
                            <View style={[styles.pfp, styles.pfpBR, styles.pfpPh]} />
                        )}
                    </>
                ) : p0 ? (
                    <FastImage source={{ uri: p0 }} style={styles.pfpSingle} />
                ) : (
                    <View style={[styles.pfpSingle, styles.pfpPh]} />
                )}
            </View>

            <View style={styles.textWrap}>
                {isSingleConversation && firstParticipant ? (
                    <ChatHeaderHandle
                        participant={firstParticipant}
                        textStyle={styles.nameText}
                        containerStyle={styles.nameRow}
                        iconSize={scaleSize(19)}
                    />
                ) : participantsMeta.length > 1 ? (
                    <View style={styles.multiHandlesRow}>
                        {participantsMeta.map((participant, idx) => (
                            <React.Fragment key={participant.key}>
                                <ChatHeaderHandle
                                    participant={participant}
                                    textStyle={styles.nameText}
                                    containerStyle={styles.multiHandleItem}
                                />
                                {idx < participantsMeta.length - 1 && (
                                    <Text
                                        style={[styles.nameText, styles.handleComma]}
                                        numberOfLines={1}
                                        ellipsizeMode="clip"
                                    >
                                        ,{" "}
                                    </Text>
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                ) : (
                    <Text numberOfLines={1} style={styles.nameText}>
                        {primaryLabel}
                    </Text>
                )}
            </View>
        </>
    );

    return (
        <View style={styles.header}>
            {/* Scooted content so it never overlaps the back icon hit area */}
            <View style={styles.centerRow} pointerEvents="box-none">
                {canOpenProfile ? (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onPressParticipant}
                        style={styles.centerContent}
                        hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                    >
                        {headerContent}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.centerContent}>{headerContent}</View>
                )}
            </View>
            {/* Back icon mirrors Notifications styling */}
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={onBack}
                hitSlop={{ top: scaleSize(8), bottom: scaleSize(8), left: scaleSize(8), right: scaleSize(8) }}
                style={styles.leftIcon}
            >
                <Ionicons name="chevron-back" size={scaleSize(20)} color={BACK_ICON_COLOR} />
            </TouchableOpacity>
            <View style={{ width: scaleSize(12) }} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        position: "relative",
        backgroundColor: BG,
        minHeight: scaleSize(56),
        justifyContent: "center",
        borderBottomColor: HAIRLINE,
        borderBottomWidth: 1,
    },

    leftIcon: {
        position: "absolute",
        left: scaleSize(20),
        top: "50%",
        transform: [{ translateY: -scaleSize(18) }],
        height: scaleSize(36),
        width: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: "center",
        justifyContent: "center",
    },

    // leave space = left(20) + icon hitbox(36) + gutter(24)
    centerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
        paddingLeft: scaleSize(20 + 36 + BACK_GUTTER),
    },
    centerContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    pfpContainer: {
        width: SINGLE_PFP_SIZE,
        height: SINGLE_PFP_SIZE,
        marginRight: scaleSize(12),
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    pfp: {
        width: STACKED_PFP_SIZE,
        height: STACKED_PFP_SIZE,
        borderRadius: STACKED_PFP_RADIUS,
        position: "absolute",
        borderWidth: AVATAR_BORDER,
        borderColor: theme.bg,
        backgroundColor: theme.field,
    },
    pfpTL: { top: STACKED_OFFSET, left: STACKED_OFFSET },
    pfpBR: { bottom: STACKED_OFFSET, right: STACKED_OFFSET },
    pfpSingle: {
        width: SINGLE_PFP_SIZE,
        height: SINGLE_PFP_SIZE,
        borderRadius: SINGLE_PFP_RADIUS,
        backgroundColor: theme.field,
        borderWidth: AVATAR_BORDER,
        borderColor: theme.bg,
    },
    pfpPh: { backgroundColor: theme.field },

    textWrap: { flex: 1, justifyContent: "center", minWidth: 0 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    multiHandlesRow: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        minWidth: 0,
        overflow: "hidden",
    },
    multiHandleItem: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        minWidth: 0,
    },
    handleComma: {
        includeFontPadding: false,
    },
    nameText: {
        fontFamily: "Poppins_700Bold",
        fontSize: ts(13),
        color: theme.textPrimary,
        includeFontPadding: false,
        flexShrink: 1,
        minWidth: 0,
    },
});

export default ChatHeader;
