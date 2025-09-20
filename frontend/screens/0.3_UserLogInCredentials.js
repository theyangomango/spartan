import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons, Octicons, Feather } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import readDoc from '../../backend/helper/firebase/readDoc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useGoogleAuth from '../auth/useGoogleAuth';
import { upsertGoogleUser } from '../auth/googleAccount';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const UserLogInCredentials = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [googleBusy, setGoogleBusy] = useState(false);
    const usersRef = useRef(null);
    const { signIn: startGoogleSignIn, isConfigured: isGoogleConfigured } = useGoogleAuth();

    const emailOrPhoneInputRef = useRef(null);

    // Ensure keyboard is always open
    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (Platform.OS === 'android') {
                emailOrPhoneInputRef.current?.focus();
            }
        });

        return () => {
            showSubscription.remove();
        };
    }, []);

    useEffect(() => {
        readDoc('global', 'users')
            .then(data => {
                usersRef.current = data.all;
            })
    }, []);

    function goBack() {
        navigation.goBack();
    }

    function logIn() {
        const input = emailOrPhone.trim().toLowerCase();
        const enteredPassword = password.trim();
        setErrorMsg('');

        if (!input || !enteredPassword) {
            setErrorMsg('Enter your username/email/phone and password.');
            return;
        }

        if (usersRef.current) {
            // Loop through the users to find a match
            const user = usersRef.current.find(user => {
                const emailMatch = !!user?.email && String(user.email).toLowerCase() === input;
                const phoneMatch = !!user?.phoneNumber && String(user.phoneNumber).toLowerCase() === input;
                const handleMatch = !!user?.handle && String(user.handle).toLowerCase() === input;
                const passwordMatch = user?.password === enteredPassword;

                // Allow login by handle, email, or phone, but only if the relevant
                // property exists (guards against null email/phoneNumber).
                return (emailMatch || phoneMatch || handleMatch) && passwordMatch;
            });

            if (user) {
                // Successfully found a matching user
                console.log('Login successful', user.uid);
                AsyncStorage.setItem('uid', user.uid, () => {
                    console.log('async storage set uid');
                });
                try { global.setAuthUid?.(user.uid); } catch {}
                try {
                    const { jumpToTab } = require('../../navigationRef');
                    jumpToTab('Workout');
                } catch {
                    navigation.navigate('Tabs', { screen: 'Workout' });
                }
            } else {
                // No matching user found
                console.log('Login failed: Invalid credentials');
                setErrorMsg('Invalid credentials. Please try again.');
            }
        } else {
            console.log('Login failed: No user data available');
            setErrorMsg('Unable to load users. Check your connection.');
        }
    }

    async function logInWithGoogle() {
        if (!isGoogleConfigured) {
            setErrorMsg('Google sign-in is not configured yet.');
            return;
        }
        if (googleBusy) return;
        setErrorMsg('');
        setGoogleBusy(true);
        try {
            const profile = await startGoogleSignIn();
            if (!profile) return;

            await upsertGoogleUser(profile);

            try {
                const { jumpToTab } = require('../../navigationRef');
                jumpToTab('Workout');
            } catch {
                navigation.navigate('Tabs', { screen: 'Workout' });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
            setErrorMsg(message);
        } finally {
            setGoogleBusy(false);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <RNBounceable onPress={goBack}>
                        <Feather name="chevron-left" size={scaleSize(27)} color={theme.textSecondary} style={styles.backIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Username / Email / Phone Number</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your username, email, or phone"
                            placeholderTextColor={theme.textSecondary}
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
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
                        <RNBounceable style={styles.button} onPress={logIn}>
                            <Text style={styles.auth_button_text}>Continue</Text>
                        </RNBounceable>
                        <RNBounceable
                            style={[styles.googleButton, (googleBusy || !isGoogleConfigured) && styles.googleButtonDisabled]}
                            onPress={logInWithGoogle}
                            disabled={googleBusy || !isGoogleConfigured}
                        >
                            <Ionicons name="logo-google" size={scaleSize(19)} color={theme.textPrimary} style={styles.googleIcon} />
                            <Text style={styles.googleButtonText}>
                                {!isGoogleConfigured ? 'Google setup required' : (googleBusy ? 'Signing in…' : 'Continue with Google')}
                            </Text>
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
        backgroundColor: require('../theme/mfpDark').default.bg,
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: scaleSize(15),
        right: scaleSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    backIcon: {
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(6),
    },
    helpIcon: {
        padding: scaleSize(8),
    },
    formWrapper: {
        flex: 1,
        paddingTop: scaleSize(screenHeight * 0.15),
    },
    formContainer: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(22),
    },
    title: {
        fontSize: scaleSize(15),
        fontWeight: '400',
        color: require('../theme/mfpDark').default.textPrimary,
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
        backgroundColor: require('../theme/mfpDark').default.field,
        fontSize: scaleSize(14),
        color: require('../theme/mfpDark').default.textPrimary,
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
        backgroundColor: require('../theme/mfpDark').default.primary,
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
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: scaleSize(1.1),
        borderColor: require('../theme/mfpDark').default.hairline,
        backgroundColor: require('../theme/mfpDark').default.field,
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(8),
        marginTop: scaleSize(12),
        justifyContent: 'center',
        width: '100%',
    },
    googleButtonDisabled: {
        opacity: 0.6,
    },
    googleButtonText: {
        fontSize: scaleSize(15),
        fontFamily: 'Outfit_600SemiBold',
        color: require('../theme/mfpDark').default.textPrimary,
    },
    googleIcon: {
        position: 'absolute',
        left: scaleSize(16),
    },
});

export default UserLogInCredentials;
