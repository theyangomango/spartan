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
    Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserCard from './UserCard'; // Ensure this path is correct
import { debounce } from 'lodash'; // Install lodash if not already installed
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Adjust scaling based on your design

const scaledSize = (size) => Math.round(size * scale);

const SearchBarComponent = ({ navigation, allUsers, onSearchExpandChange }) => {
    const [searchString, setSearchString] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const animation = useRef(new Animated.Value(0)).current; // 0: collapsed, 1: expanded

    // Debounce the search input to optimize performance
    const debouncedSearch = useRef(
        debounce((text) => {
            handleSearch(text);
        }, 300) // 300ms delay
    ).current;

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
            duration: 200,
            useNativeDriver: false,
        }).start(() => {
            setIsExpanded(false);
            setSearchString('');
            setFilteredUsers([]);
        });
    };

    const handleSearch = (text) => {
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

    const handleSearchInputChange = (text) => {
        setSearchString(text);
        debouncedSearch(text);
    };

    const toViewProfile = (user) => {
        navigation.navigate('ViewProfile', { user });
    };

    // Unified handler for the rightmost "X" button
    const handleActionPress = () => {
        if (searchString.length > 0) {
            // If there's text, clear it
            setSearchString('');
            setFilteredUsers([]);
        } else {
            // If no text, close the search bar
            handleClosePress();
        }
    };

    return (
        <View style={styles.container}>
            {/* Fixed Search Icon */}
            <RNBounceable
                bounceEffectIn={0.5}
                onPress={handleIconPress}
                style={styles.iconButton}
                accessibilityLabel="Expand search bar"
                accessibilityRole="button"
            >
                <Ionicons name="search" size={scaledSize(20)} color="#555" />
            </RNBounceable>

            {/* Animated Search Input */}
            <Animated.View
                style={[
                    styles.animatedContainer,
                    {
                        width: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, screenWidth - scaledSize(24) - scaledSize(16) - scaledSize(32)], // Adjust based on icon size and margins
                        }),
                        marginLeft: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, scaledSize(8)],
                        }),
                        opacity: animation,
                    },
                ]}
            >
                {isExpanded && (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.expandedContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Search for a person..."
                                placeholderTextColor="#bbb"
                                value={searchString}
                                onChangeText={handleSearchInputChange}
                                autoFocus={true}
                                accessibilityLabel="Search input"
                            />
                            {/* Unified "X" Button */}
                            <TouchableOpacity
                                onPress={handleActionPress}
                                style={styles.actionButton}
                                accessibilityLabel={searchString.length > 0 ? "Clear search" : "Close search bar"}
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={scaledSize(18)} color="#555" />
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                )}
            </Animated.View>

            {/* Search Results Dropdown */}
            {isExpanded && searchString.length > 0 && filteredUsers.length > 0 && (
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
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: scaledSize(40),
        backgroundColor: '#fff',
        borderRadius: scaledSize(20),
        paddingHorizontal: scaledSize(8),
        shadowColor: '#999',
        shadowOffset: { width: 0, height: scaledSize(1) },
        shadowOpacity: 0.3,
        shadowRadius: scaledSize(1.5),
        elevation: 3,
        position: 'relative', // Ensure positioning context for dropdown
    },
    iconButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: scaledSize(24), // Fixed width to prevent shifting
        height: scaledSize(24), // Set height equal to width for a perfect circle
        borderRadius: scaledSize(12), // Half of width/height to make it circular
    },
    animatedContainer: {
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textInput: {
        flex: 1,
        fontSize: scaledSize(14),
        color: '#333',
        fontFamily: 'Mulish_700Bold', // Ensure this font is loaded and bold
        fontWeight: '700', // Make text bold
    },
    actionButton: {
        padding: scaledSize(4),
    },
    userCardsContainer: {
        position: 'absolute',
        top: scaledSize(50), // Adjust based on your layout
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        maxHeight: scaledSize(300),
        borderRadius: scaledSize(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(2) },
        shadowOpacity: 0.2,
        shadowRadius: scaledSize(4),
        elevation: 5,
        zIndex: 10,
        marginTop: scaledSize(8),
    },
    // Removed noResults and noResultsText styles as they are no longer used
});

export default SearchBarComponent;
