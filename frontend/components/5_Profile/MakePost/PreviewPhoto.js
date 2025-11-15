import React from "react";
import { StyleSheet, View, Pressable, Text, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { withStrongPress } from "../../../utils/haptics";

const formatDuration = (value) => {
    const total = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

function PreviewPhoto({ asset, uri, type, duration, selected, order, onToggle }) {
    const handlePress = () => onToggle(asset);
    const isVideo = type === 'video';

    return (
        <Pressable onPress={withStrongPress(handlePress)} style={styles.image_ctnr} android_disableSound>
            {isVideo ? (
                <View style={styles.video_frame}>
                    <View style={styles.video_overlay} />
                    <View style={styles.video_badge}>
                        <Ionicons name='play' size={scaleSize(11)} color="#fff" style={{ marginRight: scaleSize(4) }} />
                        <Text style={styles.video_badge_text}>{formatDuration(duration)}</Text>
                    </View>
                </View>
            ) : (
                <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            )}
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
    prev.selected === next.selected &&
    prev.order === next.order &&
    prev.id === next.id &&
    prev.uri === next.uri &&
    prev.type === next.type
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
    video_frame: {
        flex: 1,
        backgroundColor: theme.field,
    },
    video_overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)'
    },
    video_badge: {
        position: 'absolute',
        left: scaleSize(6),
        bottom: scaleSize(6),
        borderRadius: scaleSize(10),
        backgroundColor: 'rgba(15,15,15,0.6)',
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(4),
        flexDirection: 'row',
        alignItems: 'center',
    },
    video_badge_text: {
        color: '#fff',
        fontSize: scaleSize(10),
        fontFamily: 'Outfit_600SemiBold',
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
