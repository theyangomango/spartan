import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native';
import ChatHeader from '../components/1.2_Chat/ChatHeader';
import MessageInput from '../components/1.2_Chat/MessageInput';
import MessageItem from '../components/1.2_Chat/MessageItem';
import sendMessage from '../../backend/messages/sendMessage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';
import useChatMessages from '../helper/useChatMessages';

const Chat = ({ navigation, route }) => {
    const { usersExcludingSelf, data: initialData, index } = route.params;
    const [data, setData] = useState(initialData);
    const [inputText, setInputText] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef(null);

    // 🔁 Real-time messages from content subcollection
    const messages = useChatMessages(data.cid);

    // 🔁 Optional: listen to metadata updates (like user list, title, etc.)
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'messages', data.cid), (docSnap) => {
            if (docSnap.exists()) {
                setData({ ...docSnap.data(), cid: data.cid });
            }
        });

        return () => unsub();
    }, [data.cid]);

    const handleSend = () => {
        if (inputText.trim() === '') return;

        sendMessage(global.userData.uid, global.userData.handle, data.cid, inputText);
        setInputText('');
    };

    const handleInputFocus = () => setIsInputFocused(true);
    const handleInputBlur = () => setIsInputFocused(false);

    const toMessages = () => {
        navigation.navigate('Messages', {
            message: data,
            index: index,
        });
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.container}>
                <ChatHeader usersExcludingSelf={usersExcludingSelf} toMessages={toMessages} />
                <View style={styles.content}>
                    <FlatList
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
                        keyExtractor={(item) => item.id || item.timestamp?.toString() || Math.random().toString()}
                        inverted
                        showsVerticalScrollIndicator={false}
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
