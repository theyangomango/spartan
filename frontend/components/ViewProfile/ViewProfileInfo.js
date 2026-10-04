import { StyleSheet, View, Text } from "react-native";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../helper/usePFPs";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import ProfileIdentity, { PFP_RADIUS, PFP_RING_BORDER, PFP_RING_PADDING, PFP_RING_RADIUS, PROFILE_AVATAR_SIZE } from "../5_Profile/ProfileTop/ProfileIdentity";

export default function ViewProfileInfo({ userData, onPressFollowers, onPressFollowing }) {
    const fallbackPfp = resolvePhotoURL(userData, userData?.image || '');
    const pfpUri = usePfp(String(userData?.uid || ''), userData?.pfpVersion || 0, fallbackPfp) || fallbackPfp;
    // Derive counts from array lengths for accuracy
    const followersCount = Array.isArray(userData?.followers) ? userData.followers.length : 0;
    const followingCount = Array.isArray(userData?.following) ? userData.following.length : 0;
    const trimmedBio = userData?.bio?.trim?.() ?? '';
    const bioText = trimmedBio.length > 0 ? trimmedBio : 'No bio yet...';

    const avatar = (
        <View style={styles.pfp_ctnr}>
            {pfpUri ? (
                <FastImage
                    source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
            ) : (
                <View style={[styles.pfp, { backgroundColor: theme.surface }]} />
            )}
        </View>
    );

    return (
        <ProfileIdentity
            avatar={avatar}
            bio={<Text style={[styles.bio_text, trimmedBio.length === 0 && styles.bio_placeholder_text]}>{bioText}</Text>}
            followersCount={followersCount}
            followingCount={followingCount}
            onPressFollowers={onPressFollowers}
            onPressFollowing={onPressFollowing}
        />
    );
}

const styles = StyleSheet.create({
    pfp_ctnr: {
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
        // Softer bio: lighter weight and secondary color
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
