import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Dimensions } from "react-native";
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from "../../../ProfileCard";
import RNBounceable from '@freakycoder/react-native-bounceable';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const GroupModal = () => {
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

    const handleSelectUser = (user) => {
        const newSelectedUsers = selectedUsers.includes(user)
            ? selectedUsers.filter(u => u.uid !== user.uid)
            : [...selectedUsers, user];

        setSelectedUsers(newSelectedUsers);

        const newHandles = newSelectedUsers.map(user => {
            const selectedUser = followingUsers.find(u => u.uid === user.uid);
            return selectedUser ? selectedUser.handle : '';
        });

        setSelectedHandles(newHandles);
    };

    const renderItem = ({ item, index }) => {
        const isSelected = selectedUsers.includes(item);
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
                        <View style={{ width: scaledSize(20) }} />
                        {selectedHandles.map((handle, index) => (
                            <Pressable key={index}>
                                <View style={styles.selectedHandleView}>
                                    <Text style={styles.selectedHandleText}>{handle}</Text>
                                </View>
                            </Pressable>
                        ))}
                        <View style={{ width: scaledSize(5) }} />
                    </ScrollView>
                )}
            </View>
            <View style={styles.searchContainer}>
                <Icon name="search" size={scaledSize(20)} color="#888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search"
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <ScrollView style={styles.flatlistContainer}>
                {filteredUsers.slice(0, 9).map((user, index) => renderItem({ item: user, index }))}
            </ScrollView>
            <RNBounceable
                style={[styles.sendButton, { opacity: selectedUsers.length < 1 ? 0.5 : 1 }]}
                disabled={selectedUsers.length == 0}
            >
                <Text style={styles.sendButtonText}>
                    {`Invite${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}`}
                </Text>
            </RNBounceable>
        </View>
    );
};

export default GroupModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        alignItems: 'center',
    },
    header: {
        height: scaledSize(45),
        paddingTop: scaledSize(15),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaledSize(10),
        position: 'relative',
    },
    modalText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaledSize(14.5),
    },
    selectedHandlesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedHandleView: {
        backgroundColor: '#E1F0FF',
        paddingHorizontal: scaledSize(10.5),
        height: scaledSize(29),
        borderRadius: scaledSize(8),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaledSize(5),
    },
    selectedHandleText: {
        color: '#0499FE',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(14.5),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: scaledSize(8),
        width: '90%',
        paddingHorizontal: scaledSize(8),
        marginBottom: scaledSize(10),
    },
    searchIcon: {
        marginRight: scaledSize(8),
    },
    searchBar: {
        flex: 1,
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(6),
        fontSize: scaledSize(14),
        color: '#333',
        fontFamily: 'Poppins_500Medium',
    },
    flatlistContainer: {
        flex: 1,
        width: '100%',
    },
    sendButton: {
        position: 'absolute',
        bottom: scaledSize(45),
        left: scaledSize(22),
        right: scaledSize(22),
        backgroundColor: '#2D9EFF',
        borderRadius: scaledSize(15),
        paddingVertical: scaledSize(13),
        paddingHorizontal: scaledSize(30),
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontSize: scaledSize(14),
        fontFamily: 'Poppins_600SemiBold',
    },
});
