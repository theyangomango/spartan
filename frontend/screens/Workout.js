import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";

export default function Workout({ navigation }) {
    return (
        <>
            <View style={{flex: 1}}></View>
            <Footer navigation={navigation} currentScreenName={'Workout'}/>
        </>
    )
}

const styles = StyleSheet.create({

});