import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { Profile2User } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function StatsRow() {
    const [selectedOption, setSelectedOption] = useState('star');

    const stats = [
        { number: '132', text: 'New PRs' },
        { number: '20k', text: 'Lbs Lifted' },
        { number: '5.5h', text: 'Spent In Gym' },
    ];

    const getHeaderText = () => {
        switch (selectedOption) {
            case 'star':
                return 'Close Friends';
            case 'profile':
                return 'All Followers';
            case 'globe':
                return 'Global Users';
            default:
                return 'Close Friends';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statBox}>
                {stats.map((stat, index) => (
                    <RNBounceable key={index} style={styles.stat}>
                        <Text style={styles.bigNumber}>{stat.number}</Text>
                        <Text style={styles.smallText}>{stat.text}</Text>
                    </RNBounceable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 15,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 5,
    },
    header_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 20,
        color: '#000',
    },
    scope_options: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 10,
    },
    statBox: {
        backgroundColor: '#1F1F1F',
        flexDirection: 'row',
        padding: 10,
        justifyContent: 'space-around',
        alignItems: 'center',
        borderRadius: 25,
        marginHorizontal: 16,
        height: 100,
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
        fontSize: 24,
        color: '#B9DCFF',
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: 1,
        fontSize: 14.5,
        color: '#eee',
        fontFamily: 'Lato_700Bold'
    },
});
