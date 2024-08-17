import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

export default function PostHeader({ data, url, position, totalImages }) {
    return (
        <View style={styles.outer}>
            <BlurView intensity={0} style={styles.main_ctnr}>
                <View style={styles.left}>
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
                </View>
                <View style={styles.right}>
                    {/* Render the dots and dash */}
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
        paddingTop: 16,
        paddingLeft: 22,
        paddingRight: 13,
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: 43.5,
        aspectRatio: 1,
        marginRight: 5,
    },
    pfp: {
        flex: 1,
        borderRadius: 30
    },
    text_ctnr: {
        padding: 4,
        justifyContent: 'center'
    },
    handle_text: {
        fontSize: 12.5,
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
        width: 9,
        height: 5,
        borderRadius: 5,
        backgroundColor: '#fff',
        opacity: 0.5,
        marginHorizontal: 3.5,
    },
    dash: {
        width: 25,
        height: 5,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginHorizontal: 3.5,
    },
});
