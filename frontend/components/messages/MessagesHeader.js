import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { FontAwesome6, FontAwesome5 } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import BottomSheet from "react-native-gesture-bottom-sheet";
import CreateGroupChatModal from './CreateGroupChatModal'; // Assuming ShareModal is in the same directory

const { height } = Dimensions.get('window');

export default function MessagesHeader({ toFeedScreen, handle, setScope }) {
    const [selectedButton, setSelectedButton] = useState('All');
    const [shareBottomSheetBackgroundColor, setShareBottomSheetBackgroundColor] = useState('rgba(0, 0, 0, 0.5)');
    const shareBottomSheet = useRef();

    const handleButtonPress = (button) => {
        setSelectedButton(button);
        setScope(button);
    };

    const openShareModal = () => {
        shareBottomSheet.current.show();
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (shareBottomSheet.current) {
                let panY = parseInt(JSON.stringify(shareBottomSheet.current.state.pan.y));
                let animatedHeight = parseInt(JSON.stringify(shareBottomSheet.current.state.animatedHeight));
                let realHeight = Math.max(panY, 1000 - animatedHeight);
                setShareBottomSheetBackgroundColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight / 600)})`);
            }
        }, 10);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.row}>
                <TouchableOpacity activeOpacity={0.5} onPress={toFeedScreen} style={styles.arrow_icon_ctnr}>
                    {/* <TouchableOpacity activeOpacity={0.5} onPress={toFeedScreen}> */}
                        <FontAwesome6 name='chevron-left' size={18.5} color="#2D9EFF" />
                    {/* </TouchableOpacity> */}
                </TouchableOpacity>
                <View style={styles.group_icon_ctnr}>
                    <TouchableOpacity activeOpacity={0.5} onPress={openShareModal}>
                        <FontAwesome5 name='users' size={20.5} color="#2D9EFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.plus_icon_ctnr}>
                    <FontAwesome5 name='plus' size={12.5} color="#2D9EFF" />
                </View>
                <View style={styles.overlay}>
                    <RNBounceable
                        style={[
                            styles.button_ctnr,
                            styles.left_button_ctnr,
                            { backgroundColor: selectedButton === 'All' ? '#2D9EFF' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('All')}
                    >
                        <Text style={[styles.button_text, { color: selectedButton == 'All' ? '#fff' : '#888' }]}>All</Text>
                    </RNBounceable>
                    <RNBounceable
                        style={[
                            styles.button_ctnr,
                            styles.right_button_ctnr,
                            { backgroundColor: selectedButton === 'Group' ? '#2D9EFF' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('Group')}
                    >
                        <Text style={[styles.button_text, { color: selectedButton == 'Group' ? '#fff' : '#888' }]}>Group</Text>
                    </RNBounceable>
                </View>
            </View>
            <BottomSheet
                hasDraggableIcon
                ref={shareBottomSheet}
                height={height - 65}
                sheetBackgroundColor={'#fff'}
                backgroundColor={shareBottomSheetBackgroundColor}
                draggable={true} // Optional, as it's true by default
            >
                <CreateGroupChatModal />
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        backgroundColor: '#fff',
        paddingTop: 51,
    },
    arrow_icon_ctnr: {
        position: 'absolute',
        zIndex: 1,
        left: 32,
        height: 58,
        justifyContent: 'center',
        width: 50
    },
    group_icon_ctnr: {
        position: 'absolute',
        zIndex: 1,
        right: 30,
        height: 55,
        justifyContent: 'center'
    },
    plus_icon_ctnr: {
        position: 'absolute',
        zIndex: 1,
        top: 28,
        right: 21.5,
        borderRadius: 100,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 5,
        width: '100%',
        paddingHorizontal: 30,
        paddingBottom: 5
    },
    overlay: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 40,
    },
    button_ctnr: {
        width: 113,
        height: 39,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4
    },
    left_button_ctnr: {
        marginLeft: 4,
    },
    right_button_ctnr: {
        marginRight: 4,
    },
    button_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 12.5,
    }
});
