import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Send2 } from 'iconsax-react-native';

const ProfilePicture = ({ user, onSelect, isSelected }) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: isSelected ? 1 : 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
    }, [isSelected]);

    return (
        <Pressable style={styles.itemContainer} onPress={() => onSelect(user.uid)}>
            <View style={[styles.pfp_ctnr, isSelected && styles.selected_pfp]}>
                <FastImage
                    source={{ uri: user.pfp }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <Animated.View style={[styles.iconContainer, { opacity }]}>
                    <Send2 size='24' color="#2D9EFF" />
                </Animated.View>
            </View>
            <Text numberOfLines={1} style={styles.handle_text}>{user.handle}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        width: (Dimensions.get('window').width) / 3 - 15, // Adjust width based on screen width
        paddingVertical: 5,
        alignItems: 'center',
        margin: 5,
    },
    pfp_ctnr: {
        width: 78,
        aspectRatio: 1,
        borderRadius: 40,
        position: 'relative',
    },
    iconContainer: {
        position: 'absolute',
        bottom: -3,
        right: -4,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 3.5,
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    handle_text: {
        marginTop: 8,
        textAlign: 'center',
        fontFamily: 'Outfit_500Medium',
        fontSize: 12.5,
        color: '#555'
    },
});

export default ProfilePicture;
