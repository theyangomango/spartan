import React, { useEffect, useRef, useState } from "react";
import {
    Modal,
    View,
    Pressable,
    StyleSheet,
    StatusBar,
    TextInput,
    Keyboard,
    Platform,
    KeyboardAvoidingView,
    SafeAreaView,
    Dimensions,
    Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import FastImage from "react-native-fast-image";
import Svg, { Path } from "react-native-svg";

import sendMessage from "../../../../backend/messages/sendMessage";
import { likeStory } from "../../../../backend/stories/likeStory";
import { unlikeStory } from "../../../../backend/stories/unlikeStory";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../../helper/scaleSize";

const { width: W } = Dimensions.get("window");

const COLORS = {
    accent: "#2D9EFF",
    white: "#FFFFFF",
    text: "#0F172A",
    subtext: "#9AA6B2",
    hairline: "rgba(2,6,23,0.08)",
    red: "#ff7465ff",
};

export default function FullStoryModal({
    isVisible,
    onClose,
    currentIndex,
    storiesData,
    userList,
    handleStoryNavigation,
    navigation,
}) {
    const thisUser = global.userData;
    const [replyText, setReplyText] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const pendingDirection = useRef(null);

    useEffect(() => {
        StatusBar.setHidden(isVisible, "fade");
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible || currentIndex === null) return;
        setIsReady(false);
        const s = storiesData[currentIndex];
        setIsLiked(s?.likedUsers?.includes(thisUser.uid));
    }, [currentIndex, isVisible]);

    useEffect(() => {
        if (!isReady || currentIndex === null) return;
        const prev = storiesData[currentIndex - 1];
        const next = storiesData[currentIndex + 1];
        const pre = [];
        if (prev) pre.push({ uri: prev.image });
        if (next) pre.push({ uri: next.image });
        if (pre.length) FastImage.preload(pre);
    }, [isReady, currentIndex, storiesData]);

    if (currentIndex === null) return null;
    const story = storiesData[currentIndex];

    // per-user segmented progress (hide when only one)
    const prefix = [];
    { let s = 0; for (const u of userList) { s += (u?.stories?.length || 0); prefix.push(s); } }
    const uIdx = prefix.findIndex((p) => currentIndex < p);
    const total = userList[uIdx]?.stories?.length || 1;
    const start = prefix[uIdx] - total;
    const rel = currentIndex - start; // 0-based

    const tryNavigate = (dir) => {
        if (isReady) handleStoryNavigation(dir);
        else pendingDirection.current = dir;
    };

    const handleImageLoaded = () => {
        setIsReady(true);
        if (pendingDirection.current !== null) {
            const dir = pendingDirection.current;
            pendingDirection.current = null;
            requestAnimationFrame(() => handleStoryNavigation(dir));
        }
    };

    const handleSendReply = async () => {
        const trimmed = replyText.trim();
        if (!trimmed) return;
        const list = Array.isArray(thisUser?.messages) ? thisUser.messages : [];
        const target = list.find(
            (m) =>
                Array.isArray(m?.otherUsers) &&
                m.otherUsers.length === 1 &&
                String(m.otherUsers[0]?.uid) === String(story?.uid)
        );
        if (target) {
            await sendMessage(thisUser.uid, thisUser.handle, target.mid, `Replied to your story: ${trimmed}`);
        }
        setReplyText("");
        Keyboard.dismiss();
    };

    const toggleLike = () => {
        if (isLiked) {
            unlikeStory(story.sid, thisUser.uid);
            story.likedUsers = (story.likedUsers || []).filter((u) => u !== thisUser.uid);
        } else {
            likeStory(story.sid, thisUser.uid);
            story.likedUsers = [...(story.likedUsers || []), thisUser.uid];
        }
        setIsLiked(!isLiked);
    };

    return (
        <Modal animationType="fade" transparent={false} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.root}>
                {/* media */}
                <FastImage
                    key={story.sid}
                    source={{ uri: story.image, priority: FastImage.priority.high }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={FastImage.resizeMode.cover}
                    onLoadEnd={handleImageLoaded}
                />

                {/* readability gradients */}
                <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.28)", "transparent"]} style={styles.gradTop} />
                <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.22)"]} style={styles.gradBottom} />

                {/* tap zones */}
                <Pressable disabled={!isReady} onPress={() => tryNavigate(-1)} style={styles.zoneLeft} />
                <Pressable disabled={!isReady} onPress={onClose} style={styles.zoneCenter} />
                <Pressable disabled={!isReady} onPress={() => tryNavigate(1)} style={styles.zoneRight} />

                {/* header (ABSOLUTE so y-level never moves) */}
                <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                    {/* segments: absolute ABOVE header, so it never shifts row */}
                    {total > 1 && (
                        <View style={styles.segmentsAbs} pointerEvents="none">
                            {Array.from({ length: total }).map((_, i) => (
                                <View key={i} style={styles.segmentTrack}>
                                    <View
                                        style={[
                                            styles.segmentFill,
                                            { width: `${i < rel ? 100 : i === rel ? 100 : 0}%` },
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {/* header row itself */}
                    <View style={styles.headerAbs}>
                        {/* left: pfp + handle chip (tap to profile) */}
                        <Pressable
                            onPress={() => { onClose(); navigation.navigate("ViewProfile", { user: story }); }}
                            style={styles.leftChip}
                        >
                            <FastImage
                                source={{ uri: story.pfpUri || story.pfp || story.image, priority: FastImage.priority.normal }}
                                style={styles.pfp}
                            />
                            <Text numberOfLines={1} style={styles.handle}>{story.handle}</Text>
                        </Pressable>

                        {/* right: wider translucent heart + close pill */}
                        <View style={styles.headerRight}>
                            <RNBounceable onPress={toggleLike} style={styles.likePill}>
                                {isLiked ? <HeartFilled /> : <HeartOutline />}
                            </RNBounceable>
                            <Pressable onPress={onClose} style={styles.closePill}>
                                <CloseIcon />
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>

                {/* reply bar (sleeker: font, icon size, height slightly reduced) */}
                {story.uid !== thisUser.uid && (
                    <>
                        <KeyboardAvoidingView
                            style={styles.fullScreenContainer}
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            pointerEvents="box-none">
                            <View style={styles.replyContainer}>
                                <TextInput
                                    style={styles.replyInput}
                                    placeholder="Send a reply..."
                                    placeholderTextColor="#999"
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    returnKeyType="send"
                                    onSubmitEditing={handleSendReply}
                                />
                                <Pressable onPress={handleSendReply} style={styles.sendIcon}>
                                    <Svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <Path d="m7.4 6.32 8.49-2.83c3.81-1.27 5.88.81 4.62 4.62l-2.83 8.49c-1.9 5.71-5.02 5.71-6.92 0l-.84-2.52-2.52-.84c-5.71-1.9-5.71-5.01 0-6.92ZM10.11 13.65l3.58-3.59" stroke={replyText.trim() ? "white" : "gray"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"></Path>
                                    </Svg>
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                        <View style={styles.bottomBuffer}></View>
                    </>
                )}
            </View>
        </Modal>
    );
}

/* ------------ icons ------------ */
const HeartFilled = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" fill={COLORS.red} />
    </Svg>
);
const HeartOutline = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke={COLORS.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
const CloseIcon = () => (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.text} strokeWidth="2.1" strokeLinecap="round" />
    </Svg>
);

/* ------------ styles ------------ */
const SEG_GAP = 4;

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },

    gradTop: { position: "absolute", top: 0, left: 0, right: 0, height: scaleSize(160) },
    gradBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: scaleSize(180) },

    zoneLeft: { position: "absolute", top: scaleSize(80), bottom: 0, left: 0, width: "28%" },
    zoneCenter: { position: "absolute", top: scaleSize(80), bottom: 0, left: "28%", width: "44%" },
    zoneRight: { position: "absolute", top: scaleSize(80), bottom: 0, right: 0, width: "28%" },

    /* Segments: absolute so they never push header down */
    segmentsAbs: {
        position: "absolute",
        top: scaleSize(45), left: scaleSize(8), right: scaleSize(8),
        flexDirection: "row",
        gap: SEG_GAP,
    },
    segmentTrack: {
        flex: 1,
        height: scaleSize(4),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(255,255,255,0.35)",
        overflow: "hidden",
    },
    segmentFill: { height: "100%", backgroundColor: COLORS.white },

    /* Header row: absolute fixed y-level */
    headerAbs: {
        position: "absolute",
        top: scaleSize(60), left: scaleSize(12), right: scaleSize(14),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    /* Left chip */
    leftChip: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: scaleSize(W * 0.6),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(16),
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    pfp: { width: scaleSize(32), height: scaleSize(32), borderRadius: scaleSize(18), backgroundColor: "#EEE" },
    handle: { marginLeft: scaleSize(8), color: "#fff", fontSize: scaleSize(17), fontFamily: "Outfit_600SemiBold" },

    /* Right controls */
    headerRight: { flexDirection: "row", alignItems: "center", gap: scaleSize(8) },

    // OG heart vibe: wider translucent pill
    likePill: {
        minWidth: scaleSize(60),
        height: scaleSize(38),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(18),
        backgroundColor: "rgba(0,0,0,0.40)",
        borderWidth: scaleSize(1),
        borderColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center",
    },
    // close = white chip
    closePill: {
        width: scaleSize(36), height: scaleSize(36), borderRadius: scaleSize(18),
        backgroundColor: COLORS.white,
        borderWidth: scaleSize(1), borderColor: COLORS.hairline,
        alignItems: "center", justifyContent: "center",
    },

    /* Bottom reply bar (slightly sleeker) */
    fullScreenContainer: {
        flex: 1,
        zIndex: 2,
        justifyContent: 'flex-end'
    },
    replyContainer: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.42)",
        borderRadius: scaleSize(22),
        paddingLeft: scaleSize(15),
        paddingRight: scaleSize(18),
        marginBottom: scaleSize(8),
        marginHorizontal: scaleSize(12),
    },
    replyInput: {
        flex: 1,
        color: "#eee",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(15),
        paddingVertical: scaleSize(16),
        paddingHorizontal: scaleSize(12),
    },
    bottomBuffer: { height: scaleSize(32) },
    sendIcon: { paddingLeft: scaleSize(8), paddingVertical: scaleSize(8) },
});
