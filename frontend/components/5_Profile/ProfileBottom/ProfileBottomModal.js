// ProfileBottomModal.js
import React, { memo } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Grid2, Activity, Clock } from 'iconsax-react-native';
import PostsSection from "./Posts/PostsSection";
import HistorySection from "./History/HistorySection";
import ActivitySection from "./Activity/ActivitySection";

const ProfileBottomModal = ({ selectedPanel, setSelectedPanel, posts, isBottomSheetExpanded }) => {
    return (
        <View style={styles.container}>
            <View style={styles.panel_btns}>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => setSelectedPanel('posts')}>
                        <Grid2 size="28" color={selectedPanel === 'posts' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => setSelectedPanel('history')}>
                        <Clock size="28" color={selectedPanel === 'history' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={[styles.panel_btn]}>
                    <Pressable onPress={() => setSelectedPanel('activity')}>
                        <Activity size="28" color={selectedPanel === 'activity' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
            </View>
            <View style={styles.panel_border}></View>

            <PostsSection posts={posts} isVisible={selectedPanel === 'posts'} isBottomSheetExpanded={isBottomSheetExpanded}/>
            <HistorySection isVisible={selectedPanel === 'history'}  isBottomSheetExpanded={isBottomSheetExpanded}/>
            <ActivitySection isVisible={selectedPanel === 'activity'}  isBottomSheetExpanded={isBottomSheetExpanded}/>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    panel_border: {
        borderColor: '#82bbed',
        borderBottomWidth: 1.5,
        paddingTop: 8,
        marginHorizontal: 16
    },
    panel_btns: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 8,
        justifyContent: 'space-between',
    },
    panel_btn: {
        flex: 1,
        alignItems: 'center',
    },
    scrollable_ctnr: {
        marginTop: 5,
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    }
});

export default memo(ProfileBottomModal);
