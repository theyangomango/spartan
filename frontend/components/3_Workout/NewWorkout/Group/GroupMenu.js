// components/Tracking/Group/GroupMenu.jsx
import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, FlatList, Dimensions } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Feather } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import theme from "../../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get("window");
const scaledSize = (size) => scaleSize(size);

const ParticipantItem = ({ participant, selected, onPress }) => {
    const uri = participant?.pfp || participant?.image || participant?.photoURL || participant?.avatar || "";
    return (
        <Pressable onPress={onPress} style={styles.participantRow}>
            <View style={styles.participantPfpWrap}>
                {uri ? (
                    <FastImage
                        source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                        style={styles.participantPfp}
                    />
                ) : (
                    <View style={[styles.participantPfp, { backgroundColor: "#E5E7EB" }]} />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.participantHandle}>
                    {participant?.handle ? `@${participant.handle}` : participant?.name || "Friend"}
                </Text>
                {!!participant?.name && participant?.handle && (
                    <Text numberOfLines={1} style={styles.participantSub}>
                        {participant?.name}
                    </Text>
                )}
            </View>
            {selected && <Feather name="check" size={16} color="#10B981" />}
        </Pressable>
    );
};

const GroupMenu = ({ visible, onClose, participants = [], viewing, onInvite, onSelectParticipant }) => {
    const selectedUid = viewing?.uid || null;

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
                        <Feather name="user-plus" size={18} color={theme.textPrimary} />
                        <Text style={styles.menuItemText}>Invite people</Text>
                    </RNBounceable>

                    <View style={styles.menuDivider} />

                    <Text style={styles.menuSectionHeader}>Participants</Text>
                    {participants.length === 0 ? (
                        <Text style={styles.menuEmpty}>No participants yet</Text>
                    ) : (
                        <FlatList
                            data={participants}
                            keyExtractor={(it) => String(it?.uid)}
                            renderItem={({ item }) => (
                                <ParticipantItem
                                    participant={item}
                                    selected={selectedUid === item?.uid}
                                    onPress={() => onSelectParticipant?.(item)}
                                />
                            )}
                            ItemSeparatorComponent={() => <View style={styles.menuHairline} />}
                            style={{ maxHeight: scaleSize(scaledSize(260)) }}
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
        paddingTop: scaleSize(scaledSize(70)),
        paddingRight: scaleSize(scaledSize(12)),
        alignItems: "flex-end",
    },
    menuCard: {
        width: scaleSize(scaledSize(300)),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(scaledSize(14)),
        paddingVertical: scaleSize(scaledSize(10)),
        paddingHorizontal: scaleSize(scaledSize(10)),
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 6,
    },
    menuTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(scaledSize(6)),
        paddingHorizontal: scaleSize(scaledSize(4)),
    },

    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(scaledSize(10)),
        paddingHorizontal: scaleSize(scaledSize(8)),
        borderRadius: scaleSize(scaledSize(10)),
    },
    menuItemText: {
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
        marginLeft: scaleSize(scaledSize(8)),
        flexShrink: 1,
    },

    menuDivider: {
        height: scaleSize(1),
        backgroundColor: theme.hairline,
        marginVertical: scaleSize(scaledSize(8)),
    },
    menuSectionHeader: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: theme.textSecondary,
        paddingHorizontal: scaleSize(scaledSize(6)),
        marginTop: scaleSize(scaledSize(6)),
        marginBottom: scaleSize(scaledSize(4)),
    },
    menuEmpty: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        color: theme.textSecondary,
        paddingHorizontal: scaleSize(scaledSize(8)),
        paddingVertical: scaleSize(scaledSize(6)),
    },
    menuHairline: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.hairline,
        marginLeft: scaleSize(scaledSize(50)),
    },

    participantRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(6)),
    },
    participantPfpWrap: {
        width: scaleSize(scaledSize(30)),
        height: scaleSize(scaledSize(30)),
        borderRadius: scaleSize(scaledSize(15)),
        overflow: "hidden",
        marginRight: scaleSize(scaledSize(10)),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
    },
    participantPfp: { width: "100%", height: "100%" },
    participantHandle: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(13.5), color: theme.textPrimary },
    participantSub: { fontFamily: "Outfit_500Medium", fontSize: scaleSize(11.5), color: theme.textSecondary, marginTop: scaleSize(1) },
});
