import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import getPFP from "../../../backend/storage/getPFP";
import { FontAwesome6 } from '@expo/vector-icons'

export default function Story({ data, handlePress, index, isViewed }) {
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
                <View style={[styles.pfp_ctnr, isViewed && styles.pfp_ctnr_viewed]}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
            </TouchableOpacity>
            <View style={styles.handle_ctnr}>
                <Text style={styles.handle_text}>{data.handle}</Text>
            </View>
            {index === 0 &&
                <TouchableOpacity activeOpacity={0.7} style={styles.create_icon}>
                    <FontAwesome6 name='plus' size={9} color={'#000'} />
                </TouchableOpacity>
            }
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
        fontFamily: 'Poppins_500Medium',
        fontSize: 10,
        paddingTop: 8,
        marginLeft: 3,
        color: '#666'
    },
    pfp_ctnr: {
        width: 53,
        height: 53,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#2D9EFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp_ctnr_viewed: {
        borderColor: '#BEE1FF', // Change this color to indicate the story has been viewed
    },
    pfp: {
        width: 45,
        height: 45,
        borderRadius: 50
    },
    create_icon: {
        position: 'absolute',
        top: 37,
        right: 5,
        width: 18,
        aspectRatio: 1,
        backgroundColor: '#FCF375',
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
