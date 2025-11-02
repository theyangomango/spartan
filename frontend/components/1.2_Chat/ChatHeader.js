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

const ChatHeader = ({ usersExcludingSelf = [], toMessages, onPressParticipant }) => {
    const navigation = useNavigation();
    const sanitizedHandles = usersExcludingSelf
        .map((u) => {
            const base = typeof u?.handle === 'string' ? u.handle : '';
            const trimmed = base.replace(/^@+/, '').trim();
            if (trimmed) return trimmed;
            const name = typeof u?.name === 'string' ? u.name.trim() : '';
            return name || 'Friend';
        });
    const handles = sanitizedHandles.filter(Boolean).join(", ");
    // Show only first names (split by space)
    const names = "";
    const u0 = usersExcludingSelf[0] || null;
    const u1 = usersExcludingSelf[1] || null;
    const fallback0 = u0?.pfp || u0?.pfpUrl || u0?.image || u0?.photoURL || u0?.avatar || "";
    const fallback1 = u1?.pfp || u1?.pfpUrl || u1?.image || u1?.photoURL || u1?.avatar || "";
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

    const hasHandles = handles.length > 0;
    const primaryLabel = hasHandles ? handles : 'Direct Message';
    const firstUser = usersExcludingSelf[0] || null;
    const fallbackVerified = Boolean(firstUser?.isVerified ?? firstUser?.verified);
    const firstUid = firstUser?.uid ? String(firstUser.uid) : '';
    const isFirstVerified = useUserVerified(firstUid, fallbackVerified);
    const showSingleVerified = usersExcludingSelf.length === 1 && sanitizedHandles[0];
    const canOpenProfile = usersExcludingSelf.length === 1 && typeof onPressParticipant === 'function';

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
                {showSingleVerified ? (
                    <VerifiedHandle
                        handle={sanitizedHandles[0]}
                        isVerified={isFirstVerified}
                        textStyle={styles.nameText}
                        numberOfLines={1}
                        iconSize={scaleSize(19)}
                        ellipsizeMode="tail"
                        preserveTextAlignment
                        containerStyle={styles.nameRow}
                    />
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
    nameText: {
        fontFamily: "Nunito_700Bold",
        fontSize: ts(16),
        color: theme.textPrimary,
        includeFontPadding: false,
    }
});

export default ChatHeader;
