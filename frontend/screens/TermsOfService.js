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
        <Text style={styles.p}>Last updated: September 16, 2025</Text>
        <Text style={styles.p}>These Terms govern your use of the Spartan iOS application and related services (the "Service"). By using the Service, you agree to these Terms.</Text>

        <Text style={styles.h}>Owner and Contact</Text>
        <Text style={styles.p}>Owner/Operator: Yiming Bai (operating Spartan){'\n'}Email: yangbai@thespartan.app</Text>

        <Text style={styles.h}>Governing Law and Venue</Text>
        <Text style={styles.p}>Texas law governs these Terms. You agree to the exclusive jurisdiction and venue of courts in Collin County, Texas, for disputes related to the Service.</Text>

        <Text style={styles.h}>1. Eligibility and Accounts</Text>
        <Text style={styles.li}>• You must be at least 13 years old. If under the age of majority, you represent you have parental/guardian consent.</Text>
        <Text style={styles.li}>• Provide accurate registration information (name, username, email/phone). Keep your password secure; you’re responsible for activity on your account.</Text>
        <Text style={styles.li}>• We may suspend/terminate accounts or remove content for violations or risk to the Service or users.</Text>

        <Text style={styles.h}>2. Privacy</Text>
        <Text style={styles.p}>See the Privacy Policy for how we collect, use, and share data. It is incorporated by reference.</Text>

        <Text style={styles.h}>3. Health and Safety Notice</Text>
        <Text style={styles.p}>Spartan provides fitness and nutrition tracking for informational purposes only. It is not medical advice. Consult a physician before starting any exercise or nutrition program. Use at your own risk. Stop any activity that causes pain, dizziness, or shortness of breath.</Text>
        <Text style={styles.p}>No Emergency Services: Do not use Spartan for emergencies. If you are in an emergency, call your local emergency number (e.g., 911 in the U.S.).</Text>
        <Text style={styles.p}>Assumption of Risk; Release: You acknowledge fitness/nutrition activities carry inherent risks and you assume those risks. To the fullest extent permitted by law, you release Spartan from claims arising from your activities and use of the Service.</Text>

        <Text style={styles.h}>4. User Content and License</Text>
        <Text style={styles.li}>• You retain ownership of your posts, images, videos, comments, and messages ("User Content").</Text>
        <Text style={styles.li}>• You grant Spartan a non‑exclusive, worldwide, royalty‑free license to host, store, reproduce, display, and distribute your User Content to operate and improve the Service (e.g., showing content to followers, displaying your username/avatar, leaderboards). This license ends when content is deleted from our systems, subject to reasonable backups/caches.</Text>
        <Text style={styles.li}>• Visibility: profiles (username, avatar, basic profile) are visible to other users; posts are visible to followers by default; leaderboards are public in‑app.</Text>
        <Text style={styles.li}>• Direct Messages: intended to be private between participants. If end‑to‑end encryption is not enabled, messages are encrypted in transit/at rest and may be accessible to us or processors for security, moderation, or legal compliance. Metadata may be processed for delivery/safety.</Text>
        <Text style={styles.li}>• User Interactions; Release: You are solely responsible for your interactions with other users. To the fullest extent permitted by law, you release Spartan from claims arising out of such interactions.</Text>
        <Text style={styles.li}>• You represent you have rights to your content and it complies with these Terms and laws.</Text>

        <Text style={styles.h}>5. Prohibited Conduct and Content</Text>
        <Text style={styles.li}>• No harassment, hate speech, threats, or bullying.</Text>
        <Text style={styles.li}>• No sexually explicit content, exploitation, or content involving minors.</Text>
        <Text style={styles.li}>• No incitement of violence, self‑harm, or illegal/dangerous activities.</Text>
        <Text style={styles.li}>• No doxxing or impersonation; respect privacy and IP rights.</Text>
        <Text style={styles.li}>• No malware, scraping without permission, or attempts to access non‑public features.</Text>

        <Text style={styles.h}>6. Community Features</Text>
        <Text style={styles.li}>• Followers and Visibility: posts are visible to your followers by default; you control who you follow. Profiles (username, avatar) are visible to other users.</Text>
        <Text style={styles.li}>• Leaderboards: usernames and relevant scores/metrics may be shown publicly in‑app.</Text>
        <Text style={styles.li}>• Messaging: any user may initiate a DM with another user. Do not spam or harass.</Text>

        <Text style={styles.h}>7. Third‑Party Services</Text>
        <Text style={styles.p}>The Service integrates with FatSecret (nutrition) and Google Firebase (hosting, storage, Firestore, analytics). Their terms and privacy policies apply to their services. Third‑party content (including nutrition databases) may be inaccurate, incomplete, or outdated; Spartan does not guarantee its accuracy.</Text>

        <Text style={styles.h}>8. Apple App Store Terms</Text>
        <Text style={styles.p}>If you downloaded the app from Apple’s App Store, you acknowledge Apple is not responsible for the Service, has no obligation to provide maintenance/support, and is a third‑party beneficiary of these Terms.</Text>

        <Text style={styles.h}>9. Intellectual Property</Text>
        <Text style={styles.p}>Spartan and its licensors own the Service and related IP, excluding your User Content. Do not copy, modify, distribute, or create derivative works of the Service.</Text>

        <Text style={styles.h}>10. DMCA and Reporting</Text>
        <Text style={styles.p}>To report copyright infringement, email yangbai@thespartan.app with your contact info, description of the work and allegedly infringing content, location, a good‑faith statement, a statement under penalty of perjury of authorization, and your signature. We may remove content and terminate repeat infringers.</Text>
        <Text style={styles.p}>Report harassment/safety issues via yangbai@thespartan.app or in‑app reporting if available.</Text>

        <Text style={styles.h}>11. Payments</Text>
        <Text style={styles.p}>Spartan does not currently process payments or charge subscription fees within the app.</Text>

        <Text style={styles.h}>12. Termination</Text>
        <Text style={styles.p}>You can stop using the Service at any time and request account deletion via yangbai@thespartan.app. We may suspend or terminate access with or without notice for violations or risk to users or the Service.</Text>

        <Text style={styles.h}>13. Disclaimers and Limitation of Liability</Text>
        <Text style={styles.p}>The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. Spartan does not guarantee any health, fitness, or nutrition outcomes. To the maximum extent permitted by law, Spartan and its owners/affiliates/service providers are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages; any loss of data, revenue, profits, or goodwill; or any personal injury or property damage, arising from or relating to use of the Service or your activities. Our total liability is limited to the greater of $100 or amounts you paid to us in the 12 months preceding the claim. Any claim must be filed within one (1) year after it accrues.</Text>

        <Text style={styles.h}>14. Indemnification</Text>
        <Text style={styles.p}>You agree to indemnify and hold harmless Spartan, its owners, affiliates, and service providers from claims arising out of your use of the Service or violation of these Terms or laws.</Text>

        <Text style={styles.h}>15. Changes</Text>
        <Text style={styles.p}>We may modify or discontinue the Service and update these Terms. We will update the date above and provide notice of material changes. Continued use means you accept the updated Terms.</Text>

        <Text style={styles.h}>16. Miscellaneous</Text>
        <Text style={styles.li}>• Assignment: You may not assign these Terms without consent; we may assign them.</Text>
        <Text style={styles.li}>• Severability: If a provision is unenforceable, the remainder remains in effect.</Text>
        <Text style={styles.li}>• Entire Agreement: These Terms and the Privacy Policy form the entire agreement.</Text>
        <Text style={styles.li}>• Waiver: Failure to enforce a provision is not a waiver.</Text>
        <Text style={styles.li}>• Force Majeure: We are not liable for delays/failures due to events beyond our control (e.g., disasters, outages, war, government action).</Text>
        <Text style={styles.li}>• Export Controls: You agree to comply with applicable export control and sanctions laws.</Text>
        <Text style={styles.li}>• Beta Features: Preview/experimental features may change or break and are provided AS IS.</Text>
        <Text style={styles.li}>• Class Action/Jury Waiver (where permitted): Disputes must be brought individually; you waive any right to a jury trial.</Text>

        <Text style={styles.h}>17. Contact</Text>
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
  p: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(ts(20)) },
  li: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(ts(20)), marginLeft: scaleSize(6) },
});
