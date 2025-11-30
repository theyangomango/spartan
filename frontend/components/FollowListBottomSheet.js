import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import FastImage from 'react-native-fast-image';
import theme from '../theme/mfpDark';
import { usePfp } from '../helper/usePFPs';
import isThisUser from '../helper/isThisUser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strong as hapticStrong } from '../utils/haptics';
import { resolvePhotoURL } from '../utils/profilePhoto';

import scaleSize from "../helper/scaleSize";
import VerifiedHandle from "./common/VerifiedHandle";
import useUserVerified from "../hooks/useUserVerified";
import { RANK_TIER_THEMES } from "./1_Feed/FeedSnapshotCard";

const { height: SCREEN_H } = Dimensions.get('window');
const scale = SCREEN_H / 844;
const s = (v) => Math.round(v * scale);

// Normalize possibly mixed user ref shapes into a friendly display object
function normalizeUser(u) {
    if (!u) return null;
    if (typeof u === 'string') return { uid: String(u) };
    const resolved = resolvePhotoURL(u, u?.pfp || u?.image || u?.photoURL || '');
    return {
        uid: String(u?.uid || u?.id || ''),
        handle: u?.handle || u?.username || '',
        name: u?.name || u?.displayName || '',
        pfp: resolved,
        photoURL: resolved,
        image: resolved,
        pfpVersion: u?.pfpVersion || u?.pfpVer || 0,
        isVerified: Boolean(u?.isVerified ?? u?.verified ?? false),
    };
}

