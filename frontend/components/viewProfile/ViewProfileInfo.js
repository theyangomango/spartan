import { StyleSheet, View, Text } from "react-native";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../helper/usePFPs";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import ProfileIdentity, { PROFILE_AVATAR_SIZE } from "../5_Profile/ProfileTop/ProfileIdentity";

const PFP_RADIUS_FACTOR = 22.5 / 54;
const PFP_RING_PADDING_FACTOR = 2.25 / 54;
const PFP_RING_BORDER_FACTOR = 3 / 54;
const PFP_RING_RADIUS_FACTOR = 26.5 / (54 + 2 * 2.25);
const PFP_SIZE = PROFILE_AVATAR_SIZE;
const PFP_RADIUS = Math.round(PFP_SIZE * PFP_RADIUS_FACTOR);
const PFP_RING_PADDING = Math.round(PFP_SIZE * PFP_RING_PADDING_FACTOR);
const PFP_RING_BORDER = Math.round(PFP_SIZE * PFP_RING_BORDER_FACTOR);
const PFP_RING_RADIUS = Math.round((PFP_SIZE + PFP_RING_PADDING * 2) * PFP_RING_RADIUS_FACTOR);

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
        width: PFP_SIZE,
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
