import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { FontAwesome6, Octicons, Entypo } from '@expo/vector-icons';
import { ArrowDown2, AddSquare, HambergerMenu } from 'iconsax-react-native'
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function ProfileHeader({ onPressCreateBtn }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.options_btn_ctnr}>
                <Octicons name="gear" size={22.5} color={'#ccc'} />
            </RNBounceable>
            <TouchableOpacity>
                <View style={styles.center}>
                    <Entypo name="chevron-down" size={18} color="#fff" />
                    <Text style={styles.handle_text}>yangbai</Text>
                    <View style={styles.down_arrow_ctnr}>
                        <Entypo name="chevron-down" size={18} color="#666" />
                    </View>
                </View>
            </TouchableOpacity>
            <View style={styles.right}>
                <TouchableOpacity onPress={onPressCreateBtn}>
                    <View style={styles.create_btn_ctnr}>
                        <FontAwesome6 name='plus' size={13} color="#bbb" />
                    </View>
                </TouchableOpacity>
                {/* <TouchableOpacity>
                    <View style={styles.options_btn_ctnr}>
                        <HambergerMenu size="24" color="#000" />
                    </View>
                </TouchableOpacity> */}
            </View>
        </View>
    )

}

const styles = StyleSheet.create({
    main_ctnr: {
        height: 87,
        alignItems: 'flex-end',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 17,
        paddingVertical: 12
    },
    center: {
        flexDirection: 'row'
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        padding: 2,
        color: '#666'
    },
    down_arrow_ctnr: {
        justifyContent: 'center'
    },
    right: {
        flexDirection: 'row',
    },
    create_btn_ctnr: {
        borderWidth: 1.5,
        width: 21.5,
        borderRadius: 5,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#bbb'
    },
    options_btn_ctnr: {
    }
});