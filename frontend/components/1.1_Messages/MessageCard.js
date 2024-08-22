import { View, StyleSheet, Text } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import FastImage from "react-native-fast-image";
import getDisplayTime from '../../helper/getDisplayTime';

export default function MessageCard({ usersExcludingSelf, content, timestamp, toChat, index }) {
    const handles = usersExcludingSelf.map(user => user.handle).join(', ');

    return (
        <RNBounceable onPress={() => toChat(index, usersExcludingSelf)} style={styles.mainContainer}>
            <View style={styles.leftContainer}>
                <View style={styles.profilePicturesContainer}>
                    {usersExcludingSelf.length > 1 ? (
                        <>
                            <FastImage
                                source={{ uri: usersExcludingSelf[0].pfp }}
                                style={[styles.profilePicture, styles.topLeftProfilePicture]}
                            />
                            <FastImage
                                source={{ uri: usersExcludingSelf[1].pfp }}
                                style={[styles.profilePicture, styles.bottomRightProfilePicture]}
                            />
                        </>
                    ) : (
                        <FastImage
                            source={{ uri: usersExcludingSelf[0].pfp }}
                            style={styles.singleProfilePicture}
                        />
                    )}
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
        width: 48,
        height: 48,
        position: 'relative',
        marginRight: 12,
    },
    profilePicture: {
        width: 35,
        height: 35,
        borderRadius: 30,
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#fff',
    },
    topLeftProfilePicture: {
        top: 0,
        left: 0,
    },
    bottomRightProfilePicture: {
        bottom: 0,
        right: 0,
    },
    singleProfilePicture: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
