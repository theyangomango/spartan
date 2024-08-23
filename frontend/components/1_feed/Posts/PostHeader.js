import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get("window");

// Function to determine the styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            pfpSize: 50,
            fontSize: 14,
            dotSize: { width: 10, height: 6, marginHorizontal: 4 },
            dashSize: { width: 24, height: 6, marginHorizontal: 4 },
            paddingTop: 18,
            paddingVertical: 6,
            paddingLeft: 25,
            paddingRight: 15,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            pfpSize: 43.5,
            fontSize: 12.5,
            dotSize: { width: 9, height: 5, marginHorizontal: 3.5 },
            dashSize: { width: 21, height: 5, marginHorizontal: 3.5 },
            paddingTop: 16,
            paddingVertical: 5,
            paddingLeft: 22,
            paddingRight: 13,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            pfpSize: 42,
            fontSize: 12,
            dotSize: { width: 8.5, height: 5, marginHorizontal: 3 },
            dashSize: { width: 20, height: 5, marginHorizontal: 3 },
            paddingTop: 15,
            paddingVertical: 5,
            paddingLeft: 21,
            paddingRight: 12,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            pfpSize: 40,
            fontSize: 11.5,
            dotSize: { width: 8, height: 4.5, marginHorizontal: 2.5 },
            dashSize: { width: 19, height: 4.5, marginHorizontal: 2.5 },
            paddingTop: 14,
            paddingVertical: 4.5,
            paddingLeft: 20,
            paddingRight: 11,
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function PostHeader({ data, url, position, totalImages, toViewProfile }) {
    return (
        <View style={styles.outer}>
            <BlurView intensity={0} style={styles.main_ctnr}>
                <Pressable onPress={toViewProfile} style={styles.left}>
                    <View style={styles.pfp_ctnr}>
                        <Image
                            source={{ uri: url }}
                            style={styles.pfp}
                        />
                    </View>
                    <View style={styles.text_ctnr}>
                        <Text style={styles.handle_text}>
                            {data.handle}
                        </Text>
                    </View>
                </Pressable>
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
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'hidden'
    },
    main_ctnr: {
        backgroundColor: 'rgba(37,42,54,0.1)',
        paddingTop: dynamicStyles.paddingTop,
        paddingLeft: dynamicStyles.paddingLeft,
        paddingRight: dynamicStyles.paddingRight,
        paddingVertical: dynamicStyles.paddingVertical,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
        marginRight: 5,
    },
    pfp: {
        flex: 1,
        borderRadius: dynamicStyles.pfpSize / 2,
    },
    text_ctnr: {
        padding: 4,
        justifyContent: 'center'
    },
    handle_text: {
        fontSize: dynamicStyles.fontSize,
        paddingBottom: 5,
        fontFamily: 'Poppins_600SemiBold',
        color: '#fff'
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    dot: {
        width: dynamicStyles.dotSize.width,
        height: dynamicStyles.dotSize.height,
        borderRadius: dynamicStyles.dotSize.height / 2,
        backgroundColor: '#fff',
        opacity: 0.5,
        marginHorizontal: dynamicStyles.dotSize.marginHorizontal,
    },
    dash: {
        width: dynamicStyles.dashSize.width,
        height: dynamicStyles.dashSize.height,
        borderRadius: dynamicStyles.dashSize.height / 2,
        backgroundColor: '#fff',
        marginHorizontal: dynamicStyles.dashSize.marginHorizontal,
    },
});
