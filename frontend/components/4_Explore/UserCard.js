import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import scaleSize from '../../helper/scaleSize';
import FastImage from 'react-native-fast-image';
import { withStrongPress } from '../../utils/haptics';
import VerifiedHandle from '../common/VerifiedHandle';

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
                <VerifiedHandle
                    handle={user.handle}
                    isVerified={Boolean(user?.isVerified ?? user?.verified)}
                    textStyle={styles.handle_text}
                    numberOfLines={1}
                />
                <Text style={styles.name_text}>{user.name}</Text>
            </View>

        </Pressable>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        marginHorizontal: scaleSize(8),
        paddingHorizontal: scaleSize(11),
        paddingVertical: scaleSize(9),
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: scaleSize(1.5),
        borderBottomColor: '#eee',
    },
    pfp_ctnr: {
        width: scaleSize(47),
        aspectRatio: 1,
        borderRadius: scaleSize(40),
        position: 'relative',
    },
    text_ctnr: {
        marginLeft: scaleSize(12),
        flex: 1,
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: scaleSize(40),
    },
    handle_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(12.5),
        color: '#000',
        marginBottom: scaleSize(1.5),
    },
    name_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: scaleSize(12.5),
        color: '#888',
    },
});

export default UserCard;
