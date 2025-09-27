// components/2_Competition/TribeMenu.jsx
import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Ionicons } from "@expo/vector-icons";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
const ts = require('../../helper/scaleSize').ts;

// Scaled sizes (baseline ~ iPhone 12/13: 390x844)
const MENU_WIDTH = scaleSize(260);
const MENU_RADIUS = scaleSize(14);
const MENU_PAD_V = scaleSize(10);
const MENU_PAD_H = scaleSize(10);

const BACKDROP_PT = scaleSize(60);
const BACKDROP_PR = scaleSize(12);

const FONT_TITLE = ts(15);
const FONT_SECTION = ts(12.5);
const FONT_EMPTY = ts(12.5);

const ITEM_PAD_V = scaleSize(10);
const ITEM_PAD_H = scaleSize(8);
const ITEM_RADIUS = scaleSize(10);
const ITEM_TEXT_ML = scaleSize(8);

const ICON_ITEM = scaleSize(18);
const ICON_CHECK = scaleSize(16);

const TribeMenu = ({
    visible,
    tribes = [],
    selectedTribeId,
    scope,                // "Global", "Following", and tribe scopes
    onClose,
    onSelectGlobal,
    onSelectFollowing,    // NEW (renamed from onSelectFollowers)
    onSelectTribe,
    onCreatePress,
    onJoinPress,
}) => {
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
                <Pressable style={StyleSheet.absoluteFill} onPress={withStrongPress(onClose)} />

                {/* CARD */}
                <View style={styles.menuCard}>
                    <Text style={styles.menuTitle}>Tribes</Text>

                    {/* Global */}
                    <RNBounceable style={styles.menuItem} onPress={withStrongPress(onSelectGlobal)}>
                        <Ionicons name="earth-outline" size={ICON_ITEM} color="#EAEAEA" />
                        <Text style={styles.menuItemText}>Global</Text>
                        {!selectedTribeId && scope === "Global" && (
                            <Ionicons name="checkmark" size={ICON_CHECK} color="#2D9EFF" style={{ marginLeft: "auto" }} />
                        )}
                    </RNBounceable>

                    {/* Following */}
                    <RNBounceable style={styles.menuItem} onPress={withStrongPress(onSelectFollowing)}>
                        <Ionicons name="people-outline" size={ICON_ITEM} color="#EAEAEA" />
                        <Text style={styles.menuItemText}>Following</Text>
                        {!selectedTribeId && scope === "Following" && (
                            <Ionicons name="checkmark" size={ICON_CHECK} color="#2D9EFF" style={{ marginLeft: "auto" }} />
                        )}
                    </RNBounceable>

                    <View style={styles.menuDivider} />

                    <Text style={styles.menuSectionHeader}>My Tribes</Text>
                    {tribes.length === 0 && <Text style={styles.menuEmpty}>No tribes yet</Text>}

                    {tribes.map((t) => (
                        <RNBounceable
                            key={t.id}
                            style={styles.menuItem}
                            onPress={withStrongPress(() => onSelectTribe?.(t.id))}
                        >
                            <Ionicons name="people-circle-outline" size={ICON_ITEM} color="#EAEAEA" />
                            <Text style={styles.menuItemText}>{t.name}</Text>
                            {selectedTribeId === t.id && (
                                <Ionicons name="checkmark" size={ICON_CHECK} color="#2D9EFF" style={{ marginLeft: "auto" }} />
                            )}
                        </RNBounceable>
                    ))}

                    <View style={styles.menuDivider} />

                    <RNBounceable style={styles.menuItem} onPress={withStrongPress(onCreatePress)}>
                        <Ionicons name="add-circle-outline" size={ICON_ITEM} color="#EAEAEA" />
                        <Text style={styles.menuItemText}>Create tribe</Text>
                    </RNBounceable>

                    <RNBounceable style={styles.menuItem} onPress={withStrongPress(onJoinPress)}>
                        <Ionicons name="log-in-outline" size={ICON_ITEM} color="#EAEAEA" />
                        <Text style={styles.menuItemText}>Join by code</Text>
                    </RNBounceable>
                </View>
            </View>
        </Modal>
    );
};

export default TribeMenu;

const styles = StyleSheet.create({
    menuBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        paddingTop: BACKDROP_PT, // below header
        paddingRight: BACKDROP_PR,
        alignItems: "flex-end",
    },
    menuCard: {
        width: MENU_WIDTH,
        backgroundColor: require("../../theme/mfpDark").default.surface,
        borderRadius: MENU_RADIUS,
        paddingVertical: MENU_PAD_V,
        paddingHorizontal: MENU_PAD_H,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 6,
    },
    menuTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(FONT_TITLE),
        color: "#EAEAEA",
        marginBottom: scaleSize(6),
        paddingHorizontal: scaleSize(4),
    },
    menuSectionHeader: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(FONT_SECTION),
        color: "#AEB5C0",
        paddingHorizontal: scaleSize(6),
        marginTop: scaleSize(6),
        marginBottom: scaleSize(4),
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: ITEM_PAD_V,
        paddingHorizontal: ITEM_PAD_H,
        borderRadius: ITEM_RADIUS,
    },
    menuItemText: {
        fontFamily: "Outfit_600SemiBold",
        color: "#EAEAEA",
        marginLeft: ITEM_TEXT_ML,
    },
    menuEmpty: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(FONT_EMPTY),
        color: "#AEB5C0",
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(6),
    },
    menuDivider: {
        height: scaleSize(1),
        backgroundColor: "rgba(255,255,255,0.08)",
        marginVertical: scaleSize(8),
    },
});
