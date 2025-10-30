import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Octicons, Feather } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import createDoc from '../../backend/helper/firebase/createDoc';
import readDoc from '../../backend/helper/firebase/readDoc';
import makeID from '../../backend/helper/makeID';
import AsyncStorage from '@react-native-async-storage/async-storage';
import arrayAppend from '../../backend/helper/firebase/arrayAppend';
import buildInitialUser from '../utils/buildInitialUser';

/* --- NEW: default PFP upload on sign-up --- */
import uploadImage from '../../backend/storage/uploadImage';
import { Image as RNImage } from 'react-native';
import DEFAULT_PFP from '../assets/DEFAULT_PFP.png';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375
function scaleSize(size) { return Math.round(size * scale); }

const NewUserCreation = ({ navigation, route }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const emailOrPhoneInputRef = useRef(null);
    const usernameFromRoute = route?.params?.username ?? '';

    function goBack() { navigation.goBack(); }

    // simple validators
    const isValidEmail = (v) => /^(?:[A-Z0-9._%+-]+)@(?:[A-Z0-9-]+\.)+[A-Z]{2,}$/i.test(v);
    const isValidPhone = (v) => {
        const d = (v || '').replace(/[^0-9+]/g, '');
        if (d.startsWith('+')) return d.length >= 11 && d.length <= 16; // + and 10-15 digits
        return d.length >= 10 && d.length <= 15;
    };
    const isValidUsername = (v) => /^[a-z0-9_.]{6,20}$/.test(v);

    async function signUp() {
        try {
            if (submitting) return;
            setErrorMsg('');
            // Basic validation
            const trimmedEmailOrPhone = emailOrPhone.toLowerCase().trim();
            const trimmedUsername = usernameFromRoute.toLowerCase().trim();
            const trimmedName = name.trim();

            if (!trimmedEmailOrPhone || !trimmedName || !password.trim()) {
                setErrorMsg('Please fill out all fields.');
                return;
            }

            if (!trimmedUsername) {
                setErrorMsg('Please go back and create a username.');
                return;
            }

            // Constraints
            if (trimmedName.length < 2 || trimmedName.length > 40) {
                setErrorMsg('Name must be 2–40 characters.');
                return;
            }
            if (!isValidUsername(trimmedUsername)) {
                setErrorMsg('Username must be 6–20 chars (a–z, 0–9, _ or .).');
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

            const newUser = buildInitialUser({
                uid: newID,
                handle: trimmedUsername,
                name: trimmedName,
                email: isEmail ? trimmedEmailOrPhone : null,
                phoneNumber: isEmail ? null : trimmedEmailOrPhone,
                image: defaultPfpUrl || '',
                password,
                authProvider: 'password',
            });

            // Persist uid (await so errors don’t surface as unhandled)
            await AsyncStorage.setItem('uid', newID);
            try { global.setAuthUid?.(newID); } catch {}

            // Write to Firestore (await BOTH)
            await arrayAppend('global', 'users', 'all', newUser);
            await createDoc('users', newID, newUser);

            try {
                navigation.navigate('Tabs');
            } catch {}
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
                    <View style={styles.iconSide}>
                        <RNBounceable onPress={goBack}>
                            <Feather name="chevron-left" size={scaleSize(27)} color={theme.textSecondary} style={styles.backIcon} />
                        </RNBounceable>
                    </View>
                    <View style={styles.handleWrapper}>
                        {!!usernameFromRoute && (
                            <Text style={styles.handleText}>@{usernameFromRoute}</Text>
                        )}
                    </View>
                    <View style={styles.iconSide} />
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
                        <Text style={styles.agreeText}>
                            By signing up, I agree to the
                        </Text>
                        <View style={styles.linkRow}>
                            <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                                <Text style={styles.link}> Terms of Service</Text>
                            </TouchableOpacity>
                            <Text style={styles.agreeText}> and</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                                <Text style={styles.link}> Privacy Policy</Text>
                            </TouchableOpacity>
                        </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    backIcon: { paddingHorizontal: scaleSize(8), paddingVertical: scaleSize(6) },
    helpIcon: { padding: scaleSize(8) },
    iconSide: {
        width: scaleSize(44),
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    handleWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    formWrapper: { flex: 1, paddingTop: scaleSize(screenHeight * 0.15) },
    formContainer: { alignItems: 'center', paddingHorizontal: scaleSize(22) },
    handleText: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
    },
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
    agreeText: {
        color: theme.textSecondary,
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(12),
        textAlign: 'center',
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scaleSize(3),
        marginBottom: scaleSize(8),
    },
    link: {
        color: theme.primary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
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
