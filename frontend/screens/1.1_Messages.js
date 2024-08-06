import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import MessageCard from "../components/1.1_Messages/MessageCard";
import MessagesHeader from "../components/1.1_Messages/MessagesHeader";
import CreateGroupChatBottomSheet from "../components/1.1_Messages/CreateGroupChatBottomSheet";
import initChat from "../../backend/messages/initChat";
import makeID from '../../backend/helper/makeID'
import arrayAppend from '../../backend/helper/firebase/arrayAppend'

export default function Messages({ navigation, route }) {
    const userData = global.userData;
    const [messages, setMessages] = useState([]);
    const [scope, setScope] = useState('All');
    const [isCreateGroupChatBottomSheetVisible, setIsCreateGroupChatBottomSheetVisible] = useState(false);

    useEffect(() => {
        setMessages(route.params.messages);
    }, []);

    const toFeedScreen = () => {
        // Navigate to the Feed screen
        navigation.navigate('Feed');
    };

    const toChat = (key, usersExcludingSelf) => {
        // Navigate to the Chat screen with selected message data
        navigation.navigate('Chat', { data: messages[key], usersExcludingSelf });
    };

    const openCreateGroupChatBottomSheet = () => {
        // Show the create group chat bottom sheet
        setIsCreateGroupChatBottomSheetVisible(true);
    };

    const createGroupChat = async (usersExcludingSelf) => {
        // Update Firestore
        const selfUser = {
            uid: userData.uid,
            handle: userData.handle,
            pfp: userData.image,
            name: userData.name
        };

        const cid = makeID();
        arrayAppend('users', userData.uid, 'messages', cid);

        // Append to Messages List
        const newChat = await initChat(userData.uid, [...usersExcludingSelf, selfUser], cid);
        setMessages([...messages, newChat]);

        // Navigate
        setIsCreateGroupChatBottomSheetVisible(false);
        navigation.navigate('Chat', { data: newChat, usersExcludingSelf });
    };

    if (!userData) return null;

    return (
        <View style={styles.mainContainer}>
            <MessagesHeader
                handle={userData.handle}
                toFeedScreen={toFeedScreen}
                setScope={setScope}
                openCreateGroupChatBottomSheet={openCreateGroupChatBottomSheet}
            />
            <View style={styles.cardsContainer}>
                <ScrollView style={styles.cardsScrollView}>
                    {messages.map((msg, index) => {
                        // Skip rendering if scope is 'Group' and message is not a group message
                        if (scope === 'Group' && !msg.isGroup) return null;

                        // Filter out the current user from the message users list
                        const usersExcludingSelf = msg.users.filter(usr => usr.uid !== userData.uid);

                        return (
                            <View key={index}>
                                <MessageCard
                                    // pfp={usersExcludingSelf[0].pfp}
                                    // handle={usersExcludingSelf[0].handle}
                                    usersExcludingSelf={usersExcludingSelf}
                                    content={msg.content.length > 0 && msg.content[msg.content.length - 1].text}
                                    timestamp={msg.content.length > 0 && msg.content[msg.content.length - 1].timestamp}
                                    toChat={toChat}
                                    index={index}
                                />
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
            <CreateGroupChatBottomSheet
                isVisible={isCreateGroupChatBottomSheetVisible}
                setIsVisible={setIsCreateGroupChatBottomSheetVisible}
                createGroupChat={createGroupChat}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    cardsContainer: {
        flex: 1,
    },
    cardsScrollView: {
        paddingTop: 6,
    },
});
