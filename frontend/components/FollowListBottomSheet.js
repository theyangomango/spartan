import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import FastImage from 'react-native-fast-image';
import theme from '../theme/mfpDark';
import { usePfp } from '../helper/usePFPs';
import isThisUser from '../helper/isThisUser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const snapPoints = useMemo(() => ['82%'], []);
    const [list, setList] = useState([]);
    const insets = useSafeAreaInsets();

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
        marginTop: scaleSize(s(12)),
        borderTopLeftRadius: scaleSize(s(26)),
        borderTopRightRadius: scaleSize(s(26)),
        overflow: 'hidden',
    },
    sheetBackground: {
        backgroundColor: 'rgba(18, 21, 30, 0.96)',
        borderTopLeftRadius: scaleSize(s(26)),
        borderTopRightRadius: scaleSize(s(26)),
    },
    handle: {
        paddingVertical: scaleSize(s(12)),
    },
    handleIndicator: {
        width: scaleSize(s(36)),
        height: scaleSize(s(4)),
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: scaleSize(s(2)),
    },
    header: {
        paddingTop: scaleSize(s(18)),
        paddingHorizontal: scaleSize(s(20)),
        paddingBottom: scaleSize(s(6)),
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(s(14)),
        lineHeight: scaleSize(s(18)),
        color: theme.textPrimary,
        letterSpacing: 0.3,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(s(12)),
        paddingVertical: scaleSize(s(8)),
    },
    listContent: {
        paddingBottom: scaleSize(s(18)),
        paddingTop: scaleSize(s(6)),
    },
    pfpC: {
        width: scaleSize(s(36)),
        height: scaleSize(s(36)),
        borderRadius: scaleSize(s(18)),
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: theme.surface,
    },
    pfp: { width: '100%', height: '100%', borderRadius: scaleSize(s(18)) },
    textC: { marginLeft: scaleSize(s(12)), flex: 1 },
    handle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(s(13.5)),
        color: theme.textPrimary,
        letterSpacing: 0.2,
    },
    name: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(s(13)),
        color: theme.textSecondary,
        marginTop: scaleSize(s(2)),
    },
    // start divider aligned with item horizontal padding so it begins left of the pfp
    sep: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginLeft: scaleSize(s(60)),
        marginRight: scaleSize(s(14)),
    },
    backdrop: {
        left: 0,
        right: 0,
    },
});
