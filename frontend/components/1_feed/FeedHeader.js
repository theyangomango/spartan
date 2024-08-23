import React, { memo } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Ionicons, Octicons, MaterialIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// Function to determine the styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            logoTextFontSize: 20,
            iconSize: 26,
            paddingHorizontal: 35,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            logoTextFontSize: 17,
            iconSize: 24,
            paddingHorizontal: 30,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            logoTextFontSize: 16,
            iconSize: 22,
            paddingHorizontal: 25,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            logoTextFontSize: 14,
            iconSize: 20,
            paddingHorizontal: 20,
        };
    }
};

const dynamicStyles = getDynamicStyles();

const FeedHeader = ({ toMessagesScreen, onOpenNotifications, onOpenSettings, backButton, onBackPress, style }) => {
    if (backButton) {
        return (
            <Animated.View style={[styles.back_header, style]}>
                <TouchableOpacity onPress={onBackPress}>
                    <Ionicons name="chevron-back" size={dynamicStyles.iconSize} color="#000" />
                </TouchableOpacity>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[styles.main_ctnr, style]}>
            <View style={styles.logo}>
                <View style={styles.logo_image_ctnr}>
                    <Image
                        source={require('../../../frontend/assets/logo_black.png')}
                        style={styles.logo_image}
                    />
                </View>
                <Text style={[styles.logo_text, { fontSize: dynamicStyles.logoTextFontSize }]}>SPARTAN</Text>
            </View>

            <View style={styles.right_icons}>
                <RNBounceable onPress={onOpenNotifications} style={styles.heart_button}>
                    <Svg xmlns="http://www.w3.org/2000/svg" width={dynamicStyles.iconSize} height={dynamicStyles.iconSize} viewBox="0 0 24 24" fill="none">
                        <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#ccc" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"></Path>
                    </Svg>
                    {global.userData && global.userData.notificationNewEvents > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationText}>{global.userData.notificationNewEvents}</Text>
                        </View>
                    )}
                </RNBounceable>

                <RNBounceable onPress={toMessagesScreen} style={styles.message_button}>
                    <MaterialIcons name="alternate-email" size={dynamicStyles.iconSize + 1.5} color={'#ccc'} />
                </RNBounceable>
            </View>
            <RNBounceable onPress={onOpenSettings} style={styles.options_btn_ctnr}>
                <Octicons name="gear" size={dynamicStyles.iconSize - 1.5} color={'#ccc'} />
            </RNBounceable>
        </Animated.View>
    );
};

export default memo(FeedHeader);

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 1.5
    },
    back_header: {
        width: '100%',
        backgroundColor: '#fff',
        flexDirection: 'row',
        paddingLeft: dynamicStyles.paddingHorizontal,
    },
    logo: {
        marginBottom: 8,
        alignItems: 'center',
        flexDirection: 'row',
        paddingRight: 15,
    },
    logo_image_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo_image: {
        width: 27,
        height: 28,
    },
    logo_text: {
        paddingLeft: 2,
        fontFamily: 'Inter_600SemiBold',
    },
    right_icons: {
        flexDirection: 'row',
        position: 'absolute',
        right: dynamicStyles.paddingHorizontal,
        top: 2,
        alignItems: 'center',
    },
    heart_button: {
        marginRight: 20,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        right: -7.5,
        top: -5,
        backgroundColor: 'red',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationText: {
        color: '#fff',
        fontSize: 8,
        fontFamily: 'Outfit_600SemiBold'
    },
    options_btn_ctnr: {
        position: 'absolute',
        left: dynamicStyles.paddingHorizontal,
        top: 2.5,
    },
});
