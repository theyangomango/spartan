import React, { useState } from 'react';
import { StatusBar } from "expo-status-bar";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { EvilIcons, FontAwesome } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { storage } from '../../../../firebase.config';
import { ref, uploadBytes } from 'firebase/storage';
import makeID from '../../../../backend/helper/makeID';
import getStoryImage from '../../../../backend/storage/getStoryImage';
import createDoc from '../../../../backend/helper/firebase/createDoc';
import arrayAppend from '../../../../backend/helper/firebase/arrayAppend';
import * as ImageManipulator from 'expo-image-manipulator';

export default function PostStoryScreen({ selectedImage, goBack, endStoryCreation, postStoryToFeeds }) {
    async function compressImage(uri) {
        const compressedImage = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 0.01, format: ImageManipulator.SaveFormat.JPEG }
        );
        return compressedImage.uri;
    }

    const [isVisible, setIsVisible] = useState(true);

    async function handlePostStory() {
        const sid = makeID();
        const compressedURI = await compressImage(selectedImage);
        const res = await fetch(compressedURI)
        const bytes = await res.blob();


        await uploadBytes(ref(storage, `stories/${sid}`), bytes);
        const firebaseURI = await getStoryImage(sid);
        const newStory = {
            sid: sid,
            uid: global.userData.uid,
            pfp: global.userData.image,
            name: global.userData.name,
            handle: global.userData.handle,
            created: Date.now(),
            image: firebaseURI,
            likedUsers: [],
            tagged: [], // Todo
            likeCount: 0
        }
        createDoc('stories', sid, newStory);
        postStoryToFeeds(sid);

        setTimeout(() => {
            endStoryCreation();
        }, 100);
    }

    return (
        <View style={styles.mainContainer}>
            <TouchableWithoutFeedback
                onLongPress={() => setIsVisible(false)}
                onPressOut={() => setIsVisible(true)}
            >
                <View style={styles.fullscreenContainer}>
                    <StatusBar hidden={true} />
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.fullscreenImage}
                        resizeMode='contain'
                    />
                </View>
            </TouchableWithoutFeedback>

            <View style={styles.header}>
                <TouchableOpacity style={styles.closeButtonContainer} onPress={goBack}>
                    <EvilIcons name="close" size={30} color="#fff" />
                </TouchableOpacity>
            </View>

            {isVisible && (
                <View style={styles.modalFooter}>
                    <ScrollView horizontal={true} style={styles.footerScrollView}>
                        <View style={styles.storyOptionsContainer}>
                            <RNBounceable activeOpacity={0.5} style={styles.storyOptionContainer} onPress={handlePostStory}>
                                <View style={styles.optionRectangle}>
                                    <View style={styles.pfpContainer}>
                                        <Image
                                            source={{ uri: global.userData.image }}
                                            style={styles.pfp}
                                        />
                                    </View>
                                    <Text style={styles.optionText}>Your Story</Text>
                                </View>
                            </RNBounceable>
                            <RNBounceable activeOpacity={0.5} style={styles.storyOptionContainer}>
                                <View style={styles.optionRectangle}>
                                    <View style={styles.iconContainer}>
                                        <FontAwesome name='star' size={16} color={'#fff'} />
                                    </View>
                                    <Text style={styles.optionText}>Close Friends</Text>
                                </View>
                            </RNBounceable>
                        </View>
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 40,
        left: 23,
        zIndex: 1,
    },
    fullscreenContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    modalFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '11%',
        zIndex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    footerScrollView: {
        paddingHorizontal: 15,
    },
    storyOptionsContainer: {
        flexDirection: 'row',
    },
    storyOptionContainer: {
        marginRight: 8,
    },
    optionRectangle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(25, 25, 25, 0.4)',
        borderRadius: 20,
        paddingVertical: 8.5,
        paddingHorizontal: 15,
    },
    pfpContainer: {
        width: 30,
        aspectRatio: 1,
        borderRadius: 18,
        overflow: 'hidden',
        marginRight: 10,
    },
    iconContainer: {
        width: 30,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: '#4CAEFF',
        marginRight: 10,
    },
    pfp: {
        width: '100%',
        height: '100%',
    },
    optionText: {
        color: '#fff',
        fontSize: 13,
    },
    closeButtonContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 100,
    },
});
