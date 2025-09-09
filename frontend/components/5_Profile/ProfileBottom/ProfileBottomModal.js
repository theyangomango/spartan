import React, { memo } from "react";
import { StyleSheet, View, Pressable, Dimensions } from "react-native";
import { Grid2, Clock } from 'iconsax-react-native';
import Svg, { Path } from "react-native-svg";
import PostsSection from "./Posts/PostsSection";
import HistorySection from "./History/HistorySection";
import SavedSection from "./Saved/SavedSection";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const ProfileBottomModal = ({ selectedPanel, setSelectedPanel, posts, savedPosts, completedWorkouts, isBottomSheetExpanded, onOpenWorkout }) => {
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
                    <Pressable onPress={() => setSelectedPanel('saved')}>
                        {/* Bookmark icon */}
                        <Svg
                            xmlns="http://www.w3.org/2000/svg"
                            width={scaledSize(28)}
                            height={scaledSize(28)}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={selectedPanel === 'saved' ? "#359ffc" : "#888"}
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </Svg>
                    </Pressable>
                </View>
            </View>
            <View style={styles.panel_border}></View>

            {posts && (
                <PostsSection posts={posts} isVisible={selectedPanel === 'posts'} isBottomSheetExpanded={isBottomSheetExpanded} />
            )}
            <HistorySection
                completedWorkouts={completedWorkouts}
                isVisible={selectedPanel === 'history'}
                isBottomSheetExpanded={isBottomSheetExpanded}
                onOpenWorkout={onOpenWorkout}
            />
            <SavedSection posts={savedPosts} isVisible={selectedPanel === 'saved'} isBottomSheetExpanded={isBottomSheetExpanded} />
        </View>
    );
};

import theme from "../../../theme/mfpDark";
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
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
