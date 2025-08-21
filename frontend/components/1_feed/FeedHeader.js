import React, { memo, useEffect, useRef, useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    TextInput,
    FlatList,
    Modal,
    TouchableWithoutFeedback,
    SafeAreaView,
} from "react-native";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";
import { getFeedHeaderStyles } from "../../helper/getFeedHeaderStyles";
import { db } from "../../../firebase.config";
import {
    collection,
    query,
    where,
    onSnapshot,
    getDocs,
    orderBy,
    limit,
} from "firebase/firestore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
const scale = SCREEN_WIDTH / 375;
const s = (n) => Math.round(n * scale);

/* ------------------------------ Debounce ------------------------------ */
const useDebounce = (fn, delay = 250) => {
    const t = useRef(null);
    return (...args) => {
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => fn(...args), delay);
    };
};

/* --------------------------- ProfileCard --------------------------- */
const ProfileCard = ({ user, onPress }) => {
    const avatarSize = s(42);
    const hasPfp = !!user?.pfp;

    console.log(user);

    return (
        <RNBounceable onPress={onPress} style={styles.profileCard} bounceEffectIn={0.9}>
            <View style={styles.profileLeft}>
                {hasPfp ? (
                    <Image
                        source={{ uri: user.pfp }}
                        style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: '#eee' }}
                    />
                ) : (
                    <Ionicons name="person-circle" size={avatarSize + s(6)} color="#C7C7CC" style={{ marginLeft: s(-3) }} />
                )}
                <View style={{ marginLeft: s(10), flex: 1 }}>
                    <Text numberOfLines={1} style={styles.cardHandle}>@{user.handle || 'user'}</Text>
                    {!!user.name && <Text numberOfLines={1} style={styles.cardName}>{user.name}</Text>}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={s(18)} color="#A0A0A0" />
        </RNBounceable>
    );
};

/* --------------------------- SearchUsersBar --------------------------- */
/**
 * Full-screen overlay search:
 * - Keeps the search icon FIXED in the header position
 * - Slides the input horizontally from LEFT → RIGHT when expanding
 * - Uses local `allUsersRef` if provided; otherwise Firestore prefix queries
 */
