import React from "react";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { StyleSheet, View, Text } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";

export default function ProfileRowButtons({ handleEditProfile, handleOpenViewStats }) {
    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex} onPress={withStrongPress(handleEditProfile)}>
                <View style={[styles.button, styles.flex]}>
                    <Text style={styles.edit_profile_text}>Edit Profile</Text>
                </View>
            </RNBounceable>

            <RNBounceable style={styles.flex} onPress={withStrongPress(handleOpenViewStats)}>
                <View style={[styles.button, styles.flex]}>
                    <Text style={styles.edit_profile_text}>View Stats</Text>
                </View>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        marginTop: scaleSize(12),
        flexDirection: "row",
        gap: scaleSize(8),
        height: scaleSize(36),
    },
    flex: {
        flex: 1,
    },
    button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(12),
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        justifyContent: "center",
        alignItems: "center",
    },
    edit_profile_text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        color: '#E5E7EB',
    },
});
