import React, { memo } from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { Grid2, Clock, Weight } from 'iconsax-react-native';
import PostsSection from "./Posts/PostsSection";
import HistorySection from "./History/HistorySection";
import TemplatesSection from "./Templates/TemplatesSection";
import { withStrongPress } from "../../../utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const scaledSize = (size) => scaleSize(size);

const ProfileBottomModal = ({ selectedPanel, setSelectedPanel, posts, templates, completedWorkouts, isBottomSheetExpanded, onOpenWorkout, onScrollExpandRequest, contentLocked = false, lockedSubtitle = '', ownerData = null }) => {
    const normalizedTemplates = Array.isArray(templates) ? templates : [];
    const insets = useSafeAreaInsets();
    const isViewingSelf = (() => {
        const ownerUid = ownerData?.uid ? String(ownerData.uid) : null;
        try {
            const viewerUid = global?.userData?.uid ? String(global.userData.uid) : null;
            return ownerUid && viewerUid && ownerUid === viewerUid;
        } catch {
            return false;
        }
    })();
    const viewingSelfTemplates = isViewingSelf;

    if (contentLocked) {
        const safeBottom = insets?.bottom || 0;
        const paddingBottom = safeBottom + scaleSize(110);
        const paddingTop = scaleSize(25);
        return (
            <View style={[styles.container, styles.lockedContainer, { paddingBottom, paddingTop }]}>
                <View style={styles.lockIconWrap}>
                    <Ionicons name="lock-closed" size={scaleSize(40)} color="#9CA3AF" />
                </View>
                <Text style={styles.lockedTitle}>This account is private</Text>
                <Text style={styles.lockedSubtitle}>
                    {lockedSubtitle || 'Follow this user to see their posts, workouts, and templates.'}
                </Text>
            </View>
        );
    }

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
                    viewingSelf={isViewingSelf}
                />
            )}
            <HistorySection
                completedWorkouts={completedWorkouts}
                isVisible={selectedPanel === 'history'}
                isBottomSheetExpanded={isBottomSheetExpanded}
                onOpenWorkout={onOpenWorkout}
                onScrollExpandRequest={onScrollExpandRequest}
                ownerData={ownerData}
                viewingSelf={isViewingSelf}
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
        paddingTop: scaledSize(4),
        marginHorizontal: scaledSize(16)
    },
    panel_btns: {
        flexDirection: 'row',
        marginHorizontal: scaledSize(16),
        marginTop: scaledSize(2),
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
    },
    lockedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: scaleSize(24),
    },
    lockIconWrap: {
        width: scaleSize(80),
        height: scaleSize(80),
        borderRadius: scaleSize(40),
        backgroundColor: 'rgba(148, 163, 184, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleSize(12),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(18),
        color: '#E5E7EB',
        marginBottom: scaleSize(6),
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(14),
        lineHeight: scaleSize(20),
        textAlign: 'center',
        color: '#9CA3AF',
        maxWidth: '80%',
    },
});

export default memo(ProfileBottomModal);
