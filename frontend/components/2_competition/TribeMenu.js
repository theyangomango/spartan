// components/2_Competition/TribeMenu.jsx
import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Ionicons } from "@expo/vector-icons";

const TribeMenu = ({
    visible,
    tribes,
    selectedTribeId,
    scope,                // "Global" | "All Followers"
    onClose,
    onSelectGlobal,
    onSelectFollowers,    // NEW
    onSelectTribe,
    onCreatePress,
    onJoinPress,
    onManagePress,
}) => {
    const current = tribes.find((t) => t.id === selectedTribeId);

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
                {/* BACKDROP CLICK TARGET */}
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                {/* CARD */}
                <View style={styles.menuCard}>
                    <Text style={styles.menuTitle}>Tribes</Text>

                    {/* Global */}
                    <RNBounceable style={styles.menuItem} onPress={onSelectGlobal}>
                        <Ionicons name="globe-outline" size={18} color="#333" />
                        <Text style={styles.menuItemText}>All (Global)</Text>
                        {!selectedTribeId && scope === "Global" && (
                            <Ionicons name="checkmark" size={16} color="#2D9EFF" style={{ marginLeft: "auto" }} />
                        )}
                    </RNBounceable>

                    {/* Followers (under Global) */}
                    <RNBounceable style={styles.menuItem} onPress={onSelectFollowers}>
                        <Ionicons name="people-outline" size={18} color="#333" />
                        <Text style={styles.menuItemText}>Following</Text>
                        {!selectedTribeId && scope === "All Followers" && (
                            <Ionicons name="checkmark" size={16} color="#2D9EFF" style={{ marginLeft: "auto" }} />
                        )}
                    </RNBounceable>

                    <View style={styles.menuDivider} />

                    <Text style={styles.menuSectionHeader}>My Tribes</Text>
                    {tribes.length === 0 && <Text style={styles.menuEmpty}>No tribes yet</Text>}

                    {tribes.map((t) => (
                        <RNBounceable
                            key={t.id}
                            style={styles.menuItem}
                            onPress={() => onSelectTribe?.(t.id)}
                        >
                            <Ionicons name="people-circle-outline" size={18} color="#333" />
                            <Text style={styles.menuItemText}>{t.name}</Text>
                            {selectedTribeId === t.id && (
                                <Ionicons name="checkmark" size={16} color="#2D9EFF" style={{ marginLeft: "auto" }} />
                            )}
                        </RNBounceable>
                    ))}

                    <View style={styles.menuDivider} />

                    <RNBounceable style={styles.menuItem} onPress={onCreatePress}>
                        <Ionicons name="add-circle-outline" size={18} color="#333" />
                        <Text style={styles.menuItemText}>Create tribe</Text>
                    </RNBounceable>

                    <RNBounceable style={styles.menuItem} onPress={onJoinPress}>
                        <Ionicons name="log-in-outline" size={18} color="#333" />
                        <Text style={styles.menuItemText}>Join by code</Text>
                    </RNBounceable>

                    {!!current && (
                        <>
                            <View style={styles.menuDivider} />
                            <RNBounceable style={styles.menuItem} onPress={onManagePress}>
                                <Ionicons name="settings-outline" size={18} color="#333" />
                                <Text style={styles.menuItemText}>Manage current tribe</Text>
                            </RNBounceable>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default TribeMenu;

const styles = StyleSheet.create({
    menuBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.15)",
        paddingTop: 60, // below header
        paddingRight: 12,
        alignItems: "flex-end",
    },
    menuCard: {
        width: 260,
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 10,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    menuTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 16,
        color: "#111",
        marginBottom: 6,
        paddingHorizontal: 4,
    },
    menuSectionHeader: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12.5,
        color: "#666",
        paddingHorizontal: 6,
        marginTop: 6,
        marginBottom: 4,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    menuItemText: {
        fontFamily: "Outfit_600SemiBold",
        color: "#222",
        marginLeft: 8,
    },
    menuEmpty: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12.5,
        color: "#999",
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    menuDivider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 8,
    },
});
