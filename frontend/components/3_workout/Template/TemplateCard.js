import React, { useRef, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { Weight } from 'iconsax-react-native';
import PlayIcon from './PlayIcon';
import CalendarIcon from "./CalendarIcon";
import { FontAwesome5 } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import WeightIcon from './WeightIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;
function scaleSize(size) {
    return Math.round(size * (SCREEN_WIDTH / BASE_WIDTH));
}

const CIRCLE_SIZE = scaleSize(41);

const TemplateCard = memo(
    ({ template, handleLongPress, handlePressEditButton, handlePressStartButton }) => {
        const scaleValue = useRef(new Animated.Value(1)).current;

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
            <RNBounceable
                onPress={handlePressEditButton}
                onLongPress={handleLongPress}
                delayLongPress={200}
            >
                <View style={styles.mainContainer}>
                    <View style={styles.textContainer}>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.titleText, { fontSize: scaleSize(16) }]}>
                                {template.name}
                            </Text>
                        </View>
                        <View style={styles.infoContainer}>
                            <View style={styles.dateContainer}>
                                <CalendarIcon width={scaleSize(18)} height={scaleSize(18)} />
                                <Text style={[styles.dateText, { fontSize: scaleSize(14) }]}>
                                    {template.lastDate ? template.lastDate : 'New!'}
                                </Text>
                            </View>
                            <View style={styles.exercisesContainer}>
                                <WeightIcon width={scaleSize(21)} height={scaleSize(21)} />
                                <Text style={[styles.exercisesText]}>
                                    <Text style={{ fontSize: scaleSize(15) }}>
                                        {template.exercises.length > 0 && (template.exercises.length + ' ')}
                                    </Text>
                                    <Text style={{ fontSize: scaleSize(14) }}>
                                        {template.exercises.length === 0 && 'No '}
                                        {`Exercise${template.exercises.length === 1 ? '' : 's'}`}
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Pressable
                        onPress={handlePressStartButton}
                        onPressIn={handleStartButtonPressIn}
                        onPressOut={handleStartButtonPressOut}
                        style={styles.startButton}
                    >
                        <Animated.View style={[styles.circle, { transform: [{ scale: scaleValue }] }]}>
                            {/* <FontAwesome5 name="play" size={scaleSize(15)} color="#fff" /> */}
                            <PlayIcon size={scaleSize(15)} color="#fff" />
                        </Animated.View>
                    </Pressable>
                </View>
            </RNBounceable>
        );
    }
);

export default TemplateCard;

const styles = StyleSheet.create({
    mainContainer: {
        borderRadius: scaleSize(15),
        paddingLeft: scaleSize(30),
        marginTop: scaleSize(10),
        paddingTop: 2,
        marginHorizontal: scaleSize(16),
        backgroundColor: '#f7f7f7',
        height: scaleSize(85),
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
        paddingBottom: scaleSize(5),
        marginTop: scaleSize(4)
    },
    titleText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#2D9EFF',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaleSize(13),
    },
    dateText: {
        fontFamily: 'SourceSansPro_700Bold',
        color: '#888',
        marginLeft: scaleSize(5),
        marginBottom: scaleSize(0.2)
    },
    exercisesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: scaleSize(1.8)
    },
    exercisesText: {
        fontFamily: 'SourceSansPro_700Bold',
        color: '#888',
        marginLeft: scaleSize(5),
        marginBottom: scaleSize(1.35)
    },
    startButton: {
        marginRight: scaleSize(25),
    },
    circle: {
        backgroundColor: '#6FB8FF',
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 2,
    },
});
