import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";

export default function ButtonRow({
    buttons,
    selectedButton,
    setSelectedButton,
    newLikes,
    newComments,
}) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {buttons.map((button) => {
                    const isSelected = selectedButton === button;
                    return (
                        <RNBounceable
                            key={button}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => setSelectedButton(button)}
                        >
                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                {button}
                            </Text>

                            {button === "Likes" && newLikes > 0 && (
                                <View style={styles.badgeWrap}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{newLikes}</Text>
                                    </View>
                                </View>
                            )}

                            {button === "Comments" && newComments > 0 && (
                                <View style={styles.badgeWrap}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{newComments}</Text>
                                    </View>
                                </View>
                            )}
                        </RNBounceable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    row: {
        paddingTop: scaleSize(24),
        paddingBottom: scaleSize(10),
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
    },

    chip: {
        backgroundColor: "#FFFFFF",
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(18),
        marginRight: scaleSize(8),
        position: "relative",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
    },
    chipSelected: {
        backgroundColor: "#0F172A",
        borderColor: "rgba(255,255,255,0.12)",
        shadowOpacity: 0.12,
        elevation: 2,
    },
    chipText: {
        color: "#0F172A",
        fontSize: scaleSize(13),
        fontFamily: "Outfit_600SemiBold",
    },
    chipTextSelected: {
        color: "#FFFFFF",
    },

    badgeWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        top: scaleSize(-12),
        alignItems: "center",
    },
    badge: {
        backgroundColor: "#FF387E",
        borderRadius: scaleSize(9),
        paddingHorizontal: scaleSize(7),
        paddingVertical: scaleSize(4),
        shadowColor: "#FF387E",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 3,
    },
    badgeText: {
        color: "#fff",
        fontSize: scaleSize(10),
        fontFamily: "Outfit_600SemiBold",
    },
});
