import { ScrollView, StyleSheet, View } from "react-native";
import Header from "../components/Header";
import MessageCard from "../components/MessageCard";

const messages = [1, 2];

export default function Messages() {
    return (
        <View style={styles.main_ctnr}>
            <Header />
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