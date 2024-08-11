import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';
import formatTimestampToDateString from '../../../../helper/formatTimestampToDateString';
import roundToNearestMinute from '../../../../helper/roundToNearestMinute';

const PastWorkoutCard = ({ workout }) => {
    console.log('renders');
    console.log(workout.created);

    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Arms: '#CBBCFF',
        Back: '#95E0C8',
        Triceps: '#FFD580',
        Legs: '#FFB347',
        Abs: '#FF6961',
        // Add more muscle groups and colors as needed
    };

    const renderExercise = useCallback(({ item }) => (
        <View style={styles.entry_ctnr}>
            <View style={styles.entry_left}>
                <Text
                    style={styles.entry_text}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {item.name}
                </Text>
                <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[item.muscle] }]}>
                    <Text style={styles.muscle_text}>{item.muscle}</Text>
                </View>
            </View>

            <View style={styles.entry_right}>
                <Text style={styles.entry_text}>25lb x 12</Text>
            </View>
        </View>
    ), [muscleColors]);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.scroll_ctnr}>
                <View style={styles.header}>
                    <Text style={styles.date_text}>{formatTimestampToDateString(workout.created)}</Text>
                </View>
                <View style={styles.stats_row}>
                    <View style={styles.stats_entry}>
                        <Clock color='#666' size={16} variant='Bold' />
                        <Text style={styles.stats_text}>{roundToNearestMinute(workout.duration)} min</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <View style={{ paddingBottom: 1.2 }}>
                            <MaterialCommunityIcons name='weight' size={17} color={'#666'} />
                        </View>
                        <Text style={styles.stats_text}>{workout.volume} lb</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <MaterialCommunityIcons name="trophy" color={"#666"} size={14} />
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
                <FlatList
                    data={workout.exercises}
                    renderItem={renderExercise}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingBottom: 10 }}
                />
            </View>
        </View>
    );
};

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
        fontFamily: 'Outfit_500Medium',
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
        fontSize: 14,
        fontFamily: 'Outfit_500Medium'
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
        fontFamily: 'Outfit_400Regular',
        fontSize: 13.5,
        marginRight: 5,
        flex: 1,
        color: '#666'
    },
    muscle_ctnr: {
        borderRadius: 10,
        paddingHorizontal: 8.5,
        paddingVertical: 1.5,
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

export default React.memo(PastWorkoutCard);
