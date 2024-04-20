import { StyleSheet, View, Text, Image, Pressable } from "react-native";
import { Ionicons } from '@expo/vector-icons'

export default function FeedHeader({ navigation }) {
    function toMessagesScreen() {
        navigation.navigate('Messages');
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.logo}>
                <View style={styles.logo_image_ctnr}>
                    <Image
                        source={require('../../../frontend/assets/Layer_1.png')}
                        style={styles.logo_image}
                    />
                </View>
                <Text style={styles.logo_text}>SPARTAN</Text>
            </View>
            <Pressable onPress={toMessagesScreen}>
                <View style={styles.msg_btn_ctnr}>
                    <Ionicons name='chatbubble-outline' size={20} color={'#fff'} />
                </View>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 122,
        backgroundColor: '#2D9EFF',
        paddingHorizontal: 15,
        paddingBottom: 20,
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
        width: 40,
        height: 30,
    },
    logo_text: {
        fontSize: 25,
        color: '#fff',
    },
    msg_btn_ctnr: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff3',
        justifyContent: 'center',
        alignItems: 'center'
    }
});