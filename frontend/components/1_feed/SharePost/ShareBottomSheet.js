import React, { useEffect, useMemo, useRef, memo, useState } from "react";
import { View, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Animated, Keyboard, Pressable, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import ShareModal from "./ShareModal";

const { width, height } = Dimensions.get('screen');

const ShareBottomSheet = ({ shareBottomSheetCloseFlag, shareBottomSheetExpandFlag }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["96%"], []);

    useEffect(() => {
        bottomSheetRef.current.close();
    }, [shareBottomSheetCloseFlag]);

    useEffect(() => {
        bottomSheetRef.current.expand();
    }, [shareBottomSheetExpandFlag]);

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
                // onChange={handleSheetIndexChange}
                handleStyle={{ display: 'none' }}
                backgroundStyle={{ backgroundColor: '#fff' }}
                enablePanDownToClose
            >
                <ShareModal closeBottomSheet={() => bottomSheetRef.current.close()} />
            </BottomSheet>
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
        backgroundColor: '#f6f6f6',
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

export default memo(ShareBottomSheet);
