import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import makeID from '../../backend/helper/makeID';
import {
    sanitizeHandle,
    USERNAME_REGEX,
    fetchAllUsers,
    isHandleTaken,
    persistPendingUserWithHandle,
} from '../utils/usernameRegistration';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375
function scaleSize(size) { return Math.round(size * scale); }

const NewUserCreation = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [handle, setHandle] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const emailOrPhoneInputRef = useRef(null);

    function goBack() { navigation.goBack(); }

    const isValidEmail = (v) => /^(?:[A-Z0-9._%+-]+)@(?:[A-Z0-9-]+\.)+[A-Z]{2,}$/i.test(v);
    const isValidPhone = (v) => {
        const d = (v || '').replace(/[^0-9+]/g, '');
        if (d.startsWith('+')) return d.length >= 11 && d.length <= 16; // + and 10-15 digits
        return d.length >= 10 && d.length <= 15;
    };

    const handleHandleChange = (value) => {
        setHandle(sanitizeHandle(value));
    };

    async function signUp() {
        if (submitting) return;
        setErrorMsg('');

        const trimmedEmailOrPhone = emailOrPhone.toLowerCase().trim();
        const trimmedName = name.trim();
        let normalizedHandle = sanitizeHandle(handle);

        if (!trimmedEmailOrPhone || !trimmedName || !password.trim()) {
            setErrorMsg('Please fill out all fields.');
            return;
        }

        if (trimmedName.length < 2 || trimmedName.length > 40) {
            setErrorMsg('Name must be 2–40 characters.');
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

        if (!normalizedHandle) {
            setErrorMsg('Please choose a username.');
            return;
        }

        if (!USERNAME_REGEX.test(normalizedHandle)) {
            setErrorMsg('Username must be 6–20 characters (a–z, 0–9, _ or .).');
            return;
        }

        setSubmitting(true);
        try {
            const allUsers = await fetchAllUsers();
            const userExists = allUsers.some((entry) => {
                if (!entry || typeof entry !== 'object') return false;
                const emailCandidate = typeof entry.email === 'string' ? entry.email.toLowerCase() : '';
                const phoneCandidate = entry.phoneNumber != null ? String(entry.phoneNumber).toLowerCase() : '';
                return (emailCandidate && emailCandidate === trimmedEmailOrPhone)
                    || (phoneCandidate && phoneCandidate === trimmedEmailOrPhone);
            });

            if (userExists) {
                setErrorMsg('Email/phone already in use.');
                return;
            }

            if (isHandleTaken(allUsers, normalizedHandle)) {
                setErrorMsg('Username is already taken.');
                return;
            }

            const newID = makeID();

            const pendingUser = {
                uid: newID,
                name: trimmedName,
                email: isEmail ? trimmedEmailOrPhone : null,
                phoneNumber: isEmail ? null : trimmedEmailOrPhone,
                password,
                authProvider: 'password',
                needsDefaultPfp: true,
            };

            await persistPendingUserWithHandle({
                pendingUser,
                handle: normalizedHandle,
                allUsers,
            });

            Keyboard.dismiss();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Tabs' }],
            });
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

                        <Text style={styles.title}>Choose a Username</Text>
                        <View style={styles.usernameWrapper}>
                            <Text style={styles.usernamePrefix}>@</Text>
                            <TextInput
                                style={styles.usernameInput}
                                placeholder="yourusername"
                                placeholderTextColor={theme.textSecondary}
                                value={handle}
                                onChangeText={handleHandleChange}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="done"
                                onSubmitEditing={signUp}
                            />
                        </View>
                        <Text style={styles.usernameHelper}>
                            Usernames are 6–20 characters. Letters, numbers, underscores, and periods only.
                        </Text>
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
    usernameWrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scaleSize(6),
        backgroundColor: theme.field,
        paddingVertical: scaleSize(11.5),
        paddingHorizontal: scaleSize(12),
        marginBottom: scaleSize(10),
    },
    usernamePrefix: {
        fontSize: scaleSize(16),
        color: theme.textSecondary,
        fontFamily: 'Outfit_600SemiBold',
        marginRight: scaleSize(6),
    },
    usernameInput: {
        flex: 1,
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        fontFamily: 'Outfit_500Medium',
        padding: 0,
    },
    usernameHelper: {
        alignSelf: 'flex-start',
        fontSize: scaleSize(11.5),
        color: theme.textSecondary,
        marginBottom: scaleSize(16),
        paddingLeft: scaleSize(3),
        fontFamily: 'Outfit_400Regular',
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
