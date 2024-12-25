// SearchBarComponent.js

import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    FlatList,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserCard from './UserCard'; // Ensure this path is correct

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Adjust scaling based on your design

const scaledSize = (size) => Math.round(size * scale);

const SearchBarComponent = ({ navigation, allUsers, onSearchExpandChange }) => {
    const [searchString, setSearchString] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const animation = useRef(new Animated.Value(0)).current; // 0: collapsed, 1: expanded

    useEffect(() => {
        // Notify parent about expansion state
        onSearchExpandChange(isExpanded);
    }, [isExpanded]);

    const handleIconPress = () => {
        setIsExpanded(true);
        Animated.timing(animation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleClosePress = () => {
        Keyboard.dismiss();
        Animated.timing(animation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            setIsExpanded(false);
            setSearchString('');
            setFilteredUsers([]);
        });
    };

    const handleSearch = (text) => {
        setSearchString(text);
        if (text) {
            const filtered = allUsers.current.filter(user =>
                user.uid !== global.userData.uid &&
                (user.handle.toLowerCase().includes(text.toLowerCase()) ||
                    user.name.toLowerCase().includes(text.toLowerCase()))
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers([]);
        }
    };

    const toViewProfile = (user) => {
        navigation.navigate('ViewProfile', { user });
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [scaledSize(40), screenWidth - scaledSize(32)], // Adjust margins as needed
                    }),
                },
            ]}
        >
            {!isExpanded ? (
                // Collapsed state: Show only the search icon
                <TouchableOpacity
                    onPress={handleIconPress}
                    style={styles.iconButton}
                    accessibilityLabel="Expand search bar"
                    accessibilityRole="button"
                >
                    <Ionicons name="search" size={scaledSize(20)} color="#555" />
                </TouchableOpacity>
            ) : (
                // Expanded state: Show the search input and close icon
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.expandedContainer}>
                        <Ionicons name="search" size={scaledSize(16)} color="#c6c6c6" style={styles.searchIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Search for a person..."
                            placeholderTextColor="#bbb"
                            value={searchString}
                            onChangeText={handleSearch}
                            autoFocus={true}
                            accessibilityLabel="Search input"
                        />
                        {searchString.length > 0 && (
                            <TouchableOpacity
                                onPress={() => handleSearch('')}
                                style={styles.clearButton}
                                accessibilityLabel="Clear search"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close-circle" size={scaledSize(18)} color="#c6c6c6" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={handleClosePress}
                            style={styles.closeButton}
                            accessibilityLabel="Close search bar"
                            accessibilityRole="button"
                        >
                            <Ionicons name="close" size={scaledSize(18)} color="#555" />
                        </TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            )}

            {isExpanded && searchString.length > 0 && (
                <View style={styles.userCardsContainer}>
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item.handle}
                        renderItem={({ item }) => (
                            <UserCard user={item} toViewProfile={toViewProfile} />
                        )}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: scaledSize(40),
        backgroundColor: '#fff',
        borderRadius: scaledSize(20),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaledSize(8),
        shadowColor: '#999',
        shadowOffset: { width: 0, height: scaledSize(1) },
        shadowOpacity: 0.4,
        shadowRadius: scaledSize(2),
        elevation: 3,
    },
    iconButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    expandedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    searchIcon: {
        marginRight: scaledSize(8),
    },
    textInput: {
        flex: 1,
        fontSize: scaledSize(14),
        color: '#333',
        fontFamily: 'Mulish_700Bold',
    },
    clearButton: {
        padding: scaledSize(4),
    },
    closeButton: {
        padding: scaledSize(4),
        marginLeft: scaledSize(8),
    },
    userCardsContainer: {
        position: 'absolute',
        top: scaledSize(50), // Adjust based on your layout
        left: scaledSize(0),
        right: scaledSize(0),
        backgroundColor: '#fff',
        maxHeight: scaledSize(300),
        borderRadius: scaledSize(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(2) },
        shadowOpacity: 0.2,
        shadowRadius: scaledSize(4),
        elevation: 5,
        zIndex: 10,
    },
});

export default SearchBarComponent;
