import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated, Easing } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import FastImage from "react-native-fast-image";
import scaleSize from "../../helper/scaleSize";
const ts = require('../../helper/scaleSize').ts;
import VerifiedHandle from "../common/VerifiedHandle";
import theme from "../../theme/mfpDark";

const PODIUM_HEIGHT = scaleSize(260);
export { PODIUM_HEIGHT };

// Scaled sizes (baseline ~ iPhone 12/13: 390x844)
const PFP_SIZE_LEFT = scaleSize(60);
const PFP_SIZE_CENTER = scaleSize(64);
const PFP_SIZE_RIGHT = scaleSize(56);

const BAR_HEIGHT_LEFT = scaleSize(120);
const BAR_HEIGHT_CENTER = scaleSize(150);
const BAR_HEIGHT_RIGHT = scaleSize(100);
const BAR_WIDTH = scaleSize(86);

const FONT_HANDLE = ts(15);
const FONT_BAR = ts(27);

const BAR_RADIUS = scaleSize(10);
const BAR_MARGIN_H = scaleSize(18);

const HANDLE_PT = scaleSize(5);
const HANDLE_PB = scaleSize(10);
const BAR_TEXT_PT = scaleSize(6);

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function Podium({ data, topOffset = 0 }) {
    // Subtle animated drift for blue streaks
    const drift1 = useRef(new Animated.Value(0)).current;
    const drift2 = useRef(new Animated.Value(0)).current;
    const drift3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const makeLoop = (val, duration, delay = 0) => {
            const seq = Animated.sequence([
                Animated.timing(val, {
                    toValue: 1,
                    duration,
                    delay,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(val, {
                    toValue: 0,
                    duration,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]);
            return Animated.loop(seq);
        };

        // Slightly faster for more noticeable motion
        const l1 = makeLoop(drift1, 8000, 0);
        const l2 = makeLoop(drift2, 10000, 600);
        const l3 = makeLoop(drift3, 12000, 1200);

        l1.start();
        l2.start();
        l3.start();

        return () => {
            l1.stop();
            l2.stop();
            l3.stop();
        };
    }, [drift1, drift2, drift3]);

    // Increased amplitude and a touch of vertical parallax
    const tx1 = drift1.interpolate({ inputRange: [0, 1], outputRange: [-scaleSize(24), scaleSize(24)] });
    const tx2 = drift2.interpolate({ inputRange: [0, 1], outputRange: [-scaleSize(18), scaleSize(18)] });
    const tx3 = drift3.interpolate({ inputRange: [0, 1], outputRange: [-scaleSize(14), scaleSize(14)] });
    const ty2 = drift2.interpolate({ inputRange: [0, 1], outputRange: [-scaleSize(2.5), scaleSize(2.5)] });
    const ty3 = drift3.interpolate({ inputRange: [0, 1], outputRange: [scaleSize(1.5), -scaleSize(1.5)] });

    // Subtle opacity pulsing to enhance visibility
    const op1 = drift1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.0, 0.7] });
    const op2 = drift2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.95, 0.6] });
    const op3 = drift3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.9, 0.55] });

    if (!data) return <></>;
    return (
        <View style={[styles.container, { height: PODIUM_HEIGHT }]}>
            {/* Strips disabled per design request; keep block for easy re-enable */}
            {false && (
                <View style={styles.streaks_container}>
                    <AnimatedLinearGradient
                        colors={[
                            'rgba(45,158,255,0.00)', // transparent
                            'rgba(45,158,255,0.14)', // faint blue core
                            'rgba(45,158,255,0.00)', // transparent
                        ]}
                        locations={[0, 0.5, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[
                            styles.streak_base,
                            styles.streak_one,
                            { opacity: op1, transform: [{ translateX: tx1 }, { rotate: '-14deg' }] },
                        ]}
                    />
                    <AnimatedLinearGradient
                        colors={[
                            'rgba(45,158,255,0.00)',
                            'rgba(45,158,255,0.10)',
                            'rgba(45,158,255,0.00)',
                        ]}
                        locations={[0, 0.5, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[
                            styles.streak_base,
                            styles.streak_two,
                            { opacity: op2, transform: [{ translateX: tx2 }, { translateY: ty2 }, { rotate: '-12deg' }] },
                        ]}
                    />
                    <AnimatedLinearGradient
                        colors={[
                            'rgba(45,158,255,0.00)',
                            'rgba(45,158,255,0.08)',
                            'rgba(45,158,255,0.00)',
                        ]}
                        locations={[0, 0.5, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[
                            styles.streak_base,
                            styles.streak_three,
                            { opacity: op3, transform: [{ translateX: tx3 }, { translateY: ty3 }, { rotate: '-10deg' }] },
                        ]}
                    />
                </View>
            )}
            {/* Podium content band (top ~40% of screen) */}
            <View style={[styles.podium_band, { top: topOffset }]}>
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
                        <View style={styles.handleWrapper}>
                            <VerifiedHandle
                                handle={data[1].handle}
                                isVerified={Boolean(data[1]?.isVerified ?? data[1]?.verified)}
                                textStyle={[styles.leaderboard_handle_text, { fontSize: FONT_HANDLE }]}
                                numberOfLines={1}
                                containerStyle={styles.handleRow}
                            />
                        </View>
                    )}
                    <View style={[styles.bar_ctnr, styles.silver_ctnr, { height: BAR_HEIGHT_LEFT, width: BAR_WIDTH }]}>
                        {/* Unified number color for all bars */}
                        <Text style={[styles.bar_text_unified, { fontSize: FONT_BAR }]}>2</Text>
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
                        <View style={styles.handleWrapper}>
                            <VerifiedHandle
                                handle={data[0].handle}
                                isVerified={Boolean(data[0]?.isVerified ?? data[0]?.verified)}
                                textStyle={[styles.leaderboard_handle_text, { fontSize: FONT_HANDLE }]}
                                numberOfLines={1}
                                containerStyle={styles.handleRow}
                            />
                        </View>
                    )}
                    <View style={[styles.bar_ctnr, styles.gold_ctnr, { height: BAR_HEIGHT_CENTER, width: BAR_WIDTH }]}>
                        <Text style={[styles.bar_text_unified, { fontSize: FONT_BAR }]}>1</Text>
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
                        <View style={styles.handleWrapper}>
                            <VerifiedHandle
                                handle={data[2].handle}
                                isVerified={Boolean(data[2]?.isVerified ?? data[2]?.verified)}
                                textStyle={[styles.leaderboard_handle_text, { fontSize: FONT_HANDLE }]}
                                numberOfLines={1}
                                containerStyle={styles.handleRow}
                            />
                        </View>
                    )}
                    <View style={[styles.bar_ctnr, styles.bronze_ctnr, { height: BAR_HEIGHT_RIGHT, width: BAR_WIDTH }]}>
                        <Text style={[styles.bar_text_unified, { fontSize: FONT_BAR }]}>3</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        position: 'relative',
        backgroundColor: theme.bg,
    },
    // Subtle blue streaks only at the top portion
    streaks_container: {
        position: 'absolute',
        top: scaleSize(28), // nudge streaks lower
        left: 0,
        right: 0,
        height: '42%',
        overflow: 'hidden',
    },
    streak_base: {
        position: 'absolute',
        width: '160%',
        height: scaleSize(14),
        left: '-30%',
        borderRadius: scaleSize(14),
    },
    streak_one: {
        top: scaleSize(18),
        transform: [{ rotate: '-14deg' }],
    },
    streak_two: {
        top: scaleSize(44),
        height: scaleSize(18),
        transform: [{ rotate: '-12deg' }],
    },
    streak_three: {
        top: scaleSize(70),
        height: scaleSize(12),
        transform: [{ rotate: '-10deg' }],
    },
    // Top header band that holds the podium bars
    podium_band: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '100%',
        justifyContent: 'space-evenly',
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'transparent',
        paddingHorizontal: scaleSize(10),
    },
    bar_ctnr: {
        borderTopLeftRadius: BAR_RADIUS,
        borderTopRightRadius: BAR_RADIUS,
        marginHorizontal: BAR_MARGIN_H,
        marginTop: scaleSize(3),
        alignItems: 'center'
    },
    left: { alignItems: 'center', width: '28.5%' },
    center: { alignItems: 'center', width: '28.5%' },
    right: { alignItems: 'center', width: '28.5%' },
    // Slightly richer tones that sit better on dark
    silver_ctnr: { backgroundColor: '#D8DFEA' },
    gold_ctnr: { backgroundColor: '#FFC83D' },
    bronze_ctnr: { backgroundColor: '#FF9555' },
    pfp_ctnr: {
        aspectRatio: 1,
        borderRadius: scaleSize(50)
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(50),
    },
    leaderboard_handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
        paddingTop: HANDLE_PT,
    },
    handleWrapper: {
        paddingBottom: HANDLE_PB,
    },
    handleRow: {
        justifyContent: 'center',
    },
    bar_text: {
        fontFamily: 'Outfit_800ExtraBold',
        paddingTop: BAR_TEXT_PT,
        color: '#fff'
    },
    // Unified number color for all bars (high contrast on silver/gold/bronze)
    bar_text_unified: {
        fontFamily: 'Outfit_800ExtraBold',
        paddingTop: BAR_TEXT_PT,
        color: '#1A3A63',
    },
});
