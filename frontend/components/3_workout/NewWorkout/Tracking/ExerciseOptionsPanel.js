// ExerciseOptionsPanel.js
import RNBounceable from "@freakycoder/react-native-bounceable";
import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';



const ExerciseOptionsPanel = ({ visible, onClose, position, replaceExercise, deleteExercise }) => {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
                <View style={[styles.panel, { top: position.top, left: position.left }]}>
                    <RNBounceable style={[styles.button, { opacity: 0.3 }]} disabled onPress={() => { replaceExercise(); onClose() }}>
                        <Text style={styles.button_text}>Replace Exercise</Text>
                        <MaterialCommunityIcons name="arrow-u-left-top" size={20} color="#000" style={styles.uTurnIcon} />
                    </RNBounceable>
                    <RNBounceable style={styles.button} onPress={() => { deleteExercise(); onClose() }}>
                        <Text style={styles.button_text}>Remove Exercise</Text>
                        <FontAwesome6 name={'trash-can'} size={16} style={styles.trash_icon} />
                    </RNBounceable>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    panel: {
        backgroundColor: '#fff',
        position: 'absolute',
        zIndex: 10,
        borderRadius: 20,
        shadowColor: '#ccc',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
        paddingVertical: 10,
        right: 20
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        paddingHorizontal: 20,
        flex: 1,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center'
    },
    button_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 15,
    },
    uTurnIcon: {
        marginLeft: 4,
    },
    trash_icon: {
        marginLeft: 6
    }
});

export default ExerciseOptionsPanel;
