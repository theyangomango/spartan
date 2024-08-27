import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const TemplateDetails = ({ exercises }) => {
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
                            <Text style={styles.muscle_text} numberOfLines={1}>
                                {exercise.muscle}
                            </Text>
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
        borderBottomLeftRadius: scaleSize(25),
        borderBottomRightRadius: scaleSize(25),
        paddingHorizontal: scaleSize(25),
        marginTop: scaleSize(-8),
        marginHorizontal: scaleSize(16),
        backgroundColor: '#fff',
        borderWidth: scaleSize(3),
        borderColor: '#f6f6f6'
    },
    scroll_ctnr: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: scaleSize(12),
        paddingBottom: scaleSize(5),
    },
    entry_ctnr: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: scaleSize(6),
    },
    entry_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13.5),
        marginRight: scaleSize(10),
        color: '#666',
        flex: 1, // Make the text take up available space
        flexShrink: 1, // Allow the text to shrink if needed
    },
    muscle_ctnr: {
        borderRadius: scaleSize(10),
        paddingHorizontal: scaleSize(8.5),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0, // Prevent the muscle container from shrinking
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(10.5),
        color: '#fff',
    },
});

export default TemplateDetails;
