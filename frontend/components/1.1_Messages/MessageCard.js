import { View, StyleSheet, Text, Dimensions } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import FastImage from "react-native-fast-image";
import getDisplayTime from '../../helper/getDisplayTime';

const { width, height } = Dimensions.get('window');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            handleFontSize: 16,
            contentFontSize: 14,
            dateFontSize: 13,
            profilePictureSize: 50,
            smallProfilePictureSize: 36,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            handleFontSize: 15,
            contentFontSize: 13,
            dateFontSize: 12,
            profilePictureSize: 48,
            smallProfilePictureSize: 35,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            handleFontSize: 14.5,
            contentFontSize: 12.5,
            dateFontSize: 11.5,
            profilePictureSize: 46,
            smallProfilePictureSize: 34,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            handleFontSize: 14,
            contentFontSize: 12,
            dateFontSize: 11,
            profilePictureSize: 44,
            smallProfilePictureSize: 33,
        };
    }
};

const dynamicStyles = getDynamicStyles();

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
                                style={[
                                    styles.profilePicture, 
                                    styles.topLeftProfilePicture, 
                                    { width: dynamicStyles.smallProfilePictureSize, height: dynamicStyles.smallProfilePictureSize }
                                ]}
                            />
                            <FastImage
                                source={{ uri: usersExcludingSelf[1].pfp }}
                                style={[
                                    styles.profilePicture, 
                                    styles.bottomRightProfilePicture, 
                                    { width: dynamicStyles.smallProfilePictureSize, height: dynamicStyles.smallProfilePictureSize }
                                ]}
                            />
                        </>
                    ) : (
                        <FastImage
                            source={{ uri: usersExcludingSelf[0].pfp }}
                            style={[
                                styles.singleProfilePicture, 
                                { width: dynamicStyles.profilePictureSize, height: dynamicStyles.profilePictureSize }
                            ]}
                        />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.handleText, { fontSize: dynamicStyles.handleFontSize }]} numberOfLines={1} ellipsizeMode="tail">{handles}</Text>
                    <Text style={[styles.contentText, { fontSize: dynamicStyles.contentFontSize }]} numberOfLines={1} ellipsizeMode="tail">{content}</Text>
                </View>
            </View>
            <View style={styles.rightContainer}>
                <Text style={[styles.dateText, { fontSize: dynamicStyles.dateFontSize }]}>{getDisplayTime(timestamp)}</Text>
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
        width: dynamicStyles.profilePictureSize,
        height: dynamicStyles.profilePictureSize,
        position: 'relative',
        marginRight: 12,
    },
    profilePicture: {
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
        borderRadius: dynamicStyles.profilePictureSize / 2,
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
        paddingVertical: 3,
        fontFamily: 'Outfit_500Medium',
        letterSpacing: 0.2,
    },
    contentText: {
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
        fontFamily: 'Outfit_400Regular',
        letterSpacing: 0.1,
    },
});
