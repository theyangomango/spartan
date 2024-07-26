import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Pressable } from 'react-native';

const notifications = [
    {
        id: '1',
        handle: 'user1',
        message: 'liked your post',
        time: '2h'
    },
    {
        id: '2',
        handle: 'user2',
        message: 'commented: Great photo!',
        time: '3h'
    },
    {
        id: '3',
        handle: 'user3',
        message: 'started following you',
        time: '5h',
        isFollow: true
    },
    // Add more notifications as needed
];

export default function NotificationsModal() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Inbox</Text>
            <FlatList
                showsVerticalScrollIndicator={false}
                data={notifications}
                renderItem={({ item }) => (
                    <Pressable>

                        <View style={styles.card}>
                            <Image source={{ uri: global.userData.image }} style={styles.pfp} />
                            <View style={styles.textContainer}>
                                <Text style={styles.handle}>{item.handle}</Text>
                                <Text>
                                    <Text style={styles.message}>{item.message}</Text>
                                    <Text style={styles.time}>  {item.time}</Text>
                                </Text>
                            </View>
                            {
                                item.isFollow &&
                                <RNBounceable style={styles.followButton}>
                                    <Text style={styles.followButtonText}>Follow Back</Text>
                                </RNBounceable>
                            }

                        </View>
                    </Pressable>

                )}
                keyExtractor={item => item.id}
                style={styles.flatlist}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        textAlign: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        fontFamily: 'Outfit_500Medium'
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 13,
        paddingHorizontal: 8,
        paddingTop: 5,
        paddingBottom: 8,
        // backgroundColor: '#fff',
        borderRadius: 8,
    },
    flatlist: {
        paddingHorizontal: 10,
    },
    bottom_row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp: {
        width: 53,
        aspectRatio: 1,
        borderRadius: 100,
        marginRight: 11.5,
    },
    textContainer: {
        flex: 1,
    },
    handle: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        paddingVertical: 1.5
    },
    message: {
        fontSize: 13,
        color: '#555',
        fontFamily: 'Outfit_400Regular'
    },
    time: {
        fontSize: 13,
        color: '#888',
        fontFamily: 'Outfit_400Regular'
    },
    followButton: {
        backgroundColor: '#4AA1FF',
        marginTop: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginLeft: 10,
        
    },
    followButtonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
});
