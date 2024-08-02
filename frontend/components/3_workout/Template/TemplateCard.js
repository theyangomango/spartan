import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableWithoutFeedback, Animated, Pressable } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Calendar, Weight } from 'iconsax-react-native';
import Collapsible from 'react-native-collapsible';
import TemplateDetails from './TemplateDetails';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function TemplateCard({ lastUsedDate, name, exercises, handleLongPress, isPanelVisible, setSelectedTemplate }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const borderRadiusAnim = useRef(new Animated.Value(15)).current; // Initial border radius value

    const handlePress = () => {
        console.log(isPanelVisible);

        if (isPanelVisible) {
            setSelectedTemplate(name);
        }

        else {
            setIsCollapsed(!isCollapsed);
        }
    };

    // useEffect(() => {
    //     Animated.timing(borderRadiusAnim, {
    //         toValue: isCollapsed ? 15 : 0, // Animate to 0 when expanded, 15 when collapsed
    //         duration: 300, // Duration of the animation
    //         useNativeDriver: false,
    //     }).start();
    // }, [isCollapsed]);

    return (
        <RNBounceable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={200}>
            <Animated.View style={[styles.main_ctnr, { borderBottomLeftRadius: borderRadiusAnim, borderBottomRightRadius: borderRadiusAnim }]}>
                <View style={styles.text_container}>
                    <Text style={styles.title_text}>{name}</Text>
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
                <Ionicons name="chevron-down" size={22} color="#999" style={styles.chevron_icon} />
            </Animated.View>

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
        alignItems: 'center'
    },
    text_container: {
        flex: 1,
    },
    title_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#2D9EFF',
        paddingBottom: 5.5
    },
    info_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2
    },
    date_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20
    },
    date_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 13,
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
        marginLeft: 1
    },
    chevron_icon: {
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
    collapsibleContainer: {
        overflow: 'hidden',
    },
});