export default function FollowListBottomSheet({ isVisible, setIsVisible, title = 'Followers', users = [], navigation }) {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ['100%'], []);
    const [list, setList] = useState([]);
    const insets = useSafeAreaInsets();
    const emptyMessage = useMemo(() => {
        const normalizedTitle = String(title || '').toLowerCase();
        if (normalizedTitle.includes('like')) return 'No likes yet';
        if (normalizedTitle.includes('follower')) return 'No followers yet';
        if (normalizedTitle.includes('following')) return "You're not following anyone yet";
        return 'Nothing here yet';
    }, [title]);

    // Build derived list; rely on embedded refs (normalized on write). Avoid extra reads here.
    useEffect(() => {
        const base = (Array.isArray(users) ? users : []).map(normalizeUser).filter(Boolean);
        setList(base);
    }, [JSON.stringify(users)]);

  // Respond to visibility changes (auto-expand to configured snap point)
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex?.(0));
    } else {
      bottomSheetRef.current?.close?.();
    }
  }, [isVisible]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.45}
                style={[props.style, styles.backdrop, { top: -insets.top, bottom: -Math.max(0, insets.bottom) }]}
            />
        ),
        [insets.bottom, insets.top],
    );

    const onPressUser = (u) => {
        if (!u?.uid) return;
        try {
            hapticStrong();
            const navigatingToSelf = isThisUser(u.uid);
            const rootNav = navigation?.getParent?.('ROOT');
            if (navigatingToSelf) {
                if (rootNav?.navigate) rootNav.navigate('Profile');
                else navigation.navigate('Profile');
            } else {
                if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: u });
                else navigation.navigate('ViewProfile', { user: u });
            }

            if (navigatingToSelf) {
                setTimeout(() => setIsVisible(false), 0);
            }
        } catch { }
    };

    const keyExtractor = (item) => String(item.uid || Math.random());

    const FollowRow = ({ item }) => {
        const fallbackPfp = resolvePhotoURL(item, item?.pfp || '');
        const pfpUri = usePfp(String(item?.uid || ''), item?.pfpVersion || 0, fallbackPfp) || fallbackPfp;
        const isVerified = useUserVerified(item?.uid, Boolean(item?.isVerified));
        const rankTierKey = useMemo(() => {
            const candidates = [
                item?.rankTier,
                item?.currentRank?.tier,
                item?.currentRank?.rankTier,
                item?.rank?.tier,
                item?.rank?.rankTier,
            ];
            for (const val of candidates) {
                if (typeof val === "string" && val.trim()) return val.trim().toLowerCase();
            }
            return null;
        }, [item?.currentRank?.rankTier, item?.currentRank?.tier, item?.rank?.rankTier, item?.rank?.tier, item?.rankTier]);

        const rankTheme = useMemo(() => {
            const key = rankTierKey || "gold";
            return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.gold;
        }, [rankTierKey]);

        const handleColor = useMemo(() => {
            const bronzeAccent =
                rankTierKey === "bronze"
                    ? (Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : "#b94f1f")
                    : null;
            const candidates = [
                bronzeAccent,
                Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : null,
                Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[2] : null,
                rankTheme?.borderColor,
                rankTheme?.titleSecondaryColor,
            ];
            for (const c of candidates) {
                if (typeof c === "string" && c.trim()) return c;
            }
            return theme.textPrimary;
        }, [rankTierKey, rankTheme]);

        return (
            <Pressable style={styles.item} onPress={() => onPressUser(item)}>
                <View style={styles.pfpC}>
                    {pfpUri ? (
                        <FastImage source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }} style={styles.pfp} />
                    ) : (
                        <View style={[styles.pfp, { backgroundColor: theme.surface }]} />
                    )}
                </View>
                <View style={styles.textC}>
                    <VerifiedHandle
                        handle={item?.handle || item?.uid}
                        isVerified={isVerified}
                        textStyle={[styles.handle, { color: handleColor }]}
                        iconSize={scaleSize(13.5)}
                        numberOfLines={1}
                        containerStyle={styles.handleRow}
                    />
                    {!!item?.name && <Text numberOfLines={1} style={styles.name}>{item.name}</Text>}
                </View>
            </Pressable>
        );
    };

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{emptyMessage}</Text>
        </View>
    ), [emptyMessage]);

    return (
        <View pointerEvents="box-none" style={styles.wrapper}>
            <BottomSheet
                ref={bottomSheetRef}
                index={isVisible ? 0 : -1}
                snapPoints={snapPoints}
                handleStyle={styles.handle}
                handleIndicatorStyle={styles.handleIndicator}
                backgroundStyle={styles.sheetBackground}
                backdropComponent={renderBackdrop}
                enablePanDownToClose
                onClose={() => setIsVisible(false)}
                detached
                style={styles.sheet}
                topInset={insets.top}
                bottomInset={0}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                </View>
                <FlatList
                    data={list}
                    keyExtractor={keyExtractor}
                    renderItem={({ item }) => <FollowRow item={item} />}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                />
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1400,
        elevation: 50,
    },
    sheet: {
        marginTop: scaleSize(12),
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
        overflow: 'hidden',
    },
    sheetBackground: {
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
    },
    handle: {
        paddingVertical: scaleSize(12),
    },
    handleIndicator: {
        width: scaleSize(36),
        height: scaleSize(4),
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        borderRadius: scaleSize(2),
    },
    header: {
        paddingTop: scaleSize(18),
        paddingHorizontal: scaleSize(20),
        paddingBottom: scaleSize(6),
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        lineHeight: scaleSize(18),
        color: theme.textPrimary,
        letterSpacing: 0.3,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(8),
    },
    listContent: {
        paddingBottom: scaleSize(18),
        paddingTop: scaleSize(6),
        flexGrow: 1,
    },
    pfpC: {
        width: scaleSize(40),
        height: scaleSize(40),
        borderRadius: scaleSize(20),
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: theme.surface,
    },
    pfp: { width: '100%', height: '100%', borderRadius: scaleSize(20) },
    textC: { marginLeft: scaleSize(12), flex: 1 },
    handleRow: { flexShrink: 1, maxWidth: '100%' },
    handle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(12),
        color: theme.textPrimary,
        letterSpacing: 0.2,
    },
    name: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        marginTop: scaleSize(2),
    },
    // start divider aligned with item horizontal padding so it begins left of the pfp
    sep: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginLeft: scaleSize(64),
        marginRight: scaleSize(14),
    },
    backdrop: {
        left: 0,
        right: 0,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
        paddingTop: scaleSize(40),
    },
    emptyStateText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(14),
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
});
