import { View, Text, Image, StyleSheet } from "react-native"
import { SimpleLineIcons } from '@expo/vector-icons'

export default function ExplorePostHeader({ data, url }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.left}>
                <View style={styles.pfp_ctnr}>
                    <Image
                        source={{ uri: url }}
                        style={styles.pfp}
                    />
                </View>
                <View style={styles.text_ctnr}>
                    <Text style={styles.handle_text}>
                        {data.handle}
                    </Text>
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
        paddingBottom: 3,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row'
    },
    pfp_ctnr: {
        width: 34,
        height: 34,
        // borderRadius: 21,
        // backgroundColor: 'red',
        marginRight: 8,
    },
    pfp: {
        flex: 1,
        borderRadius: 17
    },
    text_ctnr: {
        justifyContent: 'center',
        paddingBottom: 4
    },
    handle_text: {
        fontSize: 13,
        fontFamily: 'Inter_700Bold',
    },
    right: {
        flexDirection: 'row'
    },
    follow_btn: {
        width: 66,
        height: 31,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#0699FF',
        justifyContent: 'center'
    },
    follow_text: {
        textAlign: 'center',
        color: 'white',
        fontSize: 11,
        fontFamily: 'Lato_700Bold',
    },
    options_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5
    },
});
