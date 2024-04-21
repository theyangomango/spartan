import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";

export default function Explore({ navigation, route }) {
    const userData = route.params.userData;

    return (
        <>
            <View style={{flex: 1}}></View>
            <Footer navigation={navigation} currentScreenName={'Explore'} userData={userData}/>
        </>
    )
}

const styles = StyleSheet.create({

});