import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Animated, Keyboard, TouchableWithoutFeedback, Pressable, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from '@expo/vector-icons'
import CommentsModal from "./CommentsModal";
import { updateDoc } from "firebase/firestore";
import incrementDocValue from "../../../backend/helper/firebase/incrementDocValue";

const CommentsBottomSheet = ({ isVisible, setIsVisible, postData }) => {
    const [isInputFocused, setIsInputFocused] = useState(false);
    const bottomSheetRef = useRef(null);
    const footerMarginBottom = useRef(new Animated.Value(0)).current;

    const snapPoints = useMemo(() => ["37%", "92"], []);
    const [isSheetDown, setisSheetDown] = useState(true);

    const [inputText, setInputText] = useState('');


    // const handleSheetChanges = useCallback((index) => {
    //     console.log("handleSheetChanges", index);
    // }, []);

    const handleSend = () => {
        if (!inputText) return;
        comments.push({
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
            comments: comments
        });
        incrementDocValue('posts', postData.pid, 'commentCount');
        setInputText('');
    };

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    const handleInputFocus = () => {
        setIsInputFocused(true);
        bottomSheetRef.current.expand();
        Animated.timing(footerMarginBottom, {
            toValue: 315,
            duration: 300,
            useNativeDriver: false
        }).start();
    };

    const handleInputBlur = () => {
        setIsInputFocused(false);
        Animated.timing(footerMarginBottom, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false
        }).start();
    };

    useEffect(() => {
        console.log(isVisible);
        if (isVisible) {
            bottomSheetRef.current.snapToIndex(0);
        } else {
            bottomSheetRef.current.close();
        }
    }, [isVisible]);

    function handleTouchHeader() {
        if (isInputFocused) {
            handleInputBlur();
            Keyboard.dismiss();
        }
    }

    function handlePressUpIcon() {
        bottomSheetRef.current.expand();
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
                // onChange={handleSheetChanges}
                handleStyle={{ display: 'none' }}
                detached
                backgroundStyle={{ backgroundColor: '#f3f3f3' }}

            >
                {postData &&
                    <CommentsModal postData={postData} handleTouchHeader={handleTouchHeader} handlePressUpIcon={handlePressUpIcon} />
                }
            </BottomSheet>
            {isVisible && (
                <Animated.View style={[styles.footer, { marginBottom: footerMarginBottom }]}>
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
                        {<Pressable style={styles.sendButton} onPress={handleSend}>
                            <Ionicons name="send" size={17.5} color="#111" />
                        </Pressable>}
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
    main_ctnr: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        alignItems: "center",
    },
    bottom_sheet: {
        zIndex: 30
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        height: 95,
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
        fontFamily: 'Mulish_600SemiBold',
        fontSize: 13.5,
    },
    sendButton: {
        // backgroundColor: '#0499FE',
        // borderRadius: 25,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CommentsBottomSheet;
