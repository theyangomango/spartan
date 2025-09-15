import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import scaleSize from '../../helper/scaleSize';
import FastImage from 'react-native-fast-image';

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

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
        marginHorizontal: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(11)),
        paddingVertical: scaleSize(scaledSize(9)),
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: scaledSize(1.5),
        borderBottomColor: '#eee',
    },
    pfp_ctnr: {
        width: scaleSize(scaledSize(47)),
        aspectRatio: 1,
        borderRadius: scaleSize(scaledSize(40)),
        position: 'relative',
    },
    text_ctnr: {
        marginLeft: scaleSize(scaledSize(12)),
        flex: 1,
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: scaleSize(scaledSize(40)),
    },
    handle_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(12.5),
        color: '#000',
        marginBottom: scaleSize(scaledSize(1.5)),
    },
    name_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: scaleSize(12.5),
        color: '#888',
    },
    iconOutline: {
        width: scaleSize(scaledSize(24)),
        height: scaleSize(scaledSize(24)),
        borderRadius: scaleSize(100),
        borderWidth: scaleSize(scaledSize(2)),
        borderColor: '#888',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaleSize(scaledSize(8)),
    },
    selectedIcon: {
        borderColor: '#2D9EFF',
    },
    filledIcon: {
        width: scaleSize(scaledSize(16)),
        aspectRatio: 1,
        borderRadius: scaleSize(100),
        backgroundColor: '#2D9EFF',
    },
});

export default UserCard;
