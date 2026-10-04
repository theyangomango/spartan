import React from "react";
import { StyleSheet, View, Text } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../../helper/usePFPs";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import theme from '../../../theme/mfpDark';
import ProfileIdentity, { PFP_RADIUS, PFP_RING_BORDER, PFP_RING_PADDING, PFP_RING_RADIUS, PROFILE_AVATAR_SIZE } from "./ProfileIdentity";

export default function ProfileInfo({
    userData,
    pfp,
    onPressFollowers,
    onPressFollowing,
    bioValue = "",
}) {
    const fallbackPfp = resolvePhotoURL(userData, "");
    const cachedPfp = usePfp(String(userData?.uid || ''), userData?.pfpVersion || 0, fallbackPfp);
    const pfpUri = pfp || cachedPfp || fallbackPfp || '';
    // Derive counts from array lengths for accuracy
    const followersCount = Array.isArray(userData?.followers) ? userData.followers.length : 0;
    const followingCount = Array.isArray(userData?.following) ? userData.following.length : 0;
    const bioDraft = typeof bioValue === "string" ? bioValue : String(bioValue ?? "");
    const trimmedBio = bioDraft.trim();
    const bioText = trimmedBio.length > 0 ? trimmedBio : 'No bio yet...';

    const renderPfpImage = () => (
        <View style={styles.pfp_ring}>
            {pfpUri ? (
                <FastImage
                    source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
            ) : (
                <View style={[styles.pfp, { backgroundColor: '#e5e7eb' }]} />
            )}
        </View>
    );

    const bio = (
        <Text style={[styles.bio_text, trimmedBio.length === 0 && styles.bio_placeholder_text]}>{bioText}</Text>
    );

    return (
        <ProfileIdentity
            avatar={renderPfpImage()}
            bio={bio}
            followersCount={followersCount}
            followingCount={followingCount}
            onPressFollowers={onPressFollowers}
            onPressFollowing={onPressFollowing}
        />
    );
}

const styles = StyleSheet.create({
    pfp_ring: {
        borderWidth: PFP_RING_BORDER,
        borderRadius: PFP_RING_RADIUS,
        padding: PFP_RING_PADDING,
        borderColor: theme.hairline,
    },
    pfp: {
        width: PROFILE_AVATAR_SIZE,
        aspectRatio: 1,
        borderRadius: PFP_RADIUS,
    },
    bio_text: {
        // Make bio visually distinct from handle: lighter weight, softer color
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(13.5),
        color: theme.textSecondary,
        lineHeight: scaleSize(18),
        letterSpacing: 0.1,
        textAlign: 'center',
    },
    bio_placeholder_text: {
        color: theme.muted,
    },
});
