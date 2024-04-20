import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";

export default function Competition({ navigation }) {
    return (
        <>
            <View style={{flex: 1}}></View>
            <Footer navigation={navigation} currentScreenName={'Competition'}/>
        </>
    )
}

const styles = StyleSheet.create({

});