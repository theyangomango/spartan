import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Animated } from "react-native";
import { Calendar, Weight } from 'iconsax-react-native';
import Collapsible from 'react-native-collapsible';
import TemplateDetails from './TemplateDetails';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function TemplateCard({ lastUsedDate, name, exercises, handleLongPress, isPanelVisible, setSelectedTemplate }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        if (isPanelVisible) {
            setSelectedTemplate(name);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };

    const handleStartButtonPressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.8,
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
            <View style={styles.main_ctnr}>
                <View style={styles.text_container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title_text}>{name}</Text>
                        <RNBounceable bounceEffectIn={0.7} style={styles.editButton}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </RNBounceable>
                    </View>
                    <View style={styles.info_ctnr}>
                        <View style={styles.date_ctnr}>
                            <Calendar size="18.5" color={'#666'} />
                            <Text style={styles.date_text}> {lastUsedDate}</Text>
                        </View>
                        <View style={styles.exercises_ctnr}>
                            <Weight size="21.5" color="#666" />
                            <Text style={styles.exercises_text}> {exercises.length} Exercises</Text>
                        </View>
                    </View>
                </View>
                <Pressable
                    onPressIn={handleStartButtonPressIn}
                    onPressOut={handleStartButtonPressOut}
                >
                    <Animated.View style={[styles.startButton, { transform: [{ scale: scaleValue }] }]}>
                        <Text style={styles.startButtonText}>Start</Text>
                    </Animated.View>
                </Pressable>
            </View>

            <Collapsible collapsed={isCollapsed} style={styles.collapsibleContainer}>
                <TemplateDetails exercises={exercises} />
            </Collapsible>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
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
    text_container: {
        flex: 1,
        justifyContent: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 5.5,
    },
    title_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 15,
        color: '#2D9EFF',
    },
    editButton: {
        backgroundColor: '#ccc',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginLeft: 4,
    },
    editButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 12,
    },
    info_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    date_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    date_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12.5,
        color: '#666',
    },
    exercises_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exercises_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 13,
        color: '#666',
        marginLeft: 1,
    },
    startButton: {
        backgroundColor: '#32CD32',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 8,
        right: 20,
        transform: [{ translateY: -10 }],
    },
    startButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
    collapsibleContainer: {
        overflow: 'hidden',
    },
});
