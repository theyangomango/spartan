import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Animated, Keyboard, Pressable, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from '@expo/vector-icons';
import CommentsModal from "./CommentsModal";
import incrementDocValue from "../../../../backend/helper/firebase/incrementDocValue";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";

const { width, height } = Dimensions.get('screen');

const CommentsBottomSheet = ({ isVisible, postData, commentsBottomSheetExpandFlag }) => {
    const [isInputFocused, setIsInputFocused] = useState(false);
    const bottomSheetRef = useRef(null);
    const footerTranslateY = useRef(new Animated.Value(0)).current;

    const snapPoints = useMemo(() => ["36%", "92%"], []);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (!inputText) return;
        postData.comments.push({
            handle: global.userData.handle,
            uid: global.userData.uid,
            pfp: global.userData.image,
            content: inputText,
            timestamp: Date.now(),
            likeCount: 0,
            likedUsers: [],
            replies: [],
            isCaption: false
        });
        updateDoc('posts', postData.pid, {
            comments: postData.comments
        });
        incrementDocValue('posts', postData.pid, 'commentCount');
        setInputText('');
    };

    const handleInputFocus = () => {
        setIsInputFocused(true);
        bottomSheetRef.current.expand();
        Animated.timing(footerTranslateY, {
            toValue: -315,
            duration: 225,
            useNativeDriver: true
        }).start();
    };

    const handleInputBlur = () => {
        setIsInputFocused(false);
        Animated.timing(footerTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start();
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', handleInputFocus);
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', handleInputBlur);

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current.snapToIndex(0);
        } else {
            bottomSheetRef.current.close();
        }
    }, [isVisible]);

    useEffect(() => {
        bottomSheetRef.current.expand();
    }, [commentsBottomSheetExpandFlag]);

    function handleTouchHeader() {
        if (isInputFocused) {
            handleInputBlur();
            Keyboard.dismiss();
        }
    }

    function handlePressUpIcon() {
        bottomSheetRef.current.expand();
    }

    function handleSheetIndexChange(index) {
        if (index === 1) {
            setIsSheetExpanded(true);
        } else {
            setIsSheetExpanded(false);
        }

    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents='box-none'
        >
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetIndexChange}
                handleStyle={{ display: 'none' }}
                detached
                backgroundStyle={{ backgroundColor: '#f3f3f3' }}
            >
                {postData &&
                    <CommentsModal
                        postData={postData}
                        handleTouchHeader={handleTouchHeader}
                        handlePressUpIcon={handlePressUpIcon}
                        isSheetExpanded={isSheetExpanded}
                    />
                }
            </BottomSheet>
            {isVisible && (
                <Animated.View style={[styles.footer, { transform: [{ translateY: footerTranslateY }] }]}>
                    <View style={styles.inputContainer}>
                        <View style={styles.image_ctnr}>
                            <Image source={{ uri: global.userData.image }} style={styles.pfp} />
                        </View>
                        <TextInput
                            placeholder="Add comment"
                            style={styles.textInput}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            value={inputText}
                            onChangeText={setInputText}
                        />
                        <Pressable style={styles.sendButton} onPress={handleSend}>
                            <Ionicons name="send" size={17.5} color="#111" />
                        </Pressable>
                    </View>
                </Animated.View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 85,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999
    },
    footer: {
        position: 'absolute',
        // bottom: 0,
        top: height - 180,
        height: 95 + width / 2,
        paddingBottom: width / 2,
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 40
    },
    inputContainer: {
        flex: 1,
        marginHorizontal: 18,
        marginTop: 14,
        marginBottom: 26,
        backgroundColor: '#f3f3f3',
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12
    },
    image_ctnr: {
        width: 37,
        aspectRatio: 1
    },
    pfp: {
        flex: 1,
        borderRadius: 100
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 7,
        color: '#000',
        fontFamily: 'Outfit_500Medium',
        fontSize: 13.5,
    },
    sendButton: {
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CommentsBottomSheet;
