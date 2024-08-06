import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import sendMessage from '../../../backend/messages/sendMessage';
import getChatDisplayTime from '../../helper/getChatDisplayTime';

function getReverse(arr) {
    let list = [];
    arr.forEach(element => {
        list.push(element);
    });
    list.reverse();
    return list;
}

const Chat = ({ navigation, route }) => {
    const { data, usersExcludingSelf } = route.params;
    const [messages, setMessages] = useState(getReverse(data.content));
    const [inputText, setInputText] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
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
            text: inputText,
            uid: global.userData.uid,
            handle: global.userData.handle,
            timestamp: new Date().getTime(),
            name: global.userData.name,
        };

        setMessages([newMessage, ...messages]);
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
        setIsInputFocused(true);
    };

    const handleInputBlur = () => {
        setIsInputFocused(false);
    };

    const toMessages = () => {
        navigation.navigate('Messages');
    };

    const shouldDisplayTime = (currentMessage, lastMessage) => {
        if (!lastMessage) return true;
        return ((currentMessage.timestamp - lastMessage.timestamp)) > 1000 * 60 * 60 * 4; // More than 4 hours apart
    };

    const handles = usersExcludingSelf.map(user => user.handle).join(', ');
    const names = usersExcludingSelf.map(user => user.name).join(', ');

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
        >
            <View style={styles.container}>
                <View style={styles.arrowIconContainer}>
                    <TouchableOpacity activeOpacity={0.5} onPress={toMessages}>
                        <FontAwesome6 name='chevron-left' size={18.5} color="#2D9EFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={[styles.pfpContainer, { width: 42 + 15 * (usersExcludingSelf.length - 1) }]}>
                            {usersExcludingSelf.map((user, idx) => (
                                <Image
                                    key={user.uid}
                                    source={{ uri: user.pfp }}
                                    style={[styles.pfp, { left: idx * 15 }]}
                                />
                            ))}
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.nameText} numberOfLines={1} ellipsizeMode='tail'>{names}</Text>
                            <Text style={styles.handleText} numberOfLines={1} ellipsizeMode='tail'>{handles}</Text>
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
                            const isOtherUserMessage = item.uid !== global.userData.uid;
                            const showHandle = usersExcludingSelf.length > 1 && isOtherUserMessage;

                            return (
                                <>
                                    <View style={isOtherUserMessage ? styles.otherMessageContainer : styles.userMessageContainer}>
                                        <Text style={isOtherUserMessage ? styles.otherMessageText : styles.userMessageText}>{item.text}</Text>
                                    </View>
                                    {showHandle && (
                                        <Text style={styles.messageHandleText}>{item.handle}</Text>
                                    )}
                                    {displayTime && (
                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeText}>{getChatDisplayTime(item.timestamp)}</Text>
                                        </View>
                                    )}
                                </>
                            );
                        }}
                        style={styles.flatlist}
                        keyExtractor={(item, index) => index.toString()}
                        inverted
                        onScroll={handleScroll}
                        onScrollEndDrag={handleScrollEnd}
                        scrollEventThrottle={16}
                        ListHeaderComponent={<View style={{ height: 15 }} />}
                        ListFooterComponent={<View style={{ height: 15 }} />}
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
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
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
        backgroundColor: '#fff',
        shadowColor: '#aaa',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 5,
        paddingLeft: '16.5%',
    },
    arrowIconContainer: {
        position: 'absolute',
        top: 51,
        zIndex: 1,
        left: 32,
        height: 58,
        width: 50,
        justifyContent: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 7,
        paddingTop: 2,
    },
    pfpContainer: {
        flexDirection: 'row',
        position: 'relative',
        alignItems: 'center',
        marginRight: 7,
    },
    pfp: {
        width: 42,
        height: 42,
        borderRadius: 21,
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#fff',
    },
    textContainer: {
        justifyContent: 'center',
        flex: 1,
        marginRight: 10
    },
    nameText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
    },
    handleText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12.5,
        color: '#888',
    },
    content: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    flatlist: {},
    userMessageContainer: {
        alignSelf: 'flex-end',
        backgroundColor: '#0499FE',
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 2,
        padding: 10,
        maxWidth: '70%',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#CEE4F9',
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 2,
        padding: 10,
        maxWidth: '70%',
    },
    userMessageText: {
        fontSize: 14,
        color: '#fff',
        fontFamily: 'Poppins_500Medium',
    },
    otherMessageText: {
        fontSize: 14,
        color: '#222',
        fontFamily: 'Poppins_500Medium',
    },
    messageHandleText: {
        alignSelf: 'flex-start',
        marginLeft: 24,
        marginBottom: 2,
        fontSize: 12,
        color: '#888',
        fontFamily: 'Poppins_500Medium',
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
        fontFamily: 'Poppins_500Medium',
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
        backgroundColor: '#fff',
        ...(Platform.OS === 'android' && { elevation: 5 }),
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

export default Chat;
