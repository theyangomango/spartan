import { Pressable, StyleSheet, Text, View, Dimensions } from "react-native";
import { Heart } from "iconsax-react-native";
import { useEffect, useState } from "react";
import FastImage from "react-native-fast-image";
import getStoriesPrefixSums from "../../../helper/getStoriesPrefixSums";
import { likeStory } from "./../../../../backend/stories/likeStory";
import { unlikeStory } from "./../../../../backend/stories/unlikeStory";
import scaleSize from "../../../helper/scaleSize";

export default function StoryHeaderButtons({
    stories,
    userList,
    index,
    toViewProfile,
}) {
    /** ---------- like‑state ---------- */
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

    /** ---------- dash math ---------- */
    const prefixSum = getStoriesPrefixSums(userList);
    const userIndex = prefixSum.findIndex((p) => index < p);
    const numOfStories = userList[userIndex].stories.length;
    const storyStartIndex = prefixSum[userIndex] - numOfStories;
    const relativeStoryIndex = index - storyStartIndex;

    /** ---------- render ---------- */
    return (
        <View style={styles.mainContainer}>
            {/*  LEFT  */}
            <Pressable onPress={() => toViewProfile(index)} style={styles.left}>
                <FastImage
                    key={stories[index].sid}
                    source={{ uri: stories[index].pfp }}
                    style={styles.pfp}
                />
                <Text style={styles.handleText}>{stories[index].handle}</Text>
            </Pressable>

            {/*  DASH STRIP  */}
            <View style={styles.dashContainer}>
                {Array.from({ length: numOfStories }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dash,
                            i === relativeStoryIndex ? styles.activeDash : styles.inactiveDash,
                            {
                                // flex grows/shrinks each dash evenly.
                                flex: 1,
                                // thin margins so we don’t waste space when many stories exist
                                marginHorizontal: numOfStories > 10 ? scaleSize(1) : scaleSize(2),
                                // cap width when there are only a few stories
                                maxWidth: scaleSize(42),
                            },
                        ]}
                    />
                ))}
            </View>

            {/*  RIGHT (Like button)  */}
            {stories[index].uid !== global.userData.uid &&
                <Pressable onPress={handlePressLikeButton} style={styles.likeBtn}>
                    {isLiked ? (
                        <Heart size={scaleSize(23)} color="#FF8A65" variant="Bold" />
                    ) : (
                        <Heart size={scaleSize(23)} color="#FF8A65" />
                    )}
                </Pressable>
            }
        </View>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    mainContainer: {
        position: "absolute",
        zIndex: 999,
        top: scaleSize(37),
        paddingHorizontal: scaleSize(20),

        flexDirection: "row",
        alignItems: "center",
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
        fontSize: scaleSize(18),
        fontFamily: "SourceSansPro_600SemiBold",
    },

    /* dash strip takes up all spare room */
    dashContainer: {
        flex: 1,                 // takes all spare room
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end", // ⟵ new: push dashes to the right
    },
    dash: {
        height: scaleSize(4),
        borderRadius: scaleSize(90),
    },
    activeDash: { backgroundColor: "#fff" },
    inactiveDash: { backgroundColor: "#bbb" },

    /* right block */
    likeBtn: {
        paddingLeft: scaleSize(10),
    },
});
