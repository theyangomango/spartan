import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { FontAwesome6, FontAwesome5 } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

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
                    <FontAwesome6 name='chevron-left' size={18.5} color="#2D9EFF" />
                </TouchableOpacity>
                <View style={styles.groupIconContainer}>
                    <TouchableOpacity activeOpacity={0.5} onPress={openCreateGroupChatBottomSheet}>
                        <FontAwesome5 name='users' size={18.5} color="#2D9EFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.plusIconContainer}>
                    <FontAwesome5 name='plus' size={12.5} color="#2D9EFF" />
                </View>
                <View style={styles.overlay}>
                    <RNBounceable
                        style={[
                            styles.buttonContainer,
                            styles.leftButtonContainer,
                            { backgroundColor: selectedButton === 'All' ? '#2D9EFF' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('All')}
                    >
                        <Text style={[styles.buttonText, { color: selectedButton === 'All' ? '#fff' : '#888' }]}>All</Text>
                    </RNBounceable>
                    <RNBounceable
                        style={[
                            styles.buttonContainer,
                            styles.rightButtonContainer,
                            { backgroundColor: selectedButton === 'Group' ? '#2D9EFF' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('Group')}
                    >
                        <Text style={[styles.buttonText, { color: selectedButton === 'Group' ? '#fff' : '#888' }]}>Group</Text>
                    </RNBounceable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: '#fff',
        paddingTop: 51,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 5,
        width: '100%',
        paddingHorizontal: 30,
        paddingBottom: 5,
    },
    arrowIconContainer: {
        position: 'absolute',
        zIndex: 1,
        left: 27,
        height: 58,
        justifyContent: 'center',
        width: 50,
        padding: 5
    },
    groupIconContainer: {
        position: 'absolute',
        zIndex: 1,
        right: 30,
        height: 55,
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
        width: 113,
        height: 39,
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
        fontSize: 12.5,
    },
});
