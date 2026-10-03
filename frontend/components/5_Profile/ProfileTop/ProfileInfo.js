import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../../helper/usePFPs";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import theme from '../../../theme/mfpDark';
import DismissableTextInput from "../../common/DismissableTextInput";
import ProfileIdentity, { PROFILE_AVATAR_SIZE } from "./ProfileIdentity";

const scaledSize = (size) => scaleSize(size);
const PFP_RADIUS_FACTOR = 22.5 / 54;
const PFP_RING_PADDING_FACTOR = 2.25 / 54;
const PFP_RING_BORDER_FACTOR = 3 / 54;
const PFP_RING_RADIUS_FACTOR = 26.5 / (54 + 2 * 2.25);
const PFP_SIZE = PROFILE_AVATAR_SIZE;
const PFP_RADIUS = Math.round(PFP_SIZE * PFP_RADIUS_FACTOR);
const PFP_RING_PADDING = Math.round(PFP_SIZE * PFP_RING_PADDING_FACTOR);
const PFP_RING_BORDER = Math.round(PFP_SIZE * PFP_RING_BORDER_FACTOR);
const PFP_RING_RADIUS = Math.round((PFP_SIZE + PFP_RING_PADDING * 2) * PFP_RING_RADIUS_FACTOR);

export default function ProfileInfo({
    userData,
    pfp,
    onPressFollowers,
    onPressFollowing,
    isEditingBio = false,
    isSavingBio = false,
    bioValue = "",
    onBioChange,
    onBioSubmit,
    focusBioSignal = 0,
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
    const bioInputRef = useRef(null);
    useEffect(() => {
        if (!isEditingBio) return undefined;
        const timer = setTimeout(() => {
            try { bioInputRef.current?.focus?.(); } catch {}
        }, 120);
        return () => clearTimeout(timer);
    }, [isEditingBio, focusBioSignal]);

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

    const bio = isEditingBio ? (
        <DismissableTextInput
            ref={bioInputRef}
            style={[styles.bio_text, styles.bio_input, isSavingBio && styles.bio_input_disabled]}
            value={bioDraft}
            onChangeText={onBioChange}
            editable={!isSavingBio}
            multiline
            placeholder="No bio yet..."
            placeholderTextColor={theme.muted}
            onSubmitEditing={onBioSubmit}
            onBlur={onBioSubmit}
            returnKeyType="done"
            blurOnSubmit
        />
    ) : (
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
        width: PFP_SIZE,
        aspectRatio: 1,
        borderRadius: PFP_RADIUS,
    },
    bio_text: {
        // Make bio visually distinct from handle: lighter weight, softer color
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(13.5),
        color: theme.textSecondary,
        lineHeight: scaledSize(18),
        letterSpacing: 0.1,
        textAlign: 'center',
    },
    bio_input: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 0,
        minWidth: scaleSize(200),
        textAlignVertical: 'top',
    },
    bio_input_disabled: {
        opacity: 0.6,
    },
    bio_placeholder_text: {
        color: theme.muted,
    },
});
