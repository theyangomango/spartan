import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from '../ProfileCard';
import RNBounceable from '@freakycoder/react-native-bounceable';
import scaleSize from "../../helper/scaleSize";
import { LinearGradient } from 'expo-linear-gradient';

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

export default function CreateGroupChatModal({ initChat }) {
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
        const exists = selectedUsers.some(u => u.uid === user.uid);
        const newSelectedUsers = exists
            ? selectedUsers.filter(u => u.uid !== user.uid)
            : [...selectedUsers, user];

        setSelectedUsers(newSelectedUsers);
        setSelectedHandles(newSelectedUsers.map(u => (u ? u.handle : '')));
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.some(u => u.uid === item.uid);
        return (
            <ProfileCard
                user={item}
                onSelect={handleSelectUser}
                isSelected={isSelected}
            />
        );
    };

    const onClearSearch = () => setSearchQuery('');

    const deselectByHandle = (handle) => {
        const target = selectedUsers.find(u => u.handle === handle);
        if (target) handleSelectUser(target);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { fontSize: dynamicStyles.modalTextFontSize + 1 }]}>New Group</Text>
                {selectedHandles.length === 0 ? (
                    <Text style={styles.subHeaderText}>Add people to your group</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedHandlesContainer}>
                        <View style={{ width: 16 }} />
                        {selectedHandles.map((handle, index) => (
                            <Pressable key={`${handle}-${index}`} onPress={() => deselectByHandle(handle)}>
                                <View style={styles.selectedHandleView}>
                                    <Text style={[styles.selectedHandleText, { fontSize: dynamicStyles.modalTextFontSize }]}>{handle}</Text>
                                    <Icon name="close" size={scaleSize(14)} color="#2D9EFF" />
                                </View>
                            </Pressable>
                        ))}
                        <View style={{ width: 8 }} />
                    </ScrollView>
                )}
            </View>

            <View style={styles.searchContainer}>
                <Icon name="search" size={scaleSize(16)} color="#2D9EFF" style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchBar, { fontSize: dynamicStyles.searchBarFontSize }]}
                    placeholder="Search by handle or name"
                    placeholderTextColor="#8AA0BF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={onClearSearch} hitSlop={8}>
                        <Icon name="close-circle" size={scaleSize(18)} color="#A9C6EF" />
                    </Pressable>
                )}
            </View>

            <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.uid}
                style={styles.flatListContainer}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
            />

            <RNBounceable
                disabled={selectedUsers.length <= 1}
                activeOpacity={0.8}
                style={[styles.createButtonWrap, selectedUsers.length <= 1 && { opacity: 0.6 }]}
                onPress={() => initChat(selectedUsers)}
            >
                <LinearGradient
                    colors={selectedUsers.length > 1 ? ["#2A65D9", "#59AAEE"] : ["#BFD8F8", "#BFD8F8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createButton}
                >
                    <Icon name="people-outline" size={scaleSize(18)} color="#fff" style={{ marginRight: scaleSize(8) }} />
                    <Text style={[styles.createButtonText, { fontSize: dynamicStyles.createButtonTextFontSize }]}>
                        {`Create Group${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`}
                    </Text>
                </LinearGradient>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#252733',
    },
    header: {
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(6),
        width: '100%',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Outfit_700Bold',
        color: '#E5E7EB',
        letterSpacing: 0.2,
    },
    subHeaderText: {
        fontFamily: 'Outfit_500Medium',
        color: '#A1A7B3',
        fontSize: scaleSize(12.5),
        marginTop: scaleSize(6),
    },
    selectedHandlesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scaleSize(6),
    },
    selectedHandleView: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleSize(6),
        backgroundColor: '#11253D',
        paddingHorizontal: scaleSize(10.5),
        height: scaleSize(29),
        borderRadius: scaleSize(14),
        justifyContent: 'center',
        marginRight: scaleSize(6),
        borderWidth: 1,
        borderColor: 'rgba(45,158,255,0.30)',
    },
    selectedHandleText: {
        color: '#7fb5ff',
        fontFamily: 'Outfit_700Bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E2128',
        borderRadius: scaleSize(14),
        width: '90%',
        paddingHorizontal: scaleSize(12),
        marginBottom: scaleSize(10),
        height: scaleSize(44),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    searchIcon: { marginRight: scaleSize(8) },
    searchBar: {
        flex: 1,
        paddingVertical: scaleSize(8),
        fontFamily: 'Outfit_500Medium',
        color: '#E5E7EB',
    },
    flatListContainer: {
        width: '100%',
    },
    listContent: {
        paddingBottom: scaleSize(100),
    },
    createButtonWrap: {
        position: 'absolute',
        bottom: scaleSize(45),
        left: scaleSize(22),
        right: scaleSize(22),
        borderRadius: scaleSize(16),
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 4,
    },
    createButton: {
        borderRadius: scaleSize(16),
        paddingVertical: scaleSize(13),
        paddingHorizontal: scaleSize(30),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    createButtonText: {
        color: 'white',
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.2,
    },
});
