import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';

export default function PostHonestyModal({ visible, onConfirm, onCancel }) {
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
            <View style={styles.backdrop}>
                <Pressable style={styles.backdropTouchable} onPress={onCancel} />
                <View style={styles.card}>
                    <View style={styles.iconRow}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
                        </View>
                        <Text style={styles.title}>Keep It Honest</Text>
                    </View>
                    <Text style={styles.body}>
                        Share authentic progress. Avoid misrepresenting results or posting edited photos as unedited.
                    </Text>
                    <View style={styles.btnRow}>
                        <Pressable style={[styles.btn, styles.cancel]} onPress={onCancel}>
                            <Text style={[styles.btnText, styles.cancelText]}>Cancel</Text>
                        </Pressable>
                        <Pressable style={[styles.btn, styles.confirm]} onPress={onConfirm}>
                            <Text style={[styles.btnText, styles.confirmText]}>I Agree</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
    backdropTouchable: { ...StyleSheet.absoluteFillObject },
    card: { width: '86%', backgroundColor: theme.surface, borderRadius: scaleSize(18), paddingVertical: scaleSize(16), paddingHorizontal: scaleSize(16) },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(8) },
    iconWrap: { width: scaleSize(32), height: scaleSize(32), borderRadius: scaleSize(16), backgroundColor: theme.field, alignItems: 'center', justifyContent: 'center', marginRight: scaleSize(8) },
    title: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(16), color: theme.textPrimary },
    body: { fontFamily: 'Outfit_500Medium', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(require('../../../helper/scaleSize').ts(20)), marginTop: scaleSize(4) },
    btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: scaleSize(14), gap: scaleSize(10) },
    btn: { paddingVertical: scaleSize(10), paddingHorizontal: scaleSize(16), borderRadius: scaleSize(10) },
    btnText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(14) },
    cancel: { backgroundColor: theme.field },
    cancelText: { color: theme.textPrimary },
    confirm: { backgroundColor: theme.primary },
    confirmText: { color: '#fff' },
});
