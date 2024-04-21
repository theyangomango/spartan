import { ScrollView, StyleSheet, View } from "react-native";
import MessageCard from "../components/messages/MessageCard";
import MessagesHeader from "../components/messages/MessagesHeader";
import { useReducer } from "react";

export default function Messages({ navigation, route }) {
    const { userData, messages } = route.params;

    function toFeedScreen() {
        navigation.navigate('Feed');
    }

    return (
        <View style={styles.main_ctnr}>
            <MessagesHeader handle={userData.handle} toFeedScreen={toFeedScreen} />
            <View style={styles.cards_ctnr}>
                <ScrollView style={styles.cards_scrollview}>
                    {
                        messages.map((msg, index) => {
                            let usersExcludingSelf = msg.users.filter(usr => {
                                if (usr.uid != userData.uid) return usr;
                            });

                            return (
                                <MessageCard
                                    uid = {usersExcludingSelf[0].uid}
                                    handle={usersExcludingSelf[0].handle}
                                    content={msg.content[msg.content.length - 1].text}
                                    timestamp={msg.content[msg.content.length - 1].timestamp}
                                    key={index}
                                />
                            )
                        })
                    }
                </ScrollView>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
    },
    cards_ctnr: {
        flex: 1,
        paddingHorizontal: 16,
    },
    cards_scrollview: {
        paddingTop: 16
    }
});