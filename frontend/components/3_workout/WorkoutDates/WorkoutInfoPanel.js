import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Feather, Octicons } from '@expo/vector-icons';

const WorkoutInfoPanel = ({ isVisible, onClose, date, selectedTemplate, setSelectedTemplate }) => {
    const panelOpacity = useRef(new Animated.Value(0)).current;
    const [panelZIndex, setPanelZIndex] = useState(0);

    function deselectTemplate() {
        setSelectedTemplate(null);
    }

    useEffect(() => {
        if (isVisible) {
            Animated.timing(panelOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).stop();
            setPanelZIndex(1);
            Animated.timing(panelOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
            });
        } else {
            Animated.timing(panelOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setPanelZIndex(0);
            });
        }
    }, [isVisible]);

    // Parse and format the date
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
    });

    return (
        <Animated.View style={[styles.panel, { opacity: panelOpacity, zIndex: panelZIndex }]}>
            <View style={styles.panelHeader}>
                <View style={styles.panelHeaderTextContainer}>
                    <Text style={styles.panelHeaderText}>{formattedDate} Workout</Text>
                    <View style={styles.pfp_ctnr}>
                        <Image
                            source={{ uri: global.userData.image }}
                            style={styles.profileImage}
                        />
                    </View>
                </View>
                <RNBounceable onPress={onClose}>
                    {/* <Feather name="check-circle" size={22} color="#000" /> */}
                    <Octicons name='check-circle-fill' size={22} color={'#bbb'}/>
                </RNBounceable>
            </View>
            <View style={styles.panelButtonsRow}>
                <RNBounceable style={[styles.templateButton, selectedTemplate && styles.selectedTemplateButton]} onPress={deselectTemplate}>
                    <Text style={[styles.templateButtonText, selectedTemplate && styles.selectedTemplateButtonText]}>
                        {selectedTemplate ? selectedTemplate.name : 'No Template Selected'}
                    </Text>
                </RNBounceable>

                {/* // ! Removed from Beta */}
                {/* <RNBounceable style={styles.panelButton}>
                    <Text style={styles.panelButtonText}>6:00 - 7:00 PM</Text>
                </RNBounceable> */}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    panel: {
        position: 'absolute',
        top: 170,
        left: 10,
        right: 10,
        height: 90,
        borderRadius: 15,
        backgroundColor: '#f6f6f6',
        flexDirection: 'column',
        paddingLeft: 10,
        paddingTop: 12,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 7,
        paddingLeft: 8,
        paddingRight: 18
    },
    panelHeaderTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    panelHeaderText: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
        marginRight: 8,
    },
    pfp_ctnr: {
        paddingBottom: 2
    },
    profileImage: {
        width: 26,
        aspectRatio: 1,
        borderRadius: 15,
    },
    panelButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    panelButton: {
        borderRadius: 12,
        backgroundColor: '#ddd',
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 6,
    },
    panelButtonText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold'
    },
    templateButton: {
        borderRadius: 12,
        backgroundColor: '#e8e8e8',
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 6,
    },
    templateButtonText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        color: '#b8b8b8'
    },
    selectedTemplateButton: {
        backgroundColor: '#82BDFE',
    },
    selectedTemplateButtonText: {
        color: '#fff',
    },
});

export default WorkoutInfoPanel;
