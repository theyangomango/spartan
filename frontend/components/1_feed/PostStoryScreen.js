import React, { useState } from 'react';
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { EvilIcons, FontAwesome } from '@expo/vector-icons';
import CachedImage from 'expo-cached-image';

export default function PostStoryScreen({ selectedImage, goBack }) {
    const [isVisible, setIsVisible] = useState(true);
    const [selectedOption, setSelectedOption] = useState('myStory'); // Default to 'myStory'

    const handleOptionPress = (option) => {
        setSelectedOption(option);
    };

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
                    />
                </View>
            </TouchableWithoutFeedback>

            {isVisible && (
                <BlurView intensity={5} style={styles.header}>
                    <View style={styles.header_left}>
                        <CachedImage
                            key={global.userData.uid}
                            source={{ uri: global.userData.image }}
                            style={styles.header_pfp}
                            cacheKey={global.userData.uid}
                        />
                        <Text style={styles.handle_text}>{global.userData.handle}</Text>
                    </View>
                    <View style={styles.header_right}>
                        <TouchableOpacity onPress={goBack} activeOpacity={0.5}>
                            <EvilIcons name="close" size={25} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            )}

            {isVisible && (
                <BlurView intensity={5} style={styles.modal_footer}>
                    <ScrollView horizontal={true} style={styles.footer_scrollview}>
                        <View style={styles.story_options_ctnr}>
                            <TouchableOpacity
                                activeOpacity={0.5}
                                style={[styles.story_option_ctnr, { opacity: selectedOption === 'myStory' ? 1 : 0.5 }]}
                                onPress={() => handleOptionPress('myStory')}
                            >
                                <View style={styles.pfp_ctnr}>
                                    <CachedImage
                                        key={global.userData.uid}
                                        source={{ uri: global.userData.image }}
                                        style={styles.pfp}
                                        cacheKey={global.userData.uid}
                                    />
                                </View>
                                <Text style={styles.your_story_text}>Your Story</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.5}
                                style={[styles.story_option_ctnr, { opacity: selectedOption === 'closeFriends' ? 1 : 0.5 }]}
                                onPress={() => handleOptionPress('closeFriends')}
                            >
                                <View style={styles.icon_ctnr}>
                                    <FontAwesome name='star' size={16} color={'#fff'} />
                                </View>
                                <Text style={styles.your_story_text}>Close Friends</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                    <View style={styles.send_btn_ctnr}>
                        <TouchableOpacity activeOpacity={0.5} style={styles.sendButton}>
                            <Text style={styles.sendButtonText}>Post Story</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 5,
        zIndex: 1,
        backgroundColor: 'rgba(25, 25, 25, 0.4)',
        alignItems: 'center'
    },
    header_left: {
        flexDirection: 'row'
    },
    header_right: {

    },
    header_pfp: {
        width: 32,
        aspectRatio: 1,
        borderRadius: 22,
    },
    handle_text: {
        color: '#fff',
        padding: 8,
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold'
    },
    fullscreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain'
    },
    modal_footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 88,
        backgroundColor: 'rgba(25, 25, 25, 0.4)',
        zIndex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        // alignItems: 'center',
        justifyContent: 'space-between',
    },
    footer_scrollview: {
        paddingHorizontal: 20,
    },
    story_options_ctnr: {
        flexDirection: 'row'
    },
    story_option_ctnr: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    pfp_ctnr: {
        width: 32,
        aspectRatio: 1,
    },
    icon_ctnr: {
        width: 32,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 17.5,
        backgroundColor: '#4CAEFF',
    },
    pfp: {
        flex: 1,
        borderRadius: 17.5,
        borderColor: '#2D9EFF',
        borderWidth: 2,
    },
    your_story_text: {
        color: '#fff',
        fontSize: 9,
        paddingVertical: 8
    },
    send_btn_ctnr: {
        paddingVertical: 5
    },
    sendButton: {
        backgroundColor: '#4CAEFF',
        // backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginRight: 18,
        // marginBottom: 10
    },
    sendButtonText: {
        color: '#fff',
        // color: '#000',
        fontSize: 13,
        fontFamily: 'SourceSansPro_600SemiBold'
    },
});
