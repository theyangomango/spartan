import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import getPFP from "../../backend/storage/getPFP";

export default function Story({ data }) {
    const [pfp, setPFP] = useState(null);
    useEffect(() => {
        getPFP(data.uid)
            .then(url => {
                console.log(url);
                setPFP(url);
            })
    }, []);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.pfp_ctnr}>
                <Image
                    source={{uri: pfp}}
                    style={styles.pfp}
                />
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
        borderWidth: 2,
        borderRadius: 28
    },
    pfp: {
        width: 48,
        height: 48,
        backgroundColor: '#fff',
        borderRadius: 33,
        // borderWidth: 1.5,
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