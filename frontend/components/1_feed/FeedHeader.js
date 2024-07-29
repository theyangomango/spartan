import { StyleSheet, View, Text, Image, Pressable, TouchableOpacity } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons, Octicons, Entypo, MaterialIcons } from '@expo/vector-icons'
// import { AddSquare, Heart } from 'iconsax-react-native'
import RNBounceable from '@freakycoder/react-native-bounceable';
import { Message, Sms } from 'iconsax-react-native'
// import { SvgUri } from 'react-native-svg'
import Svg, { Path } from "react-native-svg"


export default function FeedHeader({ toMessagesScreen, onOpenNotifications }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.logo}>
                <View style={styles.logo_image_ctnr}>
                    <Image
                        source={require('../../../frontend/assets/logo_black.png')}
                        style={styles.logo_image}
                    />
                </View>
                <Text style={styles.logo_text}>SPARTAN</Text>
                {/* <SvgUri width="20" height="20" source={require('../../assets/heart.svg')}/> */}

            </View>
            {/* <View style={styles.right}> */}
            {/* <RNBounceable onPress={onOpenNotifications}> */}
            {/* <View style={styles.notifications_btn_ctnr}> */}
            {/* <Heart size={26} color="#2D9EFF" /> */}
            {/* </View> */}
            {/* </RNBounceable> */}
            {/* <RNBounceable onPress={toMessagesScreen}> */}

            <View style={styles.right_icons}>
                {/* <Ionicons name='chatbubble-outline' size={22} color={'#2D9EFF'} /> */}
                {/* <Entypo name="mail" color={'#ccc'} size={26}/> */}
                {/* <Sms size="26" color="#999"/> */}
                {/* <Sms size="26" color="#2D9EFF" /> */}
                {/* <MaterialCommunityIcons name="heart-outline" size={25} color={'#ccc'}/> */}

                {/* <SvgUri width="20" height="20" source={require('../../assets/heart.svg')}/> */}
                <RNBounceable onPress={onOpenNotifications} style={styles.heart_button}>
                    <Svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#ccc" strokeWidth="2.1" stroke-linecap="round" stroke-linejoin="round"></Path></Svg>
                </RNBounceable>

                <RNBounceable onPress={toMessagesScreen} style={styles.message_button}>
                    <MaterialIcons name="alternate-email" size={25.5} color={'#ccc'} />
                </RNBounceable>

                {/* <Message size="24" color="#2D9EFF" /> */}
            </View>
            <View style={styles.options_btn_ctnr}>
                {/* <Ionicons name='chatbubble-outline' size={22} color={'#2D9EFF'} /> */}
                {/* <Sms size="26" color="#999"/> */}
                <Octicons name="gear" size={22.5} color={'#ccc'} />
                {/* <Sms size="26" color="#2D9EFF" /> */}
                {/* <Feather name="mail" size={22} color={'#2D9EFF'}/> */}

                {/* <Message size="24" color="#2D9EFF" /> */}

            </View>
            {
                // global.userData &&
                // <View style={styles.red_circle_ctnr}>
                // <Text style={styles.red_circle_text}>{global.userData.messages.length}</Text>
                // </View>
            }

            {/* </RNBounceable> */}
            {/* </View> */}
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        paddingTop: 50,
        // backgroundColor: '#F7FCFF',
        backgroundColor: '#fff',
        // paddingLeft: 5,
        // paddingRight: 25,
        // paddingBottom: 5,
        flexDirection: 'row',
        alignItems: 'flex-end',
        // justifyContent: 'space-between',
        justifyContent: 'center',
        // paddingBottom: 5,
    },
    logo: {
        // height: 40,
        // flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
        flexDirection: 'row',
        paddingRight: 15

    },
    logo_image_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo_image: {
        width: 27,
        height: 28,
        // marginTop: 1.5
    },
    logo_text: {
        fontSize: 17,
        // color: '#2D9EFF',
        // color: '#000',
        paddingLeft: 2,
        fontFamily: 'Inter_600SemiBold',
        // color: '#333'
        // letterSpacing: -0.1
        // fontFamily: 'Inter_400Regular',

    },
    right: {
        // position: 'absolute',
        // top: 50,
        // right: 20,
        marginRight: 3,
        flexDirection: 'row',
        marginBottom: 3
    },
    notifications_btn_ctnr: {
        width: 36,
        aspectRatio: 1,
        borderRadius: 20,
        // backgroundColor: '#E0F1FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3,
        marginHorizontal: 12
    },
    right_icons: {
        flexDirection: 'row',
        position: 'absolute',
        right: 30,
        top: 51,
        alignItems: 'center'
        // padding: 5,
    },
    heart_button: {
        marginRight: 20
    },
    red_circle_ctnr: {
        width: 19,
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: 'red',
        position: 'absolute',
        top: -2,
        right: -6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    options_btn_ctnr: {
        position: 'absolute',
        left: 30,
        top: 51.5
    },
    red_circle_text: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 8.5,
        color: '#fff'
    }
});