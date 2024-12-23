/**
 * Top Button Row across the Notifications Modal
 * Contains "All Activity", "Likes", "Comments", "Mensions" as filters
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";

export default function ButtonRow({ buttons, selectedButton, setSelectedButton, newLikes, newComments }) {
    return (
        <View style={styles.buttonRowContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.buttonRow}
            >
                {buttons.map((button) => (
                    <RNBounceable
                        key={button}
                        style={[
                            styles.button,
                            selectedButton === button && styles.selectedButton,
                        ]}
                        onPress={() => setSelectedButton(button)}
                    >
                        <Text
                            style={[
                                styles.buttonText,
                                selectedButton === button && styles.selectedButtonText,
                            ]}
                        >
                            {button}
                        </Text>

                        {/* Badge for new 'Likes' */}
                        {button === "Likes" && newLikes > 0 && (
                            <View style={styles.badgeContainer}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{newLikes}</Text>
                                </View>
                            </View>
                        )}

                        {/* Badge for new 'Comments' */}
                        {button === "Comments" && newComments > 0 && (
                            <View style={styles.badgeContainer}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{newComments}</Text>
                                </View>
                            </View>
                        )}
                    </RNBounceable>
                ))}
            </ScrollView>
        </View>
    );
}

// 2. Convert your dimension logic to scaleSize
const styles = StyleSheet.create({
    buttonRowContainer: {},
    buttonRow: {
        paddingTop: scaleSize(30),
        paddingBottom: scaleSize(9),
        alignItems: "center",
        paddingHorizontal: scaleSize(15),
    },
    button: {
        backgroundColor: "#f3f3f3",
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(20),
        marginRight: scaleSize(8),
        position: "relative",
    },
    selectedButton: {
        backgroundColor: "#000",
    },
    buttonText: {
        color: "#000",
        fontSize: scaleSize(13),
        fontFamily: "Outfit_600SemiBold",
    },
    selectedButtonText: {
        color: "#fff",
    },
    badgeContainer: {
        position: "absolute",
        alignItems: "center",
        left: 0,
        right: 0,
        top: scaleSize(-12),
    },
    badge: {
        backgroundColor: "#FF387E",
        borderRadius: scaleSize(10),
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(5),
    },
    badgeText: {
        color: "#fff",
        fontSize: scaleSize(10),
        fontFamily: "Outfit_600SemiBold",
    },
});
