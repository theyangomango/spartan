import { Pressable, StyleSheet, View } from "react-native";
import { Home, Cup, Weight, SearchNormal1, Profile } from 'iconsax-react-native'

export default function Footer({ navigation }) {
    function toFeedScreen() {
        navigation.navigate('Feed')
    }

    function toCompetitionScreen() {
        navigation.navigate('Competition')
    }

    function toWorkoutScreen() {
        navigation.navigate('Workout')
    }

    function toExploreScreen() {
        navigation.navigate('Explore')
    }

    function toProfileScreen() {
        navigation.navigate('Profile')
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toFeedScreen}>

                    <Home size="32" color="#0499fe" variant="Broken" />
                </Pressable>

            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toCompetitionScreen}>
                    <Cup size="32" color="#888" />
                </Pressable>
            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toWorkoutScreen}>
                    <Weight size="36" color="#888" />
                </Pressable>
            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toExploreScreen}>
                    <SearchNormal1 size="28" color="#888" />
                </Pressable>
            </View>
            <View style={styles.icon_ctnr}>
                <Pressable onPress={toProfileScreen}>
                    <Profile size="32" color="#888" variant="Broken" />
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
        shadowColor: '#aaa',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    icon_ctnr: {
        flex: 1,
        alignItems: 'center'
    },
});