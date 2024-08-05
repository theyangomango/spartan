import { Image, StyleSheet, Text, View } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function LeaderboardCard({ uid, pfp, handle, value, rank, handlePress }) {
    return (
        <RNBounceable onPress={handlePress} style={styles.card_ctnr}>
            <View style={styles.card_left}>
                <Text style={styles.rank_text}>{rank}</Text>
                <Entypo name='chevron-down' size={20} color={'red'} style={styles.arrow_icon} />
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
                <View>
                    <Text style={styles.handle_text}>{handle}</Text>
                    <Text style={styles.name_text}>Yang Bai</Text>
                </View>
            </View>
            <View style={styles.card_right}>
                <Text style={styles.stat_text}>{value}lbs</Text>
            </View>
        </RNBounceable>
    )
};

const styles = StyleSheet.create({
    card_ctnr: {
        height: 77,
        // backgroundColor: 'red',
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        // paddingHorizontal: 10,
        paddingLeft: 10,
        paddingRight: 12,
        marginHorizontal: 15,
        marginBottom: 12.5,
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: 54,
        aspectRatio: 1
    },
    pfp: {
        flex: 1,
        borderRadius: 100
    },
    handle_text: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
        paddingHorizontal: 12,
        color: '#333'
    },
    name_text: {
        marginTop: 1.5,
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        paddingHorizontal: 12,
        color: '#999'
    },
    card_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#2D9EFF',
        fontSize: 15
    },
    rank_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#333',
    },
    arrow_icon: {
        marginLeft: 1,
        marginRight: 7,
    },
});
