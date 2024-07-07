import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Platform, Image, KeyboardAvoidingView, Keyboard, Pressable } from 'react-native';
import CommentCard from './CommentCard';
import updateDoc from '../../../backend/helper/firebase/updateDoc';
import { Ionicons } from '@expo/vector-icons';
import getPFP from '../../../backend/storage/getPFP';
import incrementDocValue from '../../../backend/helper/firebase/incrementDocValue';

export default function CommentsModal({ postData }) {
    const comments = postData.comments;
    const [pfp, setPFP] = useState(null);
    const [inputText, setInputText] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        getPFP(global.userData.uid).then(url => {
            setPFP(url);
        });

        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            if (flatListRef.current) {
                flatListRef.current.scrollToIndex({index: 3, animated: true})
            }
        });

        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    function handleLikeComment(index) {
        comments[index].likeCount++;
        comments[index].likedUsers.push(global.userData.uid);
        updateDoc('posts', postData.pid, {
            comments: comments
        });
    }

    function handleUnlikeComment(index) {
        comments[index].likeCount--;
        const i = comments[index].likedUsers.indexOf(global.userData.uid);
        if (i > -1) {
            comments[index].likedUsers.splice(i, 1);
        }
        updateDoc('posts', postData.pid, {
            comments: comments
        });
    }

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
                <View style={styles.header}>
                    <Text style={styles.headerText}>Comments</Text>
                </View>
                <FlatList
                    showsVerticalScrollIndicator={false}
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <Pressable>
                            <CommentCard data={item} likeComment={handleLikeComment} unlikeComment={handleUnlikeComment} index={index} key={index} />
                        </Pressable>
                    )}
                    contentContainerStyle={styles.comments_list_ctnr}
                />
                <Pressable>
                    <View style={[styles.footer, { marginBottom: isInputFocused ? 65 : 0 }]}>
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
                                placeholder={`Add a comment for ${postData.handle}`}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                            />
                            {inputText && <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                <Ionicons name="send" size={15} color="#2D9EFF" />
                            </TouchableOpacity>}
                        </View>
                    </View>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        // backgroundColor: '#F3F6FA'
        backgroundColor: '#F6F8FB'
    },
    header: {
        height: 50,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 0.2,
        borderBottomColor: '#eee',
        paddingHorizontal: 15,
    },
    headerText: {
        padding: 5,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Poppins_400Regular'
    },
    comments_list_ctnr: {
        paddingHorizontal: 15,
        paddingBottom: 200,
        flexGrow: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 22,
        paddingTop: 10,
        paddingBottom: 24,
        backgroundColor: '#fff',

        // borderTopColor: '#ddd',
        // borderTopWidth: 0.75,
    },
    pfp_ctnr: {
        width: 36,
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
        borderColor: '#ddd',
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
        paddingVertical: 7,
        color: '#000',
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
    },
    sendButton: {
        // backgroundColor: '#0499FE',
        // borderRadius: 25,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
