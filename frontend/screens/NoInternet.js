import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import scaleSize, { ts } from '../helper/scaleSize';
import theme from '../theme/mfpDark';

export default function NoInternet({ style }) {
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
});
