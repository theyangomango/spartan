import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, TextInput, Pressable, SafeAreaView, Dimensions, FlatList } from "react-native";
import { FontAwesome6, AntDesign } from '@expo/vector-icons';
import { Location, Weight } from 'iconsax-react-native';
import { Feather } from '@expo/vector-icons';
import makeID from "../../../../backend/helper/makeID";
// Storage handled via native resumable helper to avoid RN Blob issues
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import uploadResumableNative from "../../../../backend/storage/uploadResumableNative";
import createPost from "../../../../backend/posts/createPost";
import arrayAppend from "../../../../backend/helper/firebase/arrayAppend";
import formatDate from '../../../helper/formatDate';
import { toMillis } from "../../../utils/friends";
import { compressUnder250KB } from "./compressUnder250KB";
import PostHonestyModal from "./PostHonestyModal";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import WorkoutHistoryCard from "../ProfileBottom/History/WorkoutHistoryCard";
import theme from '../../../theme/mfpDark';
import { withStrongPress } from "../../../utils/haptics";

import scaleSize1 from "../../../helper/scaleSize";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Assuming a base screen width of 375 (like iPhone X)

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function PostOptionsScreen({ navigation, route }) {
    const { images, workout } = route.params;

    const [caption, setCaption] = useState('');
    const [isSharing, setIsSharing] = useState(false); // New state for tracking share progress
    const [honestyVisible, setHonestyVisible] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState(workout || null);
    const workoutSheetRef = useRef(null);
    const workoutList = useMemo(() => (Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : []), [(global?.userData?.completedWorkouts || []).length]);
    const snapPoints = useMemo(() => ["94%"], []);
    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    function goBack() {
        navigation.goBack();
    }

    async function compressImage(uri) {
        const compressedImage = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 0.001, format: ImageManipulator.SaveFormat.JPEG }
        );
        return compressedImage.uri;
    }

    const beginShare = () => setHonestyVisible(true);

    async function sharePost() {
        setIsSharing(true); // Disable the button

        const pid = makeID();
        var downloadedImageURLs = [];

        for (let index = 0; index < images.length; index++) {
            const image = images[index];

            try {
                // Compress while preserving quality/resolution
                let compressedUri = await compressUnder250KB(image);
                // Safety: ensure we have a file:// path readable by FileSystem (iOS can return ph:// from MediaLibrary)
                if (!compressedUri || !compressedUri.startsWith('file://')) {
                    const tmp = await ImageManipulator.manipulateAsync(
                        compressedUri || image,
                        [],
                        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    compressedUri = tmp?.uri;
                }
                // Pick extension and proper content-type from URI
                const withoutQuery = (compressedUri || '').split('?')[0];
                const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
                const ext = (match ? match[1] : 'jpg').toLowerCase();
                const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');

                const id = makeID();
                const path = `posts/${pid}-${id}.${ext}`;
                const { url } = await uploadResumableNative({ fileUri: compressedUri, path, mime });
                downloadedImageURLs.push(url);
            } catch (error) {
                console.error(`Error processing image ${index + 1}:`, error);
            }
        }

        // Convert to media objects expected by feed renderer
        const media = downloadedImageURLs.map((url) => ({ uri: url, type: 'image' }));
        createPost(global.userData.uid, global.userData.handle, global.userData.image, caption, media, pid, selectedWorkout);
        arrayAppend('users', global.userData.uid, 'posts', pid);
        await arrayAppend('global', 'posts', 'PIDs', pid);
        try {
            const { jumpToTab } = require('../../../../navigationRef');
            jumpToTab('Feed');
        } catch {
            navigation.navigate('Tabs', { screen: 'Feed' });
        }

        setIsSharing(false); // Re-enable the button
    }

    return (
        <View style={styles.main_ctnr}>
            <SafeAreaView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={withStrongPress(goBack)} style={styles.back_icon_ctnr}>
                        <FontAwesome6 name='chevron-left' size={scaleSize(17)} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.title_text_ctnr}>
                        <Text style={styles.header_text}>New Post</Text>
                    </View>
                    <View style={styles.share_button_ctnr}>
                        <TouchableOpacity
                            onPress={withStrongPress(beginShare)}
                            style={[styles.share_btn, (caption.length === 0 || isSharing) && styles.share_btn_disabled]}
                            disabled={caption.length === 0 || isSharing}
                        >
                            <Text style={styles.share_btn_text}>{isSharing ? 'Sharing...' : 'Share'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.body_scrollview}>
                <View style={styles.post_preview_ctnr}>
                    <Image
                        source={{ uri: images[0] }}
                        style={styles.post_preview_image}
                    />
                    <View style={styles.caption_input_ctnr}>
                        <TextInput
                            placeholder="Write a caption..."
                            placeholderTextColor={theme.textSecondary}
                            value={caption}
                            onChangeText={setCaption}
                            style={styles.caption_text}
                            multiline={true}
                        />
                    </View>
                </View>

                <Pressable onPress={withStrongPress(() => workoutSheetRef.current?.expand?.())}>
                    <View style={[styles.btn_ctnr, styles.top_btn_ctnr]}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.workout_icon_ctnr]}>
                                <Weight size={scaleSize(25)} color={theme.primary} />
                            </View>
                            <Text style={[styles.btn_text, selectedWorkout ? styles.dark_text : {}]}>
                                {
                                    selectedWorkout
                                        ? `${formatDate(new Date(toMillis(selectedWorkout?.created ?? selectedWorkout?.createdAt))) } Workout`
                                        : "Add Workout"
                                }
                            </Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={scaleSize(15)} color={theme.textSecondary} />
                        </View>
                    </View>
                </Pressable>

                {/* Tagging and location are not part of this version */}
                {false && (
                    <Pressable>
                        <View style={styles.btn_ctnr}>
                            <View style={styles.btn_left}>
                                <View style={[styles.btn_icon_ctnr, styles.user_icon_ctnr]}>
                                    <Feather name="user" size={scaleSize(22)} color={theme.primary} />
                                </View>
                                <Text style={styles.btn_text}>Tag People</Text>
                            </View>
                            <View style={styles.right_icon_ctnr}>
                                <FontAwesome6 name='chevron-right' size={scaleSize(15)} color={theme.textSecondary} />
                            </View>
                        </View>
                    </Pressable>
                )}
                {false && (
                    <Pressable>
                        <View style={styles.btn_ctnr}>
                            <View style={styles.btn_left}>
                                <View style={[styles.btn_icon_ctnr, styles.location_icon_ctnr]}>
                                    <Location size={scaleSize(22)} color={theme.primary} />
                                </View>
                                <Text style={styles.btn_text}>Add Location</Text>
                            </View>
                            <View style={styles.right_icon_ctnr}>
                                <FontAwesome6 name='chevron-right' size={scaleSize(15)} color={theme.textSecondary} />
                            </View>
                        </View>
                    </Pressable>
                )}

            </ScrollView>

            <PostHonestyModal
                visible={honestyVisible}
                onCancel={() => setHonestyVisible(false)}
                onConfirm={() => { setHonestyVisible(false); sharePost(); }}
            />

            {/* Bottom sheet: Select a past workout to attach */}
            <View style={styles.bottomSheetOuter} pointerEvents="box-none">
                <BottomSheet
                    ref={workoutSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enablePanDownToClose
                    backdropComponent={renderBackdrop}
                    handleIndicatorStyle={styles.handleIndicator}
                    backgroundStyle={styles.bottomSheetBackground}
                >
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Your Workouts</Text>
                        {selectedWorkout && (
                            <TouchableOpacity onPress={withStrongPress(() => setSelectedWorkout(null))}>
                                <Text style={styles.clearAttach}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <FlatList
                        data={workoutList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <Pressable onPress={withStrongPress(() => { setSelectedWorkout(item); workoutSheetRef.current?.close?.(); })}>
                                <WorkoutHistoryCard workout={item} />
                            </Pressable>
                        )}
                        contentContainerStyle={{ paddingBottom: scaleSize(20) }}
                        ListEmptyComponent={<Text style={styles.emptyText}>No workouts yet</Text>}
                        initialNumToRender={5}
                    />
                </BottomSheet>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: theme.bg
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        flexDirection: 'row',
        backgroundColor: theme.bg,
        paddingTop: scaleSize(2),
        paddingBottom: scaleSize(10)
    },
    back_icon_ctnr: {
        paddingHorizontal: scaleSize(23),
        width: '33.33%'
    },
    title_text_ctnr: {
        alignItems: 'center',
        width: '33.33%'
    },
    header_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        textAlign: 'center',
        color: theme.textPrimary,
    },
    share_button_ctnr: {
        width: '33.33%',
        alignItems: 'flex-end',
    },
    share_btn: {
        minWidth: scaleSize(75),
        paddingHorizontal: scaleSize(12),
        height: scaleSize(32),
        borderRadius: scaleSize(12),
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    share_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        color: '#fff',
    },
    share_btn_disabled: {
        opacity: 0.5,
    },
    body_scrollview: {
        paddingTop: scaleSize(20),
        backgroundColor: theme.surface
    },
    post_preview_ctnr: {
        height: scaleSize(100),
        flexDirection: 'row',
        paddingHorizontal: scaleSize(15)
    },
    post_preview_image: {
        width: scaleSize(80),
        aspectRatio: 1,
        borderRadius: scaleSize(15)
    },
    caption_input_ctnr: {
        flex: 1,
        paddingTop: scaleSize(10),
        marginLeft: scaleSize(15),
    },
    caption_text: {
        fontSize: scaleSize(15),
        fontFamily: 'Outfit_600SemiBold',
        color: theme.textPrimary,
    },
    btn_ctnr: {
        paddingVertical: scaleSize(4),
        borderBottomWidth: 0.25,
        borderColor: theme.hairline,
        flexDirection: 'row',
        paddingHorizontal: scaleSize(17),
        justifyContent: 'space-between'
    },
    top_btn_ctnr: {
        borderTopWidth: 0.25,
        borderColor: theme.hairline,
    },
    btn_left: {
        flexDirection: 'row'
    },
    btn_text: {
        fontFamily: 'Outfit_500Medium',
        color: theme.textSecondary, // Default lighter color
        fontSize: scaleSize(15),
        paddingVertical: scaleSize(7),
    },
    dark_text: {
        color: theme.textPrimary, // Darker color when workout is present
        fontFamily: 'Outfit_600SemiBold',
    },
    btn_icon_ctnr: {
        justifyContent: 'center',
        alignContent: 'center',
    },
    workout_icon_ctnr: {
        marginRight: scaleSize(9)
    },
    user_icon_ctnr: {
        marginRight: scaleSize(11)
    },
    location_icon_ctnr: {
        marginRight: scaleSize(12)
    },
    right_icon_ctnr: {
        paddingHorizontal: scaleSize(8),
        justifyContent: 'center'
    },
    // Bottom sheet styles
    bottomSheetOuter: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    handleIndicator: {
        backgroundColor: theme.hairline,
        width: scaleSize(44),
        height: scaleSize(5),
        borderRadius: scaleSize(3),
    },
    bottomSheetBackground: {
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
        backgroundColor: theme.surface,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(6),
    },
    sheetTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(16),
        color: theme.textPrimary,
    },
    clearAttach: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(13),
        color: theme.primary,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.textSecondary,
        fontFamily: 'Outfit_500Medium',
        paddingVertical: scaleSize(20),
    }
});
