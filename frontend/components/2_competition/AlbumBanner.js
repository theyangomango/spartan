import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function AlbumBanner() {
    return (
        <RNBounceable style={styles.container}>
            <Text style={styles.text}>See Progress Photos</Text>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#6FB8FF',
        borderRadius: 30,
        marginHorizontal: 15,
        marginTop: 15,
    },
    text: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
    },
});
