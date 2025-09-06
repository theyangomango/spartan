import RNBounceable from "@freakycoder/react-native-bounceable";
import { useRef, useState } from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import followUser from "../../../backend/user/followUser";
import unfollowUser from "../../../backend/user/unfollowUser";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileRowButtons({ toMessages, user }) {
    const [isFollowing, setIsFollowing] = useState(Array.isArray(global?.userData?.following) && global.userData.following.some(f => String(f?.uid) === String(user?.uid)));
    const pendingRef = useRef(false);
    const [busy, setBusy] = useState(false);

    const normalizeRef = (u) => ({
        uid: String(u?.uid || u?.id || ''),
        handle: u?.handle || '',
        name: u?.name || '',
        pfp: u?.pfp || u?.image || u?.photoURL || '',
    });

    const toggleFollow = async () => {
        if (pendingRef.current || busy) return; // prevent spamming while a write is in-flight
        pendingRef.current = true; setBusy(true);

        const me = normalizeRef(global?.userData || {});
        const other = normalizeRef(user || {});

        // optimistic UI update
        setIsFollowing((prev) => !prev);

        // mirror to global cache immediately for consistency across screens
        try {
            const list = Array.isArray(global?.userData?.following) ? [...global.userData.following] : [];
            const exists = list.some((x) => String(x?.uid) === other.uid);
            if (!exists) list.push(other); else {
                // remove all matches (defensive against duplicates)
                for (let i = list.length - 1; i >= 0; i--) if (String(list[i]?.uid) === other.uid) list.splice(i, 1);
            }
            global.userData.following = list;
        } catch {}

        try {
            if (!isFollowing) await followUser(me, other);
            else await unfollowUser(me, other);
        } catch {
            // revert optimistic toggle on failure
            setIsFollowing((prev) => !prev);
        } finally {
            pendingRef.current = false; setBusy(false);
        }
    };

    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex} onPress={toggleFollow} disabled={busy}>
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
