import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons
import { useNavigation } from '@react-navigation/native';

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

export default function NotificationsModal({ closeBottomSheet }) {
    const navigation = useNavigation();
    const [selectedButton, setSelectedButton] = useState('All Activity');

    const buttons = ['All Activity', 'Likes', 'Comments', 'Mentions'];
    const newLikes = 58; // Hardcoded number for new likes
    const newComments = 32; // Hardcoded number for new comments

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* <Pressable
                    onPress={closeBottomSheet}
                >
                    <Ionicons
                        name="chevron-down"
                        size={24}
                        color="black"
                    />
                </Pressable> */}
                <Text style={styles.title}>Notifications</Text>
                {/* <Ionicons
                    name="chevron-down"
                    size={24}
                    color="#f6f6f6"
                /> */}
            </View>
            <View style={styles.buttonRowContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buttonRow}>
                    {buttons.map((button) => (
                        <RNBounceable
                            key={button}
                            style={[
                                styles.button,
                                selectedButton === button && styles.selectedButton
                            ]}
                            onPress={() => setSelectedButton(button)}
                        >
                            <Text
                                style={[
                                    styles.buttonText,
                                    selectedButton === button && styles.selectedButtonText
                                ]}
                            >
                                {button}
                            </Text>
                            {(button === 'Likes' && newLikes > 0) && (
                                <View style={styles.badge_ctnr}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{newLikes}</Text>
                                    </View>
                                </View>
                            )}
                            {(button === 'Comments' && newComments > 0) && (
                                <View style={styles.badge_ctnr}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{newComments}</Text>
                                    </View>
                                </View>
                            )}
                        </RNBounceable>
                    ))}
                </ScrollView>
            </View>
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
        // backgroundColor: '#f6f6f6',
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
    
    },
    header: {
        paddingTop: 23,
        paddingHorizontal: 25,
        // flexDirection: 'row',
        alignItems: 'center',
        // justifyContent: 'space-between',
    },
    title: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16
    },
    buttonRowContainer: {
        // height: 70,
    },
    buttonRow: {
        paddingTop: 23,
        paddingBottom: 7,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    button: {
        backgroundColor: '#f3f3f3',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginRight: 8,
        position: 'relative', // Needed to position the badge
    },
    selectedButton: {
        backgroundColor: '#000',
    },
    buttonText: {
        color: '#000',
        fontSize: 12.5,
        fontFamily: 'Outfit_600SemiBold',
    },
    selectedButtonText: {
        color: '#fff',
    },
    badge_ctnr: {
        position: 'absolute',
        alignItems: 'center',
        left: 0,
        right: 0,
        top: -12
    },
    badge: {
        backgroundColor: '#FF387E',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
        borderRadius: 25,
    },
    flatlist: {
        paddingHorizontal: 12,
    },
    pfp: {
        width: 47,
        aspectRatio: 1,
        borderRadius: 20,
        marginRight: 11.5,
    },
    textContainer: {
        flex: 1,
    },
    handle: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        paddingVertical: 1.5
    },
    message: {
        fontSize: 12.5,
        color: '#555',
        fontFamily: 'Outfit_500Medium'
    },
    time: {
        fontSize: 12.5,
        color: '#aaa',
        fontFamily: 'Outfit_500Medium'
    },
    followButton: {
        backgroundColor: '#2D92FF',
        paddingVertical: 13.5,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginLeft: 10,
        shadowColor: '#2D92FF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5
    },
    followButtonText: {
        color: '#fff',
        fontSize: 12.5,
        fontFamily: 'Outfit_600SemiBold',
    },
});
