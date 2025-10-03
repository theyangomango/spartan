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
                    <Text style={styles.bold}>Rithvik Punati</Text> — Thank you for being my best friend and always staying real throughout these years.
                    You inspired me to work out, improve myself, and chase my ambitions
                    - I would have gave up on Spartan a long time ago if it wasn't for your support.
                    {'\n'}
                </Text>

                <Text style={styles.p}>
                    <Text style={styles.bold}>Dai Nakagawa</Text> — Thank you for all the times you've sat down with me and helped out in Spartan's design.
                    Those conversations shaped so much of the app, and
                    your feedback is more valuable than some of the best UI/UX designers on the planet
                    - Spartan's UI would look atrocious if it wasn't for you.
                    {'\n'}
                </Text>


                <Text style={styles.p}>
                    <Text style={styles.bold}>FatSecret Team</Text> — Thanks for powering macro tracking and approving usage of your barcode scanning API.
                    I'm so grateful that you gave Spartan's vision a chance.
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
    p: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: ts(20) },
    li: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: ts(20), marginLeft: scaleSize(6) },
    bold: { fontFamily: 'Outfit_700Bold' },
});
