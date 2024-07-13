import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Dimensions, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchPanel from './SearchPanel';

const { height: screenHeight } = Dimensions.get('window');

const SearchBarComponent = ({ navigation, onFilteredHandlesChange }) => {
    const [searchString, setSearchString] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const filterHandles = (text) => {
        setSearchString(text);
        // Your existing filter logic here...
    };

    const handleSelectSearch = (search) => {
        setSearchString(search);
        filterHandles(search);
        setIsFocused(false);
    };

    return (
        <View style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search" size={16.5} color="#c6c6c6" style={styles.icon} />
                    <TextInput
                        style={styles.textInput}
                        placeholder="How much protein should I eat?..."
                        placeholderTextColor="#bbb"
                        value={searchString}
                        onChangeText={filterHandles}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => { /* Do nothing on blur */ }}
                    />
                    {searchString.length > 0 && (
                        <TouchableOpacity activeOpacity={0.5} onPress={() => { setSearchString(''); onFilteredHandlesChange([]); }} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color="#c6c6c6" />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableWithoutFeedback>
            <TouchableOpacity
                style={styles.searchButton}
                onPress={() => filterHandles(searchString)}
            >
                <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>

            {isFocused && (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[styles.fullScreenPanel, { height: screenHeight }]}>
                        <SearchPanel onSelectSearch={handleSelectSearch} />
                    </View>
                </TouchableWithoutFeedback>
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
        paddingVertical: 8.5,
        paddingHorizontal: 22,
        marginLeft: 16,
        marginBottom: 1,
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 1 },
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
    clearButton: {
        marginLeft: 10,
    },
    searchButton: {
        borderRadius: 50,
        paddingVertical: 8,
        paddingHorizontal: 11,
        marginRight: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },
    searchButtonText: {
        color: '#6AB2F8',
        fontSize: 13,
        fontWeight: 'bold',
    },
    fullScreenPanel: {
        position: 'absolute',
        top: 40, // So that it doesn't cover the search bar
        left: 0,
        right: 0,
        // backgroundColor: 'red',
        zIndex: 2,
    }
});

export default SearchBarComponent;
