import { StyleSheet, View, Text, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons'

export default function Header() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.logo}>
                <View style={styles.logo_image_ctnr}>
                    {
                        // ! Increase Resolution
                    }
                    <Image
                        source={require('../../Layer_1.png')}
                        style={styles.logo_image}
                    />
                </View>
                <Text style={styles.logo_text}>SPARTAN</Text>
            </View>
            <View style={styles.msg_btn_ctnr}>
                <Ionicons name='chatbubble-outline' size={20} color={'#fff'}/>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 95,
        backgroundColor: '#2D9EFF',
        paddingHorizontal: 15,
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