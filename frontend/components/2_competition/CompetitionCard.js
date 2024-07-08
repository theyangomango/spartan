import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown2 } from 'iconsax-react-native';
import { useEffect, useState } from 'react';
import getPFP from '../../../backend/storage/getPFP';
import getOrdinalString from '../../helper/getOrdinalString';

export default function CompetitionCard({ uid, pfp, handle, value, rank }) {
    return (
        <View style={styles.card_ctnr}>
            <View style={styles.card_left}>
                <View style={styles.pfp_ctnr}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
                <Text style={styles.handle_text}>{handle}</Text>
            </View>
            <View style={styles.card_right}>
                {/* <Text style={styles.stat_text}>{value}lbs</Text> */}
                {/* <Text style={styles.rank_text}>{getOrdinalString(rank)}</Text> */}
                <ArrowDown2 size={20} color="red" style={styles.arrow_icon} />
            </View>
        </View>
    )
};

const styles = StyleSheet.create({
    card_ctnr: {
        height: 65,
        borderRadius: 15,
        borderWidth: 0.8,
        borderColor: '#555',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: 36,
        height: 36,
    },
    pfp: {
        flex: 1,
        borderRadius: 18
    },
    handle_text: {
        fontFamily: 'Mulish_700Bold',
        paddingHorizontal: 10
    },
    card_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#2D9EFF',
    },
    rank_text: {
        fontFamily: 'Mulish_700Bold',
        paddingLeft: 14,
    },
    arrow_icon: {
        marginLeft: 3.5
    },
});