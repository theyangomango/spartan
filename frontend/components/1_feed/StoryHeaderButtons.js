import { Pressable, StyleSheet, View } from "react-native";
import { Heart } from 'iconsax-react-native'
import { useState } from "react";
import { likeStory } from "../../../backend/stories/likeStory";
import { unlikeStory } from "../../../backend/stories/unlikeStory";

export default function StoryHeaderButtons({ data }) {
    const [isLiked, setIsLiked] = useState(data.likedUsers.includes(global.userData.uid));

    function handlePressLikeButton() {
        if (!isLiked) {
            likeStory(data.sid, global.userData.uid);
        } else {
            unlikeStory(data.sid, global.userData.uid);
        }
        setIsLiked(!isLiked);
    }

    return (
        <View style={styles.main_ctnr}>
            <Pressable onPress={handlePressLikeButton}>
                {isLiked ?
                    <Heart size={21} color="#FF8A65" variant="Bold" /> :
                    <Heart size={21} color="#FF8A65" />
                }
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'flex-end'
    }
})