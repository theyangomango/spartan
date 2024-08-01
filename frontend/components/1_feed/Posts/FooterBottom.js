import React from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';

const FooterBottom = ({ data, opacityAnim }) => {
    console.log(data.likes);

    return (
        <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
            <View style={styles.profilePictures}>
                <Image source={{ uri: global.userData.image }} style={[styles.profilePicture, styles.profilePicture1]} />
                <Image source={{ uri: global.userData.image }} style={[styles.profilePicture, styles.profilePicture2]} />
                <Image source={{ uri: global.userData.image }} style={[styles.profilePicture, styles.profilePicture3]} />
            </View>
            <Text style={styles.likedByText}>Liked by</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 12,
        left: 22,
        right: 13,
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePictures: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePicture: {
        width: 28,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    profilePicture1: {
        zIndex: 3,
    },
    profilePicture2: {
        marginLeft: -8,
        zIndex: 2,
    },
    profilePicture3: {
        marginLeft: -8,
        zIndex: 1,
    },
    likedByText: {
        marginLeft: 8,
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12.5,
    },
});

export default FooterBottom;
