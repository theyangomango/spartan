import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Ionicons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

// Shared selection context lives in the hook; tapping a row updates `viewing` via side effect:
// We keep this row purely visual + event dispatch through a custom event on the window.
// (Keeps things decoupled without prop drilling.)
const ParticipantRow = ({ participant, selectedUid }) => {
    const selected = selectedUid === participant.uid;

    const onPress = () => {
        // Broadcast to hook via a lightweight event
        // Consumers listen and update viewing.
        try {
            const ev = new CustomEvent("workout_viewing_select", { detail: participant });
            // Some RN envs don't have window.CustomEvent; fallback:
            if (typeof window?.dispatchEvent === "function") {
                window.dispatchEvent(ev);
            } else {
                // fallback: attach global
                global.__workoutViewingSelect = participant;
            }
        } catch {
            global.__workoutViewingSelect = participant;
        }
    };

    return (
        <RNBounceable onPress={onPress} style={[styles.menuItem, selected && styles.menuItemSelected]} activeScale={0.98}>
            <FastImage
                source={
                    participant.image
                        ? { uri: participant.image, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }
                        : undefined
                }
                style={styles.menuPfp}
            />
            <Text style={[styles.menuItemText, selected && styles.menuItemTextSelected]} numberOfLines={1}>
                @{participant.handle || participant.uid?.slice(0, 6)}
            </Text>
            {selected && <Ionicons name="checkmark" size={16} color="#2D9EFF" style={{ marginLeft: "auto" }} />}
        </RNBounceable>
    );
};

export default ParticipantRow;

const styles = StyleSheet.create({
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaledSize(10),
        paddingHorizontal: scaledSize(8),
        borderRadius: scaledSize(10),
    },
    menuItemSelected: { backgroundColor: "#F7FAFF" },
    menuItemText: {
        fontFamily: "Outfit_600SemiBold",
        color: "#222",
        marginLeft: scaledSize(8),
        flexShrink: 1,
    },
    menuItemTextSelected: { color: "#2D9EFF" },
    menuPfp: {
        width: scaledSize(28),
        height: scaledSize(28),
        borderRadius: scaledSize(14),
        backgroundColor: "#EEE",
        marginRight: scaledSize(10),
    },
});
