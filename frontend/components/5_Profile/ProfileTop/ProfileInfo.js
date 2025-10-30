import React, { useEffect, useRef, useMemo } from "react";
import { StyleSheet, View, Text, Dimensions, Pressable, Animated } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../../helper/usePFPs";
import theme from '../../../theme/mfpDark';
import { withStrongPress } from "../../../utils/haptics";
import DismissableTextInput from "../../common/DismissableTextInput";
import formatHexStat from "../../../utils/formatHexStat";

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

export default function ProfileInfo({
    userData,
    pfp,
    onPressFollowers,
    onPressFollowing,
    onPressEditPfp,
    isEditingBio = false,
    isSavingBio = false,
    bioValue = "",
    onBioChange,
    onBioSubmit,
    focusBioSignal = 0,
}) {
    const cachedPfp = usePfp(String(userData?.uid || ''), userData?.pfpVersion || 0);
    const pfpUri = pfp || cachedPfp || '';
    // Derive counts from array lengths for accuracy
    const followersCount = Array.isArray(userData?.followers) ? userData.followers.length : 0;
    const followingCount = Array.isArray(userData?.following) ? userData.following.length : 0;
    const overallLabel = `${formatHexStat(userData?.statsHexagon?.overall)} overall`;
    const bioDraft = typeof bioValue === "string" ? bioValue : String(bioValue ?? "");
    const trimmedBio = bioDraft.trim();
    const bioText = trimmedBio.length > 0 ? trimmedBio : 'No bio yet...';
    const bioInputRef = useRef(null);
    const editBadgeScale = useRef(new Animated.Value(1)).current;
    const pfpScale = useRef(new Animated.Value(1)).current;

    const handleEditPfpPress = useMemo(() => withStrongPress(onPressEditPfp), [onPressEditPfp]);

    useEffect(() => {
        if (!isEditingBio) return undefined;
        const timer = setTimeout(() => {
            try { bioInputRef.current?.focus?.(); } catch {}
        }, 120);
        return () => clearTimeout(timer);
    }, [isEditingBio, focusBioSignal]);

    const triggerBounceAnimations = () => {
        pfpScale.setValue(0.94);
        editBadgeScale.setValue(0.92);
        Animated.parallel([
            Animated.spring(pfpScale, {
                toValue: 1,
                stiffness: 240,
                damping: 16,
                mass: 0.7,
                useNativeDriver: true,
            }),
            Animated.spring(editBadgeScale, {
                toValue: 1,
                stiffness: 220,
                damping: 14,
                mass: 0.7,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const isEditable = typeof onPressEditPfp === 'function';

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

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <Pressable style={styles.followers_stat_ctnr} onPress={withStrongPress(onPressFollowers)} hitSlop={8}>
                    <Text style={styles.user_stat_count_text}>{followersCount}</Text>
                    <Text style={styles.user_stat_text}>Followers</Text>
                </Pressable>
                <View style={styles.pfp_ctnr}>
                    {isEditable ? (
                        <Pressable
                            style={[styles.pfp_pressable]}
                            onPress={() => {
                                triggerBounceAnimations();
                                handleEditPfpPress?.();
                            }}
                            hitSlop={{ top: scaledSize(6), bottom: scaledSize(6), left: scaledSize(6), right: scaledSize(6) }}
                        >
                            <Animated.View style={{ transform: [{ scale: pfpScale }] }}>
                                {renderPfpImage()}
                            </Animated.View>
                            <Animated.View
                                style={[
                                    styles.edit_badge,
                                    {
                                        transform: [
                                            { translateY: scaledSize(10) },
                                            { scale: editBadgeScale },
                                        ],
                                    },
                                ]}
                            >
                                <Text style={styles.edit_badge_text}>Edit</Text>
                            </Animated.View>
                        </Pressable>
                    ) : (
                        renderPfpImage()
                    )}
                </View>
                <Pressable style={styles.following_stat_ctnr} onPress={withStrongPress(onPressFollowing)} hitSlop={8}>
                    <Text style={styles.user_stat_count_text}>{followingCount}</Text>
                    <Text style={styles.user_stat_text}>Following</Text>
                </Pressable>
            </View>
            <View style={styles.profile_info_ctnr}>
                <View style={styles.name_and_score_ctnr}>
                    <Text style={styles.name_text}>{global.userData.name}</Text>
                    <View style={styles.border_line}></View>
                    <Text style={styles.score_text}>{overallLabel}</Text>
                </View>
                <View style={styles.bio_ctnr}>
                    {isEditingBio ? (
                        <DismissableTextInput
                            ref={bioInputRef}
                            style={[
                                styles.bio_text,
                                styles.bio_input,
                                isSavingBio && styles.bio_input_disabled,
                                trimmedBio.length === 0 && styles.bio_placeholder_text,
                            ]}
                            value={bioDraft}
                            onChangeText={onBioChange}
                            editable={!isSavingBio}
                            multiline
                            placeholder="No bio yet..."
                            placeholderTextColor={theme.textSecondary}
                            onSubmitEditing={onBioSubmit}
                            onBlur={onBioSubmit}
                            returnKeyType="done"
                            blurOnSubmit
                        />
                    ) : (
                        <Text style={[styles.bio_text, trimmedBio.length === 0 && styles.bio_placeholder_text]}>{bioText}</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: scaleSize(5),
        marginBottom: scaledSize(5),
    },
    top_row: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pfp_ctnr: {
        marginHorizontal: scaledSize(12),
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingBottom: scaledSize(12),
    },
    pfp_pressable: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pfp_ring: {
        borderWidth: scaledSize(3),
        borderRadius: scaledSize(26.5),
        padding: scaledSize(2.25),
        borderColor: theme.hairline,
    },
    pfp: {
        width: scaledSize(54),
        aspectRatio: 1,
        borderRadius: scaledSize(22.5),
    },
    followers_stat_ctnr: {
        alignItems: 'flex-end',
    },
    following_stat_ctnr: {
        alignItems: 'flex-start',
    },
    user_stat_count_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(17),
        color: '#E5E7EB',
        paddingBottom: scaledSize(1),
    },
    user_stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: '#A5ACB8',
    },
    profile_info_ctnr: {
        alignItems: 'center',
    },
    name_and_score_ctnr: {
        marginTop: scaledSize(20),
        flexDirection: 'row',
        paddingBottom: scaledSize(3.5),
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    border_line: {
        height: '60%',
        alignSelf: 'center',
        borderWidth: scaledSize(1),
        marginHorizontal: scaledSize(10),
        borderColor: require('../../../theme/mfpDark').default.hairline,
    },
    name_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        flex: 1,
        textAlign: 'right',
        color: '#F1F5F9',
    },
    score_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        color: '#0499FE',
        flex: 1,
        textAlign: 'left',
    },
    bio_ctnr: { marginTop: scaledSize(2) },
    bio_text: {
        // Make bio visually distinct from handle: lighter weight, softer color
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        lineHeight: scaledSize(17),
        letterSpacing: 0.1,
        textAlign: 'center',
        paddingHorizontal: scaledSize(8),
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
        color: '#FFFFFF',
    },
    edit_badge: {
        position: 'absolute',
        bottom: 0,
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(4),
        borderRadius: scaledSize(12),
        backgroundColor: '#334c7ad6', // gold accent for edit badge
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: scaledSize(4),
        shadowOffset: { width: 0, height: scaledSize(2) },
        elevation: 4,
    },
    edit_badge_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});
