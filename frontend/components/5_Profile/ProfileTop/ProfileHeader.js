import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { FontAwesome6, Entypo } from '@expo/vector-icons';
import { Setting2 } from "iconsax-react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";
import { AddSquare } from "iconsax-react-native";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";

const scaledSize = (size) => scaleSize(size);
const HEADER_MARGIN_TOP = scaleSize(5);
const HEADER_PADDING_TOP = scaleSize(2); // Keep vertical origin aligned with Feed/Workout header

export default function ProfileHeader({ onPressCreateBtn, onPressSettings }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.leftBtn} onPress={withStrongPress(onPressSettings)}>
                <Setting2 size={24} color={theme.textSecondary} />
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
                <RNBounceable onPress={withStrongPress(onPressCreateBtn)}>
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
        paddingHorizontal: scaleSize(scaledSize(22)),
        paddingBottom: scaleSize(scaledSize(15)),
        paddingTop: HEADER_PADDING_TOP,
        marginTop: HEADER_MARGIN_TOP,
    },
    center: {
        flexDirection: 'row',
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        padding: scaleSize(scaledSize(2)),
        color: theme.textPrimary,
    },
    down_arrow_ctnr: {
        justifyContent: 'center',
    },
    right: {
        flexDirection: 'row',
    },
    create_btn_ctnr: {
        borderWidth: scaleSize(scaledSize(1.5)),
        width: scaleSize(scaledSize(21.5)),
        borderRadius: scaleSize(scaledSize(5)),
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: theme.hairline,
    },
    leftBtn: { paddingTop: scaleSize(scaledSize(1)) },
});
