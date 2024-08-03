import { useEffect, useState } from "react";
import { StyleSheet, View, Image, Pressable, Text } from "react-native";

export default function Photo({ uri, images, setImages }) {
    const [isSelected, setIsSelected] = useState(false);
    const [order, setOrder] = useState(images.length);

    function handlePress() {
        // * Selecting an Image
        if (!isSelected) {
            setImages([...images, uri]);
        }

        // * Deselecting an Image
        if (isSelected) {
            setImages(images.filter(img => {
                return img != uri;
            }));
        }

        setIsSelected(!isSelected);
    }

    useEffect(() => {
        setOrder(images.indexOf(uri) + 1);
    }, [images])

    return (
        <Pressable onPress={handlePress} style={styles.image_ctnr}>
            <Image source={{ uri: uri }} style={[styles.image, isSelected && styles.selected]} />
            {isSelected && <View style={styles.blue_icon}>
                <Text style={styles.blue_icon_text}>{order}</Text>
            </View>}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    image_ctnr: {
        width: `${100 / 3}%`,
        aspectRatio: 1
    },
    image: {
        flex: 1
    },
    selected: {
        opacity: 0.5
    },
    blue_icon: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#0499FE',
        justifyContent: 'center',
        alignItems: 'center'
    },
    blue_icon_text: {
        color: '#fff',
        fontFamily: 'Inter_700Bold'
    }
});