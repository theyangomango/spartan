import { View, StyleSheet, Text } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import FastImage from "react-native-fast-image";
import getDisplayTime from '../../helper/getDisplayTime';

export default function MessageCard({ usersExcludingSelf, content, timestamp, toChat, index }) {
    const handles = usersExcludingSelf.map(user => user.handle).join(', ');
    const maxProfilePics = 5; // Set a maximum number of profile pictures to show at full size
    const profilePicSize = usersExcludingSelf.length > maxProfilePics ? 40 : 48; // Adjust size based on the number of users
    const profilePicOverlap = 20; // Overlap amount

    return (
        <RNBounceable onPress={() => toChat(index, usersExcludingSelf)} style={styles.mainContainer}>
            <View style={styles.leftContainer}>
                <View style={[styles.profilePicturesContainer, { width: profilePicSize + profilePicOverlap * (usersExcludingSelf.length - 1) }]}>
                    {usersExcludingSelf.map((user, idx) => (
                        <FastImage
                            key={user.uid}
                            source={{ uri: user.pfp }}
                            style={[styles.profilePicture, { left: idx * profilePicOverlap, width: profilePicSize, height: profilePicSize }]}
                        />
                    ))}
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.handleText} numberOfLines={1} ellipsizeMode="tail">{handles}</Text>
                    <Text style={styles.contentText}>{content}</Text>
                </View>
            </View>
            <View style={styles.rightContainer}>
                <Text style={styles.dateText}>{getDisplayTime(timestamp)}</Text>
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        height: 80,
        marginHorizontal: 15,
        paddingHorizontal: 15,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8',
        marginBottom: 8,
    },
    profilePicturesContainer: {
        flexDirection: 'row',
        marginRight: 12,
        position: 'relative',
        alignItems: 'center',
    },
    profilePicture: {
        borderRadius: 24,
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#fff',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textContainer: {
        flexShrink: 1,
    },
    handleText: {
        fontSize: 16,
        paddingVertical: 3,
        fontFamily: 'Outfit_500Medium',
        letterSpacing: 0.2,
    },
    contentText: {
        fontSize: 12.5,
        fontFamily: 'Outfit_400Regular',
        color: '#999',
        marginBottom: 7,
    },
    rightContainer: {
        paddingTop: 15,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    dateText: {
        color: '#999',
        fontSize: 12,
        fontFamily: 'Outfit_400Regular',
        letterSpacing: 0.1,
    },
});
