import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import getChatDisplayTime from '../../helper/getChatDisplayTime';

const shouldDisplayTime = (currentMessage, lastMessage) => {
    if (!lastMessage) return true;
    return ((currentMessage.timestamp - lastMessage.timestamp)) > 1000 * 60 * 60 * 4; // More than 4 hours apart
};

const MessageItem = ({ item, messages, index, usersExcludingSelf }) => {
    const nextItem = messages[index + 1];
    const displayTime = shouldDisplayTime(item, nextItem);
    const isOtherUserMessage = item.uid !== global.userData.uid;
    const showHandle = usersExcludingSelf.length > 1 && isOtherUserMessage;


    if (!item.isPost) return (
        <>
            <View style={isOtherUserMessage ? styles.otherMessageContainer : styles.userMessageContainer}>
                <Text style={isOtherUserMessage ? styles.otherMessageText : styles.userMessageText}>{item.text}</Text>
            </View>
            {showHandle && (
                <Text style={styles.messageHandleText}>{item.handle}</Text>
            )}
            {displayTime && (
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{getChatDisplayTime(item.timestamp)}</Text>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    userMessageContainer: {
        alignSelf: 'flex-end',
        backgroundColor: '#0499FE',
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 2,
        padding: 10,
        maxWidth: '70%',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#CEE4F9',
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 2,
        padding: 10,
        maxWidth: '70%',
    },
    userMessageText: {
        fontSize: 14,
        color: '#fff',
        fontFamily: 'Poppins_500Medium',
    },
    otherMessageText: {
        fontSize: 14,
        color: '#222',
        fontFamily: 'Poppins_500Medium',
    },
    messageHandleText: {
        alignSelf: 'flex-start',
        marginLeft: 24,
        marginBottom: 2,
        fontSize: 12,
        color: '#888',
        fontFamily: 'Poppins_500Medium',
    },
    timeContainer: {
        alignSelf: 'center',
        marginVertical: 25,
        backgroundColor: '#EEE',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    timeText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Poppins_500Medium',
    },
});

export default MessageItem;
