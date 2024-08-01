import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import getPFP from '../../../backend/storage/getPFP';
import sendMessage from '../../../backend/messages/sendMessage';
import getChatDisplayTime from '../../helper/getChatDisplayTime';
import getDisplayTime from '../../helper/getDisplayTime';

function getReverse(arr) {
    let list = [];
    arr.forEach(element => {
        list.push(element);
    });
    list.reverse();
    return list;
}

const Chat = ({ navigation, route }) => {
    const { pfp_uid, handle, data } = route.params;
    const [image, setImage] = useState(null);
    const [messages, setMessages] = useState(getReverse(data.content));
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

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getHours()}:${date.getMinutes()}`;
    };

    const shouldDisplayTime = (currentMessage, lastMessage) => {
        if (!lastMessage) return true; // Display time for the first message
        return ((currentMessage.timestamp - lastMessage.timestamp)) > 1000 * 60 * 60 * 4; // More than 2 minutes apart
    };

    // Hardcoded lastTimestamp for the other user
    const otherUserLastTimestamp = 1721880100874; // Replace with actual timestamp

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
        >
            <View style={styles.container}>
                <View style={styles.arrow_icon_ctnr}>
                    <TouchableOpacity activeOpacity={0.5} onPress={toMessages}>
                        <FontAwesome6 name='chevron-left' size={18.5} color="#2D9EFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.pfp_ctnr}>
                            <Image
                                source={{ uri: image }}
                                style={styles.pfp}
                            />
                        </View>
                        <View>
                            <Text style={styles.nameText}>Sam Suluk</Text>
                            <Text style={styles.handleText}>{handle}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.content}>
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        ref={flatListRef}
                        data={messages}
                        renderItem={({ item, index }) => {
                            const nextItem = messages[index + 1];
                            const displayTime = shouldDisplayTime(item, nextItem);

                            // Determine if this message is the last one read by the other user
                            const isLastReadMessage = item.timestamp >= otherUserLastTimestamp && (!nextItem || nextItem.timestamp > otherUserLastTimestamp);

                            return (
                                <>
                                    <View style={item.uid === global.userData.uid ? styles.userMessageContainer : styles.otherMessageContainer}>
                                        <Text style={item.uid === global.userData.uid ? styles.userMessageText : styles.otherMessageText}>{item.text}</Text>
                                    </View>
                                    {displayTime && (
                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeText}>{getChatDisplayTime(item.timestamp)}</Text>
                                        </View>
                                    )}
                                    {isLastReadMessage && (
                                        <View style={styles.readReceiptContainer}>
                                            <Text style={styles.readReceiptText}>Read {getDisplayTime(otherUserLastTimestamp)}</Text>
                                        </View>
                                    )}
                                </>
                            );
                        }}
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
                <View style={[styles.inputContainer, { marginBottom: isInputFocused ? 4 : 22 }]}>
                    <TouchableOpacity style={styles.emojiButton}>
                        <Ionicons name="happy-outline" size={26} color="#999" />
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
                        <Ionicons name="send" size={14.5} color="#fff" />
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
        paddingTop: 53,
        backgroundColor: '#fff', // Add background color to header
        // Add shadow properties
        shadowColor: '#aaa',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 5, // For Android
        paddingLeft: '16.5%'
    },
    arrow_icon_ctnr: {
        position: 'absolute',
        top: 51,
        zIndex: 1,
        left: 32,
        height: 58,
        width: 50,
        justifyContent: 'center'
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingBottom: 7,
        paddingTop: 2
    },
    pfp_ctnr: {
        width: 42,
        aspectRatio: 1,
        marginRight: 7,
    },
    pfp: {
        flex: 1,
        borderRadius: 100,
    },
    nameText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
    },
    handleText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12.5,
        color: '#888'
    },
    content: {
        flex: 1,
        backgroundColor: '#f8f8f8'
    },
    flatlist: {},
    userMessageContainer: {
        alignSelf: 'flex-end',
        backgroundColor: '#0499FE', // Blue background color for user messages
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 2,
        padding: 10,
        maxWidth: '70%',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#CEE4F9', // Blue background color for other messages
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 2,
        padding: 10,
        maxWidth: '70%',
    },
    userMessageText: {
        fontSize: 14,
        color: '#fff', // White text color for message text
        fontFamily: 'Poppins_500Medium'
    },
    otherMessageText: {
        fontSize: 14,
        color: '#222', // Black text color for message text
        fontFamily: 'Poppins_500Medium'
    },
    timeContainer: {
        alignSelf: 'center',
        marginVertical: 25,
        backgroundColor: '#EEE',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    timeText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Poppins_500Medium'
    },
    readReceiptContainer: {
        alignSelf: 'flex-end',
        marginRight: 20,
        marginTop: 5,
    },
    readReceiptText: {
        fontSize: 12,
        color: '#888',
        fontFamily: 'Poppins_500Medium'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 10,
        borderRadius: 30,
        marginTop: 6,
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
        fontSize: 13,
        marginRight: 10,
        color: '#000', // Text color
        fontFamily: 'Poppins_500Medium'
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
