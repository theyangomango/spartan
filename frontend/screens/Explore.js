import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";
import WorkoutFooter from "../components/workout/WorkoutFooter";

export default function Explore({ navigation, route }) {
    const userData = global.userData;

    return (
        <>
            <View style={{ flex: 1 }}></View>

            {global.workout &&
                <WorkoutFooter userData={userData} />
            }

            <Footer navigation={navigation} currentScreenName={'Explore'} />
        </>
    )
}

const styles = StyleSheet.create({

});