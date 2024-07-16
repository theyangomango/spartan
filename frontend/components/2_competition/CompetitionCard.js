import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown2 } from 'iconsax-react-native';
import { useEffect, useState } from 'react';
import getPFP from '../../../backend/storage/getPFP';
import getOrdinalString from '../../helper/getOrdinalString';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function CompetitionCard({ uid, pfp, handle, value, rank, handlePress}) {
    return (
        <RNBounceable onPress={handlePress} style={styles.card_ctnr}>
            <View style={styles.card_left}>
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
                <Text style={styles.handle_text}>{handle}</Text>
            </View>
            <View style={styles.card_right}>
                <Text style={styles.stat_text}>{value}lbs</Text>
                <Text style={styles.rank_text}>{getOrdinalString(rank)}</Text>
                <ArrowDown2 size={20} color="red" style={styles.arrow_icon} />
            </View>
        </RNBounceable>
    )
};

const styles = StyleSheet.create({
    card_ctnr: {
        height: 72,
        borderRadius: 20,
        // borderWidth: 1.5,
        // borderColor: '#ccc',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginHorizontal: 15,
        marginBottom: 13,

        backgroundColor: '#fff',
        shadowColor: '#888',
        shadowOffset: { width: 0, height: 0.8 },
        shadowOpacity: 0.6,
        shadowRadius: 2,  
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: 36,
        aspectRatio: 1
    },
    pfp: {
        flex: 1,
        borderRadius: 100
    },
    handle_text: {
        fontSize: 17,
        fontFamily: 'Outfit_500Medium',
        paddingHorizontal: 12,
        color: '#333'
    },
    card_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#2D9EFF',
        fontSize: 16
    },
    rank_text: {
        fontFamily: 'Mulish_700Bold',
        paddingLeft: 14,
        fontSize: 14.5
    },
    arrow_icon: {
        marginLeft: 3.5
    },
});