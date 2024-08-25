import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, Dimensions } from "react-native";
import { Entypo } from '@expo/vector-icons';
import getPFP from "../../../../backend/storage/getPFP";
import RNBounceable from "@freakycoder/react-native-bounceable";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function ProfileInfo({ userData, pfp }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <View style={styles.followers_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData.followerCount}</Text>
                    <Text style={styles.user_stat_text}>Followers</Text>
                </View>
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                    <RNBounceable style={styles.plus_icon_ctnr}>
                        <Entypo name="plus" size={scaledSize(16)} color="#222" />
                    </RNBounceable>
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
                    <Text style={styles.score_text}>{userData.statsHexagon.overall} overall</Text>
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
        borderColor: '#ccc',
    },
    pfp: {
        width: scaledSize(54),
        aspectRatio: 1,
        borderRadius: scaledSize(22.5),
    },
    plus_icon_ctnr: {
        position: 'absolute',
        bottom: scaledSize(-8),
        backgroundColor: '#FCF375',
        width: scaledSize(35),
        height: scaledSize(20),
        borderRadius: scaledSize(10),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EBDF38',
        shadowOffset: { width: 0, height: scaledSize(0.5) },
        shadowOpacity: 1,
        shadowRadius: scaledSize(2),
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
        fontSize: scaledSize(17),
        color: '#555',
        paddingBottom: scaledSize(1),
    },
    user_stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(14.5),
        color: '#bfbfbf',
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
        borderColor: '#e7e7e7',
    },
    name_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(16),
        flex: 1,
        textAlign: 'right',
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
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(15),
        color: '#b3b3b3',
    },
});
