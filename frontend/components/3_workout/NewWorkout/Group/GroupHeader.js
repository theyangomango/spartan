import React from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import TimerDisplay from "../TimerDisplay";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

const GroupHeader = ({
    viewingSelf,
    overlayPfp,
    onOpenMenu,
    onLongPressInvite,
    onFinish,
    countdown,
    onAddTime,
    timerRef,
    headerStyle,
}) => {
    return (
        <View style={headerStyle}>
            <View style={styles.rest_timer_ctnr}>
                <RNBounceable style={styles.iconWrapper} onPress={onAddTime}>
                    <MaterialCommunityIcons name="timer-outline" size={scaledSize(24)} color="#0499FE" />
                    {countdown > 0 && (
                        <Text style={styles.countdownText}>
                            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                        </Text>
                    )}
                </RNBounceable>
            </View>

            <View style={styles.timer_text_ctnr} pointerEvents="none">
                <TimerDisplay timerRef={timerRef} />
            </View>

            <View style={styles.header_right}>
                <View style={{ position: "relative" }}>
                    <Pressable
                        onPress={onOpenMenu}
                        onLongPress={onLongPressInvite}
                        style={[styles.group_btn, !viewingSelf && styles.group_btnFriend]}
                    >
                        <FontAwesome name="group" size={scaledSize(17)} color="#FFBB3D" />
                        <View style={[styles.overlayPfpWrap, !viewingSelf && styles.overlayPfpFriendRing]}>
                            {overlayPfp ? (
                                <FastImage
                                    source={{
                                        uri: overlayPfp,
                                        priority: FastImage.priority.normal,
                                        cache: FastImage.cacheControl.immutable,
                                    }}
                                    style={styles.overlayPfp}
                                />
                            ) : (
                                <View style={[styles.overlayPfp, { backgroundColor: "#EEE" }]} />
                            )}
                        </View>
                    </Pressable>
                </View>

                <RNBounceable onPress={onFinish} style={styles.finish_btn}>
                    <Text style={styles.finish_btn_text}>Finish</Text>
                </RNBounceable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    rest_timer_ctnr: {
        alignItems: "center",
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(10),
        borderRadius: scaledSize(12),
        backgroundColor: "#E1F0FF",
    },
    iconWrapper: {
        flexDirection: "row",
    },
    countdownText: {
        fontSize: scaledSize(16),
        color: "#0499FE",
        fontFamily: "Outfit_700Bold",
        marginLeft: scaledSize(6),
    },

    timer_text_ctnr: {
        position: "absolute", left: 0, right: 0, top: scaledSize(10),
    },

    header_right: { flexDirection: "row", alignItems: "center" },

    group_btn: {
        width: scaledSize(35),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: "#FFE8BC",
        justifyContent: "center",
        alignItems: "center",
        marginRight: scaledSize(10),
        overflow: "visible",
    },
    group_btnFriend: { backgroundColor: "#E1F0FF" },

    overlayPfpWrap: {
        position: "absolute",
        top: -scaledSize(6),
        right: -scaledSize(6),
        width: scaledSize(22),
        height: scaledSize(22),
        borderRadius: scaledSize(20),
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        borderWidth: 1,
        borderColor: "#fff",
    },
    overlayPfpFriendRing: { borderColor: "#2D9EFF" },

    overlayPfp: { width: "100%", height: "100%", borderRadius: scaledSize(20) },

    finish_btn: {
        width: scaledSize(80),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: "#DCFFE3",
        justifyContent: "center",
        alignItems: "center",
    },
    finish_btn_text: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(15.5),
        color: "#40D99B",
    },
});

export default GroupHeader;
