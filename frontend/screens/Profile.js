import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Grid2, Activity } from 'iconsax-react-native'
import Footer from "../components/Footer";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileInfo from "../components/profile/ProfileInfo";
import EditProfileButton from "../components/profile/EditProfileButton";
import WorkoutStats from "../components/profile/WorkoutStats";

export default function Profile({ navigation }) {
    console.log('Profile Screen')

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ProfileHeader />
                <ProfileInfo />
                <EditProfileButton />
                <WorkoutStats />


                <View style={styles.panel_btns}>
                    <View style={styles.posts_btn}>
                        <Grid2 size="28" color="#359ffc" />
                    </View>
                    <View style={styles.activity_btn}>
                        <Activity size="28" color="#888" />
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
    panel_btns: {
        flexDirection: 'row',
        borderBottomWidth: 1.5,
        paddingBottom: 5,
        borderColor: '#82bbed',
        marginHorizontal: 6,
        marginTop: 10,
    },
    posts_btn: {
        width: '50%',
        alignItems: 'center'
    },
    activity_btn: {
        width: '50%',
        alignItems: 'center'
    }
});