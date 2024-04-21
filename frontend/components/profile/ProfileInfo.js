import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import getPFP from "../../../backend/storage/getPFP";

export default function ProfileInfo({ userData }) {
    const [pfp, setPFP] = useState(null);

    useEffect(() => {
        getPFP(userData.uid)
            .then(url => {
                setPFP(url)
            })
    }, []);

    return (
        <View>
            <View style={styles.top_row}>
                <Image
                    source={{ uri: pfp }}
                    style={styles.pfp}
                />
                <View style={styles.user_stats_ctnr}>
                    <View style={styles.user_stat}>
                        <Text style={styles.user_stat_count_text}>{userData.postCount}</Text>
                        <Text style={styles.user_stat_text}>Posts</Text>
                    </View>
                    <View style={styles.user_stat}>
                        <Text style={styles.user_stat_count_text}>{userData.followerCount}</Text>
                        <Text style={styles.user_stat_text}>Followers</Text>
                    </View>
                    <View style={styles.user_stat}>
                        <Text style={styles.user_stat_count_text}>{userData.followingCount}</Text>
                        <Text style={styles.user_stat_text}>Following</Text>
                    </View>
                </View>
            </View>

            <View style={styles.profile_info_ctnr}>
                <View style={styles.name_ctnr}>
                    <Text style={styles.name_text}>{userData.handle}</Text>
                </View>
                <View style={styles.bio_ctnr}>
                    <Text style={styles.bio_text}>{userData.bio}</Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    top_row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 80,
        alignItems: 'center',
        paddingHorizontal: 10
    },
    pfp: {
        width: 64,
        height: 64,
        borderRadius: 32,
        // backgroundColor: 'red',
    },
    user_stats_ctnr: {
        flexDirection: 'row',
        paddingHorizontal: 20
    },
    user_stat: {
        padding: 12,
        alignItems: 'center'
    },
    user_stat_count_text: {
        fontFamily: 'SourceSansPro_600SemiBold',
        fontSize: 20
    },
    user_stat_text: {
        fontFamily: 'SourceSansPro_400Regular',
        fontSize: 14
    },
    profile_info_ctnr: {
        paddingHorizontal: 10
    },
    name_ctnr: {
        paddingVertical: 5
    },
    name_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 18
    },
    bio_ctnr: {

    },
    bio_text: {
        fontFamily: 'SourceSansPro_400Regular',
        fontSize: 14,
        color: '#848484'
    },
});