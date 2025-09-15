import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Svg, { Path } from "react-native-svg";
import { likeStory } from "../../../../backend/stories/likeStory";
import { unlikeStory } from "../../../../backend/stories/unlikeStory";

import scaleSize from "../../../helper/scaleSize";

const COLORS = {
    red: "#FF3B30",
    hairline: "rgba(255,255,255,0.22)",
};

export default function StoryHeaderButtons({ stories, index, toViewProfile }) {
    const [isLiked, setIsLiked] = useState(
        stories[index].likedUsers.includes(global.userData.uid)
    );

    useEffect(() => {
        setIsLiked(stories[index].likedUsers.includes(global.userData.uid));
    }, [index]);

    const toggleLike = () => {
        const s = stories[index];
        if (isLiked) {
            unlikeStory(s.sid, global.userData.uid);
            s.likedUsers = s.likedUsers.filter((u) => u !== global.userData.uid);
        } else {
            likeStory(s.sid, global.userData.uid);
            s.likedUsers.push(global.userData.uid);
        }
        setIsLiked(!isLiked);
    };

    const s = stories[index];

    return (
        <View style={styles.row}>
            <Pressable onPress={() => toViewProfile(index)} style={styles.leftChip}>
                <FastImage source={{ uri: s.pfpUri || s.pfp || s.image }} style={styles.pfp} />
                <Text numberOfLines={1} style={styles.handle}>{s.handle}</Text>
            </Pressable>

            {s.uid !== global.userData.uid && (
                <RNBounceable onPress={toggleLike} style={styles.likePill}>
                    {isLiked ? <HeartFilled /> : <HeartOutline />}
                </RNBounceable>
            )}
        </View>
    );
}

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

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop },
    leftChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(16),
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    pfp: { width: scaleSize(32), height: scaleSize(32), borderRadius: scaleSize(18), backgroundColor: "#EEE" },
    handle: { marginLeft: scaleSize(8), color: "#fff", fontSize: scaleSize(17), fontFamily: "Outfit_600SemiBold" },

    // OG heart vibe: wider translucent pill
    likePill: {
        minWidth: scaleSize(56),
        height: scaleSize(36),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(18),
        backgroundColor: "rgba(0,0,0,0.40)",
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        alignItems: "center",
        justifyContent: "center",
    },
});
