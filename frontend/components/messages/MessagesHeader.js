import { StyleSheet, View, Pressable, Text } from "react-native";
import { ArrowLeft2 } from 'iconsax-react-native'

export default function MessagesHeader({ toFeedScreen, handle }) {
    return (
        <View style={styles.main_ctnr}>
            <Pressable onPress={toFeedScreen}>
                <View style={styles.arrow_icon_ctnr}>
                    <ArrowLeft2 size="24" color="#fff" />
                </View>
            </Pressable>
            <View style={styles.handle_text_ctnr}>
                <Text style={styles.handle_text}>{handle}</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 110,
        backgroundColor: '#2D9EFF',
        paddingHorizontal: 15,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    arrow_icon_ctnr: {
        padding: 6
    },
    handle_text_ctnr: {
        padding: 9
    },
    handle_text: {
        fontFamily: 'SourceSansPro_600SemiBold',
        fontSize: 20,
        color: '#fff'
    },
});