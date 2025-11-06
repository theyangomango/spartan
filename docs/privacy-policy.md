# Spartan Privacy Policy

Last updated: 2025-03-16

This Privacy Policy explains how Spartan ("Spartan," "we," "us," or "our") collects, uses, and shares information about you when you use our iOS application and related services (the "Service").

Owner/Operator: Yiming Bai (operating Spartan)

Contact: support@thespartan.app

Governing Law: Texas, USA (venue: Collin County, Texas)

Spartan is intended for users aged 13 and over. If you are under 13, do not use the Service. If you are under the age of majority in your jurisdiction, you must have a parent or legal guardian’s consent to use the Service.

## Information We Collect

We collect the following categories of information:

1) Information you provide directly
- Personal identifiers: name, username, email address, phone number.
- Account credentials: password (stored using industry-standard hashing and salting; we never store plain text passwords).
- Fitness and nutrition data: weight, height, foods consumed, macro tracking and related metrics you enter (collectively, "Health Data").
- Content you create: posts, comments, images, and videos.
- Direct messages and chats between users.

2) Information we collect automatically
- Usage and device data: device type, OS version, app version, in-app actions, and crash or performance diagnostics so we can troubleshoot issues.
- Device tokens for push notifications so we can deliver alerts you opt into.
- Analytics: via Firebase Analytics (Google). We use analytics for product improvement; we do not use ad tracking/IDFA or third-party advertising networks.

3) Information from third parties and integrations
- Food database and nutrition content from FatSecret to power search and nutrition features.

Payments: Spartan does not process payments or collect payment card information at this time.

We do not request access to HealthKit, location services, or contacts. The Service is iOS-only at this time.

## How We Use Information

We use your information to:
- Provide and operate the Service (workouts, macro tracking, posts, messaging, leaderboards, and follower features).
- Personalize your experience and display relevant in‑app content (e.g., your stats and feed from accounts you follow).
- Send push notifications for reminders and transactional communications (e.g., workout tracking reminders). You can control notifications in iOS settings.
- Monitor, maintain, and improve performance, security, and reliability (including via analytics).
- Prevent fraud, abuse, and violations of our Terms; comply with legal obligations.

## Device Permissions and Background Activity

- Camera: Used only when you choose "Scan Barcode" in Nutrition to scan food items or attach media to a post or message.
- Photos/Library: Accessed when you attach existing media to posts or messages; we do not scan your library.
- Push Notifications: Used to send transactional updates (e.g., workout stats, comments, messages, follower activity). You can opt out in iOS settings at any time.
- Microphone, contacts, HealthKit, and background location are not requested. Data operations occur while the app is open and you are authenticated; we do not track you in the background.

## Legal Bases for Processing (EU/UK users)

If you are in the EU/UK, we process personal data under the following legal bases:
- Contract: to provide the Service you request.
- Legitimate interests: to secure, maintain, and improve the Service.
- Consent: for processing Health Data you choose to enter and for optional push notifications. You may withdraw consent at any time in your device settings or by contacting us; withdrawing consent may limit certain features.

## How We Share Information

We do not sell your personal information and we do not share it for cross-context behavioral advertising.

We may share information as follows:
- Service providers: with vendors that help us operate the Service (e.g., Google Firebase for hosting, storage, databases, and analytics; FatSecret for nutrition data). These providers process data on our behalf under contractual restrictions.
- Within the Service:
  - Profiles: username, avatar, and profile are public to other users by default.
  - Posts: visible to your followers by default (not public to all users).
  - Private accounts: you may switch to a private profile so only approved followers can see your posts, workouts, and progress.
  - Leaderboards and competitions: usernames and scores are publicly visible in-app.
  - Direct messages: designed to be private between participants. Messages are transmitted to Firebase over HTTPS and stored on our Firebase databases without end-to-end encryption, so authorized team members and processors may access them when needed for security, abuse handling, or legal compliance. Metadata (e.g., time sent, participants) may be processed for delivery and safety.
- Legal and safety: to comply with law, respond to legal requests, or protect rights, safety, and security.
- Business transfers: in connection with a merger, acquisition, or asset sale, subject to this Policy.

