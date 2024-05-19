import React, { useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard, FlatList, Text, Pressable, TouchableOpacity } from 'react-native';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/workout/WorkoutFooter";
import SearchBar from "react-native-dynamic-search-bar";
import PostPreview from '../components/explore/PostPreview';

const posts = [
    {
        id: 1,
        user: {
            username: "user1",
            profileImage: "https://via.placeholder.com/150",
        },
        image: "https://via.placeholder.com/300",
        likes: 100,
        comments: 20,
        timestamp: "2024-05-04T10:30:00Z",
    },
    {
        id: 2,
        user: {
            username: "user2",
            profileImage: "https://via.placeholder.com/150",
        },
        image: "https://via.placeholder.com/300",
        likes: 150,
        comments: 30,
        timestamp: "2024-05-03T15:45:00Z",
    },
    // Add more posts as needed
];

const handles = [
    'john_doe',
    'jane_smith',
    'alice_johnson',
    'bob_anderson',
    'charlie_harris',
    'david_brown',
    'emma_white',
];

export default function Explore({ navigation }) {
    const userData = global.userData;
    const [searchString, setSearchString] = useState('');
    const [filteredHandles, setFilteredHandles] = useState([]);
    const [photos, setPhotos] = useState([
        { id: '1', uri: 'https://placeimg.com/640/640/nature' },
        { id: '2', uri: 'https://placeimg.com/640/640/people' },
        { id: '3', uri: 'https://placeimg.com/640/640/animals' },
        { id: '4', uri: 'https://placeimg.com/640/640/tech' },
        { id: '5', uri: 'https://placeimg.com/640/640/arch' },
        { id: '6', uri: 'https://placeimg.com/640/640/any' }
    ]);

    const toPostList = () => {
        navigation.navigate('PostList', { posts });
    };

    const filterHandles = (text) => {
        setSearchString(text);
        if (text === '') {
            setFilteredHandles([]);
        } else {
            const filtered = handles
                .filter(handle =>
                    handle.toLowerCase().includes(text.toLowerCase())
                )
                .slice(0, 5); // Limit to 5 usernames
            setFilteredHandles(filtered);
        }
    };

    function toViewProfile() {
        navigation.navigate('ViewProfile');
    }

    const renderPostPreview = ({ item }) => (
        <PostPreview toPostList={toPostList} item={item} />
    );

    const renderHandleItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => {
                toViewProfile();
            }}
            style={styles.handlePreview}>
            <View style={styles.pfpContainer} />
            <Text style={styles.handleText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.mainContainer}>
                <View style={styles.header}>
                    <SearchBar
                        fontColor="#c6c6c6"
                        iconColor="#c6c6c6"
                        cancelIconColor="#c6c6c6"
                        placeholder="Search"
                        placeholderTextColor="#aaa"
                        value={searchString}
                        onChangeText={filterHandles}
                        onClearPress={() => setFilteredHandles([])}
                        style={styles.searchBar}
                    />
                </View>

                {filteredHandles.length > 0 && (
                    <FlatList
                        data={filteredHandles}
                        keyExtractor={(item) => item}
                        renderItem={renderHandleItem}
                        style={styles.handleFlatlist}
                        keyboardShouldPersistTaps="always"
                    />
                )}

                <FlatList
                    data={photos}
                    renderItem={renderPostPreview}
                    keyExtractor={item => item.id.toString()}
                    numColumns={3}
                    columnWrapperStyle={styles.row}
                    style={styles.postsFlatlist}
                    keyboardShouldPersistTaps="handled"
                />

                {global.workout && <WorkoutFooter userData={userData} />}

                <Footer navigation={navigation} currentScreenName="Explore" />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        marginTop: 55,
        marginBottom: 10,
    },
    searchBar: {
        borderWidth: 1,
        borderColor: '#ccc',
        paddingVertical: 12,
        paddingHorizontal: 5,
        marginHorizontal: 12,
        shadowColor: '#666',
        shadowOffset: { width: -2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    postsFlatlist: {
        flex: 1,
        paddingHorizontal: 3,
    },
    row: {
        flex: 1,
        justifyContent: 'space-around',
    },
    handleFlatlist: {
        position: 'absolute',
        top: 100, // Adjust based on the height of the header and search bar
        left: 0,
        right: 0,
        backgroundColor: 'white',
        zIndex: 1,
        paddingBottom: 5,
    },
    handlePreview: {
        paddingVertical: 9,
        marginHorizontal: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 0.7,
        borderBottomColor: '#888',
    },
    pfpContainer: {
        width: 36,
        height: 36,
        backgroundColor: 'red',
        borderRadius: 18,
    },
    handleText: {
        fontSize: 16,
        paddingBottom: 5,
        fontFamily: 'Lato_700Bold',
        marginHorizontal: 12,
    },
});
