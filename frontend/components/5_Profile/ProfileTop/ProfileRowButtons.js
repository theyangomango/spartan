import React from "react";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import theme from "../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844; // iPhone 13 baseline
const scaledSize = (size) => Math.round(size * scale);

export default function ProfileRowButtons({ handleOpenEditProfile, handleOpenViewStats }) {
    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex} onPress={handleOpenEditProfile}>
                <View style={[styles.button, styles.flex]}>
                    <Text style={styles.edit_profile_text}>Edit Profile</Text>
                </View>
            </RNBounceable>

            {/* ✅ Enable View Stats and remove disabled/opacity */}
            <RNBounceable style={styles.flex} onPress={handleOpenViewStats}>
                <View style={[styles.button, styles.flex]}>
                    <Text style={styles.edit_profile_text}>View Stats</Text>
                </View>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        marginHorizontal: scaledSize(5),
        marginTop: scaledSize(10),
        flexDirection: "row",
        justifyContent: "space-around",
        height: scaledSize(32),
    },
    flex: {
        flex: 1,
    },
    button: {
        paddingHorizontal: scaledSize(20),
        paddingVertical: scaledSize(7),
        borderRadius: scaledSize(10),
        backgroundColor: '#3A4257',
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: scaledSize(3),
    },
    edit_profile_text: {
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaledSize(12.5),
        color: '#E5E7EB',
    },
});
