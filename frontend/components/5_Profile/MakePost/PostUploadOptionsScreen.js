import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, TextInput, Pressable } from "react-native";
import { FontAwesome6, AntDesign } from '@expo/vector-icons';
import { Location, Weight } from 'iconsax-react-native';
import { Feather } from '@expo/vector-icons';
import makeID from "../../../../backend/helper/makeID";
import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../../../../firebase.config";

export default function PostUploadOptionsScreen({ navigation, route }) {
    const { userData, images } = route.params;
    const [caption, setCaption] = useState('');

    function goBack() {
        navigation.goBack();
    }

    async function sharePost() {
        console.log("Caption:", caption);
        const pid = makeID();
        const imagesIDs = [];

        try {
            for (const [index, image] of images.entries()) {
                const id = makeID();
                imagesIDs.push(id);

                console.log(`Fetching image ${index + 1}: ${image}`);
                let res;
                try {
                    res = await fetch(image);
                } catch (fetchError) {
                    console.error(`Error fetching image ${index + 1}:`, fetchError);
                    throw fetchError;
                }

                if (!res.ok) {
                    throw new Error(`Failed to fetch image ${index + 1}`);
                }

                let bytes;
                try {
                    bytes = await res.blob();
                } catch (blobError) {
                    console.error(`Error converting image ${index + 1} to blob:`, blobError);
                    throw blobError;
                }

                console.log(`Image ${index + 1} Blob:`, bytes);

                if (bytes.size === 0) {
                    throw new Error(`Blob size is 0 for image ${index + 1}`);
                }

                try {
                    const storageRef = ref(storage, `posts/${pid}-${id}.png`);
                    const metadata = {
                        contentType: 'image/jpeg',
                    };
                    console.log(`Uploading image ${index + 1}: ${id}`);
                    const uploadTask = uploadBytesResumable(storageRef, bytes, metadata);

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            // Handle progress
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            console.log(`Upload is ${progress}% done`);
                        },
                        (error) => {
                            // Handle unsuccessful uploads
                            console.error(`Error uploading image ${index + 1}:`, error);
                        },
                        () => {
                            // Handle successful uploads on complete
                            console.log(`Image ${index + 1} uploaded successfully.`);
                        }
                    );
                } catch (uploadError) {
                    console.error(`Error uploading image ${index + 1}:`, uploadError);
                    throw uploadError;
                }
            }
        } catch (error) {
            console.error("Error processing image:", error);
        }
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack}>
                    <View style={styles.back_icon_ctnr}>
                        <FontAwesome6 name='chevron-left' size={17} />
                    </View>
                </TouchableOpacity>
                <View pointerEvents="none" style={styles.title_text_ctnr}>
                    <Text style={styles.header_text}>New Post</Text>
                </View>
                <TouchableOpacity onPress={sharePost} style={styles.share_btn}>
                    <Text style={styles.share_btn_text}>Share</Text>
                </TouchableOpacity>
            </View>

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
                                <Weight size={25} color="#0699FF" />
                            </View>
                            <Text style={styles.btn_text}>Add Workout</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={15} color="#444" />
                        </View>
                    </View>
                </Pressable>

                <Pressable>
                    <View style={styles.btn_ctnr}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.user_icon_ctnr]}>
                                <Feather name="user" size={22} color={'#0699FF'} />
                            </View>
                            <Text style={styles.btn_text}>Tag People</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={15} color="#444" />
                        </View>
                    </View>
                </Pressable>

                <Pressable>
                    <View style={styles.btn_ctnr}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.location_icon_ctnr]}>
                                <Location size="22" color={'#0699FF'} />
                            </View>
                            <Text style={styles.btn_text}>Add Location</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <FontAwesome6 name='chevron-right' size={15} color="#444" />
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
        backgroundColor: '#fff'
    },
    header: {
        alignItems: 'center',
        paddingTop: 43,
        height: 92,
        paddingHorizontal: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f3f3f3'
    },
    back_icon_ctnr: {
        paddingHorizontal: 23
    },
    title_text_ctnr: {
        position: 'absolute',
        bottom: 12,
        width: '100%',
    },
    header_text: {
        textAlign: 'center',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
    },
    share_btn: {
        width: 75,
        height: 32,
        borderRadius: 12,
        backgroundColor: '#D3EDFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    share_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 14.5,
        color: '#0699FF',
    },
    body_scrollview: {
        paddingTop: 20,
    },
    post_preview_ctnr: {
        height: 100,
        flexDirection: 'row',
        paddingHorizontal: 15
    },
    post_preview_image: {
        width: 80,
        aspectRatio: 1,
        borderRadius: 15
    },
    caption_input_ctnr: {
        flex: 1,
        paddingTop: 10,
        marginLeft: 15,
    },
    caption_text: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
    },
    // ─── Btns ────────────────────────────────────────────────────────────
    btn_ctnr: {
        paddingVertical: 4,
        borderBottomWidth: 0.25,
        borderColor: '#ccc',
        flexDirection: 'row',
        paddingHorizontal: 17,
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
        fontSize: 15.5,
        paddingVertical: 7,
    },
    btn_icon_ctnr: {
        justifyContent: 'center',
        alignContent: 'center',
    },
    workout_icon_ctnr: {
        marginRight: 9
    },
    user_icon_ctnr: {
        marginRight: 11
    },
    location_icon_ctnr: {
        marginRight: 12
    },
    right_icon_ctnr: {
        paddingHorizontal: 8,
        justifyContent: 'center'
    }
});
