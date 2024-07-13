import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard, ScrollView, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import PostPreview from '../components/4_explore/PostPreview';
import SearchBarComponent from '../components/4_explore/SearchBarComponent';
import retrieveUserExploreFeed from '../../backend/retreiveUserExploreFeed';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function Explore({ navigation }) {
    const userData = global.userData;
    const [explorePosts, setExplorePosts] = useState([]);
    const [filteredHandles, setFilteredHandles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
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

    const renderPostPreview = ({ item }) => (
        <PostPreview toPostList={toPostList} item={item} />
    );

    const categories = ['For You', 'Leg Day', 'Progress Pictures', 'Bulking', 'Workout Splits'];

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

            <MasonryList
                data={explorePosts}
                renderItem={renderPostPreview}
                keyExtractor={(item, index) => index.toString()}
                numColumns={3}
                style={styles.postsMasonryList}
                showsVerticalScrollIndicator={false}
            />

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
    postsMasonryList: {
        flex: 1,
        paddingHorizontal: 3.5,
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
        backgroundColor: '#DCDCDC',
        borderRadius: 15,
        paddingVertical: 6.5,
        paddingHorizontal: 12,
        marginRight: 8,
    },
    selectedFilterButton: {
        backgroundColor: '#6AB2F8',
    },
    selectedFilterButtonText: {
        color: '#fff',
        fontFamily: 'Mulish_700Bold',
        fontSize: 13,
    },
    unselectedFilterButtonText: {
        color: '#000',
        fontFamily: 'Mulish_700Bold',
        fontSize: 13,
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
