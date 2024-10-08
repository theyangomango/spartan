import React from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native';
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
    Abs: '#FF7561',
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
                    numberOfLines={1} // Truncate to a single line
                    ellipsizeMode="tail" // Show '...' when the text overflows
                >
                    {`${item.sets.length} x ${item.name}`}
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
            <Pressable style={styles.centeredView} onPress={onClose}>
                <Pressable style={styles.modalView} onPress={() => { }}>
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
                        <RNBounceable style={styles.shareButton} onPress={postWorkout}>
                            <Text style={styles.buttonText}>Share Post </Text>
                            <MaterialCommunityIcons name="arm-flex" size={scaledSize(18)} color={'#fff'} />
                        </RNBounceable>
                    </View>
                </Pressable>
            </Pressable>
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
        paddingHorizontal: scaledSize(25),
    },
    date_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(17),
        color: '#2D9EFF',
    },
    stats_row: {
        flexDirection: 'row',
        marginBottom: scaledSize(10),
        paddingHorizontal: scaledSize(25),
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
        paddingHorizontal: scaledSize(25),
        flexDirection: 'row',
        paddingBottom: scaledSize(3),
    },
    stats_header_text: {
        fontFamily: 'Outfit_600SemiBold',
    },
    stats_header_left: {
        width: '73%',
        marginRight: scaledSize(10)
    },
    stats_header_right: {
        width: '26%',
    },
    entry_ctnr: {
        paddingHorizontal: scaledSize(25),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: scaledSize(5),
    },
    entry_left: {
        width: '73%', // Fixed to 75% of the screen width
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaledSize(10)
    },
    entry_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(13),
        color: '#888',
        flexShrink: 1, // Ensure the text shrinks when needed
        padding: 0,    // Avoid any padding that might add space around text
        margin: 0,     // Remove any margin that might cause extra space
    },    
    muscle_ctnr: {
        borderRadius: scaledSize(10),
        paddingHorizontal: scaledSize(8.5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(10),
        color: '#fff',
        margin: scaledSize(1),
        paddingVertical: scaledSize(0.5)
    },
    entry_right: {
        width: '26%', // Fixed to 25% of the screen width
        justifyContent: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#40D99B',
        borderRadius: scaledSize(15),
        paddingVertical: scaledSize(10),
        marginHorizontal: scaledSize(20)
    },
    buttonText: {
        color: '#fff',
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_600SemiBold',
    },
});

export default WorkoutSummaryModal;
