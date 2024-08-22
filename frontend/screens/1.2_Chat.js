import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native';
import ChatHeader from '../components/1.2_Chat/ChatHeader';
import MessageInput from '../components/1.2_Chat/MessageInput';
import MessageItem from '../components/1.2_Chat/MessageItem';
import getReverse from '../helper/getReverse';
import sendMessage from '../../backend/messages/sendMessage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';

const Chat = ({ navigation, route }) => {
    const { usersExcludingSelf } = route.params;
    const [data, setData] = useState(route.params.data)
    const [messages, setMessages] = useState(getReverse(data.content));
    const [inputText, setInputText] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'messages', data.cid), d => {
            const newData = d.data();
            setData({ ...newData });
            setMessages(getReverse(newData.content));
        });

        return () => unsub();
    }, []);

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

    const handleInputFocus = () => {
        setIsInputFocused(true);
    };

    const handleInputBlur = () => {
        setIsInputFocused(false);
    };

    const toMessages = () => {
        navigation.navigate('Messages', {
            message: data,
            index: route.params.index
        });
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
