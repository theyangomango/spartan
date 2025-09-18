import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';

export default function Credits({ navigation }) {
    const goBack = () => navigation.goBack();
    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Credits</Text>
                <View style={{ width: scaleSize(40) }} />
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.p}>
                    Spartan is founded, designed, developed, and maintained by Yang Bai.
                    {'\n'}
                </Text>

                <Text style={styles.h}>Special Thanks</Text>
                <Text style={styles.p}>
                    Rithvik Punati — Thank you for being my best friend and always staying real.
                    You inspired me to work out, improve myself, and chase my ambitions — and I would have gave up on Spartan a long time ago if it wasn't for your support. 
                    {'\n'}
                </Text>

                <Text style={styles.p}>
                    Dai Nakagawa — Thank you for helping out in Spartan's design. 
                    You're feedback was more valuable than some of the best UI/UX designers on the planet.
                    
                    you are a close friend and design partner. You created the exercise graphics across Spartan, sat with me to walk through screens, and offered clear, honest critique. You pushed for making Workout the home screen, for a full dark theme, and for the small decisions — spacing, contrast, hierarchy, iconography — that make the UI feel right. Thanks to your eye, Spartan looks and feels better throughout. Thank you.
                </Text>

                <Text style={styles.p}>I couldn’t have done this without you both.</Text>

                <Text style={styles.p}>
                    FatSecret — thanks for powering macro tracking and approving barcode scanning access. I appreciate you reviewing my application and giving this idea a shot.
                </Text>

                <View style={{ height: scaleSize(24) }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scaleSize(14), paddingTop: scaleSize(8), paddingBottom: scaleSize(6) },
    iconBtn: { padding: scaleSize(6), width: scaleSize(40) },
    title: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(18), color: theme.textPrimary },
    content: { paddingHorizontal: scaleSize(16), paddingTop: scaleSize(10), paddingBottom: scaleSize(18) },
    h: { marginTop: scaleSize(12), marginBottom: scaleSize(6), fontFamily: 'Outfit_700Bold', fontSize: scaleSize(15), color: theme.textPrimary },
    p: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(ts(20)) },
    li: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(ts(20)), marginLeft: scaleSize(6) },
});
