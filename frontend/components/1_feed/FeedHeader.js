import { StyleSheet, View, Text, Image, Pressable, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons'

export default function FeedHeader({ toMessagesScreen }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.logo}>
                <View style={styles.logo_image_ctnr}>
                    <Image
                        source={require('../../../frontend/assets/logo.png')}
                        style={styles.logo_image}
                    />
                </View>
                <Text style={styles.logo_text}>SPARTAN</Text>
            </View>
            <TouchableOpacity onPress={toMessagesScreen}>
                <View style={styles.right}>
                    <View style={styles.msg_btn_ctnr}>
                        <Ionicons name='chatbubble-outline' size={15.5} color={'#fff'} />
                    </View>
                    <View style={styles.red_circle_ctnr}>
                        <Text style={styles.red_circle_text}>15</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 95,
        backgroundColor: '#2D9EFF',
        paddingLeft: 5,
        paddingRight: 20,
        paddingBottom: 5,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    logo: {
        // height: 40,
        flexDirection: 'row',
        marginBottom: 5,
    },
    logo_image_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 5,
    },
    logo_image: {
        width: 30,
        height: 22,
    },
    logo_text: {
        fontSize: 21,
        color: '#fff',
    },
    right: {
        // flexDirection: 'row'
    },
    msg_btn_ctnr: {
        width: 30,
        height: 30,
        borderRadius: 20,
        backgroundColor: '#fff3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2
    },
    red_circle_ctnr: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'red',
        position: 'absolute',
        top: 0,
        left: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    red_circle_text: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 8,
        color: '#fff'
    }
});