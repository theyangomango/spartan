// Bottom-sheet modals behind the feed post's overflow button: the owner's options and the viewer's report options.

import React from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";
import styles from "../SimpleFeedPost.styles";
import OptionsWeightIcon from "./OptionsWeightIcon";

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FeedPostOwnerOptionsModal = ({
    visible,
    onRequestClose,
    backdropOpacity,
    translateY,
    onPressEditPost,
    clipPost,
    canEditWorkoutOption,
    onPressEditWorkout,
    onPressDeletePost,
    deleteOptionLabel,
}) => (
    <Modal
        transparent
        animationType="none"
        visible={visible}
        onRequestClose={onRequestClose}
    >
        <View style={styles.optionsModalRoot}>
            <AnimatedPressable
                style={[styles.optionsBackdrop, { opacity: backdropOpacity }]}
                onPress={onRequestClose}
            />
            <Animated.View
                style={[
                    styles.optionsSheet,
                    { transform: [{ translateY }] },
                ]}
            >
                <Pressable
                    style={({ pressed }) => [
                        styles.optionsItem,
                        pressed ? styles.optionsItemPressed : null,
                    ]}
                    onPress={onPressEditPost}
                >
                    <View style={styles.optionsItemRow}>
                        <View style={styles.optionsItemLeft}>
                            <MaterialCommunityIcons
                                name="pencil-outline"
                                size={scaleSize(20)}
                                color={theme.textPrimary}
                                style={styles.optionsItemIcon}
                            />
                            <Text style={styles.optionsItemText}>{clipPost ? "Edit Clip" : "Edit Post"}</Text>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={scaleSize(20)}
                            color="rgba(255,255,255,0.32)"
                        />
                    </View>
                </Pressable>
                {canEditWorkoutOption ? (
                    <>
                        <View style={styles.optionsDivider} />
                        <Pressable
                            style={({ pressed }) => [
                                styles.optionsItem,
                                pressed ? styles.optionsItemPressed : null,
                            ]}
                            onPress={onPressEditWorkout}
                        >
                            <View style={styles.optionsItemRow}>
                                <View style={styles.optionsItemLeft}>
                                    <OptionsWeightIcon
                                        size={scaleSize(20)}
                                        color={theme.textPrimary}
                                        style={styles.optionsItemIcon}
                                    />
                                    <Text style={styles.optionsItemText}>Edit Workout</Text>
                                </View>
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={scaleSize(20)}
                                    color="rgba(255,255,255,0.32)"
                                />
                            </View>
                        </Pressable>
                    </>
                ) : null}
                <View style={styles.optionsDivider} />
                <Pressable
                    style={({ pressed }) => [
                        styles.optionsItem,
                        pressed ? styles.optionsItemPressed : null,
                    ]}
                    onPress={onPressDeletePost}
                >
                    <View style={styles.optionsItemRow}>
                        <View style={styles.optionsItemLeft}>
                            <MaterialCommunityIcons
                                name="trash-can-outline"
                                size={scaleSize(20)}
                                color="#FF6B6B"
                                style={styles.optionsItemIcon}
                            />
                            <Text style={[styles.optionsItemText, styles.optionsItemDeleteText]}>
                                {deleteOptionLabel}
                            </Text>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={scaleSize(20)}
                            color="rgba(255,107,107,0.5)"
                        />
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    </Modal>
);

export const FeedPostReportOptionsModal = ({ visible, onRequestClose, backdropOpacity, translateY, onSelectReport }) => (
    <Modal
        transparent
        animationType="none"
        visible={visible}
        onRequestClose={onRequestClose}
    >
        <View style={styles.optionsModalRoot}>
            <AnimatedPressable
                style={[styles.optionsBackdrop, { opacity: backdropOpacity }]}
                onPress={onRequestClose}
            />
            <Animated.View
                style={[styles.optionsSheet, { transform: [{ translateY }] }]}
            >
                <Pressable
                    style={({ pressed }) => [
                        styles.optionsItem,
                        pressed ? styles.optionsItemPressed : null,
                    ]}
                    onPress={onSelectReport}
                >
                    <View style={styles.optionsItemRow}>
                        <View style={styles.optionsItemLeft}>
                            <MaterialCommunityIcons
                                name="flag-outline"
                                size={scaleSize(20)}
                                color="#EF4444"
                                style={styles.optionsItemIcon}
                            />
                            <Text style={[styles.optionsItemText, styles.optionsItemDeleteText]}>Report</Text>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={scaleSize(20)}
                            color="rgba(255,107,107,0.5)"
                        />
                    </View>
                </Pressable>
                <View style={styles.optionsDivider} />
                <Pressable
                    style={({ pressed }) => [
                        styles.optionsItem,
                        pressed ? styles.optionsItemPressed : null,
                    ]}
                    onPress={onRequestClose}
                >
                    <View style={styles.optionsItemRow}>
                        <View style={styles.optionsItemLeft}>
                            <MaterialCommunityIcons
                                name="close"
                                size={scaleSize(20)}
                                color={theme.textSecondary}
                                style={styles.optionsItemIcon}
                            />
                            <Text style={styles.optionsItemText}>Cancel</Text>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    </Modal>
);
