import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';

export default function PrivacyPolicy({ navigation }) {
  const goBack = () => navigation.goBack();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: scaleSize(40) }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>Last updated: 2025-11-06</Text>
        <Text style={styles.p}>This Privacy Policy explains how Spartan ("Spartan," "we," "us," or "our") collects, uses, and shares information about you when you use our iOS application and related services (the "Service").</Text>
        <Text style={styles.p}>Owner/Operator: Yiming Bai (operating Spartan){'\n'}Contact: support@thespartan.app{'\n'}Governing Law: Texas, USA (venue: Collin County, Texas)</Text>
        <Text style={styles.p}>Spartan is intended for users aged 13 and over. If you are under 13, do not use the Service. If you are under the age of majority in your jurisdiction, you must have a parent or legal guardian's consent to use the Service.</Text>

        <Text style={styles.h}>Information We Collect</Text>
        <Text style={styles.p}>We collect the following categories of information:</Text>
        <Text style={styles.li}>1) Information you provide directly</Text>
        <Text style={styles.li}>- Personal identifiers: name, username, email address, phone number.</Text>
        <Text style={styles.li}>- Account credentials: password (stored using industry-standard hashing and salting; we never store plain text passwords).</Text>
        <Text style={styles.li}>- Fitness and nutrition data: weight, height, foods consumed, macro tracking and related metrics you enter (collectively, "Health Data").</Text>
        <Text style={styles.li}>- Content you create: posts, comments, images, and videos.</Text>
        <Text style={styles.li}>- Direct messages and chats between users.</Text>
        <Text style={styles.li}>2) Information we collect automatically</Text>
        <Text style={styles.li}>- Usage and device data: device type, OS version, app version, in-app actions, and crash or performance diagnostics so we can troubleshoot issues.</Text>
        <Text style={styles.li}>- Device tokens for push notifications so we can deliver alerts you opt into.</Text>
        <Text style={styles.li}>- Analytics: via Firebase Analytics (Google). We use analytics for product improvement; we do not use ad tracking/IDFA or third-party advertising networks.</Text>
        <Text style={styles.li}>3) Information from third parties and integrations</Text>
        <Text style={styles.li}>- Food database and nutrition content from FatSecret to power search and nutrition features.</Text>
        <Text style={styles.p}>Payments: Spartan does not process payments or collect payment card information at this time.</Text>
        <Text style={styles.p}>We do not request access to HealthKit, location services, or contacts. The Service is iOS-only at this time.</Text>

        <Text style={styles.h}>How We Use Information</Text>
        <Text style={styles.p}>We use your information to:</Text>
        <Text style={styles.li}>- Provide and operate the Service (workouts, macro tracking, posts, messaging, leaderboards, and follower features).</Text>
        <Text style={styles.li}>- Personalize your experience and display relevant in-app content (e.g., your stats and feed from accounts you follow).</Text>
        <Text style={styles.li}>- Send push notifications for reminders and transactional communications (e.g., workout tracking reminders). You can control notifications in iOS settings.</Text>
        <Text style={styles.li}>- Monitor, maintain, and improve performance, security, and reliability (including via analytics).</Text>
        <Text style={styles.li}>- Prevent fraud, abuse, and violations of our Terms; comply with legal obligations.</Text>

        <Text style={styles.h}>Device Permissions and Background Activity</Text>
        <Text style={styles.li}>- Camera: Used only when you choose "Scan Barcode" in Nutrition to scan food items or attach media to a post or message.</Text>
        <Text style={styles.li}>- Photos/Library: Accessed when you attach existing media to posts or messages; we do not scan your library.</Text>
        <Text style={styles.li}>- Push Notifications: Used to send transactional updates (e.g., workout stats, comments, messages, follower activity). You can opt out in iOS settings at any time.</Text>
        <Text style={styles.li}>- Microphone, contacts, HealthKit, and background location are not requested. Data operations occur while the app is open and you are authenticated; we do not track you in the background.</Text>

        <Text style={styles.h}>Legal Bases for Processing (EU/UK users)</Text>
        <Text style={styles.li}>- Contract: to provide the Service you request.</Text>
        <Text style={styles.li}>- Legitimate interests: to secure, maintain, and improve the Service.</Text>
        <Text style={styles.li}>- Consent: for processing Health Data you choose to enter and for optional push notifications. You may withdraw consent at any time in your device settings or by contacting us; withdrawing consent may limit certain features.</Text>

        <Text style={styles.h}>How We Share Information</Text>
        <Text style={styles.p}>We do not sell your personal information and we do not share it for cross-context behavioral advertising.</Text>
        <Text style={styles.p}>We may share information as follows:</Text>
        <Text style={styles.li}>- Service providers: with vendors that help us operate the Service (e.g., Google Firebase for hosting, storage, databases, and analytics; FatSecret for nutrition data). These providers process data on our behalf under contractual restrictions.</Text>
        <Text style={styles.li}>- Within the Service:</Text>
        <Text style={styles.li}>  - Profiles: username, avatar, and profile are public to other users by default.</Text>
        <Text style={styles.li}>  - Posts: visible to your followers by default (not public to all users).</Text>
        <Text style={styles.li}>  - Private accounts: you may switch to a private profile so only approved followers can see your posts, workouts, and progress.</Text>
        <Text style={styles.li}>  - Leaderboards and competitions: usernames and scores are publicly visible in-app.</Text>
        <Text style={styles.li}>  - Bodyweight-normalized tribes: if you join a tribe leaderboard that normalizes scores by bodyweight, we share your latest logged bodyweight with that tribe’s members so normalized rankings can be computed. No additional health metrics are disclosed for this feature.</Text>
        <Text style={styles.li}>  - Direct messages: designed to be private between participants. Messages are transmitted to Firebase over HTTPS and stored on our Firebase databases without end-to-end encryption, so authorized team members and processors may access them when needed for security, abuse handling, or legal compliance. Metadata (e.g., time sent, participants) may be processed for delivery and safety.</Text>
        <Text style={styles.li}>- Legal and safety: to comply with law, respond to legal requests, or protect rights, safety, and security.</Text>
        <Text style={styles.li}>- Business transfers: in connection with a merger, acquisition, or asset sale, subject to this Policy.</Text>

        <Text style={styles.h}>Firebase Data Architecture &amp; Access Controls</Text>
        <Text style={styles.p}>Spartan is hosted on Google Firebase (Cloud Firestore, Firebase Storage, and Cloud Functions). We enforce least-privilege access through Firebase Security Rules that require authentication (`request.auth != null`) for all user data. Key controls include:</Text>
        <Text style={styles.li}>{"- `usersPrivate/{uid}`: contains health, macro, and other sensitive data. Rules allow reads/writes only by the signed-in owner (`uid == request.auth.uid`) or administrators with an `admin` custom claim."}</Text>
        <Text style={styles.li}>{"- `usersPublic/{uid}`: stores non-sensitive profile data. Any signed-in user may read it to display usernames and avatars; only the owner or an administrator may create, update, or delete entries."}</Text>
        <Text style={styles.li}>- Workouts, leaderboards, and tribe records: write access is tied to membership functions (e.g., workout `members`, tribe `members`) so that only participants can view or edit collaborative content.</Text>
        <Text style={styles.li}>- Messages and chats: access is limited to participants. Rules look up the chat document and confirm the requester's UID is in `memberUids` before returning message content or attachments.</Text>
        <Text style={styles.li}>- Reporting, account deletion, and other elevated actions route through callable Cloud Functions. The functions verify the caller's UID matches the target account or that the caller has an admin claim before performing data cleanup across collections.</Text>
        <Text style={styles.li}>- Media uploads (photos, videos) are stored in Firebase Storage paths keyed by user or chat IDs; storage rules mirror the Firestore membership checks so only owners or chat participants can download the files.</Text>
        <Text style={styles.p}>We periodically review and update these rules to address new features and minimize the amount of data each role can access.</Text>

        <Text style={styles.h}>International Transfers</Text>
        <Text style={styles.p}>We store and process data primarily in the United States (e.g., on Google Cloud/Firebase). If you are outside the U.S., your data may be transferred to and processed in the U.S. Where required, we rely on appropriate safeguards such as the European Commission's Standard Contractual Clauses, including those provided by our processors (e.g., Google for Firebase).</Text>

        <Text style={styles.h}>Data Retention</Text>
        <Text style={styles.p}>We retain your information for as long as your account is active or as needed to provide the Service and for legitimate business purposes (e.g., security, backups, legal compliance). At this time, Spartan does not maintain a fixed deletion schedule for backups. If you request deletion of your account, we will delete or de-identify your personal information within a reasonable period, subject to retaining limited data as required by law or for legitimate interests such as security and fraud prevention.</Text>

        <Text style={styles.h}>Your Rights and Choices</Text>
        <Text style={styles.li}>- Access, correction, deletion: You may request access to, correction of, or deletion of your personal information by contacting us at privacy@thespartan.app or support@thespartan.app.</Text>
        <Text style={styles.li}>- In-app controls: You can set your account to Private, approve or remove followers, and delete your account at any time from Profile -> Settings -> Delete Account.</Text>
        <Text style={styles.li}>- Push notifications: Control in iOS Settings.</Text>
        <Text style={styles.li}>- EU/UK rights: You may have rights to data portability, restriction, or objection to certain processing, and to withdraw consent where processing is based on consent.</Text>
        <Text style={styles.li}>- California (U.S.) rights: Spartan does not sell or share personal information as defined by the CCPA/CPRA. California residents can request access and deletion and will not be discriminated against for exercising rights.</Text>
        <Text style={styles.p}>We will respond to verified requests consistent with applicable law. We may need to verify your identity before fulfilling requests.</Text>

        <Text style={styles.h}>Security</Text>
        <Text style={styles.p}>We use reasonable administrative, technical, and physical safeguards to protect personal information, including encryption in transit (TLS) and encryption at rest by our cloud providers (e.g., Firebase), and role-based access controls. No method of transmission or storage is 100% secure.</Text>
        <Text style={styles.p}>Direct message content is stored in Firebase without end-to-end encryption, so it may be reviewed by authorized personnel when investigating abuse, security incidents, or legal requests.</Text>

        <Text style={styles.p}>Not a HIPAA Covered Entity; No Medical or Emergency Service: Spartan is not a medical provider and is not a "covered entity" or "business associate" under HIPAA. Do not use the Service for medical or emergency communications. If you have a medical emergency, call your local emergency number (e.g., 911 in the U.S.).</Text>
        <Text style={styles.p}>Nutrition/Content Accuracy: Nutrition databases and third-party content may contain inaccuracies or be incomplete or outdated. Use your judgment and consult professionals where appropriate.</Text>

        <Text style={styles.h}>Children's Privacy</Text>
        <Text style={styles.p}>The Service is not directed to children under 13 and we do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it.</Text>

        <Text style={styles.h}>Changes to This Policy</Text>
        <Text style={styles.p}>We may update this Policy from time to time. If we make material changes, we will update the "Last updated" date and provide additional notice as appropriate (e.g., in-app notice). Your continued use of the Service after an update indicates your acceptance of the revised Policy.</Text>

        <Text style={styles.h}>Contact Us</Text>
        <Text style={styles.p}>If you have questions or requests regarding this Policy or your data, contact us at:{'\n'}- Email: support@thespartan.app</Text>

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