## Firebase Data Architecture & Access Controls

Spartan is hosted on Google Firebase (Cloud Firestore, Firebase Storage, and Cloud Functions). We enforce least-privilege access through Firebase Security Rules that require authentication (`request.auth != null`) for all user data. Key controls include:

- `usersPrivate/{uid}`: contains health, macro, and other sensitive data. Rules allow reads/writes only by the signed-in owner (`uid == request.auth.uid`) or administrators with an `admin` custom claim.
- `usersPublic/{uid}`: stores non-sensitive profile data. Any signed-in user may read it to display usernames and avatars; only the owner or an administrator may create, update, or delete entries.
- Workouts, leaderboards, and tribe records: write access is tied to membership functions (e.g., workout `members`, tribe `members`) so that only participants can view or edit collaborative content.
- Messages and chats: access is limited to participants. Rules look up the chat document and confirm the requester’s UID is in `memberUids` before returning message content or attachments.
- Reporting, account deletion, and other elevated actions route through callable Cloud Functions. The functions verify the caller’s UID matches the target account or that the caller has an admin claim before performing data cleanup across collections.
- Media uploads (photos, videos) are stored in Firebase Storage paths keyed by user or chat IDs; storage rules mirror the Firestore membership checks so only owners or chat participants can download the files.

We periodically review and update these rules to address new features and minimize the amount of data each role can access.

## International Data Transfers

We store and process data primarily in the United States (e.g., on Google Cloud/Firebase). If you are outside the U.S., your data may be transferred to and processed in the U.S. Where required, we rely on appropriate safeguards such as the European Commission’s Standard Contractual Clauses, including those provided by our processors (e.g., Google for Firebase).

## Data Retention

We retain your information for as long as your account is active or as needed to provide the Service and for legitimate business purposes (e.g., security, backups, legal compliance). At this time, Spartan does not maintain a fixed deletion schedule for backups. If you request deletion of your account, we will delete or de-identify your personal information within a reasonable period, subject to retaining limited data as required by law or for legitimate interests such as security and fraud prevention.

## Your Rights and Choices

- Access, correction, deletion: You may request access to, correction of, or deletion of your personal information by contacting us at privacy@thespartan.app or support@thespartan.app.
- In-app controls: You can set your account to Private, approve or remove followers, and delete your account at any time from Profile → Settings → Delete Account.
- Push notifications: Control in iOS Settings.
- EU/UK rights: You may have rights to data portability, restriction, or objection to certain processing, and to withdraw consent where processing is based on consent.
- California (U.S.) rights: Spartan does not sell or share personal information as defined by the CCPA/CPRA. California residents can request access and deletion and will not be discriminated against for exercising rights.

We will respond to verified requests consistent with applicable law. We may need to verify your identity before fulfilling requests.

## Security

We use reasonable administrative, technical, and physical safeguards to protect personal information, including encryption in transit (TLS) and encryption at rest by our cloud providers (e.g., Firebase), and role-based access controls. No method of transmission or storage is 100% secure.

Direct message content is stored in Firebase without end-to-end encryption, so it may be reviewed by authorized personnel when investigating abuse, security incidents, or legal requests.

Not a HIPAA Covered Entity; No Medical or Emergency Service: Spartan is not a medical provider and is not a “covered entity” or “business associate” under HIPAA. Do not use the Service for medical or emergency communications. If you have a medical emergency, call your local emergency number (e.g., 911 in the U.S.).

Nutrition/Content Accuracy: Nutrition databases and third-party content may contain inaccuracies or be incomplete or outdated. Use your judgment and consult professionals where appropriate.

## Children’s Privacy

The Service is not directed to children under 13 and we do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it.

## Changes to This Policy

We may update this Policy from time to time. If we make material changes, we will update the “Last updated” date and provide additional notice as appropriate (e.g., in‑app notice). Your continued use of the Service after an update indicates your acceptance of the revised Policy.

## Contact Us

If you have questions or requests regarding this Policy or your data, contact us at:

- Email: support@thespartan.app
