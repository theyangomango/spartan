import { View, StyleSheet, Text } from "react-native"

export default function MessageCard() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.left_ctnr}>
                <View style={styles.pfp_ctnr}>
                </View>
                <View>
                    <Text style={styles.handle_text}>Sam Suluk</Text>
                    <Text style={styles.content_text}>you're small asf boy</Text>
                </View>
            </View>
            <View style={styles.right_ctnr}>
                <Text style={styles.date_text}>6:30pm</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 58,
        marginVertical: 9,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    pfp_ctnr: {
        width: 58,
        height: 58,
        marginRight: 12,
        backgroundColor: 'red',
        borderRadius: 29
    },
    left_ctnr: {
        flexDirection: 'row'
    },
    handle_text: {
        fontSize: 16.2,
        color: '#707078',
        paddingVertical: 5,
        fontFamily: 'SourceSansPro_600SemiBold'
    },
    content_text: {
        fontSize: 12.5,
        fontFamily: 'SourceSansPro_400Regular',
        color: '#707078',
    },
    right_ctnr: {
        justifyContent: 'center'
    },
    date_text: {
        padding: 5,
        color: '#707078',
        fontSize: 12.5,
        fontFamily: 'SourceSansPro_400Regular',
    }
});