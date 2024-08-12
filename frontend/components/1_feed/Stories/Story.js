import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome6 } from '@expo/vector-icons'

export default function Story({ data, handlePress, index, isViewed, handlePressCreateButton }) {
    return (
        <View style={styles.main_ctnr}>
            <TouchableOpacity disabled={data.stories.length === 0} onPress={handlePress} activeOpacity={0.5}>
                <View style={data.stories.length === 0 ? styles.pfp_no_border : [styles.pfp_ctnr, isViewed && styles.pfp_ctnr_viewed]}>
                    <Image source={{ uri: data.pfp }} style={styles.pfp} />
                </View>
            </TouchableOpacity>
            <View style={styles.handle_ctnr}>
                <Text style={styles.handle_text}>{data.handle}</Text>
            </View>
            {index === 0 &&
                <TouchableOpacity onPress={handlePressCreateButton} activeOpacity={0.7} style={styles.create_icon}>
                    <FontAwesome6 name='plus' size={11} color={'#222'} />
                </TouchableOpacity>
            }
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: 77,
        height: 86,
        alignItems: 'center',
    },
    handle_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12.5,
        paddingTop: 4,
        marginLeft: 3,
        color: '#666'
    },
    pfp_ctnr: {
        width: 60,
        aspectRatio: 1,
        borderRadius: 26,
        borderWidth: 3,
        borderColor: '#2D9EFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp_no_border: {
        width: 60,
        aspectRatio: 1,
        borderRadius: 26,
        borderWidth: 3,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp_ctnr_viewed: {
        borderColor: '#BEE1FF', // Change this color to indicate the story has been viewed
    },
    pfp: {
        width: 49.5,
        aspectRatio: 1,
        borderRadius: 22
    },
    create_icon: {
        position: 'absolute',
        top: 37,
        right: 5,
        width: 22,
        aspectRatio: 1,
        backgroundColor: '#FCF375',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
