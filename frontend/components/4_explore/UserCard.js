import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const UserCard = ({ user, toViewProfile }) => {
    return (
        <Pressable style={styles.itemContainer} onPress={() => toViewProfile(user)}>
            <View style={styles.pfp_ctnr}>
                <FastImage
                    source={{ uri: user.pfp }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
            </View>
            <View style={styles.text_ctnr}>
                <Text numberOfLines={1} style={styles.handle_text}>{user.handle}</Text>
                <Text style={styles.name_text}>{user.name}</Text>
            </View>

        </Pressable>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        marginHorizontal: scaledSize(8),
        paddingHorizontal: scaledSize(11),
        paddingVertical: scaledSize(9),
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: scaledSize(1.5),
        borderBottomColor: '#eee',
    },
    pfp_ctnr: {
        width: scaledSize(47),
        aspectRatio: 1,
        borderRadius: scaledSize(40),
        position: 'relative',
    },
    text_ctnr: {
        marginLeft: scaledSize(12),
        flex: 1,
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: scaledSize(40),
    },
    handle_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaledSize(12.5),
        color: '#000',
        marginBottom: scaledSize(1.5),
    },
    name_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: scaledSize(12.5),
        color: '#888',
    },
    iconOutline: {
        width: scaledSize(24),
        height: scaledSize(24),
        borderRadius: 100,
        borderWidth: scaledSize(2),
        borderColor: '#888',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaledSize(8),
    },
    selectedIcon: {
        borderColor: '#2D9EFF',
    },
    filledIcon: {
        width: scaledSize(16),
        aspectRatio: 1,
        borderRadius: 100,
        backgroundColor: '#2D9EFF',
    },
});

export default UserCard;
