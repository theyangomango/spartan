import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';

export default function PrivacyPolicy({ navigation }) {
  const goBack = () => navigation.goBack();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: scaleSize(40) }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>Last updated: September 16, 2025</Text>
        <Text style={styles.p}>Spartan ("Spartan," "we," "us") provides an iOS fitness and nutrition app. This policy explains how we collect, use, and share information.</Text>

        <Text style={styles.h}>Owner and Contact</Text>
        <Text style={styles.p}>Owner/Operator: Yiming Bai (operating Spartan){'\n'}Email: yangbai@thespartan.app{'\n'}Governing Law: Texas (venue: Collin County, TX){'\n'}Minimum Age: 13+ (parent/guardian consent if under age of majority)</Text>

        <Text style={styles.h}>Information We Collect</Text>
        <Text style={styles.li}>• Personal identifiers: name, username, email, phone.</Text>
        <Text style={styles.li}>• Account credentials: password (hashed and salted; never stored in plain text).</Text>
        <Text style={styles.li}>• Health and nutrition data you enter: weight, height, foods consumed, macros and related metrics.</Text>
        <Text style={styles.li}>• Content: posts, comments, images, videos.</Text>
        <Text style={styles.li}>• Messaging: direct messages between users.</Text>
        <Text style={styles.li}>• Usage and device data: app version, device/OS, basic analytics events via Firebase Analytics.</Text>
        <Text style={styles.li}>• Third‑party data: nutrition database and content from FatSecret used to power search and nutrition features.</Text>
        <Text style={styles.p}>We do not use HealthKit, location, or contacts. iOS only. No payments are processed in‑app.</Text>

        <Text style={styles.h}>How We Use Information</Text>
        <Text style={styles.li}>• Provide and operate features (workouts, macro tracking, posts, messaging, leaderboards, followers).</Text>
        <Text style={styles.li}>• Personalize your experience and show content from accounts you follow.</Text>
        <Text style={styles.li}>• Send push notifications for reminders and transactional communications (controllable in iOS settings).</Text>
        <Text style={styles.li}>• Maintain and improve performance, reliability, and security (including analytics).</Text>
        <Text style={styles.li}>• Prevent fraud/abuse and comply with legal obligations.</Text>

        <Text style={styles.h}>Legal Bases (EU/UK)</Text>
        <Text style={styles.li}>• Contract: to provide the Service you request.</Text>
        <Text style={styles.li}>• Legitimate interests: to secure, maintain, and improve the Service.</Text>
        <Text style={styles.li}>• Consent: for Health Data you choose to enter and for optional push notifications. Withdraw any time via device settings or by contacting us.</Text>

        <Text style={styles.h}>How We Share Information</Text>
        <Text style={styles.p}>We do not sell your personal information and we do not share it for cross‑context behavioral advertising.</Text>
        <Text style={styles.li}>• Service providers: Google Firebase (hosting, storage, Firestore, analytics) and FatSecret (nutrition). Providers process data under contractual restrictions.</Text>
        <Text style={styles.li}>• Within the app: profiles (username, avatar) are public to other users; posts are visible to followers by default; leaderboards display usernames and scores publicly in‑app; DMs are private between participants. If end‑to‑end encryption is not enabled, messages are encrypted in transit/at rest and may be accessible for abuse handling or legal compliance; metadata may be processed for delivery and safety.</Text>
        <Text style={styles.li}>• Legal/safety: to comply with law or protect rights and safety.</Text>
        <Text style={styles.li}>• Business transfers: as part of a merger, acquisition, or asset sale.</Text>

        <Text style={styles.h}>International Transfers</Text>
        <Text style={styles.p}>Data is stored primarily in the United States (Firebase/Google Cloud). Where required, transfers rely on appropriate safeguards (e.g., Standard Contractual Clauses provided by processors).</Text>

        <Text style={styles.h}>Data Retention</Text>
        <Text style={styles.p}>We keep data while your account is active and as needed for the Service and legitimate purposes (security, backups, legal). There is no fixed deletion schedule for backups currently. On deletion request, we delete or de‑identify personal information within a reasonable period, subject to legal requirements.</Text>

        <Text style={styles.h}>Your Rights and Choices</Text>
        <Text style={styles.li}>• Access/Correction/Deletion: email yangbai@thespartan.app.</Text>
        <Text style={styles.li}>• Push notifications: manage in iOS Settings.</Text>
        <Text style={styles.li}>• EU/UK: rights to portability, restriction, objection, and to withdraw consent.</Text>
        <Text style={styles.li}>• California: access and deletion rights; we do not "sell" or "share" personal information as defined by CCPA/CPRA.</Text>

        <Text style={styles.h}>Security</Text>
        <Text style={styles.p}>We use reasonable safeguards including encryption in transit (TLS), encryption at rest by Firebase, and role‑based access. No method is 100% secure.</Text>

        <Text style={styles.h}>Not Medical or Emergency Services</Text>
        <Text style={styles.p}>Spartan is not a healthcare provider and is not a HIPAA covered entity or business associate. Do not use Spartan for emergencies; call your local emergency number if needed.</Text>

        <Text style={styles.h}>Content Accuracy</Text>
        <Text style={styles.p}>Nutrition databases and third‑party content may be inaccurate, incomplete, or outdated. Use your judgment and consult professionals where appropriate.</Text>

        <Text style={styles.h}>Children</Text>
        <Text style={styles.p}>Not for children under 13. If we learn we collected such data, we will delete it.</Text>

        <Text style={styles.h}>Changes</Text>
        <Text style={styles.p}>We may update this policy. If material changes occur, we will update the date and provide appropriate notice in‑app. Continued use means you accept the changes.</Text>

        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>Email: yangbai@thespartan.app</Text>

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
});
