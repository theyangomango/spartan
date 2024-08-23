import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from '../ProfileCard';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width, height } = Dimensions.get('window');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            modalTextFontSize: 16,
            searchBarFontSize: 15,
            createButtonTextFontSize: 16,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            modalTextFontSize: 15,
            searchBarFontSize: 14.5,
            createButtonTextFontSize: 15,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            modalTextFontSize: 14.5,
            searchBarFontSize: 14,
            createButtonTextFontSize: 14.5,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            modalTextFontSize: 14,
            searchBarFontSize: 13.5,
            createButtonTextFontSize: 14,
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function CreateGroupChatModal({ createGroupChat }) {
    const [followingUsers, setFollowingUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedHandles, setSelectedHandles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => {
        if (global.userData) {
            setFollowingUsers(global.userData.following);
            setFilteredUsers(global.userData.following);
        }
    }, [global.userData]);

    useEffect(() => {
        setFilteredUsers(
            searchQuery === ''
                ? followingUsers
                : followingUsers.filter(user =>
                    user.handle.toLowerCase().includes(searchQuery.toLowerCase())
                )
        );
    }, [searchQuery, followingUsers]);

    const handleSelectUser = (user) => {
        const newSelectedUsers = selectedUsers.includes(user)
            ? selectedUsers.filter(u => u.uid !== user.uid)
            : [...selectedUsers, user];

        setSelectedUsers(newSelectedUsers);

        const newHandles = newSelectedUsers.map(user => {
            return user ? user.handle : '';
        });

        setSelectedHandles(newHandles);
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.includes(item);
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
                    <Text style={[styles.modalText, { fontSize: dynamicStyles.modalTextFontSize }]}>Add Friends</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedHandlesContainer}>
                        <View style={{ width: 20 }} />
                        {selectedHandles.map((handle, index) => (
                            <Pressable key={index}>
                                <View style={styles.selectedHandleView}>
                                    <Text style={[styles.selectedHandleText, { fontSize: dynamicStyles.modalTextFontSize }]}>{handle}</Text>
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
                    style={[styles.searchBar, { fontSize: dynamicStyles.searchBarFontSize }]}
                    placeholder="Search"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.uid}
                style={styles.flatListContainer}
            />
            <RNBounceable
                style={styles.createButton}
                disabled={selectedUsers.length <= 1}
                onPress={() => createGroupChat(selectedUsers)}
            >
                <Text style={[styles.createButtonText, { fontSize: dynamicStyles.createButtonTextFontSize }]}>
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
        paddingVertical: 8,
    },
    flatListContainer: {
        width: '100%',
    },
    createButton: {
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
    createButtonText: {
        color: 'white',
        fontFamily: 'Poppins_600SemiBold'
    },
});
