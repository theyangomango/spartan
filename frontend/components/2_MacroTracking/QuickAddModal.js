import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, Pressable, Keyboard } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

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

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
                <Pressable style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Quick Add</Text>

                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Greek Yogurt"
                        placeholderTextColor="#aaa"
                        style={styles.inputField}
                    />

                    <Text style={styles.inputLabel}>Brand (optional)</Text>
                    <TextInput
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="e.g., Custom"
                        placeholderTextColor="#aaa"
                        style={styles.inputField}
                    />

                    <View style={styles.row2}>
                        <View style={styles.col}>
                            <Text style={styles.inputLabel}>Calories</Text>
                            <TextInput
                                value={calories}
                                onChangeText={setCalories}
                                placeholder="kcal"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.inputLabel}>Protein</Text>
                            <TextInput
                                value={protein}
                                onChangeText={setProtein}
                                placeholder="g"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.row2}>
                        <View style={styles.col}>
                            <Text style={styles.inputLabel}>Carbs</Text>
                            <TextInput
                                value={carbs}
                                onChangeText={setCarbs}
                                placeholder="g"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.inputLabel}>Fat</Text>
                            <TextInput
                                value={fat}
                                onChangeText={setFat}
                                placeholder="g"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 6 }]}>Portion</Text>
                    <View style={styles.quickRow}>
                        {['1/4', '1/3', '1/2', '2/3', '3/4', '1'].map((v) => (
                            <RNBounceable key={v} style={[styles.chip, portion === v && styles.chipActive]} onPress={() => quickSet(v)}>
                                <Text style={[styles.chipText, portion === v && styles.chipTextActive]}>{v}</Text>
                            </RNBounceable>
                        ))}
                    </View>
                    <View style={styles.customRow}>
                        <Text style={styles.customLabel}>Custom</Text>
                        <TextInput
                            value={portion}
                            onChangeText={setPortion}
                            placeholder="e.g. 0.5 or 1/3"
                            placeholderTextColor="#aaa"
                            style={styles.customInput}
                            keyboardType="decimal-pad"
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
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
        modalCard: { width: '86%', backgroundColor: '#fff', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16 },
        modalTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#111', marginBottom: 12 },
        inputLabel: { fontFamily: 'Outfit_600SemiBold', color: '#333', marginBottom: 6, marginTop: 4, fontSize: 12.5 },
        inputField: { backgroundColor: '#f6f6f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Outfit_500Medium', color: '#111', marginBottom: 10 },
        row2: { flexDirection: 'row', gap: 10 },
        col: { flex: 1 },
        quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
        chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#f1f4f7' },
        chipActive: { backgroundColor: '#dbeafe' },
        chipText: { fontFamily: 'Outfit_500Medium', color: '#333' },
        chipTextActive: { color: '#1d4ed8' },
        customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
        customLabel: { fontFamily: 'Outfit_500Medium', color: '#555' },
        customInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f6f6f6', fontFamily: 'Outfit_500Medium', color: '#111' },
        modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
        modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
        cancelBtn: { backgroundColor: '#efefef' },
        confirmBtn: { backgroundColor: '#55A8FF' },
        modalBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
        cancelBtnText: { color: '#333' },
        confirmBtnText: { color: '#fff' },
    });

