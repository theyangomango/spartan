import { StyleSheet, View } from "react-native";
import { Home } from 'iconsax-react-native'

export default function Footer() {
    return (
        <View style={styles.main_ctnr}>
            <View>
                <Home size="32" color="#FF8A65" variant="Broken" />
            </View>
            <View></View>
            <View></View>
            <View></View>
            <View></View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 96,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#fff',
        // Todo Drop Shadow
        flexDirection: 'row'
    },

});