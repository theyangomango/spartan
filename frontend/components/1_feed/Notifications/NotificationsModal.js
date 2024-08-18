import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import ButtonRow from './ButtonRow';
import NotificationCard from './NotificationCard';
import getReverse from '../../../helper/getReverse';

export default function NotificationsModal() {
    const [selectedButton, setSelectedButton] = useState('All Activity');
    const events = getReverse(global.userData.notificationEvents);
    const newLikes = global.userData.notificationNewLikes;
    const newComments = global.userData.notificationNewComments;

    const filteredEvents = events.filter(event => {
        if (selectedButton === 'All Activity') {
            return true;
        }
        if (selectedButton === 'Likes') {
            return event.type === 'liked-post' || event.type === 'liked-story' || event.type === 'liked-comment';
        }
        if (selectedButton === 'Comments') {
            return event.type === 'comment' || event.type === 'replied-comment';
        }
        if (selectedButton === 'Mentions') {
            return event.type === 'mention';
        }
        return false;
    });

    return (
        <View style={styles.container}>
            <ButtonRow
                buttons={['All Activity', 'Likes', 'Comments', 'Mentions']}
                selectedButton={selectedButton}
                setSelectedButton={setSelectedButton}
                newLikes={newLikes}
                newComments={newComments}
            />
            <FlatList
                showsVerticalScrollIndicator={false}
                data={filteredEvents}
                renderItem={({ item }) => (
                    <NotificationCard item={item} />
                )}
                keyExtractor={(item, index) => index.toString()}
                style={styles.flatlist}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
    },
    flatlist: {
        paddingHorizontal: 12,
    },
});
