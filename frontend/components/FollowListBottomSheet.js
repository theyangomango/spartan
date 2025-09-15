import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import FastImage from 'react-native-fast-image';
import theme from '../theme/mfpDark';
import { usePfp } from '../helper/usePFPs';
import isThisUser from '../helper/isThisUser';

import scaleSize from "../helper/scaleSize";

const { height: SCREEN_H } = Dimensions.get('window');
const scale = SCREEN_H / 844;
const s = (v) => Math.round(v * scale);

// Normalize possibly mixed user ref shapes into a friendly display object
function normalizeUser(u) {
    if (!u) return null;
    if (typeof u === 'string') return { uid: String(u) };
    return {
        uid: String(u?.uid || u?.id || ''),
        handle: u?.handle || u?.username || '',
        name: u?.name || u?.displayName || '',
        pfp: u?.pfp || u?.image || u?.photoURL || '',
        pfpVersion: u?.pfpVersion || u?.pfpVer || 0,
    };
}

export default function FollowListBottomSheet({ isVisible, setIsVisible, title = 'Followers', users = [], navigation }) {
    const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['93%'], []);
    const [list, setList] = useState([]);

    // Build derived list; rely on embedded refs (normalized on write). Avoid extra reads here.
    useEffect(() => {
        const base = (Array.isArray(users) ? users : []).map(normalizeUser).filter(Boolean);
        setList(base);
    }, [JSON.stringify(users)]);

  // Respond to visibility changes (auto-expand to 93%)
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex?.(0));
    } else {
      bottomSheetRef.current?.close?.();
    }
  }, [isVisible]);

    const renderBackdrop = useCallback((props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} />
    ), []);

    const onPressUser = (u) => {
        if (!u?.uid) return;
        try {
            if (isThisUser(u.uid)) {
                const rootNav = navigation?.getParent?.('ROOT');
                if (rootNav?.navigate) rootNav.navigate('Profile');
                else navigation.navigate('Profile');
            } else {
                const rootNav = navigation?.getParent?.('ROOT');
                if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: u });
                else navigation.navigate('ViewProfile', { user: u });
            }
            setTimeout(() => setIsVisible(false), 0);
        } catch { }
    };

    const keyExtractor = (item) => String(item.uid || Math.random());

    const FollowRow = ({ item }) => {
        const pfpUri = usePfp(String(item?.uid || ''), item?.pfpVersion || 0) || item?.pfp || '';
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
                    <Text numberOfLines={1} style={styles.handle}>{item?.handle || item?.uid}</Text>
                    {!!item?.name && <Text numberOfLines={1} style={styles.name}>{item.name}</Text>}
                </View>
            </Pressable>
        );
    };

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={isVisible ? 0 : -1}
            snapPoints={snapPoints}
            handleStyle={{ display: 'none' }}
            backgroundStyle={{ backgroundColor: theme.bg }}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            onClose={() => setIsVisible(false)}
            detached
            style={{ marginTop: scaleSize(s(6)) }}
        >
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
            </View>
            <FlatList
                data={list}
                keyExtractor={keyExtractor}
                renderItem={({ item }) => <FollowRow item={item} />}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                contentContainerStyle={{ paddingBottom: scaleSize(s(14)), paddingTop: scaleSize(s(18)), paddingHorizontal: scaleSize(s(16)) }}
            />
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: scaleSize(s(24)),
        paddingHorizontal: scaleSize(s(22)),
        paddingBottom: scaleSize(s(12)),
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(s(16)),
        color: theme.textPrimary,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(s(8)),
        paddingVertical: scaleSize(s(12)),
    },
    pfpC: { width: scaleSize(s(40)), height: scaleSize(s(40)), borderRadius: scaleSize(s(20)), overflow: 'hidden' },
    pfp: { width: '100%', height: '100%', borderRadius: scaleSize(s(20)) },
    textC: { marginLeft: scaleSize(s(10)), flex: 1 },
    handle: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(s(14)), color: theme.textPrimary },
    name: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(s(12.5)), color: theme.textSecondary, marginTop: scaleSize(s(2)) },
    // start divider aligned with item horizontal padding so it begins left of the pfp
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.hairline, marginHorizontal: scaleSize(s(2)) },
});
