import { StyleSheet, View, Text, Image, TouchableOpacity, Animated } from "react-native";
import { Ionicons, Octicons, MaterialIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";
import { memo } from "react";

const FeedHeader = (({ toMessagesScreen, onOpenNotifications, onOpenSettings, backButton, onBackPress, style }) => {
    if (backButton) {
        return (
            <Animated.View style={[styles.back_header, style]}>
                <TouchableOpacity onPress={onBackPress}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
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
                <Text style={styles.logo_text}>SPARTAN</Text>
            </View>

            <View style={styles.right_icons}>
                <RNBounceable onPress={onOpenNotifications} style={styles.heart_button}>
                    <Svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#ccc" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"></Path>
                    </Svg>
                </RNBounceable>

                <RNBounceable onPress={toMessagesScreen} style={styles.message_button}>
                    <MaterialIcons name="alternate-email" size={25.5} color={'#ccc'} />
                </RNBounceable>
            </View>
            <RNBounceable onPress={onOpenSettings} style={styles.options_btn_ctnr}>
                <Octicons name="gear" size={22.5} color={'#ccc'} />
            </RNBounceable>
        </Animated.View>
    );
});

export default memo(FeedHeader);

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        paddingTop: 50,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    back_header: {
        width: '100%',
        paddingTop: 47,
        backgroundColor: '#fff',
        flexDirection: 'row',
        paddingLeft: 24,
        paddingBottom: 12,
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
        fontSize: 17,
        paddingLeft: 2,
        fontFamily: 'Inter_600SemiBold',
    },
    right_icons: {
        flexDirection: 'row',
        position: 'absolute',
        right: 30,
        top: 51,
        alignItems: 'center',
    },
    heart_button: {
        marginRight: 20,
    },
    options_btn_ctnr: {
        position: 'absolute',
        left: 30,
        top: 51.5,
    },
});
