// PostsSection.js
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import MasonryList from '@react-native-seoul/masonry-list';
import PostPreview from "./PostPreview";

const PostsSection = ({ posts, isVisible, isBottomSheetExpanded }) => {
    const renderPost = ({ item }) => (
        <PostPreview postData={item} />
    );

    return (
        <View style={[styles.scrollable_ctnr, !isVisible && styles.hidden]}>
            <MasonryList
                data={posts}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderPost}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    scrollable_ctnr: {
        marginTop: 5,
        flexGrow: 3,
        paddingHorizontal: 1,
        // backgroundColor: 'green'
    },
    hidden: {
        display: 'none',
    }
});

export default memo(PostsSection);
