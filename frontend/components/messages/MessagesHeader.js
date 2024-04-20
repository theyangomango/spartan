import { StyleSheet, View, Text, Image, Pressable } from "react-native";
import { Ionicons } from '@expo/vector-icons'
import { ArrowLeft2 } from 'iconsax-react-native'

export default function MessagesHeader({ navigation }) {
    function toFeedScreen() {
        navigation.navigate('Feed');
    }

    return (
        <View style={styles.main_ctnr}>
            <Pressable onPress={toFeedScreen}>
                <View style={styles.arrow_icon_ctnr}>
                    <ArrowLeft2 size="28" color="#fff" />
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
    arrow_icon_ctnr: {
        padding: 5
    },
});