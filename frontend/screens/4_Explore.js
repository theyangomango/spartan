import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Text,
    Animated,
    Dimensions
} from 'react-native';
import Footer from '../components/Footer';
import PostPreview from '../components/4_Explore/PostPreview';
import SearchBarComponent from '../components/4_Explore/SearchBarComponent';
import retrieveUserExploreFeed from '../../backend/retreiveUserExploreFeed';
import retreiveAllUsers from '../../backend/retreiveAllUsers';
import RNBounceable from '@freakycoder/react-native-bounceable';
import ExpandedExploreList from '../components/4_Explore/ExpandedExploreList';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SLIDE_DURATION = 300;

export default function Explore({ navigation }) {
    const userData = global.userData;

    // The main Explore grid data
    const [explorePosts, setExplorePosts] = useState([]);

    // The reordered array for the expanded post list
    const [expandedPosts, setExpandedPosts] = useState(null);

    // Controls if the expanded list is actually visible (mounted on screen)
    const [isExpandedVisible, setIsExpandedVisible] = useState(false);

    // The "slide up from bottom" animated value
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // The underlying grid’s opacity (for the fade out)
    const backgroundOpacity = useRef(new Animated.Value(1)).current;

    const allUsers = useRef(null);
    const [footerKey, setFooterKey] = useState(0);

    const [searchBarExpanded, setSearchBarExpanded] = useState(false);
    const filterButtonsOpacity = useRef(new Animated.Value(1)).current;

    const [selectedCategory, setSelectedCategory] = useState('For You');
    const categories = ['For You', 'Leg Day', 'Progress Pictures', 'Bulking', 'Workout Splits'];

    /************************************************
     *                 useEffects
     ***********************************************/
    useEffect(() => {
        initExploreFeed();
        initGlobalUsers();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setFooterKey(k => k + 1);
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        // Example of animating filter buttons away if the search bar expands
        if (searchBarExpanded) {
            Animated.timing(filterButtonsOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(filterButtonsOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [searchBarExpanded]);

    /************************************************
     *              Data Initialization
     ***********************************************/
    async function initExploreFeed() {
        const exploreFeedData = await retrieveUserExploreFeed(userData);
        setExplorePosts(exploreFeedData);
    }

    async function initGlobalUsers() {
        const globalUsers = await retreiveAllUsers();
        allUsers.current = globalUsers;
    }

    /************************************************
     *         Show (slide up) Expanded List
     ***********************************************/
    const handlePreviewPress = (index) => {
        // 1) Reorder the array so tapped post is first
        const reordered = [...explorePosts];
        const [tappedPost] = reordered.splice(index, 1);
        reordered.unshift(tappedPost);

        // 2) Store it
        setExpandedPosts(reordered);

        // 3) Make the expanded list visible
        setIsExpandedVisible(true);

        // 4) Reset the animation values
        translateY.setValue(SCREEN_HEIGHT);
        backgroundOpacity.setValue(1);

        // 5) Slide the expanded up & fade out the grid
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: SLIDE_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(backgroundOpacity, {
                toValue: 0, // fade out
                duration: SLIDE_DURATION,
                useNativeDriver: true,
            }),
        ]).start();
    };

    /************************************************
     *         Hide (slide down) Expanded List
     ***********************************************/
    const handleCloseExpanded = useCallback(() => {
        // Animate downward & fade the background back in
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: SLIDE_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(backgroundOpacity, {
                toValue: 1,
                duration: SLIDE_DURATION,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Actually unmount after animation completes
            setIsExpandedVisible(false);
            setExpandedPosts(null);
        });
    }, []);

    /************************************************
     *       Render the Grid of PostPreviews
     ***********************************************/
    const renderPostPreview = (item, index, large = false) => (
        <PostPreview
            item={item}
            large={large}
            onPress={() => handlePreviewPress(index)}
        />
    );

    const renderGrid = (posts, sliceIndex) => {
        if (posts.length < 6) return null;

        // Example “2 up” pattern
        if (sliceIndex % 2 === 0) {
            return (
                <View style={styles.gridContainer} key={sliceIndex}>
                    <View style={styles.gridRow}>
                        <View style={styles.gridItemLarge}>
                            {renderPostPreview(posts[0], sliceIndex * 6)}
                        </View>
                        <View style={styles.gridColumn}>
                            <View style={styles.gridItemSmall}>
                                {renderPostPreview(posts[1], sliceIndex * 6 + 1)}
                            </View>
                            <View style={styles.gridItemSmall}>
                                {renderPostPreview(posts[2], sliceIndex * 6 + 2)}
                            </View>
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[3], sliceIndex * 6 + 3)}
                        </View>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[4], sliceIndex * 6 + 4)}
                        </View>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[5], sliceIndex * 6 + 5)}
                        </View>
                    </View>
                </View>
            );
        } else {
            return (
                <View style={styles.gridContainer} key={sliceIndex}>
                    <View style={styles.gridRow}>
                        <View style={styles.gridColumn}>
                            <View style={styles.gridItemSmall}>
                                {renderPostPreview(posts[1], sliceIndex * 6 + 1)}
                            </View>
                            <View style={styles.gridItemSmall}>
                                {renderPostPreview(posts[2], sliceIndex * 6 + 2)}
                            </View>
                        </View>
                        <View style={styles.gridItemLarge}>
                            {renderPostPreview(posts[0], sliceIndex * 6)}
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[3], sliceIndex * 6 + 3)}
                        </View>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[4], sliceIndex * 6 + 4)}
                        </View>
                        <View style={styles.gridItem}>
                            {renderPostPreview(posts[5], sliceIndex * 6 + 5)}
                        </View>
                    </View>
                </View>
            );
        }
    };

    /************************************************
     *                 Main Render
     ***********************************************/
    return (
        <KeyboardAvoidingView
            style={styles.mainContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Underlying grid content => fade out with backgroundOpacity */}
            <Animated.View style={[styles.underlyingContent, { opacity: backgroundOpacity }]}>
                <View style={{ height: 46 }} />

                <View style={styles.searchAndFiltersContainer}>
                    <SearchBarComponent
                        onSearchExpandChange={setSearchBarExpanded}
                        navigation={navigation}
                        allUsers={allUsers}
                        style={styles.searchBar}
                    />
                    <Animated.View style={[styles.filterButtonsWrapper, { opacity: filterButtonsOpacity }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollViewContent}
                            style={styles.scrollview}
                        >
                            {categories.map((category, idx) => (
                                <RNBounceable
                                    key={idx}
                                    style={[
                                        styles.filterButton,
                                        selectedCategory === category && styles.selectedFilterButton
                                    ]}
                                    onPress={() => setSelectedCategory(category)}
                                >
                                    <Text
                                        style={[
                                            styles.filterButtonText,
                                            selectedCategory === category
                                                ? styles.selectedFilterButtonText
                                                : styles.unselectedFilterButtonText
                                        ]}
                                    >
                                        {category}
                                    </Text>
                                </RNBounceable>
                            ))}
                        </ScrollView>
                    </Animated.View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.gridScrollView}
                    showsVerticalScrollIndicator={false}
                >
                    {explorePosts.length > 0 &&
                        explorePosts.map((_, index) => {
                            const start = index * 6;
                            const end = start + 6;
                            if (start >= explorePosts.length) return null;
                            const chunk = explorePosts.slice(start, end);
                            return chunk.length === 6 ? renderGrid(chunk, index) : null;
                        })}
                </ScrollView>
            </Animated.View>

            {/* The expanded list, sliding up from the bottom. 
          Inside it, we do the “Feed-like” focusing logic. */}
            {isExpandedVisible && (
                <Animated.View
                    style={[
                        styles.expandedListContainer,
                        { transform: [{ translateY }] }
                    ]}
                >
                    <ExpandedExploreList
                        posts={expandedPosts}
                        onClose={handleCloseExpanded}
                    />
                </Animated.View>
            )}

            {/* Footer (like the Feed). We don't fade the footer here, but you could if you wish. */}
            <Footer key={footerKey} navigation={navigation} currentScreenName="Explore" />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
        position: 'relative'
    },
    underlyingContent: {
        flex: 1
    },
    searchAndFiltersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: 5,
        paddingLeft: 16,
        zIndex: 1000,
    },
    searchBar: {
        flex: 1,
        marginRight: 8,
    },
    filterButtonsWrapper: {
        flexDirection: 'row',
        flex: 1,
    },
    scrollViewContent: {},
    scrollview: {
        marginLeft: 8,
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
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 13.25,
    },
    unselectedFilterButtonText: {
        color: '#222',
        fontFamily: 'Mulish_700Bold',
        fontSize: 13.25,
    },
    gridScrollView: {
        paddingHorizontal: 1,
    },
    gridContainer: {},
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
        aspectRatio: 1,
    },
    gridItemSmall: {
        width: '100%',
        aspectRatio: 1,
    },
    gridItem: {
        width: '33.33%',
        aspectRatio: 1,
    },
    expandedListContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 999,
    },
});
