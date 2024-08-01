import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const TemplateDetails = ({ exercises }) => {
    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.scroll_ctnr}>
                {exercises.map((exercise, index) => (
                    <View key={index} style={styles.entry_ctnr}>
                        <Text
                            style={styles.entry_text}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {exercise.sets.length} x {exercise.name}
                        </Text>
                        <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[exercise.muscle] }]}>
                            <Text style={styles.muscle_text}>{exercise.muscle}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        paddingHorizontal: 25,
        marginTop: -8,
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#f6f6f6'
    },
    scroll_ctnr: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 12,
        paddingBottom: 5,
    },
    stats_header: {
        flexDirection: 'row',
        paddingBottom: 3,
    },
    stats_header_left: {
        width: '65%',
        marginRight: 30,
    },
    entry_ctnr: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Ensure space between elements
        width: '100%',
        marginBottom: 6,
    },
    entry_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 13.5,
        marginRight: 10, // Add some margin to create space
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
});

export default TemplateDetails;
