import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy({ navigation }) {
  const goBack = () => navigation.goBack();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>
          Effective: [Month Day, Year]{'\n'}Owner: [Company Legal Name] ("Spartan", "we"){'\n'}Contact: [Contact Email]
        </Text>

        <Text style={styles.h}>Purpose</Text>
        <Text style={styles.p}>Spartan helps users log workouts, track progress, and interact with friends.</Text>

        <Text style={styles.h}>Data We Collect</Text>
        <Text style={styles.li}>• Account Data: name, username, email/phone, profile photo.</Text>
        <Text style={styles.li}>• User Content: posts, comments, workout logs, photos you upload.</Text>
        <Text style={styles.li}>• Device/Usage: app version, device type, diagnostics/crash logs.</Text>
        <Text style={styles.li}>• Notifications: push settings and token.</Text>
        <Text style={styles.li}>• Optional: camera/photos access for uploads.</Text>

        <Text style={styles.h}>How We Use Data</Text>
        <Text style={styles.p}>To provide the app, personalize content, send service messages, maintain safety, improve the app (analytics), and comply with law.</Text>

        <Text style={styles.h}>Sharing</Text>
        <Text style={styles.p}>We use service providers (e.g., Firebase/Google Cloud, image/CDN, build/distribution). We do not sell your data.</Text>

        <Text style={styles.h}>Your Choices & Rights</Text>
        <Text style={styles.p}>Edit your profile in app. Delete your account in Settings → Account → Delete Account. Request access/erasure at [Contact Email].</Text>

        <Text style={styles.h}>Retention</Text>
        <Text style={styles.p}>Account data persists while active. You can delete content or your account. Diagnostics typically 12–24 months.</Text>

        <Text style={styles.h}>Security</Text>
        <Text style={styles.p}>We use reasonable safeguards (encryption in transit, role‑based access) but no method is 100% secure.</Text>

        <Text style={styles.h}>International Transfers</Text>
        <Text style={styles.p}>Data may be processed in the U.S. or other countries with appropriate safeguards.</Text>

        <Text style={styles.h}>Children</Text>
        <Text style={styles.p}>Not directed to children under 13. If collected in error, we will delete it.</Text>

        <Text style={styles.h}>Changes</Text>
        <Text style={styles.p}>We may update this policy and will notify you of material changes.</Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  iconBtn: { padding: 6, width: 40 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#111827' },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 },
  h: { marginTop: 12, marginBottom: 6, fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#111827' },
  p: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#334155', lineHeight: 20 },
  li: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#334155', lineHeight: 20, marginLeft: 6 },
});

