import { View, Text, Image, StyleSheet } from "react-native"
import { SimpleLineIcons } from '@expo/vector-icons'

import scaleSize from "../../helper/scaleSize";

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
        paddingBottom: scaleSize(3),
        paddingHorizontal: scaleSize(12),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row'
    },
    pfp_ctnr: {
        width: scaleSize(34),
        height: scaleSize(34),
        // borderRadius: 21,
        // backgroundColor: 'red',
        marginRight: scaleSize(8),
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(17)
    },
    text_ctnr: {
        justifyContent: 'center',
        paddingBottom: scaleSize(4)
    },
    handle_text: {
        fontSize: scaleSize(13),
        fontFamily: 'Inter_700Bold',
    },
    right: {
        flexDirection: 'row'
    },
    follow_btn: {
        width: scaleSize(66),
        height: scaleSize(31),
        borderRadius: scaleSize(30),
        marginHorizontal: scaleSize(10),
        marginVertical: scaleSize(4),
        backgroundColor: '#0699FF',
        justifyContent: 'center'
    },
    follow_text: {
        textAlign: 'center',
        color: 'white',
        fontSize: scaleSize(11),
        fontFamily: 'Lato_700Bold',
    },
    options_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scaleSize(5)
    },
});
