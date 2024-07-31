import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProfilePicture from './ProfilePicture';
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
            <ProfilePicture
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
                numColumns={3}
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

const { width } = Dimensions.get('window');
const ITEM_MARGIN = 5;
const ITEM_WIDTH = (width - ITEM_MARGIN * 6) / 3; // Adjusting margin calculation

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingTop: 5,
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
        backgroundColor: '#e0e0e0',
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
        paddingHorizontal: ITEM_MARGIN, // Adjust horizontal padding
    },
    sendButton: {
        position: 'absolute',
        bottom: 40,
        left: 25,
        right: 25,
        backgroundColor: '#2D9EFF',
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Mulish_800ExtraBold'
    },
});
