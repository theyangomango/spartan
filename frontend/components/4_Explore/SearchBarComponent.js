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
import UserCard from './UserCard';
import { debounce } from 'lodash';
import RNBounceable from '@freakycoder/react-native-bounceable';
import scaleSize from '../../helper/scaleSize';
import { strong as hapticStrong } from '../../utils/haptics';
import isThisUser from '../../helper/isThisUser';

const { width: screenWidth } = Dimensions.get('window');

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
        if (!user) return;
        hapticStrong();
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(user)) {
            if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
            else navigation.navigate('Profile', { transition: 'slide-from-right' });
            return;
        }
        if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
        else navigation.navigate('ViewProfile', { user });
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
                <Ionicons name="search" size={scaleSize(20)} color="#555" />
            </RNBounceable>
            {/* Animated Search Input */}
            <Animated.View
                style={[
                    styles.animatedContainer,
                    {
                        width: scaleSize(animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, screenWidth - scaleSize(24) - scaleSize(16) - scaleSize(32)], // Adjust based on icon size and margins
                        })),
                        marginLeft: scaleSize(animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, scaleSize(8)],
                        })),
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
                                <Ionicons name="close" size={scaleSize(18)} color="#555" />
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
        height: scaleSize(40),
        backgroundColor: '#fff',
        borderRadius: scaleSize(20),
        paddingHorizontal: scaleSize(8),
        shadowColor: '#999',
        shadowOffset: { width: 0, height: scaleSize(1) },
        shadowOpacity: 0.3,
        shadowRadius: scaleSize(1.5),
        elevation: 3,
        position: 'relative', // Ensure positioning context for dropdown
    },
    iconButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: scaleSize(24), // Fixed width to prevent shifting
        height: scaleSize(24), // Set height equal to width for a perfect circle
        borderRadius: scaleSize(12), // Half of width/height to make it circular
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
        fontSize: scaleSize(14),
        color: '#333',
        fontFamily: 'Mulish_700Bold', // Ensure this font is loaded and bold
        fontWeight: '700', // Make text bold
    },
    actionButton: {
        padding: scaleSize(4),
    },
    userCardsContainer: {
        position: 'absolute',
        top: scaleSize(50), // Adjust based on your layout
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        maxHeight: scaleSize(300),
        borderRadius: scaleSize(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(2) },
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(4),
        elevation: 5,
        zIndex: 10,
        marginTop: scaleSize(8),
    },
});

export default SearchBarComponent;
