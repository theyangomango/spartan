import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Platform, Image, KeyboardAvoidingView, Keyboard } from 'react-native';
import CommentCard from './CommentCard';
import updateDoc from '../../../backend/helper/firebase/updateDoc';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons from @expo/vector-icons
import getPFP from '../../../backend/storage/getPFP';

export default function CommentsModal({ pid, data }) {
    const [pfp, setPFP] = useState(null);
    const [inputText, setInputText] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        getPFP(global.userData.uid)
            .then(url => {
                setPFP(url);
            });

        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    function handleLikeComment(index) {
        data[index].likeCount++;
        data[index].likedUsers.push(global.userData.uid);
        updateDoc('posts', pid, {
            comments: data
        });
    }

    function handleUnlikeComment(index) {
        data[index].likeCount--;
        const i = data[index].likedUsers.indexOf(global.userData.uid);
        if (index > -1) {
            data[index].likedUsers.splice(i, 1);
        }
        updateDoc('posts', pid, {
            comments: data
        });
    }

    const handleSend = () => {
        // Handle the send action here
    };

    const handleInputFocus = () => {
        setIsInputFocused(true);
    };

    const handleInputBlur = () => {
        setIsInputFocused(false);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
        >
            <View style={styles.main_ctnr}>
                <FlatList
                    ref={flatListRef}
                    data={data}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <CommentCard data={item} likeComment={handleLikeComment} unlikeComment={handleUnlikeComment} index={index} key={index} />
                    )}
                />
                <View style={[styles.footer, { marginBottom: isInputFocused ? 70 : 30 }]}>
                    <View style={styles.pfp_ctnr}>
                        <Image
                            source={{ uri: pfp }}
                            style={styles.pfp}
                        />
                    </View>
                    <View style={[styles.inputContainer]}>
                        <TextInput
                            style={styles.textInput}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Add a comment for itzy.all.in.us"
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                            <Ionicons name="send" size={15} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        paddingHorizontal: 15,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 3,
        paddingBottom: 25,
    },
    pfp_ctnr: {
        width: 40,
        aspectRatio: 1,
        marginBottom: 3
    },
    pfp: {
        flex: 1,
        borderRadius: 22,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ababab',
        paddingHorizontal: 10,
        paddingVertical: 2.5,
        borderRadius: 30,
        marginLeft: 8,
        marginRight: 5,
        ...(Platform.OS === 'android' && { elevation: 5 }),
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        color: '#000',
    },
    sendButton: {
        backgroundColor: '#0499FE',
        borderRadius: 25,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
