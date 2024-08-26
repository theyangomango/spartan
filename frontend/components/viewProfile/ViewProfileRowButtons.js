import RNBounceable from "@freakycoder/react-native-bounceable";
import { useState } from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import followUser from "../../../backend/user/followUser";
import unfollowUser from "../../../backend/user/unfollowUser";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileRowButtons({ toMessages, user }) {
    const [isFollowing, setIsFollowing] = useState(global.userData.following.some(follower => follower.uid === user.uid));

    const toggleFollow = () => {
        const this_user = {
            name: global.userData.name,
            handle: global.userData.handle,
            pfp: global.userData.image,
            uid: global.userData.uid
        }

        if (!isFollowing) {
            followUser(this_user, user);
        } else {
            unfollowUser(this_user, user);
        }

        setIsFollowing(!isFollowing);
    };

    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex} onPress={toggleFollow}>
                <View style={[styles.flex, isFollowing ? styles.following_button : styles.follow_button]}>
                    <Text style={isFollowing ? styles.following_button_text : styles.follow_button_text}>
                        {isFollowing ? "Following" : "Follow"}
                    </Text>
                </View>
            </RNBounceable>
            <RNBounceable style={styles.flex} onPress={toMessages}>
                <View style={[styles.message_button, styles.flex]}>
                    <Text style={styles.message_button_text}>Message</Text>
                </View>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        marginHorizontal: scaleSize(5),
        marginTop: scaleSize(10),
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: scaleSize(32),
    },
    flex: {
        flex: 1,
    },
    follow_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: '#3CA5FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    following_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: '#fff',
        borderWidth: scaleSize(1.8),
        borderColor: '#3CA5FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    message_button: {
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(7),
        borderRadius: scaleSize(10),
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    follow_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(12.5),
        color: '#fff',
    },
    following_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(12.5),
        color: '#3CA5FF',
    },
    message_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(12.5),
    },
});
