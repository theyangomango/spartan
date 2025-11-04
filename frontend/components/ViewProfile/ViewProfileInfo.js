import { StyleSheet, View, Text, Dimensions, Pressable } from "react-native";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../helper/usePFPs";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import theme from "../../theme/mfpDark";
import scaleSizeGlobal from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import formatHexStat from "../../utils/formatHexStat";
// Removed plus overlay next to PFP for cleaner ViewProfile

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // match Profile screen baseline
const scaleSize = (size) => Math.round(size * scale);

export default function ViewProfileInfo({ userData, onPressFollowers, onPressFollowing }) {
    const fallbackPfp = resolvePhotoURL(userData, userData?.image || '');
    const pfpUri = usePfp(String(userData?.uid || ''), userData?.pfpVersion || 0, fallbackPfp) || fallbackPfp;
    // Derive counts from array lengths for accuracy
    const followersCount = Array.isArray(userData?.followers) ? userData.followers.length : 0;
    const followingCount = Array.isArray(userData?.following) ? userData.following.length : 0;
    const overallLabel = `${formatHexStat(userData?.statsHexagon?.overall)} overall`;
    const trimmedBio = userData?.bio?.trim?.() ?? '';
    const bioText = trimmedBio.length > 0 ? trimmedBio : 'No bio yet...';

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <Pressable style={styles.followers_stat_ctnr} onPress={withStrongPress(onPressFollowers)} hitSlop={8}>
                    <Text style={styles.user_stat_count_text}>{followersCount}</Text>
                    <Text style={styles.user_stat_text}>Followers</Text>
                </Pressable>
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
                <Pressable style={styles.following_stat_ctnr} onPress={withStrongPress(onPressFollowing)} hitSlop={8}>
                    <Text style={styles.user_stat_count_text}>{followingCount}</Text>
                    <Text style={styles.user_stat_text}>Following</Text>
                </Pressable>
            </View>
            <View style={styles.profile_info_ctnr}>
                <View style={styles.name_and_score_ctnr}>
                    <Text style={styles.name_text}>{userData && userData.name}</Text>
                    <View style={styles.border_line}></View>
                    <Text style={styles.score_text}>{overallLabel}</Text>
                </View>
                <View style={styles.bio_ctnr}>
                    <Text style={[styles.bio_text, trimmedBio.length === 0 && styles.bio_placeholder_text]}>{bioText}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: scaleSize(5),
        marginBottom: scaleSize(5),
    },
    top_row: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pfp_ctnr: {
        marginHorizontal: scaleSize(12),
        alignItems: 'center',
        position: 'relative',
        borderWidth: scaleSize(3),
        borderRadius: scaleSize(26.5),
        padding: scaleSize(2.25),
        borderColor: theme.hairline,
    },
    pfp: {
        width: scaleSize(54),
        aspectRatio: 1,
        borderRadius: scaleSize(22.5),
    },
    followers_stat_ctnr: {
        alignItems: 'flex-end',
    },
    following_stat_ctnr: {
        alignItems: 'flex-start',
    },
    user_stat_count_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSizeGlobal(17),
        color: theme.textPrimary,
        paddingBottom: scaleSize(1),
    },
    user_stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSizeGlobal(14.5),
        color: theme.textSecondary,
    },
    profile_info_ctnr: {
        alignItems: 'center',
    },
    name_and_score_ctnr: {
        marginTop: scaleSize(18),
        flexDirection: 'row',
        paddingBottom: scaleSize(3.5),
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    border_line: {
        height: '60%',
        alignSelf: 'center',
        borderWidth: scaleSize(1),
        marginHorizontal: scaleSize(10),
        borderColor: theme.hairline,
    },
    name_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSizeGlobal(16),
        flex: 1,
        textAlign: 'right',
        color: theme.textPrimary,
    },
    score_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSizeGlobal(16),
        color: theme.primary,
        flex: 1,
        textAlign: 'left',
    },
    bio_ctnr: { marginTop: scaleSize(2) },
    bio_text: {
        // Softer bio: lighter weight and secondary color
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSizeGlobal(13),
        color: theme.textSecondary,
        lineHeight: scaleSize(17),
        letterSpacing: 0.1,
    },
    bio_placeholder_text: {
        color: theme.textPrimary,
    },
});
