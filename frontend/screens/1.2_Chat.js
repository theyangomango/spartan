import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native';
import ChatHeader from '../components/1.2_Chat/ChatHeader';
import MessageInput from '../components/1.2_Chat/MessageInput';
import MessageItem from '../components/1.2_Chat/MessageItem';
import getReverse from '../helper/getReverse';
import sendMessage from '../../backend/messages/sendMessage';

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
            isPost: false,
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
        // navigation.navigate('Messages');
        navigation.goBack();
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
            <View style={styles.container}>
                <ChatHeader usersExcludingSelf={usersExcludingSelf} toMessages={toMessages} />
                <View style={styles.content}>
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        ref={flatListRef}
                        data={messages}
                        renderItem={({ item, index }) => (
                            <MessageItem
                                item={item}
                                messages={messages}
                                index={index}
                                usersExcludingSelf={usersExcludingSelf}
                            />
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        inverted
                        onScroll={handleScroll}
                        onScrollEndDrag={handleScrollEnd}
                        scrollEventThrottle={16}
                        ListHeaderComponent={<View style={{ height: 15 }} />}
                        ListFooterComponent={<View style={{ height: 15 }} />}
                    />
                </View>
                <MessageInput
                    inputText={inputText}
                    setInputText={setInputText}
                    handleSend={handleSend}
                    isInputFocused={isInputFocused}
                    handleInputFocus={handleInputFocus}
                    handleInputBlur={handleInputBlur}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
});

export default Chat;
