import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../firebase.config';
import { scaleWidth375 } from '../helper/scaleSize';

const { height: screenHeight } = Dimensions.get('window');

const UserLogInCredentials = ({ navigation }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [busy, setBusy] = useState(false);

    const identifierInputRef = useRef(null);

    // Ensure keyboard is always open
    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (Platform.OS === 'android') {
                identifierInputRef.current?.focus();
            }
        });

        return () => {
            showSubscription.remove();
        };
    }, []);

    function goBack() {
        navigation.goBack();
    }

    async function logIn() {
        if (busy) return;

        const trimmedIdentifier = identifier.trim();
        const enteredPassword = password.trim();
        setErrorMsg('');

        if (!trimmedIdentifier || !enteredPassword) {
            setErrorMsg('Enter your email, phone number, or username and password.');
            return;
        }

        setBusy(true);
        let loginEmail = '';
        const lowerIdentifier = trimmedIdentifier.toLowerCase();
        const digitsOnly = trimmedIdentifier.replace(/\D/g, '');
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        const phonePattern = /^[0-9+()\s.-]+$/;

        try {
            if (emailPattern.test(lowerIdentifier)) {
                loginEmail = lowerIdentifier;
            } else if (phonePattern.test(trimmedIdentifier) && digitsOnly.length >= 8) {
                loginEmail = `${digitsOnly}@phone.spartan.app`;
            } else {
                const resolveCallable = httpsCallable(functions, 'resolveLoginIdentifier');
                const response = await resolveCallable({ identifier: trimmedIdentifier });
                const data = response?.data || {};
                loginEmail = String(data.loginEmail || '').trim().toLowerCase();
            }

            if (!loginEmail) {
                setErrorMsg('Enter a valid email, phone number, or username.');
                return;
            }

            await signInWithEmailAndPassword(auth, loginEmail, enteredPassword);

            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
        } catch (error) {
            const code = error?.code || '';
            if (code === 'functions/not-found') {
                setErrorMsg('No account matches that username.');
            } else if (code === 'functions/invalid-argument') {
                setErrorMsg('Enter a valid email, phone number, or username.');
            } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
                setErrorMsg('Invalid credentials. Please try again.');
            } else if (code === 'auth/too-many-requests') {
                setErrorMsg('Too many attempts. Try again later.');
            } else {
                setErrorMsg('Unable to sign in. Check your connection.');
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <RNBounceable onPress={goBack}>
                        <Feather name="chevron-left" size={scaleWidth375(27)} color={theme.textSecondary} style={styles.backIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Email / Phone Number / Username</Text>
                        <TextInput
                            ref={identifierInputRef}
                            style={styles.input}
                            placeholder="Enter your email, phone number, or username"
                            placeholderTextColor={theme.textSecondary}
                            value={identifier}
                            onChangeText={setIdentifier}
                            keyboardType="email-address"
                            autoCapitalize='none'
                            autoFocus={true}
                        />

                        <Text style={styles.title}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize='none'
                        />
                    </View>

                    <View style={styles.footerContainer}>
                        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        <RNBounceable style={styles.button} onPress={logIn} disabled={busy}>
                            <Text style={styles.auth_button_text}>{busy ? 'Logging in…' : 'Continue'}</Text>
                        </RNBounceable>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: scaleWidth375(15),
        right: scaleWidth375(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    backIcon: {
        paddingHorizontal: scaleWidth375(8),
        paddingVertical: scaleWidth375(6),
    },
    formWrapper: {
        flex: 1,
        paddingTop: scaleWidth375(screenHeight * 0.15),
    },
    formContainer: {
        alignItems: 'center',
        paddingHorizontal: scaleWidth375(22),
    },
    title: {
        fontSize: scaleWidth375(15),
        fontWeight: '400',
        color: theme.textPrimary,
        paddingLeft: scaleWidth375(3),
        marginBottom: scaleWidth375(8),
        fontFamily: 'Outfit_500Medium',
        alignSelf: 'flex-start',
    },
    input: {
        width: '100%',
        paddingVertical: scaleWidth375(11.5),
        paddingHorizontal: scaleWidth375(12),
        borderRadius: scaleWidth375(6),
        backgroundColor: theme.field,
        fontSize: scaleWidth375(14),
        color: theme.textPrimary,
        fontFamily: 'Outfit_500Medium',
        marginBottom: scaleWidth375(20),
    },
    footerContainer: {
        alignItems: 'center',
        marginTop: scaleWidth375(10),
        marginHorizontal: scaleWidth375(22),
        marginBottom: scaleWidth375(20),
    },
    errorText: {
        color: '#B91C1C',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: scaleWidth375(10),
    },
    button: {
        backgroundColor: theme.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scaleWidth375(12),
        paddingHorizontal: scaleWidth375(22),
        borderRadius: scaleWidth375(8),
        width: '100%',
    },
    auth_button_text: {
        color: '#fff',
        fontSize: scaleWidth375(15),
        fontWeight: '500',
        fontFamily: 'Outfit_600SemiBold',
        marginLeft: scaleWidth375(6),
    },
});

export default UserLogInCredentials;
