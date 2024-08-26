import React, { memo } from "react";
import { StyleSheet, View, Pressable, Dimensions } from "react-native";
import { Grid2, Activity, Clock } from 'iconsax-react-native';
import PostsSection from "./Posts/PostsSection";
import HistorySection from "./History/HistorySection";
import ActivitySection from "./Activity/ActivitySection";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const ProfileBottomModal = ({ selectedPanel, setSelectedPanel, posts, completedWorkouts, isBottomSheetExpanded }) => {
    return (
        <View style={styles.container}>
            <View style={styles.panel_btns}>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => setSelectedPanel('posts')}>
                        <Grid2 size={scaledSize(28)} color={selectedPanel === 'posts' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => setSelectedPanel('history')}>
                        <Clock size={scaledSize(28)} color={selectedPanel === 'history' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={[styles.panel_btn]}>
                    <Pressable onPress={() => setSelectedPanel('activity')}>
                        <Activity size={scaledSize(28)} color={selectedPanel === 'activity' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
            </View>
            <View style={styles.panel_border}></View>

            {posts &&
                <PostsSection posts={posts} isVisible={selectedPanel === 'posts'} isBottomSheetExpanded={isBottomSheetExpanded} />
            }
            <HistorySection completedWorkouts={completedWorkouts} isVisible={selectedPanel === 'history'} isBottomSheetExpanded={isBottomSheetExpanded} />
            <ActivitySection isVisible={selectedPanel === 'activity'} isBottomSheetExpanded={isBottomSheetExpanded} />
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
        borderBottomWidth: scaledSize(1.5),
        paddingTop: scaledSize(8),
        marginHorizontal: scaledSize(16)
    },
    panel_btns: {
        flexDirection: 'row',
        marginHorizontal: scaledSize(16),
        marginTop: scaledSize(8),
        justifyContent: 'space-between',
    },
    panel_btn: {
        flex: 1,
        alignItems: 'center',
    },
    scrollable_ctnr: {
        marginTop: scaledSize(5),
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    }
});

export default memo(ProfileBottomModal);
