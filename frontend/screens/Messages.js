import { ScrollView, StyleSheet, View } from "react-native";
import Header from "../components/messages/MessagesHeader";
import MessageCard from "../components/messages/MessageCard";
import MessagesHeader from "../components/messages/MessagesHeader";

const messages = [1, 2];

export default function Messages({ navigation }) {
    return (
        <View style={styles.main_ctnr}>
            <MessagesHeader navigation={navigation} />
            <View style={styles.cards_ctnr}>
                <ScrollView style={styles.cards_scrollview}>
                    {
                        messages.map((index) => {
                            return <MessageCard key={index} />
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