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

const CIRCLE_SIZE = scaleSize(40);

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
                                <CalendarIcon width={scaleSize(15.6)} height={scaleSize(15.6)} />
                                <Text style={[styles.dateText, { fontSize: scaleSize(13) }]}>
                                    {template.lastDate ? template.lastDate : 'New!'}
                                </Text>
                            </View>
                            <View style={styles.exercisesContainer}>
                                <WeightIcon width={scaleSize(18)} height={scaleSize(18)} />
                                <Text style={[styles.exercisesText]}>
                                    <Text style={{ fontSize: scaleSize(13) }}>
                                        {template.exercises.length > 0 && (template.exercises.length + ' ')}
                                    </Text>
                                    <Text style={{ fontSize: scaleSize(13) }}>
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
        borderRadius: scaleSize(20),
        paddingLeft: scaleSize(31),
        marginTop: scaleSize(11),
        paddingTop: 5,
        paddingBottom: 1,
        marginHorizontal: scaleSize(16),
        backgroundColor: '#fff',
        height: scaleSize(79),
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',

        shadowColor: '#99a5b7ff',
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: scaleSize(3.4),
    },
    titleText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#2D9EFF',
        // color: '#000',

    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaleSize(11),
    },
    dateText: {
        fontFamily: 'Outfit_500Medium',
        color: '#888',
        marginLeft: scaleSize(4),
        marginBottom: scaleSize(0.2),
        letterSpacing: -0.1

    },
    exercisesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: scaleSize(1.8)
    },
    exercisesText: {
        fontFamily: 'Outfit_500Medium',
        color: '#888',
        marginLeft: scaleSize(4),
        marginBottom: scaleSize(1.35),
        letterSpacing: -0.1
    },
    startButton: {
        marginRight: scaleSize(26),
    },
    circle: {
        backgroundColor: '#6fb7ffd1',
        // backgroundColor: '#5786e5a1',
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 2,
    },
});
