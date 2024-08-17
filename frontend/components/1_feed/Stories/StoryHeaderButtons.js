import { Pressable, StyleSheet, Text, View } from "react-native";
import { Heart } from 'iconsax-react-native';
import { useEffect, useState } from "react";
import { likeStory } from "../../../../backend/stories/likeStory";
import { unlikeStory } from "../../../../backend/stories/unlikeStory";
import FastImage from 'react-native-fast-image'; // Import FastImage

export default function StoryHeaderButtons({ stories, index, toViewProfile }) {
    const [isLiked, setIsLiked] = useState(stories[index].likedUsers.includes(global.userData.uid));

    useEffect(() => {
        setIsLiked(stories[index].likedUsers.includes(global.userData.uid));
    }, [index]);

    function handlePressLikeButton() {
        if (!isLiked) {
            likeStory(stories[index].sid, global.userData.uid);
            stories[index].likedUsers.push(global.userData.uid);
        } else {
            unlikeStory(stories[index].sid, global.userData.uid);
            const i = stories[index].likedUsers.indexOf(global.userData.uid);
            if (i > -1) {
                stories[index].likedUsers.splice(i, 1);
            }
        }
        setIsLiked(!isLiked);
    }

    return (
        <View style={styles.main_ctnr}>
            <Pressable onPress={() => toViewProfile(index)} style={styles.left}>
                <FastImage
                    key={stories[index].sid}
                    source={{ uri: stories[index].pfp }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover} // Adjust resizeMode as needed
                />
                <Text style={styles.handle_text}>{stories[index].handle}</Text>
            </Pressable>

            <View style={styles.right}>
                <Pressable onPress={handlePressLikeButton}>
                    {isLiked ?
                        <Heart size={21} color="#FF8A65" variant="Bold" /> :
                        <Heart size={21} color="#FF8A65" />
                    }
                </Pressable>
            </View>
        </View>
    );
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
});
