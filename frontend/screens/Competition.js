import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";

export default function Competition({ navigation, route }) {
    const userData = route.params.userData;

    return (
        <>
            <View style={{flex: 1}}></View>
            <Footer navigation={navigation} currentScreenName={'Competition'} userData={userData}/>
        </>
    )
}

const styles = StyleSheet.create({

});