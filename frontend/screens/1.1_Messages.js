import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import MessageCard from "../components/1.1_Messages/MessageCard";
import MessagesHeader from "../components/1.1_Messages/MessagesHeader";
import CreateGroupChatBottomSheet from "../components/1.1_Messages/CreateGroupChatBottomSheet";
import initChat from "../../backend/messages/initChat";
import makeID from '../../backend/helper/makeID';
import arrayAppend from '../../backend/helper/firebase/arrayAppend';

export default function Messages({ navigation, route }) {
    const userData = global.userData;
    const [messages, setMessages] = useState([]);
    const [scope, setScope] = useState('All');
    const [isCreateGroupChatBottomSheetVisible, setIsCreateGroupChatBottomSheetVisible] = useState(false);

    useEffect(() => {
        if ('messages' in route.params) {
            // Sort messages before setting them
            const sortedMessages = [...route.params.messages].sort((a, b) => {
                const timestampA = a.content.length > 0 ? a.content[a.content.length - 1].timestamp : null;
                const timestampB = b.content.length > 0 ? b.content[b.content.length - 1].timestamp : null;

                if (timestampA && timestampB) {
                    return timestampB - timestampA;
                }
                if (!timestampA) return 1;
                if (!timestampB) return -1;
                return 0;
            });
            setMessages(sortedMessages);
        }
    }, [route.params.messages]);

    useEffect(() => {
        if ('message' in route.params) {
            const data = route.params.message;
            const index = route.params.index;

            // Create a new array with the updated message
            const updatedMessages = [...messages];
            updatedMessages[index] = data;

            // Sort the messages after updating
            const sortedMessages = updatedMessages.sort((a, b) => {
                const timestampA = a.content.length > 0 ? a.content[a.content.length - 1].timestamp : null;
                const timestampB = b.content.length > 0 ? b.content[b.content.length - 1].timestamp : null;

                if (timestampA && timestampB) {
                    return timestampB - timestampA;
                }
                if (!timestampA) return 1;
                if (!timestampB) return -1;
                return 0;
            });

            setMessages(sortedMessages);
        }
    }, [route.params]);

    const toFeedScreen = () => {
        navigation.navigate('Feed', { messages: messages });
    };

    const toChat = (key, usersExcludingSelf) => {
        navigation.navigate('Chat', { data: messages[key], index: key, usersExcludingSelf });
    };

    const openCreateGroupChatBottomSheet = () => {
        setIsCreateGroupChatBottomSheetVisible(true);
    };

    const createGroupChat = async (usersExcludingSelf) => {
        const selfUser = {
            uid: userData.uid,
            handle: userData.handle,
            pfp: userData.image,
            name: userData.name,
        };

        const cid = makeID();
        arrayAppend('users', userData.uid, 'messages', {
            mid: cid,
            otherUsers: usersExcludingSelf,
        });

        const newChat = await initChat(userData.uid, [...usersExcludingSelf, selfUser], cid);
        setMessages([...messages, newChat]);

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
                        if (scope === 'Group' && !msg.isGroup) return null;

                        const usersExcludingSelf = msg.users.filter(usr => usr.uid !== userData.uid);

                        return (
                            <View key={index}>
                                <MessageCard
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
