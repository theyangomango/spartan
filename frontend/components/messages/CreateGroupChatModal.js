import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Dimensions, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';

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

    const handleSelectUser = (user) => {
        const newSelectedUsers = selectedUsers.includes(user.uid)
            ? selectedUsers.filter(uid => uid !== user.uid)
            : [...selectedUsers, user.uid];

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
            <Pressable style={styles.itemContainer} onPress={() => handleSelectUser(item)}>
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
                numColumns={3}
                contentContainerStyle={styles.flatlistContainer}
            />
            <TouchableOpacity
                activeOpacity={0.5}
                style={[styles.sendButton, { opacity: selectedUsers.length < 2 ? 0.5 : 1 }]}
                disabled={selectedUsers.length === 0}
            >
                <Text style={styles.sendButtonText}>
                    {`Create Group Chat${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
                </Text>
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
        bottom: 38,
        left: 22,
        right: 22,
        backgroundColor: '#67B0FF',
        borderRadius: 20,
        paddingVertical: 18,
        alignItems: 'center'
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Mulish_800ExtraBold',
        letterSpacing: 0.08
    },
});
