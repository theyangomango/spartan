import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Dimensions, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from '../ProfileCard';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function CreateGroupChatModal() {
    const [followingUsers, setFollowingUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedHandles, setSelectedHandles] = useState([]);

    useEffect(() => {
        if (global.userData) {
            setFollowingUsers(global.userData.following);
            setFilteredUsers(global.userData.following);
        }
    }, [global.userData]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

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

    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.includes(item.uid);
        return (
            <ProfileCard
                user={item}
                onSelect={handleSelectUser}
                isSelected={isSelected}
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {selectedHandles.length === 0 ? (
                    <Text style={styles.modalText}>Add Friends</Text>
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
            <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.uid}
                style={styles.flatlistContainer}
            />
            <RNBounceable
                style={[styles.sendButton]}
                disabled={selectedUsers.length <= 1}
            >
                <Text style={styles.sendButtonText}>
                    {`Create Group Chat${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
                </Text>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center'
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
        marginRight: 5
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
        // flex: 1,
        padding: 8,
    },
    flatlistContainer: {
        // flex: 1,
        width: '100%'
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
        justifyContent: 'center'
    },
    sendButtonText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold'
    },
});

