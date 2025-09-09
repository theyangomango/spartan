import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { FontAwesome6, Octicons, Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Dimensions } from 'react-native';
import { AddSquare } from "iconsax-react-native";
import theme from "../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function ProfileHeader({ onPressCreateBtn, onPressSettings }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.leftBtn} onPress={onPressSettings}>
                <Octicons name="gear" size={scaledSize(22.5)} color={theme.textSecondary} />
            </RNBounceable>
            <RNBounceable>
                <View style={styles.center}>
                    <Text style={styles.handle_text}>{global.userData.handle}</Text>
                    {/* <View style={styles.down_arrow_ctnr}>
                        <Entypo name="chevron-down" size={scaledSize(18)} color="#A3A7B0" />
                    </View> */}
                </View>
            </RNBounceable>
            <View style={styles.right}>
                <RNBounceable onPress={onPressCreateBtn}>
                    <View style={styles.create_btn_ctnr}>
                        {/* <FontAwesome6 name='plus' size={scaledSize(13)} color="#bbb" /> */}
                        <AddSquare size={24} color={theme.textSecondary} />
                    </View>
                </RNBounceable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaledSize(22),
        paddingBottom: scaledSize(15),
        paddingTop: scaledSize(6)
    },
    center: {
        flexDirection: 'row',
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(16),
        padding: scaledSize(2),
        color: theme.textPrimary,
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
        borderColor: theme.hairline,
    },
    leftBtn: { paddingTop: scaledSize(1), paddingRight: scaledSize(6) },
});
