import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const users = [
    { handle: 'john_doe', name: 'John Doe' },
    { handle: 'jane_smith', name: 'Jane Smith' },
    { handle: 'alice_johnson', name: 'Alice Johnson' },
    { handle: 'bob_anderson', name: 'Bob Anderson' },
    { handle: 'charlie_harris', name: 'Charlie Harris' },
    { handle: 'david_brown', name: 'David Brown' },
    { handle: 'emma_white', name: 'Emma White' },
];

const SearchBarComponent = ({ navigation, onFilteredHandlesChange }) => {
    const [searchString, setSearchString] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    const filterHandles = (text) => {
        setSearchString(text);
        if (text === '') {
            setFilteredUsers([]);
            onFilteredHandlesChange([]);
        } else {
            const filtered = users
                .filter(user =>
                    user.handle.toLowerCase().includes(text.toLowerCase())
                )
                .slice(0, 5); // Limit to 5 users
            setFilteredUsers(filtered);
            onFilteredHandlesChange(filtered);
        }
    };

    const toViewProfile = () => {
        navigation.navigate('ViewProfile');
    };

    const renderUserItem = ({ item }) => (
        <RNBounceable
            onPress={toViewProfile}
            style={styles.handlePreview}>
            <View style={styles.pfpContainer} />
            <View>
                <Text style={styles.handleText}>{item.handle}</Text>
                <Text style={styles.nameText}>{item.name}</Text>
            </View>
        </RNBounceable>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={18} color="#c6c6c6" style={styles.icon} />
                <TextInput
                    style={styles.textInput}
                    placeholder="Search"
                    placeholderTextColor="#aaa"
                    value={searchString}
                    onChangeText={filterHandles}
                />
                {searchString.length > 0 && (
                    <TouchableOpacity activeOpacity={0.5} onPress={() => { setSearchString(''); setFilteredUsers([]); onFilteredHandlesChange([]); }} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={18} color="#c6c6c6" />
                    </TouchableOpacity>
                )}
            </View>
            {filteredUsers.length > 0 && (
                <View style={styles.handleFlatlistContainer}>
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item.handle}
                        renderItem={renderUserItem}
                        keyboardShouldPersistTaps="always"
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        zIndex: 1,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 50,
        // borderWidth: 1,
        // borderColor: '#ccc',
        paddingVertical: 10,
        paddingHorizontal: 22,
        marginHorizontal: 16,
        marginBottom: 1,
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    textInput: {
        flex: 1,
        color: '#333',
        fontSize: 16,
        fontFamily: 'Mulish_600SemiBold',
    },
    icon: {
        marginRight: 12,
        marginTop: 1.5
    },
    clearButton: {
        marginLeft: 10,
    },
    handleFlatlistContainer: {
        position: 'absolute',
        top: 50, // Adjust based on the height of the search bar
        left: 0,
        right: 0,
        backgroundColor: 'white',
        marginHorizontal: 10,
        paddingHorizontal: 10,
        paddingBottom: 3,
        zIndex: 2, // Ensure this view is above other views
        // shadowColor: '#666',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 3,
        // elevation: 3, // For Android shadow

        // borderBottomWidth: 0.5,
        // borderBottomColor: '#ccc'
    },
    handlePreview: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        // marginHorizontal: 3,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    pfpContainer: {
        width: 45,
        aspectRatio: 1,
        backgroundColor: 'red',
        borderRadius: 14,
    },
    handleText: {
        fontSize: 18,
        paddingBottom: 5,
        fontFamily: 'Lato_700Bold',
        marginHorizontal: 12,
    },
    nameText: {
        fontSize: 14,
        color: '#888',
        fontFamily: 'Lato_400Regular',
        marginHorizontal: 12,
    },
});

export default SearchBarComponent;
