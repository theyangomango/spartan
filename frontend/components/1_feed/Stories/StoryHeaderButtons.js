import { Pressable, StyleSheet, Text, View } from "react-native";
import { Heart } from "iconsax-react-native";
import { useEffect, useState } from "react";
import FastImage from "react-native-fast-image";
import getStoriesPrefixSums from "../../../helper/getStoriesPrefixSums";
import { likeStory } from "./../../../../backend/stories/likeStory";
import { unlikeStory } from "./../../../../backend/stories/unlikeStory";
import scaleSize from "../../../helper/scaleSize";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Svg, { Path } from "react-native-svg";

export default function StoryHeaderButtons({
    stories,
    userList,
    index,
    toViewProfile,
}) {
    /* ---------- like-state ---------- */
    const [isLiked, setIsLiked] = useState(
        stories[index].likedUsers.includes(global.userData.uid)
    );

    useEffect(() => {
        setIsLiked(stories[index].likedUsers.includes(global.userData.uid));
    }, [index]);

    function handlePressLikeButton() {
        if (isLiked) {
            unlikeStory(stories[index].sid, global.userData.uid);
            stories[index].likedUsers = stories[index].likedUsers.filter(
                (uid) => uid !== global.userData.uid
            );
        } else {
            likeStory(stories[index].sid, global.userData.uid);
            stories[index].likedUsers.push(global.userData.uid);
        }
        setIsLiked(!isLiked);
    }

    /* ---------- dash math ---------- */
    const prefixSum = getStoriesPrefixSums(userList);
    const userIndex = prefixSum.findIndex((p) => index < p);
    const numOfStories = userList[userIndex].stories.length;
    const storyStartIndex = prefixSum[userIndex] - numOfStories;
    const relativeStoryIndex = index - storyStartIndex;
    const showDashes = numOfStories > 1;

    /* ---------- render ---------- */
    return (
        <View style={styles.mainContainer}>
            {/* DASH STRIP (top line) – rendered conditionally */}
            <View style={styles.dashContainer}>

                {showDashes && Array.from({ length: numOfStories }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dash,
                            i === relativeStoryIndex ? styles.activeDash : styles.inactiveDash,
                            {
                                flex: 1,
                                marginHorizontal: numOfStories > 10 ? scaleSize(1) : scaleSize(2),
                                maxWidth: scaleSize(42),
                            },
                        ]}
                    />
                ))}
            </View>

            {/* INFO ROW (second line) */}
            <View style={styles.infoRow}>
                {/* LEFT: profile pressable */}
                <Pressable
                    onPress={() => toViewProfile(index)}
                    style={styles.left}
                >
                    <FastImage
                        key={stories[index].sid}
                        source={{ uri: stories[index].pfp }}
                        style={styles.pfp}
                    />
                    <Text style={styles.handleText}>
                        {stories[index].handle}
                    </Text>
                </Pressable>

                {/* RIGHT: like button (omit if user’s own story) */}
                {stories[index].uid !== global.userData.uid && (
                    <RNBounceable
                        onPress={handlePressLikeButton}
                        style={styles.likeBtn}
                    >
                        {isLiked ? (
                            <Heart
                                size={scaleSize(22)}
                                color="#FF8A65"
                                variant="Bold"
                            />
                        ) : (
                            // <Heart size={scaleSize(21)} color="#FF8A65" />
                            <Svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none">
                                <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#FF8A65" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"></Path>
                            </Svg>
                        )}
                    </RNBounceable>
                )}
            </View>
        </View>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    mainContainer: {
        position: "absolute",
        top: scaleSize(38),
        width: "100%",
        paddingHorizontal: scaleSize(20),
        zIndex: 999,
    },
    dashContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        marginTop: scaleSize(7),
        marginBottom: scaleSize(13),   // keeps spacing only if row exists
    },
    dash: {
        height: scaleSize(3.5),
        borderRadius: scaleSize(90),
    },
    activeDash: { backgroundColor: "#5bb2ff" },
    inactiveDash: { backgroundColor: "#ececec" },

    /* ---------- info row ---------- */
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },

    /* left block */
    left: { flexDirection: "row", alignItems: "center" },
    pfp: {
        width: scaleSize(38),
        aspectRatio: 1,
        borderRadius: scaleSize(22),
    },
    handleText: {
        color: "#fff",
        paddingHorizontal: scaleSize(8),
        fontSize: scaleSize(19),
        fontFamily: "Outfit_600SemiBold",
    },

    /* right block */
    likeBtn: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(14),
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
});
