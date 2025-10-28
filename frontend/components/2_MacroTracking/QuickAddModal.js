import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Keyboard } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import DismissableTextInput from '../common/DismissableTextInput';

export default function QuickAddModal({ visible, onClose, onSubmit, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [portion, setPortion] = useState('1');

    useEffect(() => {
        if (visible) {
            setName('');
            setBrand('');
            setCalories('');
            setProtein('');
            setCarbs('');
            setFat('');
            setPortion('1');
        }
    }, [visible]);

    const num = (s) => {
        const n = parseFloat(String(s || '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };

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

    const submit = () => {
        try { haptic(); } catch {}
        const cals = Math.max(0, num(calories));
        const prot = Math.max(0, num(protein));
        const carb = Math.max(0, num(carbs));
        const fatG = Math.max(0, num(fat));
        const factor = parsePortion(portion);
        const desc = `Calories: ${cals}, Protein: ${prot} g, Carbs: ${carb} g, Fat: ${fatG} g`;
        const item = {
            food_id: `custom-${Date.now()}`,
            food_name: name?.trim() || 'Custom item',
            brand_name: brand?.trim() || '',
            food_description: desc,
            source: 'custom',
            __portionMultiplier: factor,
        };
        onSubmit?.(item);
    };

    const quickSet = (v) => setPortion(v);
    const close = () => { Keyboard.dismiss(); onClose?.(); };
    const renderLabel = (label, required) => (
        <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>{label}</Text>
            {required ? <Text style={styles.requiredStar}>*</Text> : null}
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
                <Pressable style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Quick Add</Text>

                    {renderLabel('Name', true)}
                    <DismissableTextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Greek Yogurt"
                        placeholderTextColor="#aaa"
                        style={styles.inputField}
                        returnKeyType="done"
                    />

                    {renderLabel('Brand (optional)', false)}
                    <DismissableTextInput
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="e.g., Custom"
                        placeholderTextColor="#aaa"
                        style={styles.inputField}
                        returnKeyType="done"
                    />

                    <View style={styles.row2}>
                        <View style={styles.col}>
                            {renderLabel('Calories', true)}
                            <DismissableTextInput
                                value={calories}
                                onChangeText={setCalories}
                                placeholder="kcal"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />
                        </View>
                        <View style={styles.col}>
                            {renderLabel('Protein', false)}
                            <DismissableTextInput
                                value={protein}
                                onChangeText={setProtein}
                                placeholder="g"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />
                        </View>
                    </View>

                    <View style={styles.row2}>
                        <View style={styles.col}>
                            {renderLabel('Carbs', false)}
                            <DismissableTextInput
                                value={carbs}
                                onChangeText={setCarbs}
                                placeholder="g"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />
                        </View>
                        <View style={styles.col}>
                            {renderLabel('Fat', false)}
                            <DismissableTextInput
                                value={fat}
                                onChangeText={setFat}
                                placeholder="g"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />
                        </View>
                    </View>

                    <View style={{ marginTop: scaleSize(6) }}>
                        {renderLabel('Portion', false)}
                    </View>
                    <View style={styles.quickRow}>
                        {['1/4', '1/3', '1/2', '2/3', '3/4', '1'].map((v) => (
                            <RNBounceable key={v} style={[styles.chip, portion === v && styles.chipActive]} onPress={() => { try { haptic(); } catch {} quickSet(v); }}>
                                <Text style={[styles.chipText, portion === v && styles.chipTextActive]}>{v}</Text>
                            </RNBounceable>
                        ))}
                    </View>
                    <View style={styles.customRow}>
                        <Text style={styles.customLabel}>Custom</Text>
                        <DismissableTextInput
                            value={portion}
                            onChangeText={setPortion}
                            placeholder="e.g. 0.5 or 1/3"
                            placeholderTextColor="#aaa"
                            style={styles.customInput}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                        />
                    </View>

                    <View style={styles.modalButtons}>
                        <RNBounceable style={[styles.modalBtn, styles.cancelBtn]} onPress={close}>
                            <Text style={[styles.modalBtnText, styles.cancelBtnText]}>Cancel</Text>
                        </RNBounceable>
                        <RNBounceable style={[styles.modalBtn, styles.confirmBtn]} onPress={submit}>
                            <Text style={[styles.modalBtnText, styles.confirmBtnText]}>Add</Text>
                        </RNBounceable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        // Darker backdrop so the modal pops against the page
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' },
        // Slightly lighter modal card + stronger outline and shadow for separation
        modalCard: {
            width: '86%',
            backgroundColor: require('../../theme/mfpDark').MFP_DARK.surface, // lighter than surface
            borderRadius: scaleSize(18),
            paddingVertical: scaleSize(18),
            paddingHorizontal: scaleSize(16),
            borderWidth: scaleSize(1),
            borderColor: COLORS?.hairline || 'rgba(255,255,255,0.18)',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: scaleSize(16),
            shadowOffset: { width: 0, height: scaleSize(8) },
            elevation: 8,
        },
        modalTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(16), color: COLORS?.text || '#E5E7EB', marginBottom: scaleSize(12) },
        inputLabel: { fontFamily: 'Outfit_600SemiBold', color: COLORS?.subtext || '#A1A7B3', fontSize: scaleSize(12.5) },
        labelRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: scaleSize(6), marginTop: scaleSize(4) },
        requiredStar: { color: '#FF5F5F', fontSize: scaleSize(24), top: scaleSize(7.5), fontFamily: 'System', marginLeft: scaleSize(4), marginBottom: scaleSize(-4) },
        inputField: { backgroundColor: require('../../theme/mfpDark').MFP_DARK.fieldDeep, borderRadius: scaleSize(10), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(10), fontFamily: 'Outfit_500Medium', color: COLORS?.text || '#E5E7EB', marginBottom: scaleSize(10), fontSize: scaleSize(15) },
        row2: { flexDirection: 'row', gap: scaleSize(10) },
        col: { flex: 1 },
        quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleSize(8), marginBottom: scaleSize(12) },
        chip: { paddingVertical: scaleSize(8), paddingHorizontal: scaleSize(12), borderRadius: scaleSize(999), backgroundColor: require('../../theme/mfpDark').MFP_DARK.fieldDeep },
        chipActive: { backgroundColor: '#2D9EFF22', borderWidth: StyleSheet.hairlineWidth, borderColor: '#2D9EFF55' },
        chipText: { fontFamily: 'Outfit_500Medium', color: COLORS?.text || '#E5E7EB', fontSize: scaleSize(13) },
        chipTextActive: { color: '#7fb5ff' },
        customRow: { flexDirection: 'row', alignItems: 'center', gap: scaleSize(10), marginBottom: scaleSize(14) },
        customLabel: { fontFamily: 'Outfit_500Medium', color: COLORS?.subtext || '#A1A7B3', fontSize: scaleSize(12.5) },
        customInput: { flex: 1, paddingVertical: scaleSize(10), paddingHorizontal: scaleSize(12), borderRadius: scaleSize(10), backgroundColor: require('../../theme/mfpDark').MFP_DARK.fieldDeep, fontFamily: 'Outfit_500Medium', color: COLORS?.text || '#E5E7EB', fontSize: scaleSize(15) },
        modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: scaleSize(10) },
        modalBtn: { paddingVertical: scaleSize(10), paddingHorizontal: scaleSize(16), borderRadius: scaleSize(10) },
        cancelBtn: {backgroundColor: require('../../theme/mfpDark').MFP_DARK.fieldDeep },
        confirmBtn: { backgroundColor: '#55A8FF' },
        modalBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(14) },
        cancelBtnText: { color: COLORS?.text || '#E5E7EB' },
        confirmBtnText: { color: '#fff' },
    });
