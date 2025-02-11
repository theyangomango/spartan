// ExpandedProfileList.js
import React, { useState, useRef } from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    Animated,
    Dimensions,
    StyleSheet
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';

import getScrollTargetPosition from '../../../../helper/getScrollTargetPosition';
import { getFeedHeaderStyles } from '../../../../helper/getFeedHeaderStyles';

// Import your Post component:
import Post from '../../../1_Feed/Posts/Post';

// Optionally import CommentsBottomSheet + ShareBottomSheet if needed:
import CommentsBottomSheet from '../../../1_Feed/Comments/CommentsBottomSheet';
import ShareBottomSheet from '../../../1_Feed/SharePost/ShareBottomSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
const TARGET_POSITION = getScrollTargetPosition(SCREEN_WIDTH, SCREEN_HEIGHT);
const ANIMATION_DURATION = 300;

export default function ExpandedProfileList({ posts, onClose }) {
    console.log(posts);


    const [isSomePostFocused, setIsSomePostFocused] = useState(false);
    const focusedPostIndex = useRef(-1);

    // Animate entire list up/down
    const translateY = useRef(new Animated.Value(0)).current;

    // State for CommentsBottomSheet
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    // State for ShareBottomSheet
    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);

    // Animate the entire list container
    const animateList = (offsetY) => {
        Animated.timing(translateY, {
            toValue: -offsetY,
            duration: ANIMATION_DURATION,
            useNativeDriver: true
        }).start(() => {
            if (offsetY === 0) {
                // Means no post is focused
                focusedPostIndex.current = -1;
            }
        });
    };

    const handleFocusPost = (index, postY) => {
        focusedPostIndex.current = index;
        setIsSomePostFocused(true);

        const shift = postY - TARGET_POSITION + 15;
        animateList(shift);
    };

    const handleBackPress = () => {
        if (isSomePostFocused) {
            setIsSomePostFocused(false);
            animateList(0);
        } else {
            onClose();
        }
    };

    // Toggle Comments modal
    const openCommentsModal = () => {
        setCommentsBottomSheetExpandFlag((prev) => !prev);
    };

    // Toggle Share modal
    const openShareModal = () => {
        setShareBottomSheetExpandFlag((prev) => !prev);
    };

    const renderItem = ({ item, index }) => {
        const isFocusedPost = index === focusedPostIndex.current;
        console.log(item);

        return (
            <Animated.View
                style={[
                    styles.postWrapper,
                    isFocusedPost && { transform: [{ translateY }], zIndex: 1 }
                ]}
            >
                <Post
                    data={item}
                    index={index}
                    isFocused={isSomePostFocused && isFocusedPost}
                    handleFocusPost={handleFocusPost}
                    isSomePostFocused={isSomePostFocused}

                    /* If your Post needs to open modals, pass them down: */
                    openCommentsModal={openCommentsModal}
                    openShareModal={openShareModal}
                />
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.backButtonContainer}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButtonHitbox}>
                    <Ionicons
                        name="chevron-back"
                        size={dynamicStyles.iconSize}
                        color="#000"
                    />
                </TouchableOpacity>
            </View>

            {/* MaskedView for that rounded top effect (optional) */}
            <MaskedView
                pointerEvents="box-none"
                style={{ flex: 1, flexDirection: 'row', height: '100%' }}
                maskElement={<View style={styles.maskContainer()} />}
            >
                <Animated.View style={styles.flatListWrapper}>
                    <FlatList
                        data={posts}
                        renderItem={renderItem}
                        keyExtractor={(_, i) => i.toString()}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={!isSomePostFocused}
                        removeClippedSubviews={false}
                        initialNumToRender={5}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        scrollEventThrottle={16}
                    />
                </Animated.View>
            </MaskedView>

            {/* Comments Bottom Sheet (optional) */}
            <CommentsBottomSheet
                isVisible={isSomePostFocused}
                postData={
                    focusedPostIndex.current === -1
                        ? null
                        : posts[focusedPostIndex.current]
                }
                commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
            />

            {/* Share Bottom Sheet (optional) */}
            <ShareBottomSheet shareBottomSheetExpandFlag={shareBottomSheetExpandFlag} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    backButtonContainer: {
        paddingTop: 40,
        paddingBottom: 5,
        paddingHorizontal: dynamicStyles.paddingHorizontal - 5,
        zIndex: 9999,
    },
    backButtonHitbox: {
        paddingVertical: 5,
        paddingHorizontal: 5,
    },
    flatListWrapper: {
        flex: 1,
    },
    postWrapper: {
        width: '100%',
    },
    // Force the top corners to always have a radius of 35
    maskContainer: () => ({
        flex: 1,
        backgroundColor: '#fff',
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
    }),
});
