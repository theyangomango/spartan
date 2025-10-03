import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import scaleSize from '../../helper/scaleSize';
import FastImage from 'react-native-fast-image';
import { withStrongPress } from '../../utils/haptics';

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

const UserCard = ({ user, toViewProfile }) => {
    return (
        <Pressable style={styles.itemContainer} onPress={withStrongPress(() => toViewProfile?.(user))}>
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
        fontSize: scaleSize(12.5),
        color: '#000',
        marginBottom: scaledSize(1.5),
    },
    name_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: scaleSize(12.5),
        color: '#888',
    },
    iconOutline: {
        width: scaledSize(24),
        height: scaledSize(24),
        borderRadius: scaleSize(100),
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
        borderRadius: scaleSize(100),
        backgroundColor: '#2D9EFF',
    },
});

export default UserCard;
