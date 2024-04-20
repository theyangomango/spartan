import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";

export default function Explore({ navigation }) {
    return (
        <>
            <View style={{flex: 1}}></View>
            <Footer navigation={navigation} currentScreenName={'Explore'}/>
        </>
    )
}

const styles = StyleSheet.create({

});