import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, Octicons, Feather } from '@expo/vector-icons';
import createDoc from '../../backend/helper/firebase/createDoc';
import readDoc from '../../backend/helper/firebase/readDoc';
import makeID from '../../backend/helper/makeID';
import AsyncStorage from '@react-native-async-storage/async-storage';
import arrayAppend from '../../backend/helper/firebase/arrayAppend';

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
    const emailOrPhoneInputRef = useRef(null);

    function goBack() { navigation.goBack(); }

    async function signUp() {
        try {
            // Basic validation
            if (!emailOrPhone.trim() || !username.trim() || !name.trim() || !password.trim()) return;

            const trimmedEmailOrPhone = emailOrPhone.toLowerCase().trim();
            const trimmedUsername = username.toLowerCase().trim();
            const trimmedName = name.trim();

            // Check duplicates
            const users = await readDoc('global', 'users');
            const existing = Array.isArray(users?.all) ? users.all : [];
            const userExists = existing.some(
                (u) => u.email === trimmedEmailOrPhone || u.phoneNumber === trimmedEmailOrPhone
            );
            if (userExists) return;

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
                following: [],
                followingCount: 0,
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
                    overall: 69, abs: 33, legs: 76, chest: 54, back: 39, arms: 80, shoulders: 55
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

            // Jump to Workout tab
            navigation.navigate('Tabs', { screen: 'Workout' });
        } catch (err) {
            console.warn('Sign-up failed:', err?.message || err);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <RNBounceable onPress={goBack}>
                        <Feather name="chevron-left" size={scaleSize(27)} color="#888" style={styles.backIcon} />
                    </RNBounceable>
                    <RNBounceable>
                        <Octicons name="question" size={scaleSize(22)} color="#888" style={styles.helpIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Enter Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor="#ccc"
                            value={name}
                            onChangeText={setName}
                            autoFocus={true}
                        />

                        <Text style={styles.title}>Create a Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#ccc"
                            value={username}
                            onChangeText={setUsername}
                        />

                        <Text style={styles.title}>Email / Phone Number</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your email or phone"
                            placeholderTextColor="#ccc"
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
                        />

                        <Text style={styles.title}>Create a Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#ccc"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.footerContainer}>
                        <RNBounceable style={styles.button} onPress={signUp}>
                            <Text style={styles.auth_button_text}>Continue</Text>
                        </RNBounceable>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
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
        color: '#000',
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
        backgroundColor: '#f2f2f2',
        fontSize: scaleSize(14),
        color: '#000',
        fontFamily: 'Outfit_500Medium',
        marginBottom: scaleSize(20),
    },
    footerContainer: {
        alignItems: 'center',
        marginTop: scaleSize(10),
        marginHorizontal: scaleSize(22),
        marginBottom: scaleSize(20),
    },
    button: {
        backgroundColor: '#55A8FF',
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
