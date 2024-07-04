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
            <View style={styles.title_ctnr}>
                <Text style={styles.title}>Messages</Text>
            </View>
            <View style={[styles.arrow_icon_ctnr, styles.hidden]}>
                <ArrowLeft2 size="24" color="#2D9EFF" /> 
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
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    arrow_icon_ctnr: {
        paddingHorizontal: 6,
        paddingVertical: 10
    },
    title_ctnr: {
        padding: 12,
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'SourceSansPro_600SemiBold',
        fontSize: 20,
        color: '#fff'
    }
});