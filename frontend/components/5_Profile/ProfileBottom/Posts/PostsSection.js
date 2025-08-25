// PostsSection.js
import React, { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import MasonryList from "@react-native-seoul/masonry-list";
import PostPreview from "./PostPreview";
import SinglePostModal from "./SinglePostModal";

const PostsSection = ({ posts, isVisible }) => {
    const [selectedPost, setSelectedPost] = useState(null);

    const handlePostPress = (postData) => {
        setSelectedPost(postData);
    };

    const closeModal = () => setSelectedPost(null);

    const renderPost = ({ item }) => (
        <PostPreview postData={item} onPress={() => handlePostPress(item)} />
    );

    return (
        <View style={[styles.scrollable_ctnr, !isVisible && styles.hidden]}>
            <MasonryList
                data={posts}
                keyExtractor={(_, index) => String(index)}
                renderItem={renderPost}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            />

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
});

export default memo(PostsSection);
