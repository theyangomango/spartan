import React, { useRef, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { Calendar, Weight } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375; // Base screen width used for scaling

function scaleSize(size) {
    return Math.round(size * (SCREEN_WIDTH / BASE_WIDTH));
}

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
                                <Calendar size={scaleSize(17.5)} color="#666" />
                                <Text style={[styles.dateText, { fontSize: scaleSize(13) }]}>
                                    {template.lastDate ? template.lastDate : 'New!'}
                                </Text>
                            </View>
                            <View style={styles.exercisesContainer}>
                                <Weight size={scaleSize(19.5)} color="#666" />
                                <Text style={[styles.exercisesText, { fontSize: scaleSize(13) }]}>
                                    {template.exercises.length}{' '}
                                    {`Exercise${template.exercises.length === 1 ? '' : 's'}`}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Pressable
                        onPress={handlePressStartButton}
                        onPressIn={handleStartButtonPressIn}
                        onPressOut={handleStartButtonPressOut}
                    >
                        <Animated.View style={[styles.startButton, { transform: [{ scale: scaleValue }] }]}>
                            <MaterialCommunityIcons name="arm-flex" size={scaleSize(24.5)} color="#fff" />
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
        paddingLeft: scaleSize(25),
        marginTop: scaleSize(10),
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
        paddingBottom: scaleSize(6.5),
    },
    titleText: {
        fontFamily: 'Outfit_500Medium',
        color: '#2D9EFF',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(2),
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaleSize(11),
    },
    dateText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#777',
        marginLeft: scaleSize(3)
    },
    exercisesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exercisesText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#777',
        marginLeft: scaleSize(3),
    },
    startButton: {
        backgroundColor: '#71D6A6',
        marginRight: scaleSize(25),
        borderRadius: scaleSize(100),
        padding: scaleSize(6),
    },
    startButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
    },
    collapsibleContainer: {
        overflow: 'hidden',
    },
    // If you decide to bring back your Edit button, apply scaleSize here:
    /*
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
    */
});
