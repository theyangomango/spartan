import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Keyboard, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons from @expo/vector-icons
import { ArrowLeft2 } from 'iconsax-react-native';
import getPFP from '../../backend/storage/getPFP';
import sendMessage from '../../backend/messages/sendMessage';

const Chat = ({ navigation, route }) => {
    const { pfp_uid, handle, data } = route.params;
    const [image, setImage] = useState(null);
    const [messages, setMessages] = useState(data.content);
    const [inputText, setInputText] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false); // State to track input focus
    const flatListRef = useRef(null);

    useEffect(() => {
        getPFP(pfp_uid)
            .then(url => {
                setImage(url);
            });
    }, []);

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
            text: inputText,
            uid: global.userData.uid,
            handle: global.userData.handle,
            timestamp: new Date().getTime(),
        };

        setMessages([newMessage, ...messages]); // Append new message to the beginning of the array
        sendMessage(global.userData.uid, global.userData.handle, data.cid, inputText);
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
                    <TouchableOpacity activeOpacity={0.5} onPress={toMessages} style={styles.backButton}>
                        <ArrowLeft2 size="20" color="#2D9EFF" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.pfp_ctnr}>
                            <Image
                                source={{ uri: image }}
                                style={styles.pfp}
                            />
                        </View>
                        <Text style={styles.handleText}>{handle}</Text>
                    </View>
                </View>
                <View style={styles.content}>
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        ref={flatListRef}
                        data={messages}
                        renderItem={({ item, index }) => (
                            <View style={item.uid === global.userData.uid ? styles.userMessageContainer : styles.otherMessageContainer}>
                                <Text style={item.uid === global.userData.uid ? styles.userMessageText : styles.otherMessageText}>{item.text}</Text>
                            </View>
                        )}
                        style={styles.flatlist}
                        keyExtractor={(item, index) => index.toString()}
                        inverted // To display messages from bottom to top
                        onScroll={handleScroll}
                        onScrollEndDrag={handleScrollEnd}
                        scrollEventThrottle={16} // Adjust scroll event throttle for smoother scrolling
                        ListHeaderComponent={<View style={{ height: 15 }} />} // Add a footer with 20 pixels of height
                        ListFooterComponent={<View style={{ height: 15 }} />} // Add a footer with 20 pixels of height
                    />
                </View>
                <View style={[styles.inputContainer, { marginBottom: isInputFocused ? 11 : 30 }]}>
                    <TouchableOpacity style={styles.emojiButton}>
                        <Ionicons name="happy-outline" size={24} color="#999" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        onFocus={handleInputFocus} // Handle input focus
                        onBlur={handleInputBlur} // Handle input blur
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Ionicons name="send" size={11} color="#fff" />
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
        height: 108,
        flexDirection: 'row', // Align items horizontally
        alignItems: 'flex-end', // Center items vertically
        paddingBottom: 5,
        backgroundColor: '#fff', // Add background color to header
        // Add shadow properties
        shadowColor: '#aaa',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 5, // For Android
    },
    backButton: {
        paddingLeft: 30,
        paddingRight: 15,
        paddingVertical: 10
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    pfp_ctnr: {
        width: 33,
        aspectRatio: 1,
        marginRight: 7,
    },
    pfp: {
        flex: 1,
        borderRadius: 20,
    },
    handleText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 19.5,
        color: '#2D9EFF'
    },
    content: {
        flex: 1,
        marginTop: 4,
        backgroundColor: '#F3F6FA'
    },
    flatlist: {
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
        backgroundColor: '#C8D9FA', // Blue background color for other messages
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 4,
        padding: 10,
        maxWidth: '70%',
    },
    userMessageText: {
        fontSize: 12.5,
        color: '#fff', // White text color for message text
        fontFamily: 'Poppins_400Regular'
    },
    otherMessageText: {
        fontSize: 12.5,
        color: '#000', // White text color for message text
        fontFamily: 'Poppins_400Regular'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 1.5,
        borderRadius: 30,
        marginTop: 10,
        marginHorizontal: 15,
        backgroundColor: '#fff', // Add background color to input container
        ...(Platform.OS === 'android' && { elevation: 5 }), // Add elevation only for Android
    },
    emojiButton: {
        marginLeft: 8,
        marginRight: 5,
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
        color: '#000', // Text color,
        fontFamily: 'SourceSansPro_400Regular'
    },
    sendButton: {
        backgroundColor: '#0499FE', // Blue background color
        borderRadius: 20, // Make it circular
        padding: 10, // Adjust padding
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
    },
});

export default Chat;
