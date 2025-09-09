import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, Pressable } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function PortionPickerModal({ visible, onCancel, onConfirm, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const [input, setInput] = useState('1');

    useEffect(() => {
        if (visible) setInput('1');
    }, [visible]);

    const parsePortion = (s) => {
        const t = String(s || '').trim();
        if (!t) return 1;
        if (t.includes('/')) {
            const [a, b] = t.split('/').map((x) => parseFloat(x));
            const v = (a && b) ? (a / b) : NaN;
            return Number.isFinite(v) && v > 0 ? v : 1;
        }
        const v = parseFloat(t);
        return Number.isFinite(v) && v > 0 ? v : 1;
    };

    const quickSet = (v) => setInput(v);
    const confirm = () => onConfirm?.(parsePortion(input));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>How much did you eat?</Text>

                    <View style={styles.quickRow}>
                        {['1/4', '1/3', '1/2', '2/3', '3/4', '1'].map((v) => (
                            <RNBounceable key={v} style={[styles.chip, input === v && styles.chipActive]} onPress={() => quickSet(v)}>
                                <Text style={[styles.chipText, input === v && styles.chipTextActive]}>{v}</Text>
                            </RNBounceable>
                        ))}
                    </View>

                    <View style={styles.customRow}>
                        <Text style={styles.customLabel}>Custom</Text>
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="e.g. 0.4 or 1/3"
                            placeholderTextColor="#aaa"
                            style={styles.customInput}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.modalButtons}>
                        <RNBounceable style={[styles.modalBtn, styles.cancelBtn]} onPress={onCancel}>
                            <Text style={[styles.modalBtnText, styles.cancelBtnText]}>Cancel</Text>
                        </RNBounceable>
                        <RNBounceable style={[styles.modalBtn, styles.confirmBtn]} onPress={confirm}>
                            <Text style={[styles.modalBtnText, styles.confirmBtnText]}>Confirm</Text>
                        </RNBounceable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
        modalCard: { width: '86%', backgroundColor: COLORS?.card || '#252733', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS?.hairline || 'rgba(255,255,255,0.08)' },
        modalTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: COLORS?.text || '#E5E7EB', marginBottom: 12 },
        quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
        chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS?.fieldBg || '#1E2128' },
        chipActive: { backgroundColor: '#2D9EFF22', borderWidth: StyleSheet.hairlineWidth, borderColor: '#2D9EFF55' },
        chipText: { fontFamily: 'Outfit_500Medium', color: COLORS?.text || '#E5E7EB' },
        chipTextActive: { color: '#7fb5ff' },
        customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
        customLabel: { fontFamily: 'Outfit_500Medium', color: COLORS?.subtext || '#A1A7B3' },
        customInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS?.fieldBg || '#1E2128', fontFamily: 'Outfit_500Medium', color: COLORS?.text || '#E5E7EB' },
        modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
        modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
        cancelBtn: { backgroundColor: COLORS?.fieldBg || '#1E2128' },
        confirmBtn: { backgroundColor: '#55A8FF' },
        modalBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
        cancelBtnText: { color: COLORS?.text || '#E5E7EB' },
        confirmBtnText: { color: '#fff' },
    });
