import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { usePfp } from '../helper/usePFPs';

const { height } = Dimensions.get('window');

// Simple height-based scaler (baseline: iPhone 13 height 844)
const scale = (size) => Math.round(size * (height / 844));

// Tunables via scale
const SIZES = {
    pfp: scale(44),
    handleFont: scale(14),
    nameFont: scale(12.5),
    icon: scale(24),
    iconBorder: Math.max(1, Math.round(scale(2))),
    iconFilled: scale(16),
    paddingV: scale(9),
    paddingL: scale(21),
    paddingR: scale(22),
    cardRadius: scale(12),
};

const ProfileCard = ({ user, onSelect, isSelected }) => {
    // resolve PFP via uid (+ optional version) with immutable caching
    const pfpUri = usePfp(user.uid, user.pfpVersion ?? 0);
    const radius = SIZES.pfp / 2;

    return (
        <Pressable
            style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}
            onPress={() => onSelect(user)}
        >
            <View style={[styles.pfp_ctnr, { width: SIZES.pfp, borderRadius: radius }]}>
                {pfpUri ? (
                    <FastImage
                        source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                        style={[styles.pfp, { borderRadius: radius }]}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                ) : (
                    <View style={[styles.pfp, { borderRadius: radius, backgroundColor: '#EEE' }]} />
                )}
            </View>

            <View style={styles.text_ctnr}>
                <Text numberOfLines={1} style={[styles.handle_text, { fontSize: SIZES.handleFont }]}>
                    {user.handle}
                </Text>
                <Text numberOfLines={1} style={[styles.name_text, { fontSize: SIZES.nameFont }]}>
                    {user.name}
                </Text>
            </View>

            <View
                style={[
                    styles.iconOutline,
                    {
                        width: SIZES.icon,
                        height: SIZES.icon,
                        borderRadius: SIZES.icon / 2,
                        borderWidth: SIZES.iconBorder,
                        borderColor: isSelected ? '#2D9EFF' : '#D0D7E2',
                    },
                ]}
            >
                {isSelected && (
                    <View
                        style={[
                            styles.filledIcon,
                            { width: SIZES.iconFilled, borderRadius: SIZES.iconFilled / 2 },
                        ]}
                    />
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        paddingLeft: SIZES.paddingL,
        paddingRight: SIZES.paddingR,
        paddingVertical: SIZES.paddingV,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: SIZES.cardRadius,
    },
    itemContainerSelected: {
        backgroundColor: '#E8F0FF', // light blue highlight for full card
    },
    pfp_ctnr: {
        aspectRatio: 1,
        position: 'relative',
    },
    pfp: {
        width: '100%',
        height: '100%',
    },
    text_ctnr: {
        marginLeft: scale(12),
        flex: 1,
    },
    handle_text: {
        fontFamily: 'Nunito_700Bold',
        color: '#000',
        marginBottom: scale(2),
    },
    name_text: {
        fontFamily: 'Nunito_600SemiBold',
        color: '#888',
    },
    iconOutline: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    filledIcon: {
        aspectRatio: 1,
        backgroundColor: '#2D9EFF',
    },
});

export default ProfileCard;
