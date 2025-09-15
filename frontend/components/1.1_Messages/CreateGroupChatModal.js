import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProfileCard from '../ProfileCard';
import RNBounceable from '@freakycoder/react-native-bounceable';
import scaleSize, { ts } from "../../helper/scaleSize";
import { LinearGradient } from 'expo-linear-gradient';
import theme from "../../theme/mfpDark";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const insets = useSafeAreaInsets();

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
                // Blend with modal background when not selected; contrast only when selected
                baseBg={theme.bg}
                selectedBg={'#283249ff'}
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
                <Text style={[styles.headerTitle, { fontSize: scaleSize(dynamicStyles.modalTextFontSize + 1) }]}>New Group</Text>
                {selectedHandles.length === 0 ? (
                    <Text style={styles.subHeaderText}>Add people to your group</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedHandlesContainer}>
                        <View style={{ width: scaleSize(16) }} />
                        {selectedHandles.map((handle, index) => (
                            <Pressable key={`${handle}-${index}`} onPress={() => deselectByHandle(handle)}>
                                <View style={styles.selectedHandleView}>
                                    <Text style={[styles.selectedHandleText, { fontSize: scaleSize(dynamicStyles.modalTextFontSize) }]}>{handle}</Text>
                                    <Icon name="close" size={scaleSize(14)} color={theme.primary} />
                                </View>
                            </Pressable>
                        ))}
                        <View style={{ width: scaleSize(8) }} />
                    </ScrollView>
                )}
            </View>
            <View style={styles.searchContainer}>
                <Icon name="search" size={scaleSize(16)} color={theme.primary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchBar, { fontSize: scaleSize(dynamicStyles.searchBarFontSize) }]}
                    placeholder="Search by handle or name"
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={onClearSearch} hitSlop={8}>
                        <Icon name="close-circle" size={scaleSize(18)} color={theme.accentBlue} />
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
                style={[
                    styles.createButtonWrap,
                    // Respect device safe area so the button doesn't look cramped.
                    { bottom: scaleSize(Math.max(scaleSize(16), insets.bottom + scaleSize(10))) },
                    selectedUsers.length <= 1 && { opacity: 0.6 },
                ]}
                onPress={() => initChat(selectedUsers)}
            >
                <LinearGradient
                    colors={selectedUsers.length > 1 ? [theme.primary, theme.accentBlue] : [theme.surface, theme.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createButton}
                >
                    <Icon name="people-outline" size={scaleSize(18)} color="#fff" style={{ marginRight: scaleSize(8) }} />
                    <Text style={[styles.createButtonText, { fontSize: scaleSize(dynamicStyles.createButtonTextFontSize) }]}>
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
        // Use app background to match the rest of the UI
        backgroundColor: theme.bg,
    },
    header: {
        paddingTop: scaleSize(8),
        paddingBottom: scaleSize(6),
        width: '100%',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Outfit_700Bold',
        color: theme.textPrimary,
        letterSpacing: 0.2,
    },
    subHeaderText: {
        fontFamily: 'Outfit_500Medium',
        color: theme.textSecondary,
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
        backgroundColor: theme.restPillBg,
        paddingHorizontal: scaleSize(10.5),
        height: scaleSize(29),
        borderRadius: scaleSize(14),
        justifyContent: 'center',
        marginRight: scaleSize(6),
        borderWidth: scaleSize(1),
        borderColor: 'rgba(45,158,255,0.30)',
    },
    selectedHandleText: {
        color: theme.accentBlue,
        fontFamily: 'Outfit_700Bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.field,
        borderRadius: scaleSize(14),
        // Stretch to container width but keep comfortable margins
        alignSelf: 'stretch',
        marginHorizontal: scaleSize(16),
        paddingHorizontal: scaleSize(12),
        marginBottom: scaleSize(10),
        height: scaleSize(44),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    searchIcon: { marginRight: scaleSize(8) },
    searchBar: {
        flex: 1,
        paddingVertical: scaleSize(8),
        fontFamily: 'Outfit_500Medium',
        color: theme.textPrimary,
    },
    flatListContainer: {
        width: '100%',
    },
    listContent: {
        paddingBottom: scaleSize(110),
    },
    createButtonWrap: {
        position: 'absolute',
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
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.2,
    },
});
