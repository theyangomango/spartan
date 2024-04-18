import { View, Text, StyleSheet } from "react-native"
import { SimpleLineIcons } from '@expo/vector-icons'

export default function PostHeader() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.left}>
                <View style={styles.pfp_ctnr}>
                </View>
                <View style={styles.text_ctnr}>
                    <View>
                        <Text style={styles.handle_text}>lakshitahuja</Text>
                    </View>
                    <View>
                        <Text style={styles.date_text}>Fortnite
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.right}>
                <View style={styles.follow_btn}>
                    <Text style={styles.follow_text}>Follow</Text>
                </View>
                <View style={styles.options_icon_ctnr}>
                    <SimpleLineIcons name='options' size={14} />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    left: {
        flexDirection: 'row'
    },
    pfp_ctnr: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'red',
        marginRight: 5,
    },
    text_ctnr: {
        padding: 4,
    },
    handle_text: {
        fontWeight: '700',
        fontSize: 12.5,
        paddingBottom: 5,
    },
    date_text: {
        fontSize: 10.5,
    },
    right: {
        flexDirection: 'row'
    },
    follow_btn: {
        width: 80,
        height: 35,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#0699FF',
        justifyContent: 'center'
    },
    follow_text: {
        textAlign: 'center',
        color: 'white',
        fontSize: 12,
        fontWeight: '600'
    },
    options_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center'
    },
});
