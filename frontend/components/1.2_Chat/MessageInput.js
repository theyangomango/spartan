import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageInput = ({ inputText, setInputText, handleSend, isInputFocused, handleInputFocus, handleInputBlur }) => {
    return (
        <View style={[styles.inputContainer, { marginBottom: isInputFocused ? 4 : 22 }]}>
            <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Ionicons name="send" size={14.5} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 10,
        borderRadius: 30,
        marginTop: 6,
        marginHorizontal: 15,
        backgroundColor: '#fff',
        ...(Platform.OS === 'android' && { elevation: 5 }),
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        fontSize: 13,
        marginRight: 10,
        marginLeft: 15,
        color: '#000',
        fontFamily: 'Poppins_500Medium',
    },
    sendButton: {
        backgroundColor: '#0499FE',
        borderRadius: 20,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default MessageInput;
