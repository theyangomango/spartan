import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Keyboard, ScrollView, Pressable, Dimensions } from "react-native";
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from "../../../ProfileCard";
import RNBounceable from '@freakycoder/react-native-bounceable';

const GroupModal = ({ closeGroupModal }) => {
    const followingUsers = global.userData.following;
    const [filteredUsers, setFilteredUsers] = useState(global.userData.following);

    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedHandles, setSelectedHandles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (searchQuery === '') {
            setFilteredUsers(followingUsers);
        } else {
            setFilteredUsers(
                followingUsers.filter(user =>
                    user.handle.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, followingUsers]);

    const handleSelectUser = (userUid) => {
        const newSelectedUsers = selectedUsers.includes(userUid)
            ? selectedUsers.filter(uid => uid !== userUid)
            : [...selectedUsers, userUid];

        setSelectedUsers(newSelectedUsers);

        const newHandles = newSelectedUsers.map(uid => {
            const selectedUser = followingUsers.find(u => u.uid === uid);
            return selectedUser ? selectedUser.handle : '';
        });

        setSelectedHandles(newHandles);
    };

    const handleOutsidePress = () => {
        closeGroupModal();
    };

    const renderItem = ({ item, index }) => {
        const isSelected = selectedUsers.includes(item.uid);
        return (
            <ProfileCard
                user={item}
                onSelect={handleSelectUser}
                isSelected={isSelected}
                key={index}
            />
        );
    };

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.header}>
                {selectedHandles.length === 0 ? (
                    <Text style={styles.modalText}>Invite to Workout</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedHandlesContainer}>
                        <View style={{ width: 20 }} />
                        {selectedHandles.map((handle, index) => (
                            <Pressable key={index}>
                                <View style={styles.selectedHandleView}>
                                    <Text style={styles.selectedHandleText}>{handle}</Text>
                                </View>
                            </Pressable>
                        ))}
                        <View style={{ width: 5 }} />
                    </ScrollView>
                )}
            </View>
            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <ScrollView style={styles.flatlistContainer}>
                {filteredUsers.slice(0, 9).map((user, index) => renderItem({ item: user, index }))}
            </ScrollView>
            <RNBounceable
                style={[styles.sendButton, { opacity: selectedUsers.length <= 1 ? 0.5 : 1 }]}
                disabled={selectedUsers.length <= 1}
            >
                <Text style={styles.sendButtonText}>
                    {`Invite${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
                </Text>
            </RNBounceable>
        </View>
    );
};

export default GroupModal;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
    },
    header: {
        height: 45,
        paddingTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    modalText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
    },
    selectedHandlesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedHandleView: {
        backgroundColor: '#E1F0FF',
        paddingHorizontal: 10.5,
        height: 29,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 5,
    },
    selectedHandleText: {
        color: '#0499FE',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        width: '90%',
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchBar: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    flatlistContainer: {
        flex: 1,
        width: '100%',
    },
    sendButton: {
        position: 'absolute',
        bottom: 45,
        left: 22,
        right: 22,
        backgroundColor: '#2D9EFF',
        borderRadius: 15,
        paddingVertical: 13,
        paddingHorizontal: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
});
