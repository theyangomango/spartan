import { Pressable, StyleSheet, View } from "react-native";
import { Home, Cup, Weight, SearchNormal1, Profile } from 'iconsax-react-native'

export default function Footer({ navigation, currentScreenName }) {
    function toFeedScreen() {
        if (!global.userData) return;
        navigation.navigate('Feed');
    }

    function toCompetitionScreen() {
        if (!global.userData) return;
        navigation.navigate('Competition');
    }

    function toWorkoutScreen() {
        if (!global.userData) return;
        navigation.navigate('Workout');
    }

    function toExploreScreen() {
        if (!global.userData) return;
        navigation.navigate('Explore');
    }

    function toProfileScreen() {
        if (!global.userData) return;
        navigation.navigate('ProfileStack');
    }

    return (
        <View style={styles.outer_view}>
            <View style={styles.main_ctnr}>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={toFeedScreen}>
                        <View style={currentScreenName === 'Feed' ? styles.selectedIcon : styles.icon}>
                            <Home size="23" color="#fff" variant="Broken" />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={toCompetitionScreen}>
                        <View style={currentScreenName === 'Competition' ? styles.selectedIcon : styles.icon}>
                            <Cup size="23" color="#fff" />
                        </View>
                    </Pressable>
                </View>
                <View style={[styles.workout_icon_ctnr]}>
                    <Pressable onPress={toWorkoutScreen}>
                        <View style={currentScreenName === 'Workout' ? styles.selectedIcon : styles.icon}>
                            <Weight size="27" color="#fff" />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={toExploreScreen}>
                        <View style={currentScreenName === 'Explore' ? styles.selectedIcon : styles.icon}>
                            <SearchNormal1 size="21" color="#fff" />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={toProfileScreen}>
                        <View style={currentScreenName === 'Profile' ? styles.selectedIcon : styles.icon}>
                            <Profile size="23" color="#fff" variant="Broken" />
                        </View>
                    </Pressable>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    outer_view: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 110,
        backgroundColor: 'transparent',
        alignItems: 'center',
        // justifyContent: 'center'
    },
    main_ctnr: {
        width: '90.5%',
        height: 69.69696969696969696969,
        borderRadius: 60,
        backgroundColor: '#B3D2EE',
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 2,

        // // Todo Box Shadow
        // shadowColor: '#777',
        // shadowOffset: { width: 0, height: 0.4 },
        // shadowOpacity: 1,
        // shadowRadius: 2,
    },
    icon_ctnr: {
        flex: 1,
        alignItems: 'center',
        // paddingTop: 20,
        padding: 10,
    },
    workout_icon_ctnr: {
        flex: 1,
        alignItems: 'center',
        // paddingTop: 20,
        paddingHorizontal: 10,
        paddingVertical: 8.2,
    },
    icon: {
        padding: 13.5,
        borderRadius: 25,
    },
    selectedIcon: {
        padding: 13.5,
        backgroundColor: '#6FB8FF',
        borderRadius: 25,
    }
});
