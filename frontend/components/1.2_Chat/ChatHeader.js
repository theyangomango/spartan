// components/1.2_Chat/ChatHeader.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { FontAwesome6 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { usePfp } from "../../helper/usePFPs";
import scaleSize from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

const ACCENT = theme.primary;
const HAIRLINE = theme.hairline;
const BG = theme.bg;

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
    const p0 = u0 ? usePfp(u0.uid, u0.pfpVersion ?? 0) : null;
    const p1 = u1 ? usePfp(u1.uid, u1.pfpVersion ?? 0) : null;

    const onBack = () => {
        if (typeof toMessages === "function") toMessages();
        else navigation.goBack();
    };

    return (
        <View style={styles.header}>
            {/* Back pill — same as MessagesHeader */}
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={onBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.iconCircle, styles.leftIcon]}
            >
                <FontAwesome6 name="chevron-left" size={scaleSize(16)} color={ACCENT} />
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
                    <Text numberOfLines={1} style={styles.nameText}>{names}</Text>
                    <Text numberOfLines={1} style={styles.handleText}>{handles}</Text>
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
        top: scaleSize(10),
        left: scaleSize(20),
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: HAIRLINE,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
        zIndex: 10,
    },
    leftIcon: {},

    // leave space = left(20) + pill(32) + gutter(12)
    centerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
        paddingLeft: scaleSize(20 + 32 + 12),
    },

    pfpContainer: { width: scaleSize(48), height: scaleSize(48), marginRight: scaleSize(10), position: "relative" },
    pfp: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        position: "absolute",
        borderWidth: 2,
        borderColor: theme.bg,
        backgroundColor: theme.field,
    },
    pfpTL: { top: 1, left: 1 },
    pfpBR: { bottom: 1, right: 1 },
    pfpSingle: { width: scaleSize(42), height: scaleSize(42), borderRadius: scaleSize(21), backgroundColor: theme.field },
    pfpPh: { backgroundColor: theme.field },

    textWrap: { flex: 1, justifyContent: "center" },
    nameText: { fontFamily: "Nunito_700Bold", fontSize: scaleSize(16), color: theme.textPrimary},
    handleText: { fontFamily: "Nunito_700Bold", fontSize: scaleSize(12.5), color: theme.textSecondary, marginTop: 1 },
});

export default ChatHeader;