const SearchUsersBar = ({
    navigation,
    allUsersRef,
    disabled = false
}) => {
    const [visible, setVisible] = useState(false);
    const [qStr, setQStr] = useState('');
    const [results, setResults] = useState([]);

    // 0 collapsed, 1 expanded
    const progress = useRef(new Animated.Value(0)).current;

    const FULL_W = SCREEN_WIDTH - (dynamicStyles.paddingHorizontal * 2);
    const ICON_W = dynamicStyles.iconSize + 6;
    const GAP = s(0);
    const INPUT_MAX_W = FULL_W - ICON_W - GAP;

    const inputW = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, INPUT_MAX_W],
    });
    const backdropOpacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.06],
    });

    const open = () => {
        if (disabled) return;
        setVisible(true);
        requestAnimationFrame(() => {
            Animated.timing(progress, { toValue: 1, duration: 240, useNativeDriver: false }).start();
        });
    };

    const close = () => {
        Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
            setVisible(false);
            setQStr('');
            setResults([]);
        });
    };

    // Search sources
    const localFilter = (text) => {
        const all = allUsersRef?.current || [];
        const needle = (text || '').toLowerCase();
        const out = all
            .filter(u => u?.uid !== global?.userData?.uid)
            .filter(u =>
                (u?.handle || '').toLowerCase().includes(needle) ||
                (u?.name || '').toLowerCase().includes(needle)
            )
            .slice(0, 30);
        setResults(out);
    };

    const remotePrefixQuery = async (text) => {
        const needle = (text || '').toLowerCase();
        if (!needle) return setResults([]);

        const usersCol = collection(db, 'users');
        const handleQ = query(
            usersCol,
            orderBy('handle_lower'),
            where('handle_lower', '>=', needle),
            where('handle_lower', '<=', needle + '\uf8ff'),
            limit(15)
        );
        const nameQ = query(
            usersCol,
            orderBy('name_lower'),
            where('name_lower', '>=', needle),
            where('name_lower', '<=', needle + '\uf8ff'),
            limit(15)
        );

        const [hSnap, nSnap] = await Promise.all([getDocs(handleQ), getDocs(nameQ)]);
        const map = new Map();
        hSnap.forEach(d => map.set(d.id, d.data()));
        nSnap.forEach(d => map.set(d.id, d.data()));

        const me = global?.userData?.uid;
        const merged = Array.from(map.entries())
            .map(([uid, data]) => ({
                uid,
                handle: data?.handle ?? '',
                name: data?.name ?? '',
                pfp: data?.pfp ?? '',
            }))
            .filter(u => u.uid !== me)
            .slice(0, 30);

        setResults(merged);
    };

    const doSearch = useDebounce((text) => {
        if (!text) return setResults([]);
        if (allUsersRef?.current?.length) localFilter(text);
        else remotePrefixQuery(text).catch(() => setResults([]));
    }, 250);

    if (disabled) return <View style={styles.left_placeholder} />;

    return (
        <>
            {/* Header icon (fixed) */}
            <RNBounceable
                onPress={open}
                bounceEffectIn={0.5}
                style={styles.searchIconBtn}
                accessibilityLabel="Search users"
            >
                <Ionicons name="search" size={dynamicStyles.iconSize} color="#777" />
            </RNBounceable>

            {/* Overlay with horizontal slide input */}
            <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
                <View style={styles.modalContainer}>
                    <TouchableWithoutFeedback onPress={close}>
                        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
                    </TouchableWithoutFeedback>

                    <SafeAreaView style={styles.modalContent} pointerEvents="box-none">
                        <View style={styles.overlayBar}>
                            {/* Sliding input from icon → right */}
                            <Animated.View style={[styles.overlayInputWrap, { width: inputW }]}>
                                <TextInput
                                    style={styles.overlayInput}
                                    placeholder="Search for a person…"
                                    placeholderTextColor="#bbb"
                                    value={qStr}
                                    onChangeText={(t) => { setQStr(t); doSearch(t); }}
                                    autoFocus
                                    returnKeyType="search"
                                />
                                <TouchableOpacity
                                    onPress={() => (qStr ? (setQStr(''), setResults([])) : close())}
                                    style={styles.clearBtn}
                                    accessibilityLabel={qStr ? "Clear search" : "Close search"}
                                >
                                    <Ionicons name="close" size={s(18)} color="#555" />
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                        {/* Results → Profile Cards */}
                        {!!qStr && results.length > 0 && (
                            <View style={styles.resultsWrap}>
                                <FlatList
                                    keyboardShouldPersistTaps="handled"
                                    data={results}
                                    keyExtractor={(item) => item.uid}
                                    renderItem={({ item }) => (
                                        <ProfileCard
                                            user={item}
                                            onPress={() => {
                                                if (item.uid === global?.userData?.uid) {
                                                    navigation?.navigate('Profile');
                                                } else {
                                                    navigation?.navigate('ViewProfile', { user: { uid: item.uid, handle: item.handle, name: item.name, pfp: item.pfp } });
                                                }
                                                close();
                                            }}
                                        />
                                    )}
                                    ItemSeparatorComponent={() => <View style={{ height: s(8) }} />}
                                    contentContainerStyle={{ padding: s(10) }}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        )}
                    </SafeAreaView>
                </View>
            </Modal>
        </>
    );
};

/* ----------------------------- FeedHeader ----------------------------- */

const FeedHeader = ({
    toMessagesScreen,
    onOpenNotifications,
    backButton,
    onBackPress,
    scrollToTop,
    navigation,
    allUsersRef,
}) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const user = global.userData;

    useEffect(() => {
        if (!user?.uid) return;
        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notificationsRef, where('read', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size));
        return () => unsubscribe();
    }, [user?.uid]);

    if (backButton) {
        return (
            <Animated.View style={[styles.back_header]}>
                <TouchableOpacity onPress={onBackPress}>
                    <Ionicons name="chevron-back" size={dynamicStyles.iconSize} color="#000" />
                </TouchableOpacity>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[styles.main_ctnr]}>
            {/* Left: Search */}
            <View style={styles.leftArea}>
                <SearchUsersBar navigation={navigation} allUsersRef={allUsersRef} />
            </View>

            {/* Center: Logo/title */}
            <RNBounceable onPress={scrollToTop} style={styles.centerArea}>
                <View style={styles.logo}>
                    <View style={styles.logo_image_ctnr}>
                        <Image
                            source={require('../../../frontend/assets/logo_black.png')}
                            style={styles.logo_image}
                        />
                    </View>
                    <Text style={[styles.logo_text, { fontSize: dynamicStyles.logoTextFontSize }]}>SPARTAN</Text>
                </View>
            </RNBounceable>

            {/* Right: notifications + messages */}
            <View style={styles.right_icons}>
                <RNBounceable onPress={onOpenNotifications} style={styles.heart_button}>
                    <Svg xmlns="http://www.w3.org/2000/svg" width={dynamicStyles.iconSize} height={dynamicStyles.iconSize} viewBox="0 0 24 24" fill="none">
                        <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#ccc" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationText}>{unreadCount}</Text>
                        </View>
                    )}
                </RNBounceable>

                <RNBounceable onPress={toMessagesScreen} style={styles.message_button}>
                    <MaterialIcons name="alternate-email" size={dynamicStyles.iconSize + 1.5} color={'#ccc'} />
                </RNBounceable>
            </View>
        </Animated.View>
    );
};

