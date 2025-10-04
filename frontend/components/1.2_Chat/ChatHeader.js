// components/1.2_Chat/ChatHeader.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { FontAwesome6 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { usePfp } from "../../helper/usePFPs";
import scaleSize, { ts } from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

const ACCENT = theme.primary;
const HAIRLINE = theme.hairline;
const BG = theme.bg;

const BACK_GUTTER = 24;
const SINGLE_PFP_SIZE = scaleSize(36);
const SINGLE_PFP_RADIUS = Math.round(SINGLE_PFP_SIZE / 2);
const STACKED_PFP_SIZE = scaleSize(28);
const STACKED_PFP_RADIUS = Math.round(STACKED_PFP_SIZE / 2);
const STACKED_OFFSET = scaleSize(4);
const AVATAR_BORDER = Math.max(1, scaleSize(1));

const ChatHeader = ({ usersExcludingSelf = [], toMessages }) => {
    const navigation = useNavigation();
    const handles = usersExcludingSelf
        .map((u) => (typeof u?.handle === 'string' && u.handle.trim() ? '@' + u.handle.trim() : ''))
        .filter(Boolean)
        .join(", ");
    // Show only first names (split by space)
    const names = usersExcludingSelf
        .map((u) => (typeof u?.name === 'string' ? u.name.trim().split(/\s+/)[0] : ''))
        .filter((n) => n && n.length > 0)
        .join(", ");
    const u0 = usersExcludingSelf[0];
    const u1 = usersExcludingSelf[1];
    const p0 = u0
        ? usePfp(
            u0.uid,
            u0.pfpVersion ?? 0,
            u0?.pfp || u0?.pfpUrl || u0?.image || u0?.photoURL || u0?.avatar || ""
        )
        : null;
    const p1 = u1
        ? usePfp(
            u1.uid,
            u1.pfpVersion ?? 0,
            u1?.pfp || u1?.pfpUrl || u1?.image || u1?.photoURL || u1?.avatar || ""
        )
        : null;

    const onBack = () => {
        if (typeof toMessages === "function") toMessages();
        else navigation.goBack();
    };

    const primaryLabel = names || (handles ? handles.replace(/@/g, '').trim() : 'Direct Message');
    const secondaryLabel = handles;

    return (
        <View style={styles.header}>
            {/* Back pill — same as MessagesHeader */}
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={onBack}
                hitSlop={{ top: scaleSize(8), bottom: scaleSize(8), left: scaleSize(8), right: scaleSize(8) }}
                style={[styles.iconCircle, styles.leftIcon]}
            >
                <FontAwesome6 name="chevron-left" size={scaleSize(13)} color={ACCENT} />
            </TouchableOpacity>
            {/* Scooted content so it never overlaps the pill */}
            <View style={styles.centerRow}>
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
                    <Text numberOfLines={1} style={styles.nameText}>
                        {primaryLabel}
                    </Text>
                    {!!secondaryLabel && (
                        <Text numberOfLines={1} style={styles.handleText}>
                            {secondaryLabel}
                        </Text>
                    )}
                </View>
            </View>
            <View style={{ width: scaleSize(12) }} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        position: "relative",
        backgroundColor: BG,
        height: scaleSize(62),
        justifyContent: "center",
        borderBottomColor: HAIRLINE,
        borderBottomWidth: 1,
    },

    // exact pill spec + ensure it’s on top
    iconCircle: {
        position: "absolute",
        top: "50%",
        transform: [{ translateY: -scaleSize(14) }],
        width: scaleSize(28),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: HAIRLINE,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(7),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    leftIcon: { left: scaleSize(20) },

    // leave space = left(20) + pill(28) + gutter(24)
    centerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
        paddingLeft: scaleSize(20 + 28 + BACK_GUTTER),
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

    textWrap: { flex: 1, justifyContent: "center" },
    nameText: {
        fontFamily: "Nunito_700Bold",
        fontSize: ts(17),
        color: theme.textPrimary,
        lineHeight: ts(22),
        includeFontPadding: false,
    },
    handleText: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: ts(13),
        color: theme.textSecondary,
        marginTop: scaleSize(2),
        lineHeight: ts(18),
        includeFontPadding: false,
    },
});

export default ChatHeader;
