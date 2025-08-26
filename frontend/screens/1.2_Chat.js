import React, { useState, useRef, useEffect } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StyleSheet,
    StatusBar,
    Pressable,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatHeader from "../components/1.2_Chat/ChatHeader";
import MessageInput from "../components/1.2_Chat/MessageInput";
import MessageItem from "../components/1.2_Chat/MessageItem";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import useChatMessages from "../helper/useChatMessages";
import sendMessageV2 from "../../backend/messages/sendMessageV2";
import uploadMediaAssets from "../../backend/storage/uploadMediaAssets";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";

const { width: W } = Dimensions.get("window");

const COLORS = {
    surface: "#FFFFFF",
    primary: "#2D9EFF",
    hairline: "rgba(15,23,42,0.06)",
};

const MAX_REVEAL = 72;

export default function Chat({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { usersExcludingSelf, data: initialData, index } = route.params;

    const [data, setData] = useState(initialData);
    const [inputText, setInputText] = useState("");
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const flatListRef = useRef(null);

    const messages = useChatMessages(data.cid);
    const currentUid = global?.userData?.uid || null;

    // separate reveal channels
    const revealSelf = useSharedValue(0); // your messages
    const revealOther = useSharedValue(0); // other users
    const mode = useSharedValue(0);        // 0 none, 1 self, 2 other

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "messages", data.cid), (docSnap) => {
            if (docSnap.exists()) setData({ ...docSnap.data(), cid: data.cid });
        });
        return () => unsub();
    }, [data.cid]);

    const handleSendText = async () => {
        const text = (inputText || "").trim();
        if (!text) return;
        await sendMessageV2({
            cid: data.cid,
            sender: {
                uid: currentUid,
                handle: global.userData.handle,
                pfp: global.userData.image,
                name: global.userData.name,
            },
            text,
            media: [],
        });
        setInputText("");
    };

    const toMessages = () => navigation.navigate("Messages", { message: data, index });
    const inputBottomInset = (isInputFocused ? 4 : 16) + insets.bottom;

    // media picker (unchanged)
    const requestPickerPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === "granted";
    };
    const openMediaPicker = async () => {
        const ok = await requestPickerPermissions();
        if (!ok) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                allowsMultipleSelection: true,
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.85,
                videoMaxDuration: 60,
                selectionLimit: 10,
            });
            if (result.canceled) return;

            setIsUploading(true);
            const uploaded = await uploadMediaAssets({
                cid: data.cid,
                uid: currentUid,
                assets: result.assets || [],
            });

            await sendMessageV2({
                cid: data.cid,
                sender: {
                    uid: currentUid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    name: global.userData.name,
                },
                text: "",
                media: uploaded,
            });
        } catch (e) {
            console.warn("Media pick/send failed:", e);
        } finally {
            setIsUploading(false);
        }
    };

    // WORKLET-SAFE split pan gesture
    const pan = Gesture.Pan()
        .minDistance(8)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onBegin((e) => {
            "worklet";
            if (e.absoluteX > W * 0.55) mode.value = 1; // right 45% → your messages
            else if (e.absoluteX < W * 0.45) mode.value = 2; // left 45%  → others
            else mode.value = 0;
        })
        .onUpdate((e) => {
            "worklet";
            if (mode.value === 1) {
                // your side: right→left only
                const dx = e.translationX < 0 ? Math.min(MAX_REVEAL, -e.translationX) : 0;
                revealSelf.value = dx;
            } else if (mode.value === 2) {
                // their side: left→right only
                const dx = e.translationX > 0 ? Math.min(MAX_REVEAL, e.translationX) : 0;
                revealOther.value = dx;
            }
        })
        .onEnd(() => {
            "worklet";
            if (mode.value === 1) revealSelf.value = withTiming(0, { duration: 160 });
            if (mode.value === 2) revealOther.value = withTiming(0, { duration: 160 });
            mode.value = 0;
        })
        .onFinalize(() => {
            "worklet";
            revealSelf.value = withTiming(0, { duration: 160 });
            revealOther.value = withTiming(0, { duration: 160 });
            mode.value = 0;
        });

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar barStyle="dark-content" />
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ChatHeader usersExcludingSelf={usersExcludingSelf} toMessages={toMessages} />

                <GestureDetector gesture={pan}>
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
                                    currentUid={currentUid}
                                    revealSelf={revealSelf}
                                    revealOther={revealOther}
                                    revealMax={MAX_REVEAL}
                                />
                            )}
                            style={styles.list}
                            contentContainerStyle={[
                                styles.listContent,
                                { paddingBottom: inputBottomInset + 72 },
                            ]}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                            onScrollBeginDrag={Keyboard.dismiss}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={<View style={{ height: 6 }} />}
                            ListFooterComponent={<View style={{ height: 6 }} />}
                            scrollEventThrottle={16}
                        />
                    </View>
                </GestureDetector>

                <View style={{ backgroundColor: "#f3f3f361" }}>
                    <MessageInput
                        inputText={inputText}
                        setInputText={setInputText}
                        handleSend={handleSendText}
                        isInputFocused={isInputFocused}
                        handleInputFocus={() => setIsInputFocused(true)}
                        handleInputBlur={() => setIsInputFocused(false)}
                        bottomInset={insets.bottom}
                    />
                </View>

                <Pressable
                    onPress={openMediaPicker}
                    style={[styles.attachFab, { bottom: inputBottomInset + 16 }]}
                    hitSlop={8}
                >
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>

                {isUploading && (
                    <View style={styles.uploadOverlay} pointerEvents="none">
                        <ActivityIndicator size="small" color="#fff" />
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: "#fff" },
    surface: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.hairline,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 14, paddingTop: 8 },
    attachFab: {
        position: "absolute",
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    uploadOverlay: {
        position: "absolute",
        right: 16,
        bottom: 80,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "rgba(15,23,42,0.75)",
    },
});
