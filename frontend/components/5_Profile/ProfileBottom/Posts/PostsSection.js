// PostsSection.js

import React, { memo, useState } from "react";
import { StyleSheet, View, Modal } from "react-native";
import MasonryList from '@react-native-seoul/masonry-list';
import PostPreview from "./PostPreview";

// Import your new expanded list:
import ExpandedProfileList from "./ExpandedProfileList";

const PostsSection = ({ posts, isVisible }) => {
  /** 
   * Track:
   * 1) the pressed post
   * 2) the "cycled" posts array
   * 3) whether the expanded list is visible
   */
  const [selectedPost, setSelectedPost] = useState(null);
  const [cycledPosts, setCycledPosts] = useState([]);
  const [isExpandedListVisible, setIsExpandedListVisible] = useState(false);

  const handlePostPress = (postData) => {
    // Find the index of the pressed post in `posts`
    const selectedIndex = posts.findIndex((p) => p === postData);
    // Or you can compare by p.id if you have an `id` field:
    // const selectedIndex = posts.findIndex((p) => p.id === postData.id);

    // If not found, just do a fallback
    if (selectedIndex === -1) {
      // For safety, just put the pressed post at the front
      setCycledPosts([postData, ...posts.filter((p) => p !== postData)]);
    } else {
      // Re-order the array so it starts at the pressed post, 
      // then continues from there, and wraps around
      const newCycledPosts = [
        ...posts.slice(selectedIndex),
        ...posts.slice(0, selectedIndex),
      ];
      setCycledPosts(newCycledPosts);
    }

    setSelectedPost(postData);
    setIsExpandedListVisible(true);
  };

  const closeExpandedList = () => {
    setSelectedPost(null);
    setCycledPosts([]);
    setIsExpandedListVisible(false);
  };

  const renderPost = ({ item }) => (
    <PostPreview
      postData={item}
      onPress={() => handlePostPress(item)} // Pass the item to the handler
    />
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

      {/** 
       * Simple full-screen Modal. 
       * You could also do a custom or half-screen approach 
       */}
      <Modal
        visible={isExpandedListVisible}
        animationType="slide"
        onRequestClose={closeExpandedList}
      >
        {/* 
         Pass your *cycled* array to ExpandedProfileList 
         so it starts with the pressed post, 
         and the rest follow in order 
        */}
        <ExpandedProfileList
          posts={cycledPosts}
          onClose={closeExpandedList}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollable_ctnr: {
    marginTop: 5,
    flexGrow: 3,
    paddingHorizontal: 1,
  },
  hidden: {
    display: 'none',
  }
});

export default memo(PostsSection);
