import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import getPFP from "../../../backend/storage/getPFP";

export default function Story({ data, handlePress, index }) {
    const [pfp, setPFP] = useState(null);

    useEffect(() => {
        getPFP(data.uid)
            .then(pfp => {
                setPFP(pfp);
            });
    }, []);

    return (
        <View style={styles.main_ctnr}>
            <TouchableOpacity onPress={() => handlePress(index)} activeOpacity={0.5}>
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
            </TouchableOpacity>
            <View style={styles.handle_ctnr}>
                <Text style={styles.handle_text}>{data.handle}</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        paddingTop: 1.5,
        width: 66,
        height: 76,
        alignItems: 'center',
    },
    handle_text: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10.25,
        paddingTop: 8,
        marginLeft: 3,
        // color: '#fff'
        color: '#666'
    },
    pfp_ctnr: {
        width: 53,
        height: 53,
        borderRadius: 50,
        borderWidth: 2,
        // borderColor: '#fff',
        borderColor: '#2D9EFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp: {
        width: 45,
        height: 45,
        borderRadius: 50
    },
});