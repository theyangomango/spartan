import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Keyboard, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons from @expo/vector-icons
import { ArrowLeft2 } from 'iconsax-react-native';

const Chat = ({ navigation }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false); // State to track input focus
    const flatListRef = useRef(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            if (!isScrolled) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            if (!isScrolled) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [isScrolled]);

    const handleSend = () => {
        if (inputText.trim() === '') return;
        const newMessage = {
            id: messages.length + 1,
            text: inputText,
            sender: 'user', // Assuming user sends the message
            timestamp: new Date().getTime(),
        };
        setMessages([newMessage, ...messages]); // Append new message to the beginning of the array
        setInputText('');
    };

    const handleScroll = () => {
        setIsScrolled(true);
    };

    const handleScrollEnd = () => {
        setIsScrolled(false);
    };

    const handleInputFocus = () => {
        setIsInputFocused(true); // Input container is focused
    };

    const handleInputBlur = () => {
        setIsInputFocused(false); // Input container is blurred
    };

    function toMessages() {
        navigation.navigate('Messages');
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={toMessages} style={styles.backButton}>
                        <ArrowLeft2 size="24" color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        {/* Placeholder for Profile Picture */}
                        <View style={styles.profilePicture}></View>
                        <Text style={styles.handleText}>yangbai</Text>
                    </View>
                </View>
                <View style={styles.content}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={({ item }) => (
                            <View style={item.sender === 'user' ? styles.userMessageContainer : styles.otherMessageContainer}>
                                <Text style={styles.messageText}>{item.text}</Text>
                            </View>
                        )}
                        keyExtractor={(item) => item.id.toString()}
                        inverted // To display messages from bottom to top
                        onScroll={handleScroll}
                        onScrollEndDrag={handleScrollEnd}
                        scrollEventThrottle={16} // Adjust scroll event throttle for smoother scrolling
                    />
                </View>
                <View style={[styles.inputContainer, { marginBottom: isInputFocused ? 8 : 30 }]}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        onFocus={handleInputFocus} // Handle input focus
                        onBlur={handleInputBlur} // Handle input blur
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Ionicons name="send" size={15} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#0499FE', // Blue background color
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 55 : 45, // Increased header height
        flexDirection: 'row', // Align items horizontally
        alignItems: 'center', // Center items vertically
    },
    backButton: {
        marginRight: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    profilePicture: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: '#ccc', // Gray background color
        marginRight: 10,
    },
    handleText: {
        fontFamily: 'SourceSansPro_600SemiBold',
        fontSize: 20,
        color: '#fff'
    },
    content: {
        flex: 1,
    },
    userMessageContainer: {
        alignSelf: 'flex-end',
        backgroundColor: '#0499FE', // Blue background color for user messages
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 4,
        padding: 10,
        maxWidth: '70%',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#0499FE', // Blue background color for other messages
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 4,
        padding: 10,
        maxWidth: '70%',
    },
    messageText: {
        fontSize: 16,
        color: '#fff', // White text color for message text
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 30,
        marginTop: 10,
        marginHorizontal: 15,
        ...(Platform.OS === 'android' && { elevation: 5 }), // Add elevation only for Android
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        color: '#000', // Text color
    },
    sendButton: {
        backgroundColor: '#0499FE', // Blue background color
        borderRadius: 25, // Make it circular
        padding: 10, // Adjust padding
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
    },
});

export default Chat;
