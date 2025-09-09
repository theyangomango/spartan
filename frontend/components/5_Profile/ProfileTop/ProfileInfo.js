import React from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import FastImage from 'react-native-fast-image';
import { usePfp } from "../../../helper/usePFPs";
import theme from '../../../theme/mfpDark';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function ProfileInfo({ userData, pfp }) {
    const pfpUri = usePfp(String(userData?.uid || ''), userData?.pfpVersion || 0) || pfp || '';
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <View style={styles.followers_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData.followerCount}</Text>
                    <Text style={styles.user_stat_text}>Followers</Text>
                </View>
                <View style={styles.pfp_ctnr}>
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
                <View style={styles.following_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData.followingCount}</Text>
                    <Text style={styles.user_stat_text}>Following</Text>
                </View>
            </View>
            <View style={styles.profile_info_ctnr}>
                <View style={styles.name_and_score_ctnr}>
                    <Text style={styles.name_text}>{global.userData.name}</Text>
                    <View style={styles.border_line}></View>
                    <Text style={styles.score_text}>{(userData?.statsHexagon?.overall ?? 0)} overall</Text>
                </View>
                <View style={styles.bio_ctnr}>
                    <Text style={styles.bio_text}>{(userData.bio ? userData.bio : 'No bio yet...')}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
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
        position: 'relative',
        borderWidth: scaledSize(3),
        borderRadius: scaledSize(26.5),
        padding: scaledSize(2.25),
        borderColor: require('../../../theme/mfpDark').default.hairline,
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
        fontSize: scaledSize(17),
        color: '#E5E7EB',
        paddingBottom: scaledSize(1),
    },
    user_stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(14.5),
        color: '#A5ACB8',
    },
    profile_info_ctnr: {
        alignItems: 'center',
    },
    name_and_score_ctnr: {
        marginTop: scaledSize(25),
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
        fontSize: scaledSize(16),
        flex: 1,
        textAlign: 'right',
        color: '#F1F5F9',
    },
    score_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(16),
        color: '#0499FE',
        flex: 1,
        textAlign: 'left',
    },
    bio_ctnr: {},
    bio_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(16),
        color: theme.textPrimary,
        letterSpacing: 0.1,
    },
});
