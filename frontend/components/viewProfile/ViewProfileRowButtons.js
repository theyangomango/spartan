import RNBounceable from "@freakycoder/react-native-bounceable";
import { useRef, useState } from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import followUser from "../../../backend/user/followUser";
import unfollowUser from "../../../backend/user/unfollowUser";
import theme from "../../theme/mfpDark";
import scaleSizeGlobal from "../../helper/scaleSize";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileRowButtons({ handleOpenViewStats, user }) {
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
            <RNBounceable style={styles.flex} onPress={handleOpenViewStats}>
                <View style={[styles.view_stats_button, styles.flex]}>
                    <Text style={styles.view_stats_button_text}>View Stats</Text>
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
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    following_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1.2),
        borderColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    view_stats_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSizeGlobal(6),
        shadowOffset: { width: 0, height: scaleSizeGlobal(3) },
        elevation: 2,
    },
    follow_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: '#fff',
    },
    following_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: theme.primary,
    },
    view_stats_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: '#E5E7EB',
    },
});
