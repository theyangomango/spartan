import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard, ScrollView, Text, TouchableOpacity } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import PostPreview from '../components/4_explore/PostPreview';
import ExploreHeader from '../components/4_explore/ExploreHeader';
import SearchBarComponent from '../components/4_explore/SearchBarComponent';
import retrieveUserExploreFeed from '../../backend/retreiveUserExploreFeed';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function Explore({ navigation }) {
    const userData = global.userData;
    const [explorePosts, setExplorePosts] = useState([]);
    const [filteredHandles, setFilteredHandles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        let exploreFeedData = await retrieveUserExploreFeed(userData);
        setExplorePosts(exploreFeedData);
    }

    const toPostList = () => {
        navigation.navigate('PostList');
    };

    const renderPostPreview = ({ item }) => (
        <PostPreview toPostList={toPostList} item={item} />
    );

    const categories = ['For You', 'Leg Day', 'Progress Pictures', 'Bulking', 'Workout Splits'];

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.mainContainer}>
                {/* <ExploreHeader /> */}
                <View style={{ height: 57 }} />

                <SearchBarComponent
                    navigation={navigation}
                    onFilteredHandlesChange={setFilteredHandles}
                />

                <View style={styles.scrollViewWrapper}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.scrollViewContent}
                        style={styles.scrollview}
                    >
                        {categories.map((category, index) => (
                            <RNBounceable
                                key={index}
                                style={[
                                    styles.filterButton,
                                    selectedCategory === category && styles.selectedFilterButton
                                ]}
                                onPress={() => setSelectedCategory(category)}
                            >
                                <Text style={[
                                    styles.filterButtonText,
                                    selectedCategory === category ? styles.selectedFilterButtonText : styles.unselectedFilterButtonText
                                ]}>
                                    {category}
                                </Text>
                            </RNBounceable>
                        ))}
                    </ScrollView>
                </View>

                <MasonryList
                    data={explorePosts}
                    renderItem={renderPostPreview}
                    keyExtractor={item => item.pid.toString()}
                    numColumns={2}
                    style={styles.postsMasonryList}
                    showsVerticalScrollIndicator={false}
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
    postsMasonryList: {
        flex: 1,
        paddingHorizontal: 10,
        // marginVertical: 5,
    },
    scrollViewWrapper: {
        // marginVertical: 10,
        marginTop: 8,
        marginBottom: 8,
        height: 'auto',
    },
    scrollview: {
        paddingHorizontal: 16,
    },
    scrollViewContent: {
        alignItems: 'center',
    },
    filterButton: {
        backgroundColor: '#DCDCDC',
        borderRadius: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
    },
    selectedFilterButton: {
        backgroundColor: '#6FB8FF',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectedFilterButtonText: {
        color: '#fff',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13.5
    },
    unselectedFilterButtonText: {
        color: '#000',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13.5
    },
});
