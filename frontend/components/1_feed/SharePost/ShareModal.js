import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from '../../ProfileCard';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function ShareModal({ closeBottomSheet }) {
    const [followingUsers, setFollowingUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

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
        setSelectedUsers(prevSelectedUsers =>
            prevSelectedUsers.includes(userUid)
                ? prevSelectedUsers.filter(uid => uid !== userUid)
                : [...prevSelectedUsers, userUid]
        );
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

    function handlePressSend() {
        closeBottomSheet();
        setSelectedUsers([]);
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchBar}
                        placeholder="Search"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
            <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.uid}
                numColumns={1} // Set to 1 for vertical list
                contentContainerStyle={styles.flatlistContainer}
            />
            <RNBounceable
                activeOpacity={0.5}
                style={[styles.sendButton]}
                disabled={selectedUsers.length === 0}
                onPress={handlePressSend}
            >
                <Text style={styles.sendButtonText}>Share</Text>
            </RNBounceable>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingTop: 5,
        backgroundColor: '#fff'
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 5,
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        width: '100%',
        paddingHorizontal: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchBar: {
        flex: 1,
        padding: 8,
    },
    flatlistContainer: {
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
        fontSize: 15.5,
        fontFamily: 'Poppins_600SemiBold'
    },
});

