import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Dimensions } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';
import formatTimestampToDateString from '../../../../helper/formatTimestampToDateString';
import roundToNearestMinute from '../../../../helper/roundToNearestMinute';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

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
                        <Clock color='#666' size={scaledSize(16)} variant='Bold' />
                        <Text style={styles.stats_text}>{roundToNearestMinute(workout.duration)} min</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <View style={{ paddingBottom: scaledSize(1.2) }}>
                            <MaterialCommunityIcons name='weight' size={scaledSize(17)} color={'#666'} />
                        </View>
                        <Text style={styles.stats_text}>{workout.volume} lb</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <MaterialCommunityIcons name="trophy" color={"#666"} size={scaledSize(14)} />
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
                    contentContainerStyle={{ paddingBottom: scaledSize(10) }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        borderRadius: scaledSize(25),
        paddingHorizontal: scaledSize(25),
        marginVertical: scaledSize(9),
        marginHorizontal: scaledSize(20),
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(1.5) },
        shadowOpacity: 0.2,
        shadowRadius: scaledSize(3),
        elevation: 15,
        justifyContent: 'space-between'
    },
    scroll_ctnr: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: scaledSize(12),
        paddingBottom: scaledSize(10)
    },
    header: {
        marginBottom: scaledSize(6)
    },
    date_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(17),
        color: '#2D9EFF'
    },
    stats_row: {
        flexDirection: 'row',
        marginBottom: scaledSize(10),
    },
    stats_entry: {
        marginRight: scaledSize(15),
        flexDirection: 'row',
        alignItems: 'center',
    },
    stats_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(13.5),
        marginLeft: scaledSize(5),
        color: '#666'
    },
    stats_header: {
        flexDirection: 'row',
        paddingBottom: scaledSize(3),
    },
    stats_header_left: {
        width: '65%',
        marginRight: scaledSize(30),
    },
    stats_header_text: {
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_500Medium'
    },
    entry_ctnr: {
        flexDirection: 'row'
    },
    entry_left: {
        flexDirection: 'row',
        width: '65%',
        marginRight: scaledSize(30),
        paddingBottom: scaledSize(4.5),
        alignItems: 'center'
    },
    entry_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaledSize(13.5),
        marginRight: scaledSize(5),
        flex: 1,
        color: '#666'
    },
    muscle_ctnr: {
        borderRadius: scaledSize(10),
        paddingHorizontal: scaledSize(8.5),
        paddingVertical: scaledSize(1.5),
        alignItems: 'center',
        justifyContent: 'center'
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(10.5),
        color: '#fff'
    },
    entry_right: {
        justifyContent: 'center',
    },
});

export default React.memo(PastWorkoutCard);
