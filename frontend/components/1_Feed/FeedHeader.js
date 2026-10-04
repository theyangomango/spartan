import React, { memo, useEffect, useState } from "react";
import { View, Text } from "react-native";
import FastImage from "react-native-fast-image";
import { MaterialIcons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Svg, { Path } from "react-native-svg";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../../firebase.config";
import { withStrongPress } from "../../utils/haptics";
import FeedScopeSelector from "./FeedHeader/FeedScopeSelector";
import SearchUsersBar from "./FeedHeader/SearchUsersBar";
import styles, { METRICS, dynamicStyles } from "./FeedHeader.styles";

/* ----------------------------- FeedHeader ----------------------------- */

const FeedHeader = ({
    toMessagesScreen,
    onOpenNotifications,
    scrollToTop,
    navigation,
    allUsersRef,
    onOpenCalendar,
    heightAdjust = 0, // optional fine-tune for overall header height (affects padding only)
    topAdjust = 0,
    centerVariant = "logo",
    centerTitle = "Feed",
    centerTextPreset = "feed",
    feedScope = "forYou",
    onChangeFeedScope,
}) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const notificationsRef = collection(db, "usersPrivate", uid, "notifications");
        const q = query(notificationsRef, where("read", "==", false));
        const unsubscribe = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size));
        return () => unsubscribe();
    }, []);

    // Messages badge: listen to aggregate count on user doc
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const userRef = doc(db, 'usersPrivate', uid);
        const unsub = onSnapshot(userRef, (snap) => {
            try {
                const v = Number(snap.data()?.unreadMessagesCount || 0);
                setUnreadMessages(Number.isFinite(v) ? v : 0);
            } catch { setUnreadMessages(0); }
        });
        return () => { try { unsub(); } catch {} };
    }, []);

    const adjustedPaddingTop = topAdjust !== 0 ? Math.max(0, METRICS.paddingTop + topAdjust) : null;
    const adjustedPaddingBottom = heightAdjust !== 0 ? Math.max(0, METRICS.paddingBottom + heightAdjust) : null;
    const computedCenterTitle = typeof centerTitle === "string" && centerTitle.trim() ? centerTitle : "Feed";
    const centerTextStyle = centerTextPreset === "workout" ? styles.center_title_text_workout : styles.center_title_text_feed;

    return (
        <View style={[
            styles.main_ctnr,
            adjustedPaddingTop !== null ? { paddingTop: adjustedPaddingTop } : null,
            adjustedPaddingBottom !== null ? { paddingBottom: adjustedPaddingBottom } : null,
        ]}>
            {/* Left: Search */}
            <View style={styles.leftArea}>
                <SearchUsersBar navigation={navigation} allUsersRef={allUsersRef} onOpenCalendar={onOpenCalendar} />
            </View>
            {/* Center: fixed-height slot */}
            <View style={styles.centerArea}>
                <View style={styles.centerSlot}>
                    {centerVariant === "logo" ? (
                        <RNBounceable
                            onPress={withStrongPress(scrollToTop)}
                            style={styles.logoWrap}
                        >
                            <View style={styles.logo_image_ctnr}>
                                <FastImage
                                    source={require("../../../frontend/assets/logo_feed_black.png")}
                                    style={styles.logo_image}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                            </View>
                            <Text style={styles.logo_text}>SPARTAN</Text>
                        </RNBounceable>
                    ) : onChangeFeedScope ? (
                        <FeedScopeSelector value={feedScope} onSelect={onChangeFeedScope} onScrollToTop={scrollToTop} />
                    ) : (
                        <RNBounceable
                            onPress={withStrongPress(scrollToTop)}
                            style={styles.titleWrap}
                        >
                            <Text style={centerTextStyle}>{computedCenterTitle}</Text>
                        </RNBounceable>
                    )}
                </View>
            </View>
            {/* Right: notifications + messages */}
            <View style={styles.right_icons}>
                <RNBounceable onPress={withStrongPress(onOpenNotifications)} style={styles.notification_button}>
                    <Svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={dynamicStyles.iconSize - 1}
                        height={dynamicStyles.iconSize - 1}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    </Svg>
                    {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationText}>{unreadCount}</Text>
                        </View>
                    )}
                </RNBounceable>

                <RNBounceable
                    onPress={withStrongPress(() => {
                        try {
                            if (typeof toMessagesScreen === 'function') return toMessagesScreen();
                        } catch { }
                        try { navigation?.navigate?.('Messages'); } catch { }
                    })}
                    style={styles.message_button}
                >
                    <MaterialIcons name="alternate-email" size={dynamicStyles.iconSize + 1.5} color={"#cbd5e1"} />
                    {unreadMessages > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationText}>{unreadMessages}</Text>
                        </View>
                    )}
                </RNBounceable>
            </View>
        </View>
    );
};

export default memo(FeedHeader);
