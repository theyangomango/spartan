import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, TextInput, Pressable, SafeAreaView, Dimensions } from "react-native";
import { FontAwesome6, AntDesign } from '@expo/vector-icons';
import { Location, Weight } from 'iconsax-react-native';
import { Feather } from '@expo/vector-icons';
import makeID from "../../../../backend/helper/makeID";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../../../../firebase.config";
import * as ImageManipulator from 'expo-image-manipulator';
import createPost from "../../../../backend/posts/createPost";
import arrayAppend from "../../../../backend/helper/firebase/arrayAppend";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Assuming a base screen width of 375 (like iPhone X)

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function PostOptionsScreen({ navigation, route }) {
    const { images, workout } = route.params;

    const [caption, setCaption] = useState('');
    const [isSharing, setIsSharing] = useState(false); // New state for tracking share progress

    function goBack() {
        navigation.goBack();
    }

    async function compressImage(uri) {
        const compressedImage = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 0.01, format: ImageManipulator.SaveFormat.JPEG }
        );
        return compressedImage.uri;
    }

    async function sharePost() {
        setIsSharing(true); // Disable the button

        const pid = makeID();
        var downloadedImageURLs = [];

        for (let index = 0; index < images.length; index++) {
            const image = images[index];

            try {
                const compressedUri = await compressImage(image);
                const res = await fetch(compressedUri);
                const bytes = await res.blob();

                const id = makeID();
                const imageRef = ref(storage, `posts/${pid}-${id}.jpeg`);
                await uploadBytes(imageRef, bytes);
                const url = await getDownloadURL(imageRef);
                downloadedImageURLs.push(url);
            } catch (error) {
                console.error(`Error processing image ${index + 1}:`, error);
            }
        }

        createPost(global.userData.uid, global.userData.handle, global.userData.image, caption, downloadedImageURLs, pid);
        arrayAppend('users', global.userData.uid, 'posts', pid);
        await arrayAppend('global', 'posts', 'PIDs', pid);
        navigation.navigate('FeedStack');

        setIsSharing(false); // Re-enable the button
    }

    return (
        <View style={styles.main_ctnr}>
            <SafeAreaView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBack} style={styles.back_icon_ctnr}>
                        <FontAwesome6 name='chevron-left' size={scaleSize(17)} />
                    </TouchableOpacity>
                    <View style={styles.title_text_ctnr}>
                        <Text style={styles.header_text}>New Post</Text>
                    </View>
                    <View style={styles.share_button_ctnr}>
                        <TouchableOpacity
                            onPress={sharePost}
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
                            value={caption}
                            onChangeText={setCaption}
                            style={styles.caption_text}
                            multiline={true}
                        />
                    </View>
                </View>

                <Pressable>
                    <View style={[styles.btn_ctnr, styles.top_btn_ctnr]}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.workout_icon_ctnr]}>
                                <Weight size={scaleSize(25)} color="#0699FF" />
                            </View>
                            <Text style={styles.btn_text}>Add Workout</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={scaleSize(15)} color="#444" />
                        </View>
                    </View>
                </Pressable>

                <Pressable>
                    <View style={styles.btn_ctnr}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.user_icon_ctnr]}>
                                <Feather name="user" size={scaleSize(22)} color={'#0699FF'} />
                            </View>
                            <Text style={styles.btn_text}>Tag People</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={scaleSize(15)} color="#444" />
                        </View>
                    </View>
                </Pressable>

                <Pressable>
                    <View style={styles.btn_ctnr}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.location_icon_ctnr]}>
                                <Location size={scaleSize(22)} color={'#0699FF'} />
                            </View>
                            <Text style={styles.btn_text}>Add Location</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={scaleSize(15)} color="#444" />
                        </View>
                    </View>
                </Pressable>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#f3f3f3'
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        flexDirection: 'row',
        backgroundColor: '#f3f3f3',
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
    },
    share_button_ctnr: {
        width: '33.33%',
        alignItems: 'flex-end',
    },
    share_btn: {
        width: scaleSize(75),
        height: scaleSize(32),
        borderRadius: scaleSize(12),
        backgroundColor: '#D3EDFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    share_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        color: '#0699FF',
    },
    share_btn_disabled: {
        opacity: 0.5,
    },
    body_scrollview: {
        paddingTop: scaleSize(20),
        backgroundColor: '#fff'
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
    },
    btn_ctnr: {
        paddingVertical: scaleSize(4),
        borderBottomWidth: 0.25,
        borderColor: '#ccc',
        flexDirection: 'row',
        paddingHorizontal: scaleSize(17),
        justifyContent: 'space-between'
    },
    top_btn_ctnr: {
        borderTopWidth: 0.25,
        borderColor: '#ccc',
    },
    btn_left: {
        flexDirection: 'row'
    },
    btn_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(15.5),
        paddingVertical: scaleSize(7),
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
    }
});
