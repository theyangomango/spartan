import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { FontAwesome6, FontAwesome5 } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

const { width, height } = Dimensions.get('window');

// Function to determine the styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            iconSize: 20.5,
            buttonWidth: 120,
            buttonHeight: 42,
            buttonTextSize: 13.5,
            paddingHorizontal: 35,
            iconContainerSize: 60,
            plusIconSize: 14,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            iconSize: 19.5,
            buttonWidth: 113,
            buttonHeight: 39,
            buttonTextSize: 12.5,
            paddingHorizontal: 30,
            iconContainerSize: 58,
            plusIconSize: 12.5,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            iconSize: 18.5,
            buttonWidth: 110,
            buttonHeight: 38,
            buttonTextSize: 12.5,
            paddingHorizontal: 28,
            iconContainerSize: 56,
            plusIconSize: 12.5,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            iconSize: 17.5,
            buttonWidth: 105,
            buttonHeight: 37,
            buttonTextSize: 12,
            paddingHorizontal: 25,
            iconContainerSize: 54,
            plusIconSize: 12,
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function MessagesHeader({ toFeedScreen, openCreateGroupChatBottomSheet, setScope }) {
    const [selectedButton, setSelectedButton] = useState('All');

    const handleButtonPress = (button) => {
        setSelectedButton(button);
        setScope(button);
    };

    return (
        <View style={styles.mainContainer}>
            <View style={styles.row}>
                <TouchableOpacity activeOpacity={0.5} onPress={toFeedScreen} style={styles.arrowIconContainer}>
                    <FontAwesome6 name='chevron-left' size={dynamicStyles.iconSize} color="#2D9EFF" />
                </TouchableOpacity>
                <View style={styles.groupIconContainer}>
                    <TouchableOpacity activeOpacity={0.5} onPress={openCreateGroupChatBottomSheet}>
                        <FontAwesome5 name='users' size={dynamicStyles.iconSize} color="#2D9EFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.plusIconContainer}>
                    <FontAwesome5 name='plus' size={dynamicStyles.plusIconSize} color="#2D9EFF" />
                </View>
                <View style={styles.overlay}>
                    <RNBounceable
                        style={[
                            styles.buttonContainer,
                            styles.leftButtonContainer,
                            { 
                                backgroundColor: selectedButton === 'All' ? '#2D9EFF' : '#eee',
                                width: dynamicStyles.buttonWidth,
                                height: dynamicStyles.buttonHeight,
                            }
                        ]}
                        onPress={() => handleButtonPress('All')}
                    >
                        <Text style={[styles.buttonText, { 
                            color: selectedButton === 'All' ? '#fff' : '#888',
                            fontSize: dynamicStyles.buttonTextSize
                        }]}>All</Text>
                    </RNBounceable>
                    <RNBounceable
                        style={[
                            styles.buttonContainer,
                            styles.rightButtonContainer,
                            { 
                                backgroundColor: selectedButton === 'Group' ? '#2D9EFF' : '#eee',
                                width: dynamicStyles.buttonWidth,
                                height: dynamicStyles.buttonHeight,
                            }
                        ]}
                        onPress={() => handleButtonPress('Group')}
                    >
                        <Text style={[styles.buttonText, { 
                            color: selectedButton === 'Group' ? '#fff' : '#888',
                            fontSize: dynamicStyles.buttonTextSize
                        }]}>Group</Text>
                    </RNBounceable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 5,
        width: '100%',
        paddingHorizontal: dynamicStyles.paddingHorizontal,
        paddingBottom: 5,
    },
    arrowIconContainer: {
        position: 'absolute',
        zIndex: 1,
        left: 27,
        height: dynamicStyles.iconContainerSize,
        justifyContent: 'center',
        width: 50,
        padding: 5
    },
    groupIconContainer: {
        position: 'absolute',
        zIndex: 1,
        right: 30,
        height: dynamicStyles.iconContainerSize,
        justifyContent: 'center',
    },
    plusIconContainer: {
        position: 'absolute',
        zIndex: 1,
        top: 28,
        right: 21.5,
        borderRadius: 100,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    overlay: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 40,
    },
    buttonContainer: {
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4,
    },
    leftButtonContainer: {
        marginLeft: 4,
    },
    rightButtonContainer: {
        marginRight: 4,
    },
    buttonText: {
        fontFamily: 'Mulish_700Bold',
    },
});
