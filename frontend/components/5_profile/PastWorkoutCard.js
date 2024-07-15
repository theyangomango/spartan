import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useRef } from 'react';
import { StyleSheet, View, Text, ScrollView } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons'
import { Clock } from 'iconsax-react-native'

export default function PastWorkoutCard({ lastUsedDate, exercises, name }) {
    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    return (
        <RNBounceable>
            <View style={styles.main_ctnr}>
                <View style={styles.scroll_ctnr}>
                    <View style={styles.header}>
                        <Text style={styles.date_text}>Thursday, June 11th</Text>
                    </View>
                    <View style={styles.stats_row}>
                        <View style={styles.stats_entry}>
                            <Clock color='#666' size={16} variant='Bold' />
                            <Text style={styles.stats_text}>45 min</Text>
                        </View>
                        <View style={styles.stats_entry}>
                            <View style={{paddingBottom: 1.2}}>
                                <MaterialCommunityIcons name='weight' size={17} color={'#666'} />
                            </View>
                            <Text style={styles.stats_text}>5,000 lb</Text>
                        </View>
                        <View style={styles.stats_entry}>
                            {/* <Icon name="trophy" size={16} color="#666" /> */}
                            <FontAwesome6 name="trophy" color={"#666"} size={14} />
                            <Text style={styles.stats_text}>3 PRs</Text>
                        </View>
                    </View>
                    <View style={styles.stats_header}>
                        <View style={styles.stats_header_left}>
                            <Text style={styles.stats_header_text}>Exercise</Text>
                        </View>
                        <View style={styles.stats_header_right}>
                            <Text style={styles.stats_header_text}>Best Set</Text>
                        </View>
                    </View>
                    {exercises.map((exercise, index) => (
                        <View key={index} style={styles.entry_ctnr}>
                            <View style={styles.entry_left}>
                                <Text
                                    style={styles.entry_text}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {exercise.name}
                                </Text>
                                <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[exercise.muscle] }]}>
                                    <Text style={styles.muscle_text}>{exercise.muscle}</Text>
                                </View>
                            </View>

                            <View style={styles.entry_right}>
                                <Text style={styles.entry_text}>25lb x 12</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        borderRadius: 25,
        paddingHorizontal: 25,
        marginVertical: 9,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 15,
        justifyContent: 'space-between'
    },
    scroll_ctnr: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 12,
        paddingBottom: 10
    },
    header: {
        // alignItems: 'center',
        marginBottom: 6
    },
    date_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 17,
        color: '#2D9EFF'
    },
    stats_row: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    stats_entry: {
        marginRight: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    stats_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 13.5,
        marginLeft: 5,
        color: '#666'
    },
    stats_header: {
        flexDirection: 'row',
        paddingBottom: 3,
    },
    stats_header_left: {
        width: '65%',
        marginRight: 30,
    },
    stats_header_text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold'
    },
    entry_ctnr: {
        flexDirection: 'row'
    },
    entry_left: {
        flexDirection: 'row',
        width: '65%',
        marginRight: 30,
        paddingBottom: 4.5,
        alignItems: 'center'
    },
    entry_text: {
        fontFamily: 'Outfit_300Light',
        fontSize: 14.5,
        marginRight: 5,
        flex: 1,
        color: '#666'
    },
    muscle_ctnr: {
        borderRadius: 10,
        paddingHorizontal: 8.5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 10.5,
        color: '#fff'
    },
    entry_right: {
        justifyContent: 'center',
    },
});
