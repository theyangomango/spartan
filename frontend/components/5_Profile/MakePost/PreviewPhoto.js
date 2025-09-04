import React from "react";
import { StyleSheet, View, Pressable, Text, Image } from "react-native";

function PreviewPhoto({ id, uri, selected, order, onToggle }) {
    const handlePress = () => onToggle(uri);

    return (
        <Pressable onPress={handlePress} style={styles.image_ctnr} android_disableSound>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            {selected && (
                <>
                    <View style={styles.selectionRing} />
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{order}</Text>
                    </View>
                </>
            )}
        </Pressable>
    );
}

export default React.memo(PreviewPhoto, (prev, next) => (
    prev.selected === next.selected && prev.order === next.order && prev.id === next.id && prev.uri === next.uri
));

const styles = StyleSheet.create({
    image_ctnr: {
        width: `${100 / 3}%`,
        aspectRatio: 1,
        position: 'relative'
    },
    image: {
        flex: 1,
    },
    selectionRing: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 3,
        borderColor: '#0499FE',
        borderRadius: 4,
    },
    badge: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: '#0499FE',
        justifyContent: 'center',
        alignItems: 'center'
    },
    badgeText: {
        fontSize: 10,
        color: '#fff',
        fontFamily: 'Inter_700Bold'
    }
});
