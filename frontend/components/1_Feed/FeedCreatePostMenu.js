// Floating "+" button of the Feed and its create-post menu (share a post or a clip).
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    View,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Text,
    Animated,
    Easing,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import scaleSize from "../../helper/scaleSize";
import styles from "../../screens/feed/Feed.styles";

export default function FeedCreatePostMenu({ navigation, bottomInset }) {
    const [isCreateMenuVisible, setCreateMenuVisible] = useState(false);
    const [isCreateMenuMounted, setCreateMenuMounted] = useState(false);
    const createMenuAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isCreateMenuVisible) {
            setCreateMenuMounted(true);
            Animated.spring(createMenuAnim, {
                toValue: 1,
                tension: 120,
                friction: 14,
                useNativeDriver: true,
            }).start();
            return;
        }
        Animated.timing(createMenuAnim, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setCreateMenuMounted(false);
            }
        });
    }, [createMenuAnim, isCreateMenuVisible]);

    const closeCreateMenu = useCallback(() => {
        setCreateMenuVisible(false);
    }, []);

    const toggleCreateMenu = useCallback(() => {
        setCreateMenuVisible((prev) => !prev);
    }, []);

    const handleSharePost = useCallback(() => {
        closeCreateMenu();
        try {
            navigation?.navigate('PostOptions', { images: [] });
        } catch {
            navigation?.navigate('PostOptions');
        }
    }, [closeCreateMenu, navigation]);

    const handleShareClip = useCallback(() => {
        closeCreateMenu();
        try {
            navigation?.navigate('NewClip');
        } catch {
            navigation?.navigate('NewClip');
        }
    }, [closeCreateMenu, navigation]);

    return (
        <>
            {isCreateMenuMounted && (
                <TouchableWithoutFeedback onPress={closeCreateMenu}>
                    <Animated.View
                        style={[
                            styles.createPostBackdrop,
                            { opacity: createMenuAnim },
                        ]}
                    />
                </TouchableWithoutFeedback>
            )}

            <View
                pointerEvents="box-none"
                style={[
                    styles.createPostActionsWrapper,
                    { bottom: (bottomInset || 0) + scaleSize(110) },
                ]}
            >
                {isCreateMenuMounted && (
                    <Animated.View
                        style={[
                            styles.createPostMenu,
                            {
                                opacity: createMenuAnim,
                                transform: [
                                    {
                                        translateY: createMenuAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [scaleSize(18), 0],
                                        }),
                                    },
                                    {
                                        scale: createMenuAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.94, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.createPostMenuButton,
                                styles.createPostMenuButtonPost,
                            ]}
                            activeOpacity={0.85}
                            onPress={handleSharePost}
                            accessibilityRole="button"
                            accessibilityLabel="Share a post"
                        >
                            <View style={styles.createPostMenuRow}>
                                <View style={styles.createPostMenuLabelWrap}>
                                    <Text style={[styles.createPostMenuText, styles.createPostMenuTextDark]}>
                                        Share Post
                                    </Text>
                                    <Text style={[styles.createPostMenuSubtext, styles.createPostMenuSubtextDark]}>
                                        Quick notes, can add photos/videos
                                    </Text>
                                </View>
                                <View style={styles.createPostMenuIconBadgeDark}>
                                    <Feather
                                        name="edit-3"
                                        size={scaleSize(15)}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.createPostMenuButton,
                                styles.createPostMenuButtonPost,
                            ]}
                            activeOpacity={0.85}
                            onPress={handleShareClip}
                            accessibilityRole="button"
                            accessibilityLabel="Share a clip"
                        >
                            <View style={styles.createPostMenuRow}>
                                <View style={styles.createPostMenuLabelWrap}>
                                    <Text style={[styles.createPostMenuText, styles.createPostMenuTextDark]}>
                                        Share Clip
                                    </Text>
                                    <Text style={[styles.createPostMenuSubtext, styles.createPostMenuSubtextDark]}>
                                        Short-form video content
                                    </Text>
                                </View>
                                <View style={styles.createPostMenuIconBadgeDark}>
                                    <Feather
                                        name="video"
                                        size={scaleSize(15)}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                <TouchableOpacity
                    style={[
                        styles.createPostButton,
                        isCreateMenuVisible && styles.createPostButtonActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={toggleCreateMenu}
                    accessibilityRole="button"
                    accessibilityLabel="Open share options"
                >
                    <Animated.View
                        style={{
                            transform: [{
                                rotate: createMenuAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0deg", "45deg"],
                                }),
                            }],
                        }}
                    >
                        <Feather
                            name="plus"
                            size={scaleSize(24)}
                            color={isCreateMenuVisible ? '#FFFFFF' : '#000'}
                        />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </>
    );
}
