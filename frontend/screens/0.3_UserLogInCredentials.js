import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import { Octicons, Feather } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase.config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const UserLogInCredentials = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [busy, setBusy] = useState(false);

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

    function goBack() {
        navigation.goBack();
    }

    async function logIn() {
    const input = emailOrPhone.trim().toLowerCase();
    const enteredPassword = password.trim();
    setErrorMsg('');

    if (!input || !enteredPassword) {
        setErrorMsg('Enter your email and password.');
        return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input)) {
        setErrorMsg('Enter a valid email address.');
        return;
    }

        setBusy(true);
        try {
            const result = await signInWithEmailAndPassword(auth, input, enteredPassword);
            if (!result.user?.emailVerified) {
                setErrorMsg('Verify your email before continuing.');
                try { await signOut(auth); } catch { }
                return;
            }
            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
        } catch (error) {
            const code = error?.code || '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
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
                        <Feather name="chevron-left" size={scaleSize(27)} color={theme.textSecondary} style={styles.backIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Email</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your email"
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
});

export default UserLogInCredentials;
