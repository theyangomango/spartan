import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { Entypo } from '@expo/vector-icons';
import getPFP from "../../../backend/storage/getPFP";
import RNBounceable from "@freakycoder/react-native-bounceable";
import readDoc from "../../../backend/helper/firebase/readDoc";

export default function ViewProfileInfo({ user }) {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        getFullUserData();
    }, [user]);

    async function getFullUserData() {
        const data = await readDoc('users', user.uid);
        setUserData(data);
        console.log(data);
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <View style={styles.followers_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData && userData.followerCount}</Text>
                    <Text style={styles.user_stat_text}>Followers</Text>
                </View>
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: user.pfp }} style={styles.pfp} />
                    <RNBounceable style={styles.plus_icon_ctnr}>
                        <Entypo name="plus" size={16} color="#222" />
                    </RNBounceable>
                </View>
                <View style={styles.following_stat_ctnr}>
                    <Text style={styles.user_stat_count_text}>{userData && userData.followingCount}</Text>
                    <Text style={styles.user_stat_text}>Following</Text>
                </View>
            </View>
            <View style={styles.profile_info_ctnr}>
                <View style={styles.name_and_score_ctnr}>
                    <Text style={styles.name_text}>{user.name}</Text>
                    <View style={styles.border_line}></View>
                    <Text style={styles.score_text}>100 overall</Text>
                </View>
                <View style={styles.bio_ctnr}>
                    <Text style={styles.bio_text}>{userData && userData.bio}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginBottom: 5,
    },
    top_row: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pfp_ctnr: {
        marginHorizontal: 12,
        alignItems: 'center',
        position: 'relative',
        borderWidth: 3,
        borderRadius: 26.5,
        padding: 2.25,
        borderColor: '#ccc',
    },
    pfp: {
        width: 54,
        aspectRatio: 1,
        borderRadius: 22.5,
    },
    plus_icon_ctnr: {
        position: 'absolute',
        bottom: -8,
        backgroundColor: '#FCF375',
        width: 35,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EBDF38',
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 5,
    },
    followers_stat_ctnr: {
        alignItems: 'flex-end',
    },
    following_stat_ctnr: {
        alignItems: 'flex-start'
    },
    user_stat_count_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 17,
        color: '#555',
        paddingBottom: 1,
    },
    user_stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14.5,
        color: '#bfbfbf',
    },
    profile_info_ctnr: {
        alignItems: 'center',
    },
    name_and_score_ctnr: {
        marginTop: 25,
        flexDirection: 'row',
        paddingBottom: 3.5,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    border_line: {
        height: '60%',
        alignSelf: 'center',
        borderWidth: 1,
        marginHorizontal: 10,
        borderColor: '#e7e7e7',
    },
    name_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        flex: 1,
        textAlign: 'right',
    },
    score_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#0499FE',
        flex: 1,
        textAlign: 'left',
    },
    bio_ctnr: {},
    bio_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#b3b3b3',
    },
});
