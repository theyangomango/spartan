import { StyleSheet, View, Text } from "react-native";
import Footer from "../components/Footer";

export default function Profile({ navigation }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <View style={styles.header}>
                    <Text style={styles.handle_text}>yangbai</Text>
                    <View style={styles.create_btn_ctnr}>
                    </View>
                    <View style={styles.options_btn_ctnr}>

                    </View>
                </View>

                <View style={styles.second_header}>
                    <View style={styles.pfp}>
                    </View>

                    <View style={styles.user_stats_ctnr}>
                        <View style={styles.user_stat}>
                            <Text style={styles.user_stat_count_text}>3</Text>
                            <Text style={styles.user_stat_text}>Posts</Text>
                        </View>
                        <View style={styles.user_stat}>
                            <Text style={styles.user_stat_count_text}>25</Text>
                            <Text style={styles.user_stat_text}>Followers</Text>
                        </View>
                        <View style={styles.user_stat}>
                            <Text style={styles.user_stat_count_text}>25</Text>
                            <Text style={styles.user_stat_text}>Following</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.profile_info_ctnr}>
                    <View style={styles.name_ctnr}>
                        <Text style={styles.name_text}>Yang Bai</Text>
                    </View>
                    <View style={styles.bio_ctnr}>
                        <Text style={styles.bio_text}>jhs 26, ptx</Text>
                    </View>
                </View>


                <View style={styles.edit_profile_btn_ctnr}>
                    <View style={styles.edit_profile_btn}>
                        <Text style={styles.edit_profile_text}>Edit Profile</Text>
                    </View>

                </View>

                <View style={styles.workout_stats_ctnr}>
                    <View style={[styles.workout_stat, styles.total_workouts_stat_ctnr]}>
                        <Text style={styles.workout_stat_text}>Total Workouts</Text>
                        <Text style={[styles.workout_stat_number, styles.total_workouts_stat_number]}>54</Text>
                    </View>
                    <View style={[styles.workout_stat, styles.total_volume_stat_ctnr]}>
                        <Text style={styles.workout_stat_text}>Total Volume</Text>
                        <Text style={[styles.workout_stat_number, styles.total_volume_stat_number]}>2.9M lb</Text>
                    </View>
                    <View style={[styles.workout_stat, styles.gym_time_stat_ctnr]}>
                        <Text style={styles.workout_stat_text}>Time in Gym</Text>
                        <Text style={[styles.workout_stat_number, styles.gym_time_stat_number]}>3d 20h</Text>
                    </View>
                </View>
            </View>

            <Footer navigation={navigation} currentScreenName={'Profile'} />
        </View>

    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body_ctnr: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        height: 70,
        alignItems: 'flex-end',
        flexDirection: 'row',
        paddingHorizontal: 10
    },
    handle_text: {
        fontFamily: 'SourceSansPro_600SemiBold',
        fontSize: 18,
    },
    second_header: {
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
        backgroundColor: 'red',
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
    edit_profile_btn_ctnr: {
        paddingHorizontal: 5,
    },
    edit_profile_btn: {
        width: '100%',
        height: 36,
        marginTop: 12,
        borderRadius: 100,
        backgroundColor: '#0499FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    edit_profile_text: {
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        color: '#fff'
    },
    workout_stats_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    workout_stat: {
        width: 104,
        height: 68,
        borderRadius: 8,
        margin: 9,
        justifyContent: 'center',
        alignItems: 'center'
    },
    total_workouts_stat_ctnr: {
        backgroundColor: '#E1F0FF'
    },
    total_volume_stat_ctnr: {
        backgroundColor: '#E1FFE8'
    },
    gym_time_stat_ctnr: {
        backgroundColor: '#FFECE1'
    },
    workout_stat_text: {
        fontFamily: 'SourceSansPro_400Regular',
        fontSize: 12,
        color: '#515151'
    },
    workout_stat_number: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16
    },
    total_workouts_stat_number: {
        color: '#0499FE'
    },
    total_volume_stat_number: {
        color: '#3DC575'
    },
    gym_time_stat_number: {
        color: '#E95060'
    }
});