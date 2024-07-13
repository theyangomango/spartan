import React, { useEffect, useState } from "react";
import { StyleSheet, View, Image } from "react-native";
import getPostImage from "../../../backend/storage/getPostImage";

export default function PostPreview({ postData }) {
    const image = postData.images[0];
    const [aspectRatio, setAspectRatio] = useState(1);

    useEffect(() => {
        Image.getSize(image, (width, height) => {
            // setAspectRatio(width / height);
            setAspectRatio(1);
        });
    }, [image]);

    return (
        <View style={[styles.main_ctnr, { aspectRatio }]}>
            <Image
                source={{ uri: image }}
                style={styles.image}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        margin: 1,
        // aspectRatio will be set dynamically
    },
    image: {
        flex: 1,
        borderRadius: 10,
    }
});
