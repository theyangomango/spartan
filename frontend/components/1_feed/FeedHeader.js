import { StyleSheet, View, Text, Image, Pressable, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons'
import { AddSquare, Notification } from 'iconsax-react-native'

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
            <View style={styles.right}>
                {/* <TouchableOpacity>
                    <View style={styles.create_btn_ctnr}>
                        <AddSquare size={21} color="#fff" />
                    </View>
                </TouchableOpacity> */}
                <TouchableOpacity>
                    <View style={styles.notifications_btn_ctnr}>
                        <Notification size={18.5} color="#fff" />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={toMessagesScreen}>
                    <View style={styles.msg_btn_ctnr}>
                        <Ionicons name='chatbubble-outline' size={15.5} color={'#fff'} />
                    </View>
                    <View style={styles.red_circle_ctnr}>
                        <Text style={styles.red_circle_text}>15</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 100,
        backgroundColor: '#2D9EFF',
        paddingLeft: 5,
        paddingRight: 20,
        paddingBottom: 10,
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
        paddingRight: 2,
    },
    logo_image: {
        width: 33,
        height: 24,
    },
    logo_text: {
        fontSize: 21,
        color: '#fff',
    },
    right: {
        flexDirection: 'row'
    },
    create_btn_ctnr: {
        width: 30,
        height: 30,
        borderRadius: 20,
        backgroundColor: '#fff3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3,
    },
    notifications_btn_ctnr: {
        width: 30,
        height: 30,
        borderRadius: 20,
        backgroundColor: '#fff3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3,
        marginHorizontal: 12
    },
    msg_btn_ctnr: {
        width: 30,
        height: 30,
        borderRadius: 20,
        backgroundColor: '#fff3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3
    },
    red_circle_ctnr: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'red',
        position: 'absolute',
        top: -3,
        right: -5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    red_circle_text: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 8,
        color: '#fff'
    }
});