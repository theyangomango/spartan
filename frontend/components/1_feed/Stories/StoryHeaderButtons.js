import { Pressable, StyleSheet, Text, View } from "react-native";
import { Heart } from 'iconsax-react-native';
import { useEffect, useState } from "react";
import FastImage from 'react-native-fast-image';
import getStoriesPrefixSums from '../../../helper/getStoriesPrefixSums'

export default function StoryHeaderButtons({ stories, userList, index, toViewProfile }) {
    const [isLiked, setIsLiked] = useState(stories[index].likedUsers.includes(global.userData.uid));
    const prefixSum = getStoriesPrefixSums(userList);

    const getUserIndexForStory = (storyIndex) => {
        for (let i = 0; i < prefixSum.length; i++) {
            if (storyIndex < prefixSum[i]) {
                return i; 
            }
        }
        return -1;
    };

    const userIndex = getUserIndexForStory(index);
    const numOfStories = userList[userIndex].stories.length; 
    const storyStartIndex = prefixSum[userIndex] - userList[userIndex].stories.length;
    const relativeStoryIndex = index - storyStartIndex;

    useEffect(() => {
        setIsLiked(stories[index].likedUsers.includes(global.userData.uid));
    }, [index]);

    const handlePressLikeButton = () => {
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
    };

    return (
        <View style={styles.main_ctnr}>
            <Pressable onPress={() => toViewProfile(index)} style={styles.left}>
                <FastImage
                    key={stories[index].sid}
                    source={{ uri: stories[index].pfp }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <Text style={styles.handle_text}>{stories[index].handle}</Text>
            </Pressable>

            <View style={styles.right}>
                <View style={styles.dashContainer}>
                    {Array(numOfStories).fill(null).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dash,
                                i === relativeStoryIndex ? styles.activeDash : styles.inactiveDash
                            ]}
                        />
                    ))}
                </View>
                <Pressable onPress={handlePressLikeButton}>
                    {isLiked ?
                        <Heart size={23} color="#FF8A65" variant="Bold" /> :
                        <Heart size={23} color="#FF8A65" />
                    }
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        position: 'absolute',
        zIndex: 999
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
        flexDirection: 'row',
        alignItems: 'center'
    },
    dashContainer: {
        flexDirection: 'row',
        marginRight: 10
    },
    dash: {
        width: 33, 
        height: 3.5, 
        borderRadius: 50, 
        marginHorizontal: 2.5  
    },
    activeDash: {
        backgroundColor: '#ffffff'
    },
    inactiveDash: {
        backgroundColor: '#bbb'
    }
});
