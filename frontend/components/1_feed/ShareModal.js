import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';

export default function ShareModal() {
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
            <Pressable style={styles.itemContainer} onPress={() => handleSelectUser(item.uid)}>
                <View style={[styles.pfp_ctnr, { opacity: isSelected ? 1 : 0.7 }]}>
                    <FastImage 
                        source={{ uri: item.pfp }} 
                        style={styles.pfp} 
                        resizeMode={FastImage.resizeMode.cover} 
                    />
                </View>
                <Text style={styles.handle_text}>{item.handle}</Text>
            </Pressable>
        );
    };

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
            <TouchableOpacity 
                activeOpacity={0.5}
                style={[styles.sendButton, { opacity: selectedUsers.length === 0 ? 0.5 : 1 }]}
                disabled={selectedUsers.length === 0}
            >
                <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
        </View>
    );
}

const { width } = Dimensions.get('window');
const ITEM_MARGIN = 5;
const ITEM_WIDTH = (width - ITEM_MARGIN * 6) / 3; // Adjusting margin calculation

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
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
    itemContainer: {
        width: ITEM_WIDTH,
        alignItems: 'center',
        marginHorizontal: ITEM_MARGIN / 2,
        marginVertical: 11,
    },
    pfp_ctnr: {
        width: 78,
        aspectRatio: 1,
        borderRadius: 40,
        backgroundColor: 'gray',
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    handle_text: {
        marginTop: 8,
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#555'
    },
    sendButton: {
        position: 'absolute',
        bottom: 35,
        right: 25,
        backgroundColor: '#2D9EFF',
        borderRadius: 25,
        paddingVertical: 15,
        paddingHorizontal: 30,
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Mulish_700Bold'
    },
});
