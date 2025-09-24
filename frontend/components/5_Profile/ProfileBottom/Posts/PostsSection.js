// PostsSection.js
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MasonryList from "@react-native-seoul/masonry-list";
import PostPreview from "./PostPreview";
import SinglePostModal from "./SinglePostModal";
import FastImage from 'react-native-fast-image';
import { withStrongPress } from "../../../../utils/haptics";

import scaleSize from "../../../../helper/scaleSize";

const PostsSection = ({ posts, isVisible, onOpenWorkout, onScrollExpandRequest }) => {
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
    const isDraggingRef = useRef(false);
    const recentlyDraggedRef = useRef(false);
    const dragEndTimeoutRef = useRef(null);

    const clearDragEndTimeout = useCallback(() => {
        const timeoutId = dragEndTimeoutRef.current;
        if (!timeoutId) return;
        clearTimeout(timeoutId);
        dragEndTimeoutRef.current = null;
    }, []);

    const scheduleRecentlyDraggedReset = useCallback(() => {
        clearDragEndTimeout();
        dragEndTimeoutRef.current = setTimeout(() => {
            recentlyDraggedRef.current = false;
            dragEndTimeoutRef.current = null;
        }, 180);
    }, [clearDragEndTimeout]);

    useEffect(() => () => {
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    useEffect(() => {
        if (isVisible) return;
        isDraggingRef.current = false;
        recentlyDraggedRef.current = false;
        clearDragEndTimeout();
    }, [isVisible, clearDragEndTimeout]);

    const handleScrollBeginDrag = useCallback(() => {
        isDraggingRef.current = true;
        recentlyDraggedRef.current = true;
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    const handleScrollEndDrag = useCallback(() => {
        isDraggingRef.current = false;
        recentlyDraggedRef.current = true;
        scheduleRecentlyDraggedReset();
    }, [scheduleRecentlyDraggedReset]);

    const handleMomentumScrollEnd = useCallback(() => {
        isDraggingRef.current = false;
        recentlyDraggedRef.current = false;
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    const handleScroll = useCallback((event) => {
        if (typeof onScrollExpandRequest !== 'function') return;
        const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
        if (!isDraggingRef.current && !recentlyDraggedRef.current) return;
        onScrollExpandRequest(Math.max(0, offsetY));
    }, [onScrollExpandRequest]);

    return (
        <View style={[styles.scrollable_ctnr, !isVisible && styles.hidden]}>
            {hasPosts ? (
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
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={handleScrollBeginDrag}
                    onScrollEndDrag={handleScrollEndDrag}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
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
        backgroundColor: require('../../../../theme/mfpDark').default.field,
    },
});

export default memo(PostsSection);
