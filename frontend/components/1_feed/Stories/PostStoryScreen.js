import React, { useState } from 'react';
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { EvilIcons, FontAwesome } from '@expo/vector-icons';

export default function PostStoryScreen({ selectedImage, goBack }) {
    const [isVisible, setIsVisible] = useState(true);

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
                        resizeMode='contain' // Ensure the image maintains its aspect ratio
                    />
                </View>
            </TouchableWithoutFeedback>

            <View style={styles.header}>
                <TouchableOpacity style={styles.close_button_ctnr} onPress={goBack}>
                    <EvilIcons name="close" size={30} color="#fff" />
                </TouchableOpacity>
            </View>

            {isVisible && (
                <View style={styles.modal_footer}>
                    <ScrollView horizontal={true} style={styles.footer_scrollview}>
                        <View style={styles.story_options_ctnr}>
                            <TouchableOpacity activeOpacity={0.5} style={styles.story_option_ctnr}>
                                <View style={styles.optionRectangle}>
                                    <View style={styles.pfp_ctnr}>
                                        <Image
                                            source={{ uri: global.userData.image }}
                                            style={styles.pfp}
                                        />
                                    </View>
                                    <Text style={styles.optionText}>Your Story</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.5} style={styles.story_option_ctnr}>
                                <View style={styles.optionRectangle}>
                                    <View style={styles.icon_ctnr}>
                                        <FontAwesome name='star' size={16} color={'#fff'} />
                                    </View>
                                    <Text style={styles.optionText}>Close Friends</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
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
        top: 40,
        left: 23,
        zIndex: 1,
    },
    fullscreenContainer: {
        flex: 1,
        // backgroundColor: 'black',
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
        height: '11%',
        // backgroundColor: 'rgba(25, 25, 25, 0.4)',
        zIndex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    footer_scrollview: {
        paddingHorizontal: 15,
    },
    story_options_ctnr: {
        flexDirection: 'row',
    },
    story_option_ctnr: {
        // alignItems: 'center',
        // width: 140,
        marginRight: 8,
    },
    optionRectangle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(25, 25, 25, 0.4)',
        borderRadius: 20,
        // padding: 5,
        paddingVertical: 8.5,
        paddingHorizontal: 15
    },
    pfp_ctnr: {
        width: 30,
        aspectRatio: 1,
        borderRadius: 18,
        overflow: 'hidden',
        marginRight: 10,
    },
    icon_ctnr: {
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
    close_button_ctnr: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#rgba(0, 0, 0, 0.1)',
        borderRadius: 100,
    },
});
