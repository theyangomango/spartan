import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { Profile2User } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function StatsRow() {
    const stats = [
        { number: '132', text: 'New PRs' },
        { number: '20k', text: 'Lbs Lifted' },
        { number: '5.5h', text: 'Spent In Gym' },
    ];

    return (
        <View style={styles.container}>
            <RNBounceable style={styles.statBox}>
                {stats.map((stat, index) => (
                    <View key={index} style={styles.stat}>
                        <Text style={styles.bigNumber}>{stat.number}</Text>
                        <Text style={styles.smallText}>{stat.text}</Text>
                    </View>
                ))}
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 12,
        marginBottom: 10,
        marginHorizontal: 2.5
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 5,
    },
    statBox: {
        backgroundColor: '#1F1F1F',
        flexDirection: 'row',
        paddingHorizontal: 18,
        justifyContent: 'space-around',
        alignItems: 'center',
        borderRadius: 28,
        marginHorizontal: 16,
        height: 92,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    stat: {
        width: '33%',
        alignItems: 'center',
    },
    bigNumber: {
        fontSize: 21.9,
        color: '#B9DCFF',
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: 1.5,
        fontSize: 12.5,
        color: '#eee',
        fontFamily: 'Lato_700Bold'
    },
});
