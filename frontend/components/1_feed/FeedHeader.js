import { StyleSheet, View, Text, Image, Pressable, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons'
import { AddSquare, Notification } from 'iconsax-react-native'
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function FeedHeader({ toMessagesScreen }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.logo}>
                <View style={styles.logo_image_ctnr}>
                    <Image
                        source={require('../../../frontend/assets/inverted_logo.png')}
                        style={styles.logo_image}
                    />
                </View>
                <Text style={styles.logo_text}>SPARTAN</Text>
            </View>
            <View style={styles.right}>
                <RNBounceable>
                    <View style={styles.notifications_btn_ctnr}>
                        <Notification size={20.5} color="#2D9EFF" />
                    </View>
                </RNBounceable>
                <RNBounceable onPress={toMessagesScreen}>
                    <View style={styles.msg_btn_ctnr}>
                        <Ionicons name='chatbubble-outline' size={18} color={'#2D9EFF'} />
                    </View>
                    <View style={styles.red_circle_ctnr}>
                        <Text style={styles.red_circle_text}>15</Text>
                    </View>
                </RNBounceable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 100,
        // backgroundColor: '#F7FCFF',
        backgroundColor: '#fff',
        paddingLeft: 5,
        paddingRight: 25,
        paddingBottom: 5,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    logo: {
        // height: 40,
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center'
    },
    logo_image_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 20,
    },
    logo_image: {
        width: 36,
        height: 28,
        marginTop: 1.5
    },
    logo_text: {
        fontSize: 22,
        color: '#2D9EFF',
        paddingLeft: 2,
        fontFamily: 'Inter_400Regular'
    },
    right: {
        flexDirection: 'row',
        marginBottom: 3
    },
    notifications_btn_ctnr: {
        width: 36,
        aspectRatio: 1,
        borderRadius: 20,
        backgroundColor: '#E0F1FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3,
        marginHorizontal: 12
    },
    msg_btn_ctnr: {
        width: 36,
        aspectRatio: 1,
        borderRadius: 20,
        backgroundColor: '#E0F1FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3
    },
    red_circle_ctnr: {
        width: 19,
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: 'red',
        position: 'absolute',
        top: -5,
        right: -6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    red_circle_text: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 8.5,
        color: '#fff'
    }
});