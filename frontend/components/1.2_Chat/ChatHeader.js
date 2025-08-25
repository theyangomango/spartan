import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { FontAwesome6 } from "@expo/vector-icons";
import { usePfp } from "../../helper/usePFPs";

const ChatHeader = ({ usersExcludingSelf = [], toMessages }) => {
    const handles = usersExcludingSelf.map((u) => u.handle).join(", ");
    const names = usersExcludingSelf.map((u) => u.name).join(", ");
    const u0 = usersExcludingSelf[0];
    const u1 = usersExcludingSelf[1];
    const p0 = u0 ? usePfp(u0.uid, u0.pfpVersion ?? 0) : null;
    const p1 = u1 ? usePfp(u1.uid, u1.pfpVersion ?? 0) : null;

    return (
        <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.7} onPress={toMessages} style={styles.backBtn}>
                <FontAwesome6 name="chevron-left" size={18} color="#2D9EFF" />
            </TouchableOpacity>

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
                    {names}
                </Text>
                <Text numberOfLines={1} style={styles.handleText}>
                    {handles}
                </Text>
            </View>

            <View style={{ width: 16 }} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#ffffffff",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        height: 64, // fixed, plus outer safe-area padding from screen
        borderBottomColor: "rgba(15,23,42,0.06)",
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { padding: 8, marginRight: 6 },
    pfpContainer: { width: 48, height: 48, marginRight: 10, position: "relative" },
    pfp: {
        width: 34,
        height: 34,
        borderRadius: 17,
        position: "absolute",
        borderWidth: 2,
        borderColor: "#fff",
    },
    pfpTL: { top: 1, left: 1 },
    pfpBR: { bottom: 1, right: 1 },
    pfpSingle: { width: 42, height: 42, borderRadius: 21 },
    pfpPh: { backgroundColor: "#EAEAEA" },
    textWrap: { flex: 1, justifyContent: "center" },
    nameText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#0F172A" },
    handleText: {
        fontFamily: "Poppins_500Medium",
        fontSize: 12.5,
        color: "#7C889A",
        marginTop: 1,
    },
});

export default ChatHeader;
