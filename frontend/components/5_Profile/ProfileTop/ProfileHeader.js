import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Setting2, Add } from "iconsax-react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../../theme/headerMetrics";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;
const CREATE_ICON_SIZE = ICON_SIZE + scaleSize(3.2);
const CREATE_ICON_STROKE_WIDTH = 3.25;

export default function ProfileHeader({ onPressCreateBtn, onPressSettings }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.iconBtn} onPress={withStrongPress(onPressSettings)}>
                <Setting2 size={ICON_SIZE} color={ICON_COLOR} variant="Linear" strokeWidth={ICON_STROKE_WIDTH} />
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
                    <Add size={CREATE_ICON_SIZE} color={ICON_COLOR} variant="Linear" strokeWidth={CREATE_ICON_STROKE_WIDTH} />
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
        paddingHorizontal: HEADER_HORIZONTAL_PADDING,
        paddingBottom: METRICS.paddingBottom,
        paddingTop: METRICS.paddingTop,
        marginTop: METRICS.marginTop,
        minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
    },
    center: {
        flexDirection: 'row',
        alignItems: 'center',
        height: METRICS.centerH,
        paddingBottom: scaleSize(3.5),
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        includeFontPadding: false,
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
