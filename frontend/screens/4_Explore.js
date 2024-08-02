import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard, ScrollView, Text, KeyboardAvoidingView, Platform } from 'react-native';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/3_Workout/WorkoutFooter";
import PostPreview from '../components/4_explore/PostPreview';
import SearchBarComponent from '../components/4_explore/SearchBarComponent';
import retrieveUserExploreFeed from '../../backend/retreiveUserExploreFeed';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function Explore({ navigation }) {
    const userData = global.userData;
    const [explorePosts, setExplorePosts] = useState([]);
    const [filteredHandles, setFilteredHandles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('For You');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        init();

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    async function init() {
        let exploreFeedData = await retrieveUserExploreFeed(userData);
        setExplorePosts(exploreFeedData);
    }

    const toPostList = () => {
        navigation.navigate('PostList');
    };

    const renderPostPreview = (item, large = false) => (
        <PostPreview toPostList={toPostList} item={item} large={large} />
    );

    const categories = ['For You', 'Leg Day', 'Progress Pictures', 'Bulking', 'Workout Splits'];

    const renderGrid = (posts, index) => {
        if (posts.length < 6) return null;

        if (index % 2 == 0) {
            return (
                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <View style={styles.gridItemLarge}>
                            {renderPostPreview(posts[0], true)}
                        </View>
                        <View style={styles.gridColumn}>
                            <View style={styles.gridItemSmall}>
                                {renderPostPreview(posts[1])}
                            </View>
                            <View style={styles.gridItemSmall}>
                                {renderPostPreview(posts[2])}
                            </View>
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[3])}
                        </View>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[4])}
                        </View>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[5])}
                        </View>
                    </View>
                </View>
            );
        }

        else return (
            <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                    <View style={styles.gridColumn}>
                        <View style={styles.gridItemSmall}>
                            {renderPostPreview(posts[1])}
                        </View>
                        <View style={styles.gridItemSmall}>
                            {renderPostPreview(posts[2])}
                        </View>
                    </View>
                    <View style={styles.gridItemLarge}>
                        {renderPostPreview(posts[0], true)}
                    </View>
                </View>
                <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                        {renderPostPreview(posts[3])}
                    </View>
                    <View style={styles.gridItem}>
                        {renderPostPreview(posts[4])}
                    </View>
                    <View style={styles.gridItem}>
                        {renderPostPreview(posts[5])}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{ height: 58 }} />

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

            <ScrollView contentContainerStyle={styles.gridScrollView} showsVerticalScrollIndicator={false}>
                {explorePosts.length > 0 && explorePosts.map((_, index) => (
                    <View key={index}>
                        {renderGrid(explorePosts.slice(index * 6, index * 6 + 6), index)}
                    </View>
                ))}
            </ScrollView>

            {global.workout && <WorkoutFooter userData={userData} />}

            <Footer navigation={navigation} currentScreenName="Explore" />

            {keyboardVisible && (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.keyboardDismissOverlay} />
                </TouchableWithoutFeedback>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    gridScrollView: {
        paddingHorizontal: 2,
    },
    gridContainer: {
        // marginBottom: 10,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },
    gridColumn: {
        flexDirection: 'column',
        flexWrap: 'nowrap',
        width: '33.33%',
    },
    gridItemLarge: {
        width: '66.66%',
        height: 'auto',
        aspectRatio: 1,
    },
    gridItemSmall: {
        width: '100%',
        height: 'auto',
        aspectRatio: 1,
    },
    gridItem: {
        width: '33.33%',
        height: 'auto',
        aspectRatio: 1,
    },
    scrollViewWrapper: {
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
        backgroundColor: '#e9e9e9',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 13,
        marginRight: 6,
    },
    selectedFilterButton: {
        backgroundColor: '#6AB2F8',
    },
    selectedFilterButtonText: {
        color: '#fff',
        fontFamily: 'Mulish_700Bold',
        fontSize: 13.25,
    },
    unselectedFilterButtonText: {
        color: '#222',
        fontFamily: 'Mulish_700Bold',
        fontSize: 13.25,
    },
    keyboardDismissOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
});
