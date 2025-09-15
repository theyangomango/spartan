import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import scaleSizeFont, { ts } from '../helper/scaleSize';
import { Ionicons, Octicons, Feather } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import createDoc from '../../backend/helper/firebase/createDoc';
import readDoc from '../../backend/helper/firebase/readDoc';
import makeID from '../../backend/helper/makeID';
import AsyncStorage from '@react-native-async-storage/async-storage';
import arrayAppend from '../../backend/helper/firebase/arrayAppend';
import incrementDocValue from '../../backend/helper/firebase/incrementDocValue';

/* --- NEW: default PFP upload on sign-up --- */
import uploadImage from '../../backend/storage/uploadImage';
import { Image as RNImage } from 'react-native';
import DEFAULT_PFP from '../assets/DEFAULT_PFP.png';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375
function scaleSize(size) { return Math.round(size * scale); }

const NewUserCreation = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const emailOrPhoneInputRef = useRef(null);

    function goBack() { navigation.goBack(); }

    // simple validators
    const isValidEmail = (v) => /^(?:[A-Z0-9._%+-]+)@(?:[A-Z0-9-]+\.)+[A-Z]{2,}$/i.test(v);
    const isValidPhone = (v) => {
        const d = (v || '').replace(/[^0-9+]/g, '');
        if (d.startsWith('+')) return d.length >= 11 && d.length <= 16; // + and 10-15 digits
        return d.length >= 10 && d.length <= 15;
    };
    const isValidUsername = (v) => /^[a-z0-9_.]{3,20}$/.test(v);

    async function signUp() {
        try {
            if (submitting) return;
            setErrorMsg('');
            // Basic validation
            if (!emailOrPhone.trim() || !username.trim() || !name.trim() || !password.trim()) {
                setErrorMsg('Please fill out all fields.');
                return;
            }

            const trimmedEmailOrPhone = emailOrPhone.toLowerCase().trim();
            const trimmedUsername = username.toLowerCase().trim();
            const trimmedName = name.trim();

            // Constraints
            if (trimmedName.length < 2 || trimmedName.length > 40) {
                setErrorMsg('Name must be 2–40 characters.');
                return;
            }
            if (!isValidUsername(trimmedUsername)) {
                setErrorMsg('Username must be 3–20 chars (a–z, 0–9, _ or .).');
                return;
            }
            const isEmail = trimmedEmailOrPhone.includes('@');
            if (isEmail ? !isValidEmail(trimmedEmailOrPhone) : !isValidPhone(trimmedEmailOrPhone)) {
                setErrorMsg('Enter a valid email or phone number.');
                return;
            }
            if (password.length < 6) {
                setErrorMsg('Password must be at least 6 characters.');
                return;
            }

            // Check duplicates
            const users = await readDoc('global', 'users');
            const existing = Array.isArray(users?.all) ? users.all : [];
            const userExists = existing.some(
                (u) => (u.email && u.email.toLowerCase() === trimmedEmailOrPhone) || (u.phoneNumber && String(u.phoneNumber).toLowerCase() === trimmedEmailOrPhone)
            );
            if (userExists) { setErrorMsg('Email/phone already in use.'); return; }
            const handleExists = existing.some((u) => String(u?.handle || '').toLowerCase() === trimmedUsername);
            if (handleExists) { setErrorMsg('Username is already taken.'); return; }

            setSubmitting(true);
            const newID = makeID();

            // --- DEFAULT PFP: resolve local asset URI & upload ---
            // This avoids Asset.downloadAsync; works in Expo & bare RN.
            const defaultPfpLocalUri = RNImage.resolveAssetSource(DEFAULT_PFP)?.uri;
            let defaultPfpUrl = '';
            if (defaultPfpLocalUri) {
                // Ensure your uploadImage returns the download URL!
                // e.g., return await getDownloadURL(ref)
                defaultPfpUrl = await uploadImage(defaultPfpLocalUri, `pfps/${newID}.png`);
            }

            // Pre-follow the official Spartan account
            const SPARTAN_ACCOUNT = {
                handle: 'spartan',
                name: 'Spartan',
                pfp: 'https://firebasestorage.googleapis.com/v0/b/spartan-8a55f.appspot.com/o/pfps%2F24247ffa-0706-4b01-aff2-eec0dd592f56.png?alt=media&token=d412d55b-a488-4db2-a888-e171f2d0aa5e',
                uid: '24247ffa-0706-4b01-aff2-eec0dd592f56'
            };

            const newUser = {
                bio: "",
                completedWorkouts: [],
                currentWorkout: null,
                email: trimmedEmailOrPhone.includes('@') ? trimmedEmailOrPhone : null,
                phoneNumber: trimmedEmailOrPhone.includes('@') ? null : trimmedEmailOrPhone,
                exploreFeedPosts: [],
                feedPosts: [],
                feedStories: [{
                    handle: trimmedUsername,
                    name: trimmedName,
                    pfp: defaultPfpUrl || '',   // use uploaded default
                    stories: [],
                    uid: newID
                }],
                followerCount: 0,
                followers: [],
                following: [SPARTAN_ACCOUNT],
                followingCount: 1,
                handle: trimmedUsername,
                pfp: defaultPfpUrl || '',
                image: defaultPfpUrl || '',
                joined: Date.now(),
                lastActive: Date.now(),
                messages: [],
                name: trimmedName,
                notificationEvents: [],
                notificationNewComments: 0,
                notificationNewEvents: 0,
                notificationNewLikes: 0,
                password: password,
                postCount: 0,
                posts: [],
                progressPhotos: [],
                savedPosts: [],
                statsExercises: {},
                statsHexagon: {
                    overall: 0, abs: 0, legs: 0, chest: 0, back: 0, arms: 0, shoulders: 0
                },
                statsTotalHours: 0,
                statsTotalVolume: 0,
                statsTotalWorkouts: 0,
                templates: [
                    {
                        exercises: [
                            { muscle: 'Chest', name: 'Bench Press (Barbell)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Chest', name: 'Incline Bench (Barbell)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Chest', name: 'Chest Fly (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Shoulders', name: 'Shoulder Press (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Arms', name: 'Standing Tricep Extension (Dumbbell)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                        ],
                        lastDate: null, name: 'Push (Spartan)', tid: makeID()
                    },
                    {
                        exercises: [
                            { muscle: 'Back', name: 'Pull-Up (Assisted)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Back', name: 'Seated Row (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Shoulders', name: 'Lateral Raise (Dumbell)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Shoulders', name: 'Front Raise (Dumbell)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Arms', name: 'Preacher Curl (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                        ],
                        lastDate: null, name: 'Pull (Spartan)', tid: makeID()
                    },
                    {
                        exercises: [
                            { muscle: 'Legs', name: 'Leg Press (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Legs', name: 'Calf Raise on Leg Press (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Legs', name: 'Glute-Ham Raise', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Legs', name: 'Hip Adduction (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                            { muscle: 'Legs', name: 'Leg Extension (Machine)', sets: [{ previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }, { previous: null, reps: 0, weight: 0 }] },
                        ],
                        lastDate: null, name: 'Legs (Spartan)', tid: makeID()
                    }
                ],
                uid: newID,
            };

            // Persist uid (await so errors don’t surface as unhandled)
            await AsyncStorage.setItem('uid', newID);
            try { global.setAuthUid?.(newID); } catch {}

            // Write to Firestore (await BOTH)
            await arrayAppend('global', 'users', 'all', newUser);
            await createDoc('users', newID, newUser);

            // Also add this new user to Spartan's followers list + bump count
            try {
                const followerRef = { uid: newID, handle: trimmedUsername, name: trimmedName, pfp: defaultPfpUrl || '' };
                await arrayAppend('users', SPARTAN_ACCOUNT.uid, 'followers', followerRef);
                await incrementDocValue('users', SPARTAN_ACCOUNT.uid, 'followerCount', 1);
            } catch (e) {
                console.log('Failed to append to Spartan followers:', e?.message || e);
            }

            // Jump to Workout tab without remounts
            try {
                const { jumpToTab } = require('../../navigationRef');
                jumpToTab('Workout');
            } catch {
                navigation.navigate('Tabs', { screen: 'Workout' });
            }
        } catch (err) {
            console.warn('Sign-up failed:', err?.message || err);
            setErrorMsg('Sign-up failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <RNBounceable onPress={goBack}>
                        <Feather name="chevron-left" size={scaleSize(27)} color={theme.textSecondary} style={styles.backIcon} />
                    </RNBounceable>
                    <RNBounceable>
                        <Octicons name="question" size={scaleSize(22)} color={theme.textSecondary} style={styles.helpIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Enter Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor={theme.textSecondary}
                            value={name}
                            onChangeText={setName}
                            autoFocus={true}
                        />

                        <Text style={styles.title}>Create a Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor={theme.textSecondary}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize='none'
                        />

                        <Text style={styles.title}>Email / Phone Number</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your email or phone"
                            placeholderTextColor={theme.textSecondary}
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
                            autoCapitalize='none'
                        />

                        <Text style={styles.title}>Create a Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.footerContainer}>
                        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        <RNBounceable style={[styles.button, submitting && { opacity: 0.6 }]} onPress={signUp} disabled={submitting}>
                            <Text style={styles.auth_button_text}>{submitting ? 'Creating…' : 'Continue'}</Text>
                        </RNBounceable>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: scaleSize(15),
        right: scaleSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    backIcon: { paddingHorizontal: scaleSize(8), paddingVertical: scaleSize(6) },
    helpIcon: { padding: scaleSize(8) },
    formWrapper: { flex: 1, paddingTop: scaleSize(screenHeight * 0.15) },
    formContainer: { alignItems: 'center', paddingHorizontal: scaleSize(22) },
    title: {
        fontSize: scaleSize(15),
        fontWeight: '400',
        color: theme.textPrimary,
        paddingLeft: scaleSize(3),
        marginBottom: scaleSize(8),
        fontFamily: 'Outfit_500Medium',
        alignSelf: 'flex-start',
    },
    input: {
        width: '100%',
        paddingVertical: scaleSize(11.5),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(6),
        backgroundColor: theme.field,
        fontSize: scaleSize(14),
        color: theme.textPrimary,
        fontFamily: 'Outfit_500Medium',
        marginBottom: scaleSize(20),
    },
    footerContainer: {
        alignItems: 'center',
        marginTop: scaleSize(10),
        marginHorizontal: scaleSize(22),
        marginBottom: scaleSize(20),
    },
    errorText: {
        color: '#B91C1C',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: scaleSize(10),
    },
    button: {
        backgroundColor: theme.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(22),
        borderRadius: scaleSize(8),
        width: '100%',
    },
    auth_button_text: {
        color: '#fff',
        fontSize: scaleSize(15),
        fontWeight: '500',
        fontFamily: 'Outfit_600SemiBold',
        marginLeft: scaleSize(6),
    },
});

export default NewUserCreation;
