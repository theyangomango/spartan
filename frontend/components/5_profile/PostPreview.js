import { useEffect, useState } from "react";
import { StyleSheet, View, Image } from "react-native"
import getPostImage from "../../../backend/storage/getPostImage";

export default function PostPreview({ postData }) {
    const [image, setImage] = useState(null);
    useEffect(() => {
        getPostImage(postData.images[0])
            .then(url => {
                setImage(url);
            })
    }, []);

    return (
        <View style={styles.main_ctnr}>
            <Image
                source={{ uri: image }}
                style={styles.image}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: `${100 / 3}%`,
        aspectRatio: 1,
        backgroundColor: '#ddd'
    },
    image: {
        flex: 1,
    }
});