// screens/Workout.js (or replace your current Workout screen)
import React from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import Footer from "../components/Footer";

export default function Workout({ navigation }) {
    return (
        <SafeAreaView style={styles.root}>
            {/* Empty canvas for now */}
            <View style={styles.content} />

            {/* Footer only */}
            <Footer navigation={navigation} currentScreenName={"Workout"} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#f5f6fa", // keep existing app vibe
    },
    content: {
        flex: 1, // holds space above the footer
    },
});
