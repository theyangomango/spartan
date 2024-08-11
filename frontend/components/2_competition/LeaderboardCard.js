import { Image, StyleSheet, Text, View } from 'react-native';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function LeaderboardCard({ pfp, handle, name, value, rank, lastRank, handlePress, userIsSelf = false, bestSet }) {
    return (
        <RNBounceable onPress={handlePress} style={userIsSelf ? styles.self_card_ctnr : styles.card_ctnr}>
            <View style={styles.card_left}>
                <Text style={styles.rank_text}>{rank}</Text>
                {lastRank && lastRank < rank &&
                    <Entypo name='chevron-down' size={20} color={'red'} style={styles.arrow_icon} />
                }
                {lastRank && lastRank > rank &&
                    <Entypo name='chevron-up' size={20} color={'#23B665'} style={styles.arrow_icon} />
                }
                {(!lastRank || lastRank == rank) &&
                    <FontAwesome name='minus' size={16} color={'#aaa'} style={styles.minus_icon} />
                }
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
                <View>
                    <Text style={styles.handle_text}>{handle}</Text>
                    <Text style={styles.name_text}>{name}</Text>
                </View>
            </View>
            <View style={styles.card_right}>
                <View>
                    <Text style={styles.stat_text}>{value.toFixed(0)} lbs</Text>
                    {bestSet.reps == 0 && bestSet.weight == 0 ?
                        <Text style={styles.best_set_text}>N/A</Text>
                        :
                        <Text style={styles.best_set_text}>{bestSet.reps} x {bestSet.weight} lbs</Text>
                    }
                </View>
            </View>
        </RNBounceable>
    )
};

const styles = StyleSheet.create({
    card_ctnr: {
        height: 77,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 14,
        marginHorizontal: 15,
        marginBottom: 12.5,
    },
    self_card_ctnr: {
        height: 87,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 14,
        marginHorizontal: 15,
        borderWidth: 2.5,
        borderColor: '#57B2FF',
        backgroundColor: '#F7FBFF'
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
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#2D9EFF',
        fontSize: 15,
        textAlign: 'right'
    },
    best_set_text: {
        fontFamily: 'Outfit_500Medium',
        // color: '#2D9EFF',
        color: '#777',
        fontSize: 12.5,
        marginTop: 4, // Add some spacing between the value and best set text
        textAlign: 'right'

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
    minus_icon: {
        marginLeft: 7,
        marginRight: 10
    }
});
