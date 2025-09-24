// SavedSection.js — carbon copy of PostsSection for Saved posts
import React, { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import MasonryList from "@react-native-seoul/masonry-list";
import PostPreview from "../Posts/PostPreview";
import SinglePostModal from "../Posts/SinglePostModal";
import FastImage from 'react-native-fast-image';
import { withStrongPress } from "../../../../utils/haptics";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";

const SavedSection = ({ posts, isVisible, onOpenWorkout, isPrivate = false, isBottomSheetExpanded }) => {
    const [selectedPost, setSelectedPost] = useState(null);

    const handlePostPress = (postData) => {
        setSelectedPost(postData);
    };

    const closeModal = () => setSelectedPost(null);

    const renderPost = ({ item }) => {
        const handlePress = () => {
            try { requestAnimationFrame(() => handlePostPress(item)); }
            catch { handlePostPress(item); }
        };
        return (
            <PostPreview postData={item} onPress={withStrongPress(handlePress)} />
        );
    };

    // Always show newest → oldest
    const sortedPosts = useMemo(() => {
        if (!Array.isArray(posts)) return [];
        const toMs = (p) => Number(p?.created ?? p?.createdAt ?? p?.timestamp ?? 0) || 0;
        return [...posts].sort((a, b) => toMs(b) - toMs(a));
    }, [posts]);

    // Warm the image cache for the first few tiles
    useEffect(() => {
        if (!Array.isArray(sortedPosts) || sortedPosts.length === 0) return;
        const items = sortedPosts.slice(0, 18)
            .map((p) => p?.media?.[0]?.uri)
            .filter(Boolean)
            .map((uri) => ({ uri, priority: FastImage.priority.high }));
        if (items.length) {
            try { FastImage.preload(items); } catch {}
        }
    }, [sortedPosts]);

    const hasPosts = Array.isArray(sortedPosts) && sortedPosts.length > 0;

    const privateMessageStyle = [
        styles.privateMessageCtnr,
        isBottomSheetExpanded ? styles.privateMessageExpanded : styles.privateMessageCollapsed,
    ];

    return (
        <View
            style={[
                styles.scrollable_ctnr,
                !isVisible && styles.hidden,
                isPrivate && !isBottomSheetExpanded && styles.privateCollapsed,
            ]}
        >
            {isPrivate ? (
                <View style={privateMessageStyle}>
                    <Text style={styles.privateMessageText}>Saved posts are private</Text>
                </View>
            ) : hasPosts ? (
                <MasonryList
                    data={sortedPosts}
                    keyExtractor={(item, index) => String(item?.pid ?? index)}
                    renderItem={renderPost}
                    numColumns={3}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    windowSize={7}
                />
            ) : (
                <View style={styles.skeletonGrid}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <View key={i} style={styles.skeletonTile} />
                    ))}
                </View>
            )}

            {/* Single Post Focus Modal */}
            <SinglePostModal
                visible={!!selectedPost}
                post={selectedPost}
                onClose={closeModal}
                onOpenWorkout={onOpenWorkout}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    scrollable_ctnr: {
        marginTop: scaleSize(5),
        flexGrow: 3,
        paddingHorizontal: scaleSize(1),
    },
    hidden: { display: "none" },
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: scaleSize(1),
    },
    skeletonTile: {
        width: '32.3333%',
        margin: scaleSize(2),
        aspectRatio: 1,
        borderRadius: scaleSize(10),
        backgroundColor: theme.field,
    },
    privateMessageCtnr: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(16),
    },
    privateMessageExpanded: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: scaleSize(40),
    },
    privateMessageCollapsed: {
        alignSelf: 'stretch',
        justifyContent: 'flex-start',
        paddingTop: scaleSize(20),
        paddingBottom: scaleSize(12),
    },
    privateMessageText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: scaleSize(14),
        color: theme.hairline,
        textAlign: 'center',
    },
    privateCollapsed: {
        flexGrow: 0,
        flexBasis: 'auto',
        flexShrink: 0,
    },
});

export default memo(SavedSection);
