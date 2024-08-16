import React, { useState, useRef, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Animated } from 'react-native';
import { Calendar, Weight } from 'iconsax-react-native';
import Collapsible from 'react-native-collapsible';
import RNBounceable from '@freakycoder/react-native-bounceable';
import TemplateDetails from './TemplateDetails';

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
        }).start()
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
                        <Text style={styles.titleText}>{template.name}</Text>
                        <RNBounceable bounceEffectIn={0.7} style={styles.editButton} onPress={handlePressEditButton}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </RNBounceable>
                    </View>
                    <View style={styles.infoContainer}>
                        <View style={styles.dateContainer}>
                            <Calendar size="18.5" color='#666' />
                            <Text style={styles.dateText}> {template.lastDate ? template.lastDate : 'New'}</Text>
                        </View>
                        <View style={styles.exercisesContainer}>
                            <Weight size="21.5" color='#666' />
                            <Text style={styles.exercisesText}> {template.exercises.length} {`Exercise${template.exercises.length == 1 ? '' : 's'}`}</Text>
                        </View>
                    </View>
                </View>
                <Pressable
                    onPress={handlePressStartButton}
                    onPressIn={handleStartButtonPressIn}
                    onPressOut={handleStartButtonPressOut}
                >
                    <Animated.View style={[styles.startButton, { transform: [{ scale: scaleValue }] }]}>
                        <Text style={styles.startButtonText}>Start</Text>
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
        paddingLeft: 27,
        paddingRight: 3,
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
        fontSize: 15,
        color: '#2D9EFF',
    },
    editButton: {
        backgroundColor: '#ccc',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginLeft: 5.5,
    },
    editButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 11,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    dateText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12.5,
        color: '#666',
    },
    exercisesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exercisesText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 13,
        color: '#666',
        marginLeft: 1,
    },
    startButton: {
        backgroundColor: '#84E1B5',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 8,
        right: 20,
        transform: [{ translateY: -10 }],
    },
    startButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 13.5,
    },
    collapsibleContainer: {
        overflow: 'hidden',
    },
});
