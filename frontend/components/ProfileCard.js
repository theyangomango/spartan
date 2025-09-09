import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { usePfp } from '../helper/usePFPs';
import theme from '../theme/mfpDark';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

// Simple height-based scaler (baseline: iPhone 13 height 844)
const scale = (size) => Math.round(size * (height / 844));

// Tunables via scale
const SIZES = {
    pfp: scale(44),
    handleFont: scale(15),
    nameFont: scale(12.5),
    icon: scale(24),
    iconFilled: scale(16),
    paddingV: scale(10),
    paddingL: scale(20),
    paddingR: scale(22),
    cardRadius: scale(12),
    ring: 2,
};

const ProfileCard = ({ user, onSelect, isSelected }) => {
    // resolve PFP via uid (+ optional version) with immutable caching
    const pfpUri = usePfp(user.uid, user.pfpVersion ?? 0);
    const radius = SIZES.pfp / 2;

    return (
        <Pressable
            onPress={() => onSelect(user)}
            style={({ pressed }) => [
                styles.itemContainer,
                pressed && styles.itemPressed,
                isSelected && styles.itemContainerSelected,
            ]}
            android_ripple={{ color: 'rgba(2,132,199,0.08)' }}
        >
            <LinearGradient
                colors={["#2A65D9", "#59AAEE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: SIZES.pfp, height: SIZES.pfp, borderRadius: radius, padding: SIZES.ring }}
            >
                <View style={{ flex: 1, borderRadius: radius - SIZES.ring, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                    {pfpUri ? (
                        <FastImage
                            source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                            style={{ width: SIZES.pfp - 2 * (SIZES.ring + 2), height: SIZES.pfp - 2 * (SIZES.ring + 2), borderRadius: (SIZES.pfp - 2 * (SIZES.ring + 2)) / 2, backgroundColor: '#2E323C' }}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={{ width: SIZES.pfp - 2 * (SIZES.ring + 2), height: SIZES.pfp - 2 * (SIZES.ring + 2), borderRadius: (SIZES.pfp - 2 * (SIZES.ring + 2)) / 2, backgroundColor: '#2E323C' }} />
                    )}
                </View>
            </LinearGradient>

            <View style={styles.text_ctnr}>
                <Text numberOfLines={1} style={[styles.handle_text, { fontSize: SIZES.handleFont }]}>
                    {user.handle}
                </Text>
                <Text numberOfLines={1} style={[styles.name_text, { fontSize: SIZES.nameFont }]}>
                    {user.name}
                </Text>
            </View>

            {isSelected ? (
                <LinearGradient
                    colors={["#2A65D9", "#59AAEE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: SIZES.icon, height: SIZES.icon, borderRadius: SIZES.icon / 2, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Icon name="checkmark" size={Math.max(14, SIZES.iconFilled - 2)} color="#fff" />
                </LinearGradient>
            ) : (
                <View style={{ width: SIZES.icon, height: SIZES.icon, borderRadius: SIZES.icon / 2, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: '#3A3D45' }} />
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
        borderRadius: SIZES.cardRadius,
        backgroundColor: theme.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    itemContainerSelected: { backgroundColor: '#1E2128' },
    itemPressed: { backgroundColor: '#1E2128' },
    text_ctnr: {
        marginLeft: scale(12),
        flex: 1,
    },
    handle_text: {
        fontFamily: 'Outfit_700Bold',
        color: '#E5E7EB',
        marginBottom: scale(2),
        letterSpacing: 0.2,
    },
    name_text: {
        fontFamily: 'Outfit_500Medium',
        color: '#A1A7B3',
    },
    tickCircle: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ProfileCard;
