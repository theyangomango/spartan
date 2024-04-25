import { StyleSheet, View, Text, TouchableOpacity } from "react-native"
import { AntDesign } from '@expo/vector-icons'

export default function PostOptionsScreen({ images, goBack }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <View style={styles.back_icon_ctnr}>
                    <TouchableOpacity>
                        <AntDesign name='left' size={24} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.header_text}>New Post</Text>
                <TouchableOpacity>
                    <Text style={styles.share_text}>Share</Text>
                </TouchableOpacity>
            </View>

        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        height: 90,
        alignItems: 'center',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    back_icon_ctnr: {
        paddingBottom: 10,
        paddingLeft: 15,
        paddingRight: 22
    },
    header_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 16,
        padding: 8
    },
    share_text: {
        fontFamily: 'Mulish_500Medium',
        paddingRight: 15,
        paddingBottom: 8,
        fontSize: 15,
        color: '#0699FF'
    }
});