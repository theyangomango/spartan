import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { FontAwesome6, Entypo } from '@expo/vector-icons';
import { Setting2 } from "iconsax-react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";
import { AddSquare } from "iconsax-react-native";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../../theme/headerMetrics";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 6);
const ICON_COLOR = "#CBD5E1";

export default function ProfileHeader({ onPressCreateBtn, onPressSettings }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.iconBtn} onPress={withStrongPress(onPressSettings)}>
                <Setting2 size={ICON_SIZE} color={ICON_COLOR} variant="Linear" />
            </RNBounceable>
            <RNBounceable>
                <View style={styles.center}>
                    <Text style={styles.handle_text}>{global.userData.handle}</Text>
                    {/* <View style={styles.down_arrow_ctnr}>
                        <Entypo name="chevron-down" size={scaleSize(18)} color="#A3A7B0" />
                    </View> */}
                </View>
            </RNBounceable>
            <View style={styles.right}>
                <RNBounceable style={styles.iconBtn} onPress={withStrongPress(onPressCreateBtn)}>
                    {/* <FontAwesome6 name='plus' size={scaleSize(13)} color="#bbb" /> */}
                    <AddSquare size={ICON_SIZE} color={ICON_COLOR} variant="Linear" />
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
        paddingHorizontal: METRICS.paddingH,
        paddingBottom: METRICS.paddingBottom,
        paddingTop: METRICS.paddingTop,
        marginTop: METRICS.marginTop,
        minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
    },
    center: {
        flexDirection: 'row',
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        padding: scaleSize(2),
        color: theme.textPrimary,
    },
    down_arrow_ctnr: {
        justifyContent: 'center',
    },
    right: {
        flexDirection: 'row',
    },
    iconBtn: {
        width: ICON_WRAPPER_SIZE,
        height: ICON_WRAPPER_SIZE,
        borderRadius: ICON_WRAPPER_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
