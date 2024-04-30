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
        <View style={styles.main_ctnr}>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toFeedScreen}>
                    {currentScreenName != 'Feed' &&
                        <Home size="32" color="#888" variant="Broken" />
                    }
                    {currentScreenName == 'Feed' &&
                        < Home size="32" color="#0499fe" variant="Broken" />
                    }
                </Pressable>

            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toCompetitionScreen}>
                    {currentScreenName != 'Competition' &&
                        <Cup size="32" color="#888" />
                    }
                    {currentScreenName == 'Competition' &&
                        <Cup size="32" color="#0499fe" />
                    }
                </Pressable>
            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toWorkoutScreen}>
                    {currentScreenName != 'Workout' &&
                        <Weight size="36" color="#888" />
                    }
                    {currentScreenName == 'Workout' &&
                        <Weight size="36" color="#0499fe" />
                    }
                </Pressable>
            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toExploreScreen}>
                    {currentScreenName != 'Explore' &&
                        <SearchNormal1 size="28" color="#888" />
                    }
                    {currentScreenName == 'Explore' &&
                        <SearchNormal1 size="28" color="#0499fe" />
                    }
                </Pressable>
            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toProfileScreen}>
                    {currentScreenName != 'Profile' &&
                        <Profile size="32" color="#888" variant="Broken" />
                    }
                    {currentScreenName == 'Profile' &&
                        < Profile size="32" color="#0499fe" variant="Broken" />
                    }
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 96,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 20,
        paddingHorizontal: 5,

        // Todo Box Shadow
        shadowColor: '#555',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
    },
    icon_ctnr: {
        flex: 1,
        alignItems: 'center'
    },
});