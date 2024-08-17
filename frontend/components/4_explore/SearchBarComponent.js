import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserCard from './UserCard'; // Import the UserCard component

const SearchBarComponent = ({ navigation, allUsers }) => {
    const [searchString, setSearchString] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [filteredUsers, setFilteredUsers] = useState([]);

    const filterHandles = (text) => {
        setSearchString(text);
        if (text) {
            const filtered = allUsers.current.filter(user =>
                user.handle.toLowerCase().includes(text.toLowerCase()) ||
                user.name.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers([]); // Clear the filtered users if the search string is empty
        }
    };

    function toViewProfile(user) {
        navigation.navigate('ViewProfile', { user: user });
    }

    return (
        <View style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search" size={16.5} color="#c6c6c6" style={styles.icon} />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Search for a person..."
                        placeholderTextColor="#bbb"
                        value={searchString}
                        onChangeText={filterHandles}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => { /* Do nothing on blur */ }}
                    />
                    {searchString.length > 0 && (
                        <TouchableOpacity
                            activeOpacity={0.5}
                            onPress={() => { setSearchString(''); setFilteredUsers([]); }}
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={18} color="#c6c6c6" />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableWithoutFeedback>
            {isFocused && searchString.length > 0 && (
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={() => filterHandles(searchString)}
                >
                    <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
            )}

            {searchString.length > 0 && (
                <View style={styles.userCardsContainer}>
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item.handle}
                        renderItem={({ item }) => (
                            <UserCard user={item} toViewProfile={toViewProfile} />
                        )}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        zIndex: 1,
        flexDirection: 'row',
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 9.5,
        paddingHorizontal: 22,
        marginHorizontal: 16,
        marginBottom: 1,
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
        elevation: 3,
    },
    textInput: {
        flex: 1,
        color: '#333',
        fontSize: 13.5,
        fontFamily: 'Mulish_700Bold',
    },
    icon: {
        marginRight: 12,
        marginTop: 1.5,
    },
    clearButton: {},
    searchButton: {
        borderRadius: 50,
        paddingVertical: 8,
        paddingRight: 11,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    searchButtonText: {
        color: '#6AB2F8',
        fontSize: 13,
        fontWeight: 'bold',
    },
    userCardsContainer: {
        zIndex: 2,
        position: 'absolute',
        top: 40, // So that it doesn't cover the search bar
        left: 0,
        right: 0,
        backgroundColor: '#fff'
    }
});

export default SearchBarComponent;
