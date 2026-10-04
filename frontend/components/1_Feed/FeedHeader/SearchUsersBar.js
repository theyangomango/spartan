// Left side of the feed header: the search button (opens the SearchUsers screen) and the workout-calendar button.
import React, { useCallback, useMemo } from "react";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { withStrongPress } from "../../../utils/haptics";
import { coerceUid, ensureUidArray } from "../../../utils/userRefs";
import useSuggestedUsersList from "../../../hooks/useSuggestedUsersList";
import styles, { dynamicStyles } from "../FeedHeader.styles";

const SearchUsersBar = ({ navigation, allUsersRef, onOpenCalendar }) => {
    const { suggestedUsers: curatedSuggestedUsers } = useSuggestedUsersList();

    const curatedSuggestions = useMemo(() => {
        const blockedBySet = new Set(ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy));
        const viewerUid = coerceUid(global?.userData);
        const list = Array.isArray(curatedSuggestedUsers) ? curatedSuggestedUsers : [];
        const seen = new Set();
        const out = [];
        for (const entry of list) {
            const uid = coerceUid(entry);
            if (!uid || uid === viewerUid || blockedBySet.has(uid) || seen.has(uid)) continue;
            seen.add(uid);
            out.push(entry);
            if (out.length >= 10) break;
        }
        return out;
    }, [curatedSuggestedUsers]);

    const fallbackSuggestions = useMemo(() => {
        const blockedBySet = new Set(ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy));
        const viewerUid = coerceUid(global?.userData);
        const source = Array.isArray(allUsersRef?.current) ? allUsersRef.current : [];
        const seen = new Set();
        const out = [];
        for (const entry of source) {
            const uid = coerceUid(entry);
            if (!uid || uid === viewerUid || blockedBySet.has(uid) || seen.has(uid)) continue;
            seen.add(uid);
            out.push(entry);
            if (out.length >= 10) break;
        }
        return out;
    }, []);

    const suggestions = curatedSuggestions.length ? curatedSuggestions : fallbackSuggestions;

    const open = useCallback(() => {
        const initialSuggestions = Array.isArray(suggestions) ? suggestions.slice(0, 50) : [];
        const initialUsers = Array.isArray(allUsersRef?.current) ? allUsersRef.current.slice(0) : [];
        try {
            const startTime = Date.now();
            navigation?.navigate?.('SearchUsers', {
                transition: 'fade',
                initialSuggestions,
                initialUsers,
                startedAt: startTime,
            });
        } catch { }
    }, [navigation, suggestions, allUsersRef]);

    return (
        <>
            <RNBounceable onPress={withStrongPress(open)} bounceEffectIn={0.5} style={styles.searchIconBtn} accessibilityLabel="Search users">
                <Ionicons name="search" size={dynamicStyles.iconSize} color="#CBD5E1" />
            </RNBounceable>
            <RNBounceable
                onPress={onOpenCalendar ? withStrongPress(onOpenCalendar) : undefined}
                style={styles.feedFlameButton}
                accessibilityLabel="View workout calendar"
                accessibilityRole="button"
                disabled={!onOpenCalendar}
            >
                <FontAwesome6 name="fire-flame-curved" size={dynamicStyles.iconSize} color="#f97316" style={styles.feedFlameIcon} />
            </RNBounceable>
        </>
    );
};

export default SearchUsersBar;
