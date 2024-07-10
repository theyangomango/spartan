import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { Profile2User } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function StatsRow() {
    const [selectedOption, setSelectedOption] = useState('star');

    const stats = [
        { number: '132', text: 'New PRs', backgroundColor: '#D7B7F5' },
        { number: '20k', text: 'Lbs lifted', backgroundColor: '#FFAFB8' },
        { number: '5.5h', text: 'Spent In Gym', backgroundColor: '#FFC97F' },
        // { number: '5.5h', text: 'Spent in gym', backgroundColor: '#FFE0B7' },
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
            <View style={styles.header}>
                <View>
                    <Text style={styles.header_text}>{getHeaderText()}</Text>
                    {/* <Text>Past 14 Days</Text> */}

                </View>
                <View style={styles.scope_options}>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.iconButton}
                        onPress={() => setSelectedOption('star')}
                    >
                        <MaterialCommunityIcons
                            name='star-circle'
                            size={26}
                            color={'#2D9EFF'}
                            style={{ opacity: selectedOption === 'star' ? 1 : 0.35 }}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.iconButton}
                        onPress={() => setSelectedOption('profile')}
                    >
                        <Profile2User
                            size="24"
                            color={'#2D9EFF'}
                            variant='Bold'
                            style={{ opacity: selectedOption === 'profile' ? 1 : 0.5 }}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.iconButton}
                        onPress={() => setSelectedOption('globe')}
                    >
                        <Entypo
                            color={'#2D9EFF'}
                            name='globe'
                            size={24}
                            style={{ opacity: selectedOption === 'globe' ? 1 : 0.3 }}
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.scrollview}>
                {stats.map((stat, index) => (
                    <RNBounceable key={index} style={[styles.statBox, { backgroundColor: stat.backgroundColor }]}>
                        <Text style={styles.statNumber}>{stat.number}</Text>
                        <Text style={styles.statText}>{stat.text}</Text>
                    </RNBounceable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 15,
        marginBottom: 15,
    },
    header: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingLeft: 26,
        paddingRight: 25,
        paddingBottom: 5,
        alignItems: 'center',
    },
    header_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 20,
    },
    scope_options: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 10,
    },
    scrollview: {
        paddingLeft: 20,
    },
    statBox: {
        width: 120,
        aspectRatio: 1,
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 30,
    },
    statNumber: {
        fontSize: 29,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
    },
    statText: {
        fontSize: 14.5,
        color: '#fff',
        position: 'absolute',
        bottom: 28,
        fontFamily: 'SourceSansPro_600SemiBold',
    },
});
