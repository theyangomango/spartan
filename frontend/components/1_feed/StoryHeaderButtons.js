import { Pressable, StyleSheet, Text, View } from "react-native";
import { Blur, Heart } from 'iconsax-react-native'
import { useState } from "react";
import { likeStory } from "../../../backend/stories/likeStory";
import { unlikeStory } from "../../../backend/stories/unlikeStory";
import CachedImage from 'expo-cached-image';
import { BlurView } from 'expo-blur';

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
            <View style={styles.left}>
                <CachedImage
                    key={data.uid}
                    source={{ uri: data.pfp }}
                    style={styles.pfp}
                    cacheKey={data.uid}
                />
                <Text style={styles.handle_text}>{data.handle}</Text>
            </View>

            <View style={styles.right}>
                <Pressable onPress={handlePressLikeButton}>
                    {isLiked ?
                        <Heart size={21} color="#FF8A65" variant="Bold" /> :
                        <Heart size={21} color="#FF8A65" />
                    }
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50 
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    pfp: {
        width: 32,
        aspectRatio: 1,
        borderRadius: 22,
    },
    handle_text: {
        color: '#fff',
        padding: 8,
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold'
    },
    right: {
        justifyContent: 'center'
    },
})