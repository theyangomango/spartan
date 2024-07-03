import { Pressable, StyleSheet, View } from "react-native";
import { Heart } from 'iconsax-react-native'
import { useState } from "react";

export default function StoryHeaderButtons({ data }) {
    console.log(data);

    const [isLiked, setIsLiked] = useState(false);

    function handlePressLikeButton() {
        setIsLiked(!isLiked);
    }

    return (
        <View style={styles.main_ctnr}>
            <Pressable onPress={handlePressLikeButton}>
                {isLiked ?
                    <Heart size={24} color="#FF8A65" variant="Bold" /> :
                    <Heart size={24} color="#FF8A65" />
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