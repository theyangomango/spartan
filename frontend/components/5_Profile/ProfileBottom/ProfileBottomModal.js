import React, { memo } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { Grid2, Clock, Weight } from 'iconsax-react-native';
import PostsSection from "./Posts/PostsSection";
import HistorySection from "./History/HistorySection";
import TemplatesSection from "./Templates/TemplatesSection";
import { withStrongPress } from "../../../utils/haptics";

const scaledSize = (size) => scaleSize(size);

const ProfileBottomModal = ({ selectedPanel, setSelectedPanel, posts, templates, completedWorkouts, isBottomSheetExpanded, onOpenWorkout, onScrollExpandRequest }) => {
    const normalizedTemplates = Array.isArray(templates) ? templates : [];
    const viewingSelfTemplates = templates !== undefined && templates !== null;

    return (
        <View style={styles.container}>
            <View style={styles.panel_btns}>
                <View style={styles.panel_btn}>
                    <Pressable onPress={withStrongPress(() => setSelectedPanel('posts'))}>
                        <Grid2 size={scaledSize(28)} color={selectedPanel === 'posts' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={styles.panel_btn}>
                    <Pressable onPress={withStrongPress(() => setSelectedPanel('history'))}>
                        <Clock size={scaledSize(28)} color={selectedPanel === 'history' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={[styles.panel_btn]}>
                    <Pressable onPress={withStrongPress(() => setSelectedPanel('templates'))}>
                        <Weight
                            size={scaledSize(28)}
                            color={selectedPanel === 'templates' ? "#359ffc" : "#888"}
                        />
                    </Pressable>
                </View>
            </View>
            <View style={styles.panel_border}></View>

            {posts && (
                <PostsSection
                    posts={posts}
                    isVisible={selectedPanel === 'posts'}
                    isBottomSheetExpanded={isBottomSheetExpanded}
                    onOpenWorkout={onOpenWorkout}
                    onScrollExpandRequest={onScrollExpandRequest}
                />
            )}
            <HistorySection
                completedWorkouts={completedWorkouts}
                isVisible={selectedPanel === 'history'}
                isBottomSheetExpanded={isBottomSheetExpanded}
                onOpenWorkout={onOpenWorkout}
                onScrollExpandRequest={onScrollExpandRequest}
            />
            <TemplatesSection
                templates={normalizedTemplates}
                isVisible={selectedPanel === 'templates'}
                isBottomSheetExpanded={isBottomSheetExpanded}
                onScrollExpandRequest={onScrollExpandRequest}
                viewingSelf={viewingSelfTemplates}
            />
        </View>
    );
};

import theme from "../../../theme/mfpDark";
const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Match Feed background for entire screen cohesion
        backgroundColor: theme.bg,
    },
    panel_border: {
        borderColor: theme.primary,
        borderBottomWidth: scaledSize(1.5),
        paddingTop: scaleSize(scaledSize(4)),
        marginHorizontal: scaleSize(scaledSize(16))
    },
    panel_btns: {
        flexDirection: 'row',
        marginHorizontal: scaleSize(scaledSize(16)),
        marginTop: scaleSize(scaledSize(2)),
        justifyContent: 'space-between',
    },
    panel_btn: {
        flex: 1,
        alignItems: 'center',
    },
    scrollable_ctnr: {
        marginTop: scaleSize(scaledSize(5)),
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    }
});

export default memo(ProfileBottomModal);
