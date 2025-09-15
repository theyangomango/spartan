import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';

export default function TermsOfService({ navigation }) {
  const goBack = () => navigation.goBack();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: scaleSize(40) }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>Effective: [Month Day, Year] — By using Spartan you agree to these Terms.</Text>

        <Text style={styles.h}>Eligibility & Account</Text>
        <Text style={styles.p}>You must be at least 13. Keep your credentials secure; you are responsible for activity on your account.</Text>

        <Text style={styles.h}>License</Text>
        <Text style={styles.p}>We grant a personal, non‑exclusive, non‑transferable, revocable license to use the app for personal use.</Text>

        <Text style={styles.h}>User Content</Text>
        <Text style={styles.p}>You own your content. You grant Spartan a license to host and display it to operate the service. Do not post illegal, infringing, or harmful content.</Text>

        <Text style={styles.h}>Acceptable Use</Text>
        <Text style={styles.p}>No harassment, impersonation, reverse engineering, or malicious code. Respect IP rights.</Text>

        <Text style={styles.h}>Health Disclaimer</Text>
        <Text style={styles.p}>Spartan provides general fitness tracking and is not medical advice. Consult a physician.</Text>

        <Text style={styles.h}>Privacy</Text>
        <Text style={styles.p}>See our Privacy Policy for how we collect and use data.</Text>

        <Text style={styles.h}>Purchases</Text>
        <Text style={styles.p}>Digital purchases (if any) are handled by Apple/Google under their terms. Taxes may apply.</Text>

        <Text style={styles.h}>Termination</Text>
        <Text style={styles.p}>You may delete your account at any time. We may suspend or terminate for violations.</Text>

        <Text style={styles.h}>Disclaimers & Liability</Text>
        <Text style={styles.p}>Provided “as is” without warranties. To the fullest extent permitted by law we limit liability for indirect or consequential damages.</Text>

        <Text style={styles.h}>Governing Law</Text>
        <Text style={styles.p}>Governed by the laws of [State/Country]. Venue: courts in [Jurisdiction].</Text>

        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>[Company Legal Name] — [Contact Email]</Text>
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
});
