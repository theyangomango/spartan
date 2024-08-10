import React from 'react';
import { Modal, View, Text, StyleSheet, FlatList } from 'react-native';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

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
                <View style={[styles.muscle_ctnr, { backgroundColor: '#A1CDEE' }]}>
                    <Text style={styles.muscle_text}>Muscle Group</Text>
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
                            <Clock color='#666' size={16} variant='Bold' />
                            <Text style={styles.stats_text}>45 min</Text>
                        </View>
                        <View style={styles.stats_entry}>
                            <MaterialCommunityIcons name='weight' size={17} color={'#666'} />
                            <Text style={styles.stats_text}>{calculateTotalVolume(exercises)} lb</Text>
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
                        data={exercises}
                        renderItem={renderExercise}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        contentContainerStyle={{ paddingBottom: 10 }}
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

const calculateTotalVolume = (exercises) => {
    return exercises.reduce((total, exercise) => {
        return total + exercise.sets.reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0);
    }, 0);
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
        borderRadius: 25,
        paddingHorizontal: 25,
        paddingTop: 15,
        paddingBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 15,
    },
    header: {
        marginBottom: 6,
    },
    date_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 17,
        color: '#2D9EFF',
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
        color: '#666',
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
        fontFamily: 'Outfit_500Medium',
    },
    entry_ctnr: {
        flexDirection: 'row',
    },
    entry_left: {
        flexDirection: 'row',
        width: '65%',
        marginRight: 30,
        paddingBottom: 4.5,
        alignItems: 'center',
    },
    entry_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14.5,
        marginRight: 5,
        flex: 1,
        color: '#666',
    },
    muscle_ctnr: {
        borderRadius: 10,
        paddingHorizontal: 8.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 10.5,
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
        borderRadius: 10,
        paddingVertical: 10,
    },
    closeButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc',
        borderRadius: 10,
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default WorkoutSummaryModal;
