import { StyleSheet, View, Text } from "react-native"
import { Send, More } from 'iconsax-react-native'

export default function TemplateCard() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <Text style={styles.title_text}>Chest + Arms</Text>
                <View style={styles.header_right}>
                    <View style={styles.send_icon_ctnr}>
                        <Send size={21} color="#000" />
                    </View>
                    <View style={styles.options_icon_ctnr}>
                        <More size={22} color="#000" />
                    </View>
                </View>
            </View>
            <View style={styles.labels_ctnr}>
                <Text style={styles.exercise_label_text}>Exercise</Text>
                <Text style={styles.best_set_label_text}>Best Set</Text>
            </View>
            <View style={styles.entry_ctnr}>
                <Text style={styles.exercise_text}>Bench Press x 3</Text>
                <Text style={styles.best_set_text}>8 x 150kg</Text>
            </View>
            <View style={styles.entry_ctnr}>
                <Text style={styles.exercise_text}>Dips x 3</Text>
                <Text style={styles.best_set_text}>N/A</Text>
            </View>
            <View style={styles.entry_ctnr}>
                <Text style={styles.exercise_text}>Bicep Curls x 3</Text>
                <Text style={styles.best_set_text}>8 x 150kg</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 18,
        marginVertical: 6,
        paddingTop: 12,
        paddingBottom: 7,
        borderColor: '#ccc'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        paddingBottom: 3
    },
    header_right: {
        flexDirection: 'row'
    },
    send_icon_ctnr: {
    },
    options_icon_ctnr: {
        marginLeft: 10
    },
    title_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 15,
    },
    labels_ctnr: {
        flexDirection: 'row',
        paddingBottom: 2,
        paddingTop: 4
    },
    exercise_label_text: {
        fontFamily: 'SourceSansPro_600SemiBold',
        color: '#666',
        fontSize: 15,
        width: '55%'
    },
    best_set_label_text: {
        fontFamily: 'SourceSansPro_600SemiBold',
        color: '#666',
        fontSize: 15,
    },
    entry_ctnr: {
        flexDirection: 'row',
    },
    exercise_text: {
        width: '55%',
        fontFamily: 'SourceSansPro_400Regular',
        paddingBottom: 1,
    },
    best_set_text: {
        fontFamily: 'SourceSansPro_400Regular',
        paddingBottom: 1,
    }
})