import React, { useState, useRef, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { Calendar, Weight } from 'iconsax-react-native';
import Collapsible from 'react-native-collapsible';
import RNBounceable from '@freakycoder/react-native-bounceable';
import TemplateDetails from './TemplateDetails';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const TemplateCard = memo(({ template, handleLongPress, handlePressEditButton, handlePressStartButton }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleStartButtonPressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.9,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handleStartButtonPressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    return (
        <RNBounceable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={200}>
            <View style={styles.mainContainer}>
                <View style={styles.textContainer}>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.titleText, { fontSize: scaleSize(15) }]}>{template.name}</Text>
                        <RNBounceable bounceEffectIn={0.7} style={styles.editButton} onPress={handlePressEditButton}>
                            <Text style={[styles.editButtonText, { fontSize: scaleSize(12) }]}>Edit</Text>
                        </RNBounceable>
                    </View>
                    <View style={styles.infoContainer}>
                        <View style={styles.dateContainer}>
                            <Calendar size={scaleSize(18.5)} color='#666' />
                            <Text style={[styles.dateText, { fontSize: scaleSize(14) }]}> {template.lastDate ? template.lastDate : 'New'}</Text>
                        </View>
                        <View style={styles.exercisesContainer}>
                            <Weight size={scaleSize(21.5)} color='#666' />
                            <Text style={[styles.exercisesText, { fontSize: scaleSize(14) }]}> {template.exercises.length} {`Exercise${template.exercises.length == 1 ? '' : 's'}`}</Text>
                        </View>
                    </View>
                </View>
                <Pressable
                    onPress={handlePressStartButton}
                    onPressIn={handleStartButtonPressIn}
                    onPressOut={handleStartButtonPressOut}
                >
                    <Animated.View style={[styles.startButton, { transform: [{ scale: scaleValue }] }]}>
                        <Text style={[styles.startButtonText, { fontSize: scaleSize(12.5) }]}>Start</Text>
                    </Animated.View>
                </Pressable>
            </View>

            <Collapsible collapsed={isCollapsed} style={styles.collapsibleContainer}>
                <TemplateDetails exercises={template.exercises} />
            </Collapsible>
        </RNBounceable>
    );
});

export default TemplateCard;

const styles = StyleSheet.create({
    mainContainer: {
        borderRadius: 15,
        paddingLeft: 22,
        marginTop: 10,
        marginHorizontal: 16,
        backgroundColor: '#f8f8f8',
        height: 85,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 5.5,
    },
    titleText: {
        fontFamily: 'Outfit_500Medium',
        color: '#2D9EFF',
    },
    editButton: {
        backgroundColor: '#ccc',
        paddingVertical: scaleSize(3),
        paddingHorizontal: scaleSize(8),
        borderRadius: scaleSize(8),
        marginLeft: scaleSize(5.5),
    },
    editButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(2),
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaleSize(15),
    },
    dateText: {
        fontFamily: 'Outfit_500Medium',
        color: '#666',
    },
    exercisesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exercisesText: {
        fontFamily: 'Outfit_500Medium',
        color: '#666',
        marginLeft: scaleSize(1),
    },
    startButton: {
        backgroundColor: '#71D6A6',
        // backgroundColor: '#2D9EFF',
        paddingVertical: scaleSize(5),
        paddingHorizontal: scaleSize(15),
        borderRadius: scaleSize(8),
        right: scaleSize(18),
        transform: [{ translateY: -scaleSize(10) }],
    },
    startButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
    },
    collapsibleContainer: {
        overflow: 'hidden',
    },
});
