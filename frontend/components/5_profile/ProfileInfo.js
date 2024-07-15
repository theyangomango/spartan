import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { Entypo } from '@expo/vector-icons';
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
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <View style={styles.pfp_ctnr}>
                    <Image
                        source={{ uri: pfp }}
                        style={styles.pfp}
                    />
                    <View style={styles.plus_icon_ctnr}>
                        <Entypo name="plus" size={14.5} color="white" />
                    </View>
                </View>
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
    main_ctnr: {
        paddingHorizontal: 1.5
    },
    top_row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 80,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    pfp_ctnr: {
        position: 'relative',
    },
    pfp: {
        // marginTop: 6,
        width: 69,
        aspectRatio: 1,
        borderRadius: 50,
    },
    plus_icon_ctnr: {
        position: 'absolute',
        bottom: 3,
        right: 0,
        backgroundColor: '#0098FF',
        width: 18,
        aspectRatio: 1,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plus_icon: {
        // color: 'white',
        // fontSize: 17,
        // lineHeight: 20,
    },
    user_stats_ctnr: {
        flexDirection: 'row',
        // paddingHorizontal: 2
        // marginRight: 12
    },
    user_stat: {
        paddingHorizontal: 15.5,
        alignItems: 'center'
    },
    user_stat_count_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20.5,
        color: '#222',
        paddingBottom: 1.5
    },
    user_stat_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 15.5,
        color: '#666'
    },
    profile_info_ctnr: {
        marginTop: 5,
        paddingHorizontal: 12
    },
    name_ctnr: {
        paddingVertical: 5
    },
    name_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 24
    },
    bio_ctnr: {

    },
    bio_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 16,
        color: '#848484'
    },
});
