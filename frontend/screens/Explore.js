import React from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Footer from "../components/Footer";
import WorkoutFooter from "../components/workout/WorkoutFooter";
import SearchBar from "react-native-dynamic-search-bar";

export default function Explore({ navigation, route }) {
    const userData = global.userData;

    // Function to dismiss the keyboard
    const dismissKeyboard = () => Keyboard.dismiss();

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.main_ctnr}>
                <View style={styles.header}>
                    <SearchBar
                        fontColor="#c6c6c6"
                        iconColor="#c6c6c6"
                        cancelIconColor="#c6c6c6"
                        placeholder="Search"
                        placeholderTextColor="#aaa"
                        onClearPress={() => {
                            // filter list
                        }}
                        style={styles.search_bar}
                    />
                </View>

                {global.workout &&
                    <WorkoutFooter userData={userData} />
                }

                <Footer navigation={navigation} currentScreenName={'Explore'} />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flex: 1,
        marginTop: 55
    },
    search_bar: {
        borderWidth: 1,
        borderColor: '#ccc',
        height: 'auto',
        width: 'auto',
        paddingVertical: 12,
        paddingHorizontal: 5,
        marginHorizontal: 12,
        shadowColor: '#666',
        shadowOffset: { width: -2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    }
});
