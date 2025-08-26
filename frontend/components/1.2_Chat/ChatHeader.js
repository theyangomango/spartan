// components/1.2_Chat/ChatHeader.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { FontAwesome6 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { usePfp } from "../../helper/usePFPs";
import scaleSize from "../../helper/scaleSize";

const ACCENT = "#2D9EFF";
const HAIRLINE = "rgba(15, 23, 42, 0.03)";
const BG = "#ffffff";

const ChatHeader = ({ usersExcludingSelf = [], toMessages }) => {
    const navigation = useNavigation();
    const handles = usersExcludingSelf.map((u) => u.handle).join(", ");
    const names = usersExcludingSelf.map((u) => u.name).join(", ");
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
        borderBottomWidth: 1.5,
    },

    // exact pill spec + ensure it’s on top
    iconCircle: {
        position: "absolute",
        top: scaleSize(10),
        left: scaleSize(20),
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: HAIRLINE,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
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
        borderColor: "#fff",
        backgroundColor: "#EEE",
    },
    pfpTL: { top: 1, left: 1 },
    pfpBR: { bottom: 1, right: 1 },
    pfpSingle: { width: scaleSize(42), height: scaleSize(42), borderRadius: scaleSize(21), backgroundColor: "#EEE" },
    pfpPh: { backgroundColor: "#EAEAEA" },

    textWrap: { flex: 1, justifyContent: "center" },
    nameText: { fontFamily: "Poppins_600SemiBold", fontSize: scaleSize(16.5), color: "#0F172A", letterSpacing: 0.2 },
    handleText: { fontFamily: "Poppins_500Medium", fontSize: scaleSize(12.5), color: "#7C889A", marginTop: 1 },
});

export default ChatHeader;
