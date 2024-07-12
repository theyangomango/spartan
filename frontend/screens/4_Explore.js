import React, { useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import PostPreview from '../components/4_explore/PostPreview';
import ExploreHeader from '../components/4_explore/ExploreHeader';
import SearchBarComponent from '../components/4_explore/SearchBarComponent';

export default function Explore({ navigation }) {
    const userData = global.userData;
    

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
        navigation.navigate('PostList');
    };

    const renderPostPreview = ({ item }) => (
        <PostPreview toPostList={toPostList} item={item} />
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.mainContainer}>
                <ExploreHeader />

                <SearchBarComponent
                    navigation={navigation}
                    onFilteredHandlesChange={setFilteredHandles}
                />

                <FlatList
                    data={photos}
                    renderItem={renderPostPreview}
                    keyExtractor={item => item.id.toString()}
                    numColumns={2}
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
    row: {
        flex: 1,
        justifyContent: 'space-around',
    },
    postsFlatlist: {
        flex: 1,
        paddingHorizontal: 9,
        marginVertical: 10
    },
});
