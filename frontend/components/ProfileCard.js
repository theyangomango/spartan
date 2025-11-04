import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import scaleSize from '../helper/scaleSize';
import FastImage from 'react-native-fast-image';
import { usePfp } from '../helper/usePFPs';
import theme from '../theme/mfpDark';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { withStrongPress } from '../utils/haptics';
import VerifiedHandle from './common/VerifiedHandle';
import useUserVerified from '../hooks/useUserVerified';
import { resolvePhotoURL } from '../utils/profilePhoto';

const { height } = Dimensions.get('window');

// Centralized scaler
const s = (n) => scaleSize(n);

// Tunables via scale
const SIZES = {
    pfp: s(38),
    handleFont: s(13),
    nameFont: s(12.5),
    icon: s(24),
    iconFilled: s(16),
    paddingV: s(10),
    paddingL: s(20),
    paddingR: s(22),
    cardRadius: s(12),
    ring: 2,
};

const ProfileCard = ({ user, onSelect, isSelected, baseBg, selectedBg }) => {
    // resolve PFP via uid (+ optional version) with immutable caching
    const pfpUri = usePfp(
        user.uid,
        user.pfpVersion ?? 0,
        resolvePhotoURL(user, "")
    );
    const radius = SIZES.pfp / 2;

    const isVerified = useUserVerified(user?.uid, Boolean(user?.isVerified ?? user?.verified));

    return (
        <Pressable
            onPress={withStrongPress(() => onSelect?.(user))}
            style={({ pressed }) => [
                styles.itemContainer,
                // Allow consumers to override the base and selected background colors.
                { backgroundColor: baseBg || styles.itemContainer.backgroundColor },
                (pressed || isSelected) && { backgroundColor: selectedBg || theme.field },
            ]}
            android_ripple={{ color: 'rgba(2,132,199,0.08)' }}
        >
            <LinearGradient
                colors={[theme.primary, theme.accentBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: SIZES.pfp, height: SIZES.pfp, borderRadius: radius, padding: SIZES.ring }}
            >
                <View style={{ flex: 1, borderRadius: scaleSize(radius - SIZES.ring), backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                    {pfpUri ? (
                        <FastImage
                            source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                            style={{ width: scaleSize(SIZES.pfp - 2 * (SIZES.ring + 2)), height: scaleSize(SIZES.pfp - 2 * (SIZES.ring + 2)), borderRadius: scaleSize((SIZES.pfp - 2 * (SIZES.ring + 2)) / 2), backgroundColor: theme.field }}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={{ width: scaleSize(SIZES.pfp - 2 * (SIZES.ring + 2)), height: scaleSize(SIZES.pfp - 2 * (SIZES.ring + 2)), borderRadius: scaleSize((SIZES.pfp - 2 * (SIZES.ring + 2)) / 2), backgroundColor: theme.field }} />
                    )}
                </View>
            </LinearGradient>
            <View style={styles.text_ctnr}>
                <VerifiedHandle
                    handle={user.handle}
                    isVerified={isVerified}
                    iconSize={scaleSize(15.5)}
                    textStyle={[styles.handle_text, { fontSize: scaleSize(SIZES.handleFont) }]}
                    numberOfLines={1}
                />
                <Text numberOfLines={1} style={[styles.name_text, { fontSize: scaleSize(SIZES.nameFont) }]}>
                    {user.name}
                </Text>
            </View>
            {isSelected ? (
                <LinearGradient
                    colors={[theme.primary, theme.accentBlue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: SIZES.icon, height: SIZES.icon, borderRadius: scaleSize(SIZES.icon / 2), alignItems: 'center', justifyContent: 'center' }}
                >
                    <Icon name="checkmark" size={Math.max(14, SIZES.iconFilled - 2)} color="#fff" />
                </LinearGradient>
            ) : (
                <View style={{ width: SIZES.icon, height: SIZES.icon, borderRadius: scaleSize(SIZES.icon / 2), borderWidth: scaleSize(StyleSheet.hairlineWidth * 2), borderColor: theme.hairline }} />
            )}
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
        // borderRadius: SIZES.cardRadius,
        backgroundColor: theme.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
    },
    // selected/pressed backgrounds are applied inline to allow overrides via props
    text_ctnr: {
        marginLeft: scaleSize(s(12)),
        flex: 1,
    },
    handle_text: {
        fontFamily: 'Outfit_700Bold',
        color: theme.textPrimary,
        marginBottom: scaleSize(s(2)),
        letterSpacing: 0.2,
    },
    name_text: {
        fontFamily: 'Outfit_500Medium',
        color: theme.textSecondary,
    },
    tickCircle: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ProfileCard;
