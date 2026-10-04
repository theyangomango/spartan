import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import readDoc from "../../backend/helper/firebase/readDoc";
import UserStatsModal from "../components/2_Competition/UserStats/UserStatsModal";
import buildEffectiveStatsUser from "../components/2_Competition/UserStats/effectiveStatsUser";
import isThisUser from "../helper/isThisUser";
import theme from "../theme/mfpDark";
import { onHexagonUpdate } from "../utils/hexagonEvents";
import { subscribeUserData } from "../utils/userDataEvents";

/**
 * Full-screen stats for any user, opened from "View Stats" on a profile.
 * Route params: { user } - only `uid` is required. For another user, pass whatever their
 * profile has already loaded so the screen can render straight away.
 */
export default function UserStatsScreen({ navigation, route }) {
    const routeUser = route?.params?.user || null;
    const isSelf = isThisUser(routeUser);

    // Own stats follow the live user record.
    const [selfData, setSelfData] = useState(() => (isSelf ? global?.userData || null : null));
    useEffect(() => {
        if (!isSelf) return undefined;
        return subscribeUserData((next) => setSelfData(next || null));
    }, [isSelf]);

    // Another user's stats start from the record passed in and are refreshed from their public
    // profile, so the screen is complete even if it was opened before that profile had loaded.
    const [publicData, setPublicData] = useState(null);
    const otherUid = !isSelf && routeUser?.uid ? String(routeUser.uid) : "";
    useEffect(() => {
        if (!otherUid) return undefined;
        let active = true;
        readDoc("usersPublic", otherUid)
            .then((data) => { if (active && data) setPublicData(data); })
            .catch(() => {});
        return () => { active = false; };
    }, [otherUid]);

    // Remount own stats when the hexagon is recalculated elsewhere, as the bottom sheet does.
    const [hexagonTick, setHexagonTick] = useState(0);
    useEffect(() => {
        if (!isSelf) return undefined;
        const off = onHexagonUpdate(() => setHexagonTick((t) => t + 1));
        return () => off && off();
    }, [isSelf]);

    const user = useMemo(
        () => buildEffectiveStatsUser(
            isSelf ? selfData || routeUser : routeUser && { ...routeUser, ...(publicData || {}) }
        ),
        [isSelf, selfData, routeUser, publicData, hexagonTick]
    );

    const goBack = useCallback(() => navigation.goBack(), [navigation]);

    // While an exercise's detail is open, a back swipe should close that detail (it has its own
    // gesture) rather than pop the whole screen.
    const handleDetailActiveChange = useCallback(
        (active) => navigation.setOptions({ gestureEnabled: !active }),
        [navigation]
    );

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            {user ? (
                <UserStatsModal
                    key={hexagonTick}
                    user={user}
                    navigation={navigation}
                    toViewProfile={goBack}
                    onBack={goBack}
                    onDetailActiveChange={handleDetailActiveChange}
                />
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: theme.bg,
    },
});
