import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get("window");

const BASE_WIDTH = 390;  // Reference width (e.g., iPhone 14)
const BASE_HEIGHT = 844; // Reference height (e.g., iPhone 14)

// Scaled size function based on the reference device size
const scaledSize = (size) => {
    const scaleWidth = width / BASE_WIDTH;
    const scaleHeight = height / BASE_HEIGHT;
    const scale = Math.min(scaleWidth, scaleHeight); // Maintain aspect ratio
    return Math.round(size * scale);
};

export default function PostHeader({ data, url, position, totalImages, toViewProfile, openViewWorkout }) {
    return (
        <View style={styles.outer}>
            <BlurView intensity={0} style={styles.main_ctnr}>
                <View style={styles.left}>
                    <Pressable onPress={toViewProfile} style={styles.pfp_ctnr}>
                        <Image
                            source={{ uri: url }}
                            style={styles.pfp}
                        />
                    </Pressable>
                    <View style={styles.text_ctnr}>
                        <Pressable onPress={toViewProfile}>
                            <Text style={styles.handle_text}>
                                {data.handle}
                            </Text>
                        </Pressable>
                        <TouchableOpacity activeOpacity={0.5} onPress={openViewWorkout}>
                            <Text style={styles.date_text}>
                                9/30 Workout
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.right}>
                    {totalImages > 1 &&
                        <View style={styles.dotsContainer}>
                            {Array.from({ length: totalImages }).map((_, i) => (
                                <View
                                    key={i}
                                    style={i === position ? styles.dash : styles.dot}
                                />
                            ))}
                        </View>
                    }
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        position: 'absolute',
        zIndex: 1,
        top: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: scaledSize(40),
        borderTopRightRadius: scaledSize(40),
        overflow: 'hidden'
    },
    main_ctnr: {
        backgroundColor: 'rgba(37,42,54,0.1)',
        paddingTop: scaledSize(14),
        paddingBottom: scaledSize(9),
        paddingLeft: scaledSize(22),
        paddingRight: scaledSize(13),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: scaledSize(42.5),
        aspectRatio: 1,
        marginRight: scaledSize(5),
    },
    pfp: {
        flex: 1,
        borderRadius: scaledSize(43.5) / 2,
    },
    text_ctnr: {
        padding: scaledSize(4),
        justifyContent: 'center'
    },
    handle_text: {
        fontSize: scaledSize(12.5),
        paddingBottom: scaledSize(2),
        fontFamily: 'Poppins_600SemiBold',
        color: '#fff'
    },
    date_text: {
        fontSize: scaledSize(11),  // Make it smaller than the handle text
        color: '#7EB9F2',  // Blue color
        fontFamily: 'Poppins_700Bold',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaledSize(10),
    },
    dot: {
        width: scaledSize(9),
        height: scaledSize(5),
        borderRadius: scaledSize(5) / 2,
        backgroundColor: '#fff',
        opacity: 0.5,
        marginHorizontal: scaledSize(3.5),
    },
    dash: {
        width: scaledSize(21),
        height: scaledSize(5),
        borderRadius: scaledSize(5) / 2,
        backgroundColor: '#fff',
        marginHorizontal: scaledSize(3.5),
    },
});
