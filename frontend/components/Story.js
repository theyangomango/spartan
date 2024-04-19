import { StyleSheet, View, Text } from "react-native";

export default function Story() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.pfp_ctnr}>
                <View style={styles.pfp_image}>

                </View>
            </View>
            <View style={styles.text_ctnr}>
                <Text style={styles.text}>Your story</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: 56,
        height: 76,
        backgroundColor: '#2D9EFF',
        marginBottom: 10,
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp_ctnr: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#fff',
        borderWidth: 1.5,
        borderRadius: 28
    },
    pfp_image: {
        width: 48,
        height: 48,
        backgroundColor: '#fff',
        borderRadius: 33,
        borderWidth: 1.5,
        borderColor: '#fff'
    },
    text_ctnr: {
        paddingTop: 6,
    },
    text: {
        textAlign: 'center',
        fontSize: 10,
        color: '#fff',
        fontFamily: 'Inter_400Regular'
    }
});