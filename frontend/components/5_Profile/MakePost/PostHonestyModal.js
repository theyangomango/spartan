import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../../theme/mfpDark';

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
    card: { width: '86%', backgroundColor: theme.surface, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16 },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.field, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    title: { fontFamily: 'Outfit_600SemiBold', fontSize: require('../../../helper/scaleSize').ts(16), color: theme.textPrimary },
    body: { fontFamily: 'Outfit_500Medium', fontSize: require('../../../helper/scaleSize').ts(14), color: theme.textSecondary, lineHeight: require('../../../helper/scaleSize').ts(20), marginTop: 4 },
    btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
    btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
    btnText: { fontFamily: 'Outfit_600SemiBold', fontSize: require('../../../helper/scaleSize').ts(14) },
    cancel: { backgroundColor: theme.field },
    cancelText: { color: theme.textPrimary },
    confirm: { backgroundColor: theme.primary },
    confirmText: { color: '#fff' },
});
