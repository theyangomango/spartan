import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, FlatList, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Feather } from "@expo/vector-icons"; // switched to Feather for a sleeker icon
import ParticipantRow from "./ParticipantRow";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

const GroupMenu = ({ visible, onClose, participants, viewing, onInvite, onSelectParticipant }) => {
    return (
        <Modal
            visible={visible}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={onClose}
            presentationStyle="overFullScreen"
        >
            <View style={styles.menuBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.menuCard}>
                    <Text style={styles.menuTitle}>Workout Group</Text>

                    <RNBounceable style={styles.menuItem} onPress={onInvite} activeScale={0.98}>
                        <Feather name="user-plus" size={18} color="#333" />
                        <Text style={styles.menuItemText}>Invite people</Text>
                    </RNBounceable>

                    <View style={styles.menuDivider} />

                    <Text style={styles.menuSectionHeader}>Participants</Text>
                    {participants.length === 0 ? (
                        <Text style={styles.menuEmpty}>No participants yet</Text>
                    ) : (
                        <FlatList
                            data={participants}
                            keyExtractor={(it) => it.uid}
                            renderItem={({ item }) => (
                                <ParticipantRow participant={item} selectedUid={viewing?.uid} />
                            )}
                            ItemSeparatorComponent={() => <View style={styles.menuHairline} />}
                            style={{ maxHeight: scaledSize(260) }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default GroupMenu;

const styles = StyleSheet.create({
    menuBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.15)",
        paddingTop: scaledSize(70),
        paddingRight: scaledSize(12),
        alignItems: "flex-end",
    },
    menuCard: {
        width: scaledSize(270),
        backgroundColor: "#fff",
        borderRadius: scaledSize(14),
        paddingVertical: scaledSize(10),
        paddingHorizontal: scaledSize(10),
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    menuTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(16),
        color: "#111",
        marginBottom: scaledSize(6),
        paddingHorizontal: scaledSize(4),
    },

    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaledSize(10),
        paddingHorizontal: scaledSize(8),
        borderRadius: scaledSize(10),
    },
    menuItemText: {
        fontFamily: "Outfit_600SemiBold",
        color: "#222",
        marginLeft: scaledSize(8),
        flexShrink: 1,
    },

    menuDivider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: scaledSize(8),
    },
    menuSectionHeader: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaledSize(12.5),
        color: "#666",
        paddingHorizontal: scaledSize(6),
        marginTop: scaledSize(6),
        marginBottom: scaledSize(4),
    },
    menuEmpty: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaledSize(12.5),
        color: "#999",
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(6),
    },
    menuHairline: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#EEF2F7",
        marginLeft: scaledSize(50),
    },
});
