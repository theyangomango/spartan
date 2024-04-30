import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import Footer from "../components/Footer";
import Podium from "../components/competition/Podium";
import ComparingDropdown from "../components/competition/ComparingDropdown";
import ComparedWithDropdown from "../components/competition/ComparedWithDropdown";
import WorkoutFooter from "../components/workout/WorkoutFooter";
import CompetitionCard from "../components/competition/CompetitionCard";

export default function Competition({ navigation, route }) {
    const userData = global.userData;

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body}>
                <View style={styles.top_ctnr}>
                    <View style={styles.header}>
                        <ComparingDropdown />
                    </View>

                    <Podium />
                </View>

                <View style={styles.bottom_ctnr}>
                    <View>
                        <ComparedWithDropdown />
                    </View>

                    <ScrollView style={styles.scrollview_ctnr}>
                        <CompetitionCard />
                        <CompetitionCard />
                    </ScrollView>
                </View>
            </View>

            {global.workout &&
                <WorkoutFooter userData={userData} />
            }
            <Footer navigation={navigation} currentScreenName={'Competition'} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body: {
        flex: 1
    },
    top_ctnr: {
        backgroundColor: '#2D9EFF',
        justifyContent: 'space-between',
        height: '38%'
    },
    bottom_ctnr: {
        flex: 1,
        paddingHorizontal: 15
    },
    scrollview_ctnr: {
        flex: 1,
    }
});