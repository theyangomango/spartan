import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Send2 } from 'iconsax-react-native';

const ProfileCard = ({ user, onSelect, isSelected }) => {
    console.log(user);

    return (
        <Pressable style={styles.itemContainer} onPress={() => onSelect(user.uid)}>
            <View style={[styles.pfp_ctnr, isSelected && styles.selected_pfp]}>
                <FastImage
                    source={{ uri: user.pfp }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
            </View>
            <View style={styles.text_ctnr}>
                <Text numberOfLines={1} style={styles.handle_text}>{user.handle}</Text>
                <Text style={styles.name_text}>Yang Bai</Text>
            </View>
            <View style={[styles.iconOutline, isSelected && styles.selectedIcon]}>
                {isSelected && <View style={styles.filledIcon} />}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center'
    },
    pfp_ctnr: {
        width: 47,
        aspectRatio: 1,
        borderRadius: 40,
        position: 'relative',
    },
    text_ctnr: {
        marginLeft: 12,
        flex: 1,
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    handle_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12.5,
        color: '#000',
        marginBottom: 1.5
    },
    name_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12.5,
        color: '#888'
    },
    iconOutline: {
        width: 24,
        height: 24,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#888',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8
    },
    selectedIcon: {
        borderColor: '#2D9EFF',
    },
    filledIcon: {
        width: 16,
        aspectRatio: 1,
        borderRadius: 100,
        backgroundColor: '#2D9EFF',
    }
});

export default ProfileCard;
