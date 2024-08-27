import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, Dimensions } from "react-native";
import { Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileInfo({ userData }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <View style={styles.followers_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData && userData.followerCount}</Text>
                    <Text style={styles.user_stat_text}>Followers</Text>
                </View>
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: userData && userData.image }} style={styles.pfp} />
                    <RNBounceable style={styles.plus_icon_ctnr}>
                        <Entypo name="plus" size={scaleSize(16)} color="#222" />
                    </RNBounceable>
                </View>
                <View style={styles.following_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData && userData.followingCount}</Text>
                    <Text style={styles.user_stat_text}>Following</Text>
                </View>
            </View>
            <View style={styles.profile_info_ctnr}>
                <View style={styles.name_and_score_ctnr}>
                    <Text style={styles.name_text}>{userData && userData.name}</Text>
                    <View style={styles.border_line}></View>
                    <Text style={styles.score_text}>{userData && userData.statsHexagon.overall} overall</Text>
                </View>
                <View style={styles.bio_ctnr}>
                    <Text style={styles.bio_text}>{userData && (userData.bio ? userData.bio : 'No bio yet...')}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
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
        borderColor: '#ccc',
    },
    pfp: {
        width: scaleSize(50),
        aspectRatio: 1,
        borderRadius: scaleSize(20.5),
    },
    plus_icon_ctnr: {
        position: 'absolute',
        bottom: scaleSize(-8),
        backgroundColor: '#FCF375',
        width: scaleSize(35),
        height: scaleSize(20),
        borderRadius: scaleSize(10),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EBDF38',
        shadowOffset: { width: 0, height: scaleSize(0.5) },
        shadowOpacity: 1,
        shadowRadius: scaleSize(2),
        elevation: 5,
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
        color: '#555',
        paddingBottom: scaleSize(1),
    },
    user_stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: '#bfbfbf',
    },
    profile_info_ctnr: {
        alignItems: 'center',
    },
    name_and_score_ctnr: {
        marginTop: scaleSize(25),
        flexDirection: 'row',
        paddingBottom: scaleSize(3.5),
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    border_line: {
        height: '60%',
        alignSelf: 'center',
        borderWidth: 1,
        marginHorizontal: scaleSize(10),
        borderColor: '#e7e7e7',
    },
    name_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(15.5),
        flex: 1,
        textAlign: 'right',
    },
    score_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(15.5),
        color: '#0499FE',
        flex: 1,
        textAlign: 'left',
    },
    bio_ctnr: {},
    bio_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14),
        color: '#b3b3b3',
    },
});
