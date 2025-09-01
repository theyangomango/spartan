// components/Tracking/Group/GroupModal.jsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import ProfileCard from "../../../ProfileCard";
import RNBounceable from "@freakycoder/react-native-bounceable";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

const GroupModal = ({ closeGroupModal, onInvite }) => {
    const followingUsers = Array.isArray(global?.userData?.following) ? global.userData.following : [];
    const [filteredUsers, setFilteredUsers] = useState(followingUsers);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(followingUsers);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredUsers(
                followingUsers.filter((user) =>
                    (user.handle || "").toLowerCase().includes(q) ||
                    (user.name || "").toLowerCase().includes(q)
                )
            );
        }
    }, [searchQuery, followingUsers]);

    const toggleUser = (user) => {
        setSelectedUsers((prev) =>
            prev.some((u) => u.uid === user.uid)
                ? prev.filter((u) => u.uid !== user.uid)
                : [...prev, user]
        );
    };

    const clearSearch = () => setSearchQuery("");

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.header}>
                <Text style={styles.modalText}>Invite to Workout</Text>
            </View>

            {/* Sleek search */}
            <View style={styles.searchContainer}>
                <Icon name="search" size={scaledSize(18)} color="#2A65D9" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by handle or name"
                    placeholderTextColor="#8AA0BF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={clearSearch} hitSlop={8}>
                        <Icon name="close-circle" size={scaledSize(18)} color="#9BB6E9" />
                    </Pressable>
                )}
            </View>

            <ScrollView style={styles.list}>
                {filteredUsers.map((user, idx) => (
                    <ProfileCard
                        key={user?.uid || idx}
                        user={user}
                        onSelect={toggleUser}
                        isSelected={selectedUsers.some((u) => u.uid === user.uid)}
                    />
                ))}
                <View style={{ height: scaledSize(110) }} />
            </ScrollView>

            <RNBounceable
                style={[styles.sendButton, { opacity: selectedUsers.length < 1 ? 0.5 : 1 }]}
                disabled={selectedUsers.length === 0}
                onPress={() => onInvite?.(selectedUsers)}
            >
                <Text style={styles.sendButtonText}>
                    {`Invite${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ""}`}
                </Text>
            </RNBounceable>
        </View>
    );
};

export default GroupModal;

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, alignItems: "center" },

    header: {
        height: scaledSize(48),
        paddingTop: scaledSize(16),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaledSize(10),
    },
    modalText: {
        fontFamily: "Nunito_800ExtraBold",
        fontSize: scaledSize(15),
        color: "#111",
        includeFontPadding: false,
        letterSpacing: 0.2,
    },

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F6FF",
        borderRadius: scaledSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#DBE9FF",
        width: "90%",
        paddingHorizontal: scaledSize(10),
        paddingVertical: scaledSize(6),
        marginBottom: scaledSize(10),
    },
    searchIcon: { marginRight: scaledSize(8) },
    searchBar: {
        flex: 1,
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(6),
        fontSize: scaledSize(14),
        color: "#233",
        fontFamily: "Nunito_600SemiBold",
        includeFontPadding: false,
    },

    list: { flex: 1, width: "100%" },

    sendButton: {
        position: "absolute",
        bottom: scaledSize(20),
        left: scaledSize(22),
        right: scaledSize(22),
        backgroundColor: "#59AAEE",
        borderRadius: scaledSize(16),
        paddingVertical: scaledSize(13),
        paddingHorizontal: scaledSize(30),
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    sendButtonText: {
        color: "#fff",
        fontSize: scaledSize(15),
        fontFamily: "Nunito_800ExtraBold",
        includeFontPadding: false,
        letterSpacing: 0.25,
    },
});
