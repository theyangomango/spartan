import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { ArrowDown2, AddSquare, HambergerMenu } from 'iconsax-react-native'

export default function ViewProfileHeader() {
    return (
        <View style={styles.main_ctnr}>
            <TouchableOpacity>
                <View style={styles.left}>
                    <Text style={styles.handle_text}>@yangbai</Text>
                    <View style={styles.down_arrow_ctnr}>
                        <ArrowDown2 size="22" color="#000" />
                    </View>
                </View>
            </TouchableOpacity>
            <View style={styles.right}>
                <TouchableOpacity>
                    <View style={styles.options_btn_ctnr}>
                        <HambergerMenu size="24" color="#000" />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        height: 85,
        alignItems: 'flex-end',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 12
    },
    left: {
        flexDirection: 'row'
    },
    handle_text: {
        fontFamily: 'SourceSansPro_600SemiBold',
        fontSize: 18,
        padding: 2
    },
    down_arrow_ctnr: {
        justifyContent: 'flex-end',
        paddingBottom: 1.5
    },
    right: {
        flexDirection: 'row',
    },
    options_btn_ctnr: {
        paddingLeft: 5
    }
});