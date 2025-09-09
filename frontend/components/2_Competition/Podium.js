import { StyleSheet, View, Text } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import FastImage from "react-native-fast-image";
import scaleSize from "../../helper/scaleSize";

// Scaled sizes (baseline ~ iPhone 12/13: 390x844)
const PFP_SIZE_LEFT = scaleSize(60);
const PFP_SIZE_CENTER = scaleSize(64);
const PFP_SIZE_RIGHT = scaleSize(56);

const BAR_HEIGHT_LEFT = scaleSize(105);
const BAR_HEIGHT_CENTER = scaleSize(133);
const BAR_HEIGHT_RIGHT = scaleSize(83);
const BAR_WIDTH = scaleSize(80);

const FONT_HANDLE = scaleSize(14);
const FONT_BAR = scaleSize(27);

const BAR_RADIUS = scaleSize(10);
const BAR_MARGIN_H = scaleSize(13);

const HANDLE_PT = scaleSize(4);
const HANDLE_PB = scaleSize(10);
const BAR_TEXT_PT = scaleSize(6);

export default function Podium({ data }) {
    if (!data) return <></>;
    return (
        <View style={styles.leaderboard_ctnr}>
            {/* soft navy gradient background for header */}
            <LinearGradient
                colors={["#1b2c49", "#162842", "rgba(111,184,255,0.26)"]}
                start={{ x: 0.10, y: 0.0 }}
                end={{ x: 0.90, y: 1.0 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {/* Left */}
            <View style={styles.left}>
                <View style={[styles.pfp_ctnr, { width: PFP_SIZE_LEFT }]}>
                    {data.length >= 2 && (
                        <FastImage
                            source={{ uri: data[1].pfp }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    )}
                </View>
                {data.length >= 2 && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.leaderboard_handle_text, { fontSize: FONT_HANDLE }]}>
                        {data[1].handle}
                    </Text>
                )}
                <View style={[styles.bar_ctnr, styles.silver_ctnr, { height: BAR_HEIGHT_LEFT, width: BAR_WIDTH }]}>
                    <Text style={[styles.bar_text, { fontSize: FONT_BAR }]}>2</Text>
                </View>
            </View>

            {/* Center */}
            <View style={styles.center}>
                <View style={[styles.pfp_ctnr, { width: PFP_SIZE_CENTER }]}>
                    {data.length >= 1 && (
                        <FastImage
                            source={{ uri: data[0].pfp }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    )}
                </View>
                {data.length >= 1 && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.leaderboard_handle_text, { fontSize: FONT_HANDLE }]}>
                        {data[0].handle}
                    </Text>
                )}
                <View style={[styles.bar_ctnr, styles.gold_ctnr, { height: BAR_HEIGHT_CENTER, width: BAR_WIDTH }]}>
                    <Text style={[styles.bar_text, { fontSize: FONT_BAR }]}>1</Text>
                </View>
            </View>

            {/* Right */}
            <View style={styles.right}>
                <View style={[styles.pfp_ctnr, { width: PFP_SIZE_RIGHT }]}>
                    {data.length >= 3 && (
                        <FastImage
                            source={{ uri: data[2].pfp }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    )}
                </View>
                {data.length >= 3 && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.leaderboard_handle_text, { fontSize: FONT_HANDLE }]}>
                        {data[2].handle}
                    </Text>
                )}
                <View style={[styles.bar_ctnr, styles.bronze_ctnr, { height: BAR_HEIGHT_RIGHT, width: BAR_WIDTH }]}>
                    <Text style={[styles.bar_text, { fontSize: FONT_BAR }]}>3</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    leaderboard_ctnr: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '40%',
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
        // Dark background to match Competition screen
        backgroundColor: '#131521',
        zIndex: -1
    },
    bar_ctnr: {
        borderTopLeftRadius: BAR_RADIUS,
        borderTopRightRadius: BAR_RADIUS,
        marginHorizontal: BAR_MARGIN_H,
        alignItems: 'center'
    },
    left: { alignItems: 'center', width: '28%' },
    center: { alignItems: 'center', width: '28%' },
    right: { alignItems: 'center', width: '28%' },
    silver_ctnr: { backgroundColor: '#C0C0C0' },
    gold_ctnr: { backgroundColor: '#FFD700' },
    bronze_ctnr: { backgroundColor: '#ff7e33' },
    pfp_ctnr: {
        aspectRatio: 1,
        borderRadius: 50
    },
    pfp: {
        flex: 1,
        borderRadius: 50,
    },
    leaderboard_handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
        paddingTop: HANDLE_PT,
        paddingBottom: HANDLE_PB,
    },
    bar_text: {
        fontFamily: 'Outfit_800ExtraBold',
        paddingTop: BAR_TEXT_PT,
        color: '#fff'
    },
});
