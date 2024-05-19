import { Image, StyleSheet } from "react-native"
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ item, toPostList }) {
    return (
        <RNBounceable onPress={toPostList} style={styles.image_ctnr}>
            <Image source={{ uri: null }} style={styles.image} />
        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    image_ctnr: {
        flex: 1,
        flexDirection: 'column',
        margin: 1, // Adjust spacing between images
        aspectRatio: 1,
        backgroundColor: 'red' // This is just to visualize the container, remove if not needed
    },
    image: {
        width: '100%', // Makes each image fill the container
        // height: 100,
        resizeMode: 'cover' // Ensures the image covers the specified area without distortion
    },
})