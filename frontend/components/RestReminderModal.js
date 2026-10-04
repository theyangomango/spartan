// Global "Rest Complete" reminder dialog; App mounts it and owns its state.
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { rs, ts } from '../helper/scaleSize';
import theme from '../theme/mfpDark';

export default function RestReminderModal({ visible, onDismiss, onOpen }) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <Pressable style={restStyles.overlay} onPress={onDismiss}>
                <View style={restStyles.card}>
                    <View style={restStyles.iconRow}>
                        <View style={restStyles.iconCircle}><Ionicons name="timer-outline" size={rs(26)} color={theme.accentBlue} /></View>
                    </View>
                    <Text style={restStyles.title}>Rest Complete</Text>
                    <Text style={restStyles.body}>Time to crush your next set 🥱</Text>
                    <View style={restStyles.row}>
                        <Pressable style={[restStyles.btn, restStyles.secondary]} onPress={onDismiss}>
                            <Ionicons name="close" size={rs(16)} color={theme.textPrimary} style={{ marginRight: rs(6) }} />
                            <Text style={[restStyles.btnText, restStyles.secondaryText]}>Dismiss</Text>
                        </Pressable>
                        <Pressable style={[restStyles.btn, restStyles.primary]} onPress={onOpen}>
                            <MaterialCommunityIcons name="arm-flex" size={rs(18)} color="#fff" style={{ marginRight: rs(6) }} />
                            <Text style={[restStyles.btnText, restStyles.primaryText]}>Open</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const restStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: rs(18),
    },
    card: {
        width: '90%',
        maxWidth: 380,
        backgroundColor: theme.surface,
        borderRadius: rs(18),
        paddingVertical: rs(16),
        paddingHorizontal: rs(16),
        alignItems: 'center',
        // Softer shadow on dark surfaces
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: rs(14), shadowOffset: { width: 0, height: rs(8) } },
            android: { elevation: 8 },
            default: {},
        }),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    iconRow: { marginBottom: rs(8) },
    iconCircle: {
        width: rs(46),
        height: rs(46),
        borderRadius: rs(23),
        backgroundColor: 'rgba(45,158,255,0.12)', // theme.primary @ 12%
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(45,158,255,0.45)',
    },
    title: { fontFamily: 'Outfit_800ExtraBold', fontSize: ts(18), color: theme.textPrimary, marginTop: rs(10) },
    body: { marginTop: rs(6), fontFamily: 'Outfit_600SemiBold', fontSize: ts(13), color: theme.textSecondary, textAlign: 'center' },
    row: { flexDirection: 'row', marginTop: rs(16), width: '100%', gap: rs(8) },
    btn: { flex: 1, paddingVertical: rs(11), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    primary: {
        backgroundColor: theme.primary,
        ...Platform.select({ ios: { shadowColor: theme.primary, shadowOpacity: 0.28, shadowRadius: rs(10), shadowOffset: { width: 0, height: rs(4) } }, android: { elevation: 3 }, default: {} }),
    },
    primaryText: { color: '#fff' },
    secondary: { backgroundColor: theme.field, borderWidth: 1, borderColor: theme.hairline },
    secondaryText: { color: theme.textPrimary },
    btnText: { fontFamily: 'Outfit_700Bold', fontSize: ts(14) },
});
