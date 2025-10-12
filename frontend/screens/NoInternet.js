import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import scaleSize, { ts } from '../helper/scaleSize';
import theme from '../theme/mfpDark';

const capitalize = (input) => {
    if (!input) return '';
    return input.charAt(0).toUpperCase() + input.slice(1);
};

const formatNetworkType = (type) => {
    if (!type || typeof type !== 'string') return null;
    const readable = type.replace(/_/g, ' ').toLowerCase();
    return capitalize(readable);
};

const formatLastChecked = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function NoInternet({ onRetry, style, networkType, lastChecked }) {
    const connectionLabel = useMemo(() => formatNetworkType(networkType), [networkType]);
    const lastCheckedLabel = useMemo(() => formatLastChecked(lastChecked), [lastChecked]);

    return (
        <SafeAreaView style={[styles.root, style]}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name="cloud-offline-outline" size={scaleSize(48)} color={theme.primary} />
                </View>
                <Text style={styles.title}>You're offline</Text>
                <Text style={styles.subtitle}>We couldn't reach the internet. Check your connection and try again.</Text>
            </View>
        </SafeAreaView>
    );
}

NoInternet.defaultProps = {
    onRetry: () => { },
    style: null,
    networkType: null,
    lastChecked: null,
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' },
    content: { paddingHorizontal: scaleSize(32), alignItems: 'center', maxWidth: scaleSize(320) },
    iconCircle: {
        width: scaleSize(88),
        height: scaleSize(88),
        borderRadius: scaleSize(44),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.primaryDeep,
        marginBottom: scaleSize(20),
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(22),
        color: theme.textPrimary,
        textAlign: 'center',
        marginBottom: scaleSize(12),
    },
    subtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(15),
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: ts(20),
    },
    metaText: {
        marginTop: scaleSize(14),
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.muted,
        textAlign: 'center',
    },
    actionButton: {
        marginTop: scaleSize(24),
        paddingHorizontal: scaleSize(32),
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(14),
        backgroundColor: theme.primary,
    },
    actionLabel: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(15),
        color: '#0B111D',
    },
});
