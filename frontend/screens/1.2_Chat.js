import React, { useState, useRef, useEffect } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StyleSheet,
    TouchableWithoutFeedback,
    StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatHeader from "../components/1.2_Chat/ChatHeader";
import MessageInput from "../components/1.2_Chat/MessageInput";
import MessageItem from "../components/1.2_Chat/MessageItem";
import sendMessage from "../../backend/messages/sendMessage";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import useChatMessages from "../helper/useChatMessages";

const COLORS = {
    appBg: "#F6F7FB",
    surface: "#FFFFFF",
    hairline: "rgba(15,23,42,0.06)",
};

const Chat = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const { usersExcludingSelf, data: initialData, index } = route.params;

    const [data, setData] = useState(initialData);
    const [inputText, setInputText] = useState("");
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef(null);

    const messages = useChatMessages(data.cid);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "messages", data.cid), (docSnap) => {
            if (docSnap.exists()) setData({ ...docSnap.data(), cid: data.cid });
        });
        return () => unsub();
    }, [data.cid]);

    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [messages?.length]);

    const handleSend = () => {
        const text = (inputText || "").trim();
        if (!text) return;
        sendMessage(global.userData.uid, global.userData.handle, data.cid, text);
        setInputText("");
    };

    const toMessages = () => {
        navigation.navigate("Messages", { message: data, index });
    };

    const inputBottomInset = (isInputFocused ? 4 : 16) + insets.bottom;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar barStyle="dark-content" />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    <ChatHeader usersExcludingSelf={usersExcludingSelf} toMessages={toMessages} />

                    {/* Flat, seamless surface */}
                    <View style={styles.surface}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            inverted
                            keyExtractor={(item) =>
                                item.id || item.timestamp?.toString() || Math.random().toString()
                            }
                            renderItem={({ item, index }) => (
                                <MessageItem
                                    item={item}
                                    messages={messages}
                                    index={index}
                                    usersExcludingSelf={usersExcludingSelf}
                                />
                            )}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 14,
                                paddingTop: 8,
                                paddingBottom: inputBottomInset + 64, // space for input + extra breathing room
                                backgroundColor: COLORS.surface,
                            }}
                            ListHeaderComponent={<View style={{ height: 6 }} />}
                            ListFooterComponent={<View style={{ height: 6 }} />}
                            scrollEventThrottle={16}
                        />
                    </View>

                    <View style={{backgroundColor: '#f3f3f361'}}>
                        <MessageInput
                            inputText={inputText}
                            setInputText={setInputText}
                            handleSend={handleSend}
                            isInputFocused={isInputFocused}
                            handleInputFocus={() => setIsInputFocused(true)}
                            handleInputBlur={() => setIsInputFocused(false)}
                            bottomInset={insets.bottom}
                        />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    surface: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderTopColor: "rgba(15,23,42,0.06)",
        borderTopWidth: StyleSheet.hairlineWidth, // clean separation from header
    },
});

export default Chat;
