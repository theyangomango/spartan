import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { FontAwesome6, Octicons, Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function ProfileHeader({ onPressCreateBtn }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.options_btn_ctnr}>
                <Octicons name="gear" size={scaledSize(22.5)} color={'#ccc'} />
            </RNBounceable>
            <RNBounceable>
                <View style={styles.center}>
                    <Entypo name="chevron-down" size={scaledSize(18)} color="#fff" />
                    <Text style={styles.handle_text}>{global.userData.handle}</Text>
                    <View style={styles.down_arrow_ctnr}>
                        <Entypo name="chevron-down" size={scaledSize(18)} color="#666" />
                    </View>
                </View>
            </RNBounceable>
            <View style={styles.right}>
                <RNBounceable onPress={onPressCreateBtn}>
                    <View style={styles.create_btn_ctnr}>
                        <FontAwesome6 name='plus' size={scaledSize(13)} color="#bbb" />
                    </View>
                </RNBounceable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaledSize(17),
        paddingBottom: scaledSize(15),
    },
    center: {
        flexDirection: 'row',
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(16),
        padding: scaledSize(2),
        color: '#666',
    },
    down_arrow_ctnr: {
        justifyContent: 'center',
    },
    right: {
        flexDirection: 'row',
    },
    create_btn_ctnr: {
        borderWidth: scaledSize(1.5),
        width: scaledSize(21.5),
        borderRadius: scaledSize(5),
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#bbb',
    },
    options_btn_ctnr: {
        opacity: 0.5
    },
});
