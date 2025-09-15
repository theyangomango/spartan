import React from "react";
import { StyleSheet, View, Pressable, Text, Image } from "react-native";
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';

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
        borderWidth: scaleSize(3),
        borderColor: theme.primary,
        borderRadius: scaleSize(4),
    },
    badge: {
        position: 'absolute',
        right: scaleSize(6),
        bottom: scaleSize(6),
        minWidth: scaleSize(18),
        height: scaleSize(18),
        paddingHorizontal: scaleSize(4),
        borderRadius: scaleSize(9),
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    badgeText: {
        fontSize: scaleSize(10),
        color: '#fff',
        fontFamily: 'Inter_700Bold'
    }
});
