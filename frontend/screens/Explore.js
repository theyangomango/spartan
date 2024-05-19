import React, { useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard, FlatList, Image, TouchableOpacity } from 'react-native';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/workout/WorkoutFooter";
import SearchBar from "react-native-dynamic-search-bar";
import PostPreview from '../components/explore/PostPreview';

const posts = [
    {
        id: 1,
        user: {
            username: "user1",
            profileImage: "https://via.placeholder.com/150", // Placeholder profile image
        },
        image: "https://via.placeholder.com/300", // Placeholder post image
        likes: 100,
        comments: 20,
        timestamp: "2024-05-04T10:30:00Z",
    },
    {
        id: 2,
        user: {
            username: "user2",
            profileImage: "https://via.placeholder.com/150", // Placeholder profile image
        },
        image: "https://via.placeholder.com/300", // Placeholder post image
        likes: 150,
        comments: 30,
        timestamp: "2024-05-03T15:45:00Z",
    },
    // Add more posts as needed
];

export default function Explore({ navigation, route }) {
    const userData = global.userData;

    // Expanded sample data for the grid
    const [photos, setPhotos] = useState([
        { id: '1', uri: 'https://placeimg.com/640/640/nature' },
        { id: '2', uri: 'https://placeimg.com/640/640/people' },
        { id: '3', uri: 'https://placeimg.com/640/640/animals' },
        { id: '4', uri: 'https://placeimg.com/640/640/tech' },
        { id: '5', uri: 'https://placeimg.com/640/640/arch' },
        { id: '6', uri: 'https://placeimg.com/640/640/any' }
        // You can add more images as needed
    ]);

    // Function to dismiss the keyboard
    const dismissKeyboard = () => Keyboard.dismiss();

    function toPostList() {
        navigation.navigate('PostList', {
            posts: posts
        })
    }

    // Renders each item in the grid
    const renderItem = ({ item }) => (
        <PostPreview toPostList={toPostList} item={item} />
    );

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.main_ctnr}>
                <View style={styles.header}>
                    <SearchBar
                        fontColor="#c6c6c6"
                        iconColor="#c6c6c6"
                        cancelIconColor="#c6c6c6"
                        placeholder="Search"
                        placeholderTextColor="#aaa"
                        onClearPress={() => {
                            // Filter list, update setPhotos accordingly
                        }}
                        style={styles.search_bar}
                    />
                </View>

                <FlatList
                    data={photos}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    numColumns={3} // This ensures the grid has 3 columns
                    columnWrapperStyle={styles.row}
                    style={styles.flatlist}
                />

                {global.workout &&
                    <WorkoutFooter userData={userData} />
                }

                <Footer navigation={navigation} currentScreenName={'Explore'} />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        marginTop: 55,
        marginBottom: 10,
    },
    search_bar: {
        borderWidth: 1,
        borderColor: '#ccc',
        height: 'auto',
        width: 'auto',
        paddingVertical: 12,
        paddingHorizontal: 5,
        marginHorizontal: 12,
        shadowColor: '#666',
        shadowOffset: { width: -2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    flatlist: {
        flex: 1,
        paddingHorizontal: 3,
    },
    row: {
        flex: 1,
        justifyContent: 'space-around'
    }
});
