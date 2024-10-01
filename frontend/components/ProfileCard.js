import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';

const { width, height } = Dimensions.get('window');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            pfpSize: 50,
            handleFontSize: 14,
            nameFontSize: 14,
            iconSize: 26,
            iconBorderWidth: 2,
            filledIconSize: 18,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            pfpSize: 47,
            handleFontSize: 12.5,
            nameFontSize: 12.5,
            iconSize: 24,
            iconBorderWidth: 2,
            filledIconSize: 16,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            pfpSize: 45,
            handleFontSize: 12,
            nameFontSize: 12,
            iconSize: 22,
            iconBorderWidth: 2,
            filledIconSize: 15,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            pfpSize: 44,
            handleFontSize: 11.5,
            nameFontSize: 11.5,
            iconSize: 21,
            iconBorderWidth: 2,
            filledIconSize: 14,
        };
    }
};

const dynamicStyles = getDynamicStyles();

const ProfileCard = ({ user, onSelect, isSelected }) => {
    return (
        <Pressable style={styles.itemContainer} onPress={() => onSelect(user)}>
            <View style={[styles.pfp_ctnr, { width: dynamicStyles.pfpSize, borderRadius: dynamicStyles.pfpSize / 2 }, isSelected && styles.selected_pfp]}>
                <FastImage
                    source={{ uri: user.pfp }}
                    style={[styles.pfp, { borderRadius: dynamicStyles.pfpSize / 2 }]}
                    resizeMode={FastImage.resizeMode.cover}
                />
            </View>
            <View style={styles.text_ctnr}>
                <Text numberOfLines={1} style={[styles.handle_text, { fontSize: dynamicStyles.handleFontSize }]}>{user.handle}</Text>
                <Text style={[styles.name_text, { fontSize: dynamicStyles.nameFontSize }]}>{user.name}</Text>
            </View>
            <View style={[
                styles.iconOutline, 
                { 
                    width: dynamicStyles.iconSize, 
                    height: dynamicStyles.iconSize, 
                    borderRadius: dynamicStyles.iconSize / 2, 
                    borderWidth: dynamicStyles.iconBorderWidth 
                },
                isSelected && styles.selectedIcon
            ]}>
                {isSelected && <View style={[styles.filledIcon, { width: dynamicStyles.filledIconSize, borderRadius: dynamicStyles.filledIconSize / 2 }]} />}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        paddingLeft: 20,
        paddingRight: 22,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        aspectRatio: 1,
        position: 'relative',
    },
    text_ctnr: {
        marginLeft: 12,
        flex: 1,
    },
    pfp: {
        width: '100%',
        height: '100%',
    },
    handle_text: {
        fontFamily: 'Poppins_600SemiBold',
        color: '#000',
        marginBottom: 1.5,
    },
    name_text: {
        fontFamily: 'Poppins_500Medium',
        color: '#888',
    },
    iconOutline: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedIcon: {
        borderColor: '#2D9EFF',
    },
    filledIcon: {
        aspectRatio: 1,
        backgroundColor: '#2D9EFF',
    },
});

export default ProfileCard;
