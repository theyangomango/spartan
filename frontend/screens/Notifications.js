import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { SafeAreaView } from 'react-native-safe-area-context';

import NotificationsModal, { NOTIFICATION_FILTERS } from '../components/1_Feed/Notifications/NotificationsModal';
import theme from '../theme/mfpDark';
import scaleSize, { ts } from '../helper/scaleSize';
import resetNewNotifications from '../helper/resetNewNotifications';
import {
    markAllNotificationsReadLocal,
    useNotificationsStore,
} from '../state/notificationsStore';
import { TouchableOpacity } from 'react-native';

export default function Notifications({ navigation }) {
    const [selectedFilter, setSelectedFilter] = useState(NOTIFICATION_FILTERS[0]);
    const [isMenuOpen, setMenuOpen] = useState(false);

    const { newLikes, newComments } = useNotificationsStore(
        useCallback((state) => ({
            newLikes: state.newLikes,
            newComments: state.newComments,
        }), []),
    );

    const badgeByFilter = useMemo(() => ({
        Likes: newLikes,
        Comments: newComments,
    }), [newLikes, newComments]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                try {
                    const maybePromise = resetNewNotifications();
                    if (maybePromise?.catch) maybePromise.catch(() => {});
                } catch {}
                try { markAllNotificationsReadLocal(); } catch {}
            };
        }, [])
    );

    const uid = global?.userData?.uid || null;

    const handleBack = useCallback(() => {
        setMenuOpen(false);
        navigation?.goBack?.();
    }, [navigation]);

    const handleSelectFilter = useCallback((label) => {
        setSelectedFilter(label);
        setMenuOpen(false);
    }, []);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.header}>
                <RNBounceable style={styles.backBtn} onPress={handleBack}>
                    <Ionicons name="chevron-back" size={scaleSize(22)} color={theme.textPrimary} />
                </RNBounceable>
                <View style={styles.headerCenter}>
                    <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setMenuOpen((open) => !open)}
                    >
                        <Text style={styles.title}>{selectedFilter}</Text>
                        <Ionicons
                            name={isMenuOpen ? 'chevron-up' : 'chevron-down'}
                            size={scaleSize(18)}
                            color={theme.textPrimary}
                            style={{ marginLeft: scaleSize(6) }}
                        />
                    </Pressable>
                    {isMenuOpen && (
                        <View style={styles.dropdownMenu}>
                            {NOTIFICATION_FILTERS.map((label) => {
                                const count = badgeByFilter[label] || 0;
                                const isActive = selectedFilter === label;
                                return (
                                    <TouchableOpacity
                                        key={label}
                                        onPress={() => handleSelectFilter(label)}
                                        style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                                    >
                                        <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                                            {label}
                                        </Text>
                                        {count > 0 && (
                                            <View style={styles.dropdownBadge}>
                                                <Text style={styles.dropdownBadgeText}>{count}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.content}>
                <NotificationsModal uid={uid} navigation={navigation} filter={selectedFilter} />
            </View>
            {isMenuOpen && (
                <Pressable style={styles.dropdownBackdrop} onPress={() => setMenuOpen(false)} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(22),
        paddingBottom: scaleSize(6),
        paddingTop: scaleSize(10),
        zIndex: 1200,
        elevation: 12,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'flex-end',
        position: 'relative',
        overflow: 'visible',
        zIndex: 50,
    },
    backBtn: {
        height: scaleSize(36),
        width: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(14),
        textAlign: 'right',
    },
    headerSpacer: {
        width: scaleSize(36),
        height: scaleSize(36),
    },
    content: {
        flex: 1,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(6),
        paddingVertical: scaleSize(4),
        alignSelf: 'flex-end',
    },
    dropdownMenu: {
        position: 'absolute',
        top: scaleSize(30),
        right: 0,
        minWidth: scaleSize(120),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(16),
        paddingVertical: scaleSize(6),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        shadowColor: '#000000',
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 8,
        zIndex: 2000,
    },
    dropdownItem: {
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownItemActive: {
        backgroundColor: 'rgba(148,163,184,0.12)',
    },
    dropdownItemText: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
    },
    dropdownItemTextActive: {
        color: theme.textPrimary,
    },
    dropdownBadge: {
        minWidth: scaleSize(22),
        paddingHorizontal: scaleSize(6),
        paddingVertical: scaleSize(2),
        borderRadius: scaleSize(10),
        backgroundColor: theme.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownBadgeText: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(12),
    },
    dropdownBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 900,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
});