export default memo(FeedHeader);

/* -------------------------------- Styles ------------------------------- */

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        backgroundColor: '#fff', 
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 1.5,
        alignItems: 'center',
    },
    back_header: {
        width: '100%',
        backgroundColor: '#fff',
        flexDirection: 'row',
        paddingLeft: dynamicStyles.paddingHorizontal,
        paddingTop: 2,
        paddingBottom: 2,
        alignItems: 'center',
    },
    leftArea: {
        position: 'absolute',
        left: dynamicStyles.paddingHorizontal,
        top: 2.5,
    },
    centerArea: { justifyContent: 'center', alignItems: 'center' },
    logo: {
        marginBottom: 8,
        alignItems: 'center',
        flexDirection: 'row',
        paddingRight: 11,
    },
    logo_image_ctnr: { justifyContent: 'center', alignItems: 'center' },
    logo_image: { width: 27, height: 28 },
    logo_text: { paddingLeft: 2, fontFamily: 'Inter_600SemiBold' },
    right_icons: {
        flexDirection: 'row',
        position: 'absolute',
        right: 27,
        top: 2,
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        right: -7.5,
        top: -5,
        backgroundColor: 'red',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationText: { color: '#fff', fontSize: 8, fontFamily: 'Outfit_600SemiBold' },
    message_button: { padding: 1 },
    heart_button: { marginRight: 19, padding: 1, position: 'relative' },

    /* Collapsed search icon placeholder (when disabled) */
    left_placeholder: { width: dynamicStyles.iconSize + 6, height: dynamicStyles.iconSize + 6 },

    /* Modal overlay */
    modalContainer: { flex: 1, justifyContent: 'flex-start' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black' },
    modalContent: {
        flex: 1,
        paddingHorizontal: dynamicStyles.paddingHorizontal,
    },

    /* Overlay bar (align with header icon) */
    overlayBar: {
        marginTop: 2.5,
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    overlayInputWrap: {
        marginLeft: s(64),
        marginTop: s(-5),
        height: s(36),
        borderRadius: s(22),
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: s(2) },
        shadowOpacity: 0.1,
        shadowRadius: s(4),
        elevation: 3,
        overflow: 'hidden',
    },
    overlayInput: {
        marginLeft: 10,
        flex: 1,
        fontSize: s(12.5),
        color: '#222',
        fontWeight: '700',
        fontFamily: 'Poppins_500Medium'
    },
    clearBtn: { padding: s(6), marginLeft: s(4) },

    /* Results */
    resultsWrap: {
        marginTop: s(10),
        backgroundColor: '#fff',
        borderRadius: s(12),
        maxHeight: SCREEN_HEIGHT * 0.6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: s(2) },
        shadowOpacity: 0.15,
        shadowRadius: s(5),
        elevation: 4,
        overflow: 'hidden',
    },

    /* Profile card styles */
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: s(14),
        paddingVertical: s(10),
        paddingHorizontal: s(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: s(1) },
        shadowOpacity: 0.06,
        shadowRadius: s(3),
        elevation: 2,
    },
    profileLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    cardHandle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: s(13),
        color: '#111',
    },
    cardName: {
        marginTop: s(2),
        fontFamily: 'Outfit_400Regular',
        fontSize: s(12),
        color: '#666',
    },

    /* Header search icon */
    searchIconBtn: {
        width: dynamicStyles.iconSize + 6,
        height: dynamicStyles.iconSize + 6,
        borderRadius: (dynamicStyles.iconSize + 6) / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
