// SavedSection.js — carbon copy of PostsSection for Saved posts
import React, { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MasonryList from "@react-native-seoul/masonry-list";
import PostPreview from "../Posts/PostPreview";
import SinglePostModal from "../Posts/SinglePostModal";
import FastImage from 'react-native-fast-image';

const SavedSection = ({ posts, isVisible }) => {
    const [selectedPost, setSelectedPost] = useState(null);

    const handlePostPress = (postData) => {
        setSelectedPost(postData);
    };

    const closeModal = () => setSelectedPost(null);

    const renderPost = ({ item }) => (
        <PostPreview postData={item} onPress={() => handlePostPress(item)} />
    );

    // Warm the image cache for the first few tiles
    useEffect(() => {
        if (!Array.isArray(posts) || posts.length === 0) return;
        const items = posts.slice(0, 18)
            .map((p) => p?.media?.[0]?.uri)
            .filter(Boolean)
            .map((uri) => ({ uri, priority: FastImage.priority.high }));
        if (items.length) {
            try { FastImage.preload(items); } catch {}
        }
    }, [posts]);

    const hasPosts = Array.isArray(posts) && posts.length > 0;

    return (
        <View style={[styles.scrollable_ctnr, !isVisible && styles.hidden]}>
            {hasPosts ? (
                <MasonryList
                    data={posts}
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
            />
        </View>
    );
};

const styles = StyleSheet.create({
    scrollable_ctnr: {
        marginTop: 5,
        flexGrow: 3,
        paddingHorizontal: 1,
    },
    hidden: { display: "none" },
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 1,
    },
    skeletonTile: {
        width: '32.3333%',
        margin: 2,
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: '#2A3142',
    },
});

export default memo(SavedSection);
