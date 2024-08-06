import { useDebugValue, useEffect, useReducer, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import MessageCard from "../components/1.1_Messages/MessageCard";
import MessagesHeader from "../components/1.1_Messages/MessagesHeader";
import CreateGroupChatBottomSheet from "../components/1.1_Messages/CreateGroupChatBottomSheet";

export default function Messages({ navigation, route }) {
    const userData = global.userData;
    const [messages, setMessages] = useState([]);
    const [scope, setScope] = useState('All');
    const [isCreateGroupChatBottomSheetVisible, setIsCreateGroupChatBottomSheetVisible] = useState(false);

    useEffect(() => {
        setMessages(route.params.messages);
    }, []);

    function toFeedScreen() {
        navigation.navigate('Feed');
    }

    function toChat(key, pfp_uid, handle) {
        navigation.navigate('Chat', { data: messages[key], pfp_uid: pfp_uid, handle: handle });
    }

    function openCreateGroupChatBottomSheet() {
        setIsCreateGroupChatBottomSheetVisible(true);
    }

    if (userData) {
        return (
            <View style={styles.main_ctnr}>
                <MessagesHeader
                    handle={userData.handle}
                    toFeedScreen={toFeedScreen}
                    setScope={setScope}
                    openCreateGroupChatBottomSheet={openCreateGroupChatBottomSheet}
                />
                <View style={styles.cards_ctnr}>
                    <ScrollView style={styles.cards_scrollview}>
                        {
                            messages.map((msg, index) => {
                                let usersExcludingSelf = msg.users.filter(usr => {
                                    if (usr.uid != userData.uid) return usr;
                                });

                                return (
                                    <View key={index} style={(scope == 'Group' && !msg.isGroup) && { display: 'none' }}>
                                        <MessageCard
                                            uid={usersExcludingSelf[0].uid}
                                            handle={usersExcludingSelf[0].handle}
                                            content={msg.content[msg.content.length - 1].text}
                                            timestamp={msg.content[msg.content.length - 1].timestamp}
                                            toChat={toChat}
                                            index={index}
                                        />
                                    </View>
                                )
                            })
                        }
                    </ScrollView>
                </View>

                <CreateGroupChatBottomSheet isVisible={isCreateGroupChatBottomSheetVisible} setIsVisible={setIsCreateGroupChatBottomSheetVisible} />
            </View>
        )
    }
    else return <></>
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    cards_ctnr: {
        flex: 1,
        // paddingHorizontal: 18,
    },
    cards_scrollview: {
        paddingTop: 6
    }
});