import React from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import roundToNearestMinute from '../../helper/roundToNearestMinute';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

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

const WorkoutSummaryModal = ({ isVisible, workout, onClose, postWorkout }) => {
    if (!workout) return null;

    const { exercises, created } = workout;

    const renderExercise = ({ item }) => (
        <View style={styles.entry_ctnr}>
            <View style={styles.entry_left}>
                <Text
                    style={styles.entry_text}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {`${item.sets.length} x ${item.name}`} {/* Display the number of sets before the exercise name */}
                </Text>
                <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[item.muscle] || '#ccc' }]}>
                    <Text style={styles.muscle_text}>{item.muscle}</Text>
                </View>
            </View>
            <View style={styles.entry_right}>
                <Text style={styles.entry_text}>
                    {item.sets.length > 0 ? `${item.sets[0].weight}lb x ${item.sets[0].reps}` : 'N/A'}
                </Text>
            </View>
        </View>
    );

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.date_text}>{new Date(created).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.stats_row}>
                        <View style={styles.stats_entry}>
                            <Clock color='#666' size={scaledSize(16)} variant='Bold' />
                            <Text style={styles.stats_text}>{roundToNearestMinute(workout.duration)} min</Text>
                        </View>
                        <View style={styles.stats_entry}>
                            <MaterialCommunityIcons name='weight' size={scaledSize(17)} color={'#666'} />
                            <Text style={styles.stats_text}>{workout.volume} lb</Text>
                        </View>
                        <View style={styles.stats_entry}>
                            <MaterialCommunityIcons name="trophy" color={"#666"} size={scaledSize(14)} />
                            <Text style={styles.stats_text}>{workout.PBs} PB{workout.PBs == 1 ? '' : 's'}</Text>
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
                        data={exercises}
                        renderItem={renderExercise}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        contentContainerStyle={{ paddingBottom: scaledSize(10) }}
                    />
                    <View style={styles.buttonRow}>
                        <RNBounceable style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.buttonText}>Close</Text>
                        </RNBounceable>
                        <RNBounceable style={styles.shareButton} onPress={postWorkout}>
                            <Text style={styles.buttonText}>Post</Text>
                        </RNBounceable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darken the background
    },
    modalView: {
        width: '90%',
        backgroundColor: "#fff",
        borderRadius: scaledSize(25),
        paddingHorizontal: scaledSize(25),
        paddingTop: scaledSize(15),
        paddingBottom: scaledSize(14),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(1.5) },
        shadowOpacity: 0.2,
        shadowRadius: scaledSize(3),
        elevation: 15,
    },
    header: {
        marginBottom: scaledSize(6),
    },
    date_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(17),
        color: '#2D9EFF',
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
        color: '#666',
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
        fontSize: scaledSize(16),
        fontFamily: 'Outfit_500Medium',
    },
    entry_ctnr: {
        flexDirection: 'row',
    },
    entry_left: {
        flexDirection: 'row',
        width: '65%',
        marginRight: scaledSize(30),
        paddingBottom: scaledSize(4.5),
        alignItems: 'center',
    },
    entry_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaledSize(14.5),
        marginRight: scaledSize(5),
        flex: 1,
        color: '#666',
    },
    muscle_ctnr: {
        borderRadius: scaledSize(10),
        paddingHorizontal: scaledSize(8.5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(10.5),
        color: '#fff',
    },
    entry_right: {
        justifyContent: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    shareButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#40D99B',
        borderRadius: scaledSize(10),
        paddingVertical: scaledSize(10),
    },
    closeButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc',
        borderRadius: scaledSize(10),
        marginRight: scaledSize(8),
    },
    buttonText: {
        color: '#fff',
        fontSize: scaledSize(14),
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default WorkoutSummaryModal;
