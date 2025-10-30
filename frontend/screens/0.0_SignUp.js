import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ImageBackground,
    TextInput,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme/mfpDark';

import AuthButton from '../components/auth/AuthButton';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import authBackground from '../assets/AUTH_BACKGROUND.jpg';
import readDoc from '../../backend/helper/firebase/readDoc';

const { width: screenWidth } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const isValidUsername = (value) => /^[a-z0-9_.]{6,20}$/.test(value);
const HERO_TARGET_GAP = scaleSize(125);
const ACTIONS_MARGIN_TOP = scaleSize(12);
const USERNAME_CONTAINER_MARGIN_BOTTOM = scaleSize(16);
const MIN_HERO_MARGIN = scaleSize(20);

const SignUp = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const checkingUsernameRef = useRef(false);
    const usernameInputRef = useRef(null);
    const [usernameHeight, setUsernameHeight] = useState(0);
    const insets = useSafeAreaInsets();

    const dismissKeyboard = useCallback(() => {
        usernameInputRef.current?.blur();
        Keyboard.dismiss();
    }, []);

    const toLogInScreen = useCallback(() => {
        navigation.navigate('LogIn');
    }, [navigation]);

    const ensureUsernameReady = useCallback(async () => {
        if (checkingUsernameRef.current) {
            return null;
        }

        const trimmedUsername = username.trim();
        const normalizedUsername = trimmedUsername.toLowerCase();

        if (!trimmedUsername) {
            setUsernameError('Please create a username to continue.');
            return null;
        }

        if (!isValidUsername(normalizedUsername)) {
            setUsernameError('Username must be 6–20 characters (a–z, 0–9, _ or .).');
            return null;
        }

        dismissKeyboard();
        setUsernameError('');
        checkingUsernameRef.current = true;

        try {
            const users = await readDoc('global', 'users');
            const existing = Array.isArray(users?.all) ? users.all : [];
            const handleExists = existing.some(
                (user) => String(user?.handle || '').toLowerCase() === normalizedUsername
            );

            if (handleExists) {
                setUsernameError('Username is already taken.');
                return null;
            }

            return normalizedUsername;
        } catch (error) {
            console.warn('Username availability check failed:', error?.message || error);
            setUsernameError('Unable to verify username right now. Please try again.');
            return null;
        } finally {
            checkingUsernameRef.current = false;
        }
    }, [dismissKeyboard, username]);

    const toNewUserCreationScreen = useCallback(async () => {
        const normalizedUsername = await ensureUsernameReady();
        if (!normalizedUsername) {
            return;
        }

        navigation.navigate('NewUserCreation', { username: normalizedUsername });
    }, [ensureUsernameReady, navigation]);

    const handleGoogleSuccess = useCallback(() => {
        try {
            navigation.navigate('Tabs');
        } catch {}
    }, [navigation]);

    const handleUsernameChange = useCallback((value) => {
        const sanitized = value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase();
        setUsernameError('');
        setUsername(sanitized.slice(0, 20));
    }, []);

    const heroMarginBottom = Math.max(
        MIN_HERO_MARGIN,
        HERO_TARGET_GAP - (usernameHeight + USERNAME_CONTAINER_MARGIN_BOTTOM)
    );

    return (
        <ImageBackground
            source={authBackground}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            resizeMode="cover"
        >
            <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    <View style={[styles.inner, { paddingBottom: scaleSize(120) + insets.bottom }]}>
                        <View style={[styles.heroSection, { marginBottom: heroMarginBottom }]}>
                            <Text style={styles.heroTitle}>Welcome to Spartan</Text>
                            <Text style={styles.heroSubtitle}>
                                Find your tribe. Lift with purpose. Unlock relentless performance.
                            </Text>
                        </View>

                        <View
                            style={styles.usernameContainer}
                            onLayout={({ nativeEvent }) => {
                                const { height } = nativeEvent.layout;
                                if (Math.abs(height - usernameHeight) > 1) {
                                    setUsernameHeight(height);
                                }
                            }}
                        >
                            <Text style={styles.usernameLabel}>Create a Username</Text>
                            <View style={[styles.usernameInputWrapper, usernameError && styles.usernameInputError]}>
                                <Text style={styles.usernamePrefix}>@</Text>
                                <TextInput
                                    ref={usernameInputRef}
                                    value={username}
                                    onChangeText={handleUsernameChange}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder="yourusername"
                                    placeholderTextColor={theme.textSecondary}
                                    style={styles.usernameInput}
                                    returnKeyType="done"
                                />
                            </View>
                            <Text
                                style={[
                                    styles.usernameError,
                                    !usernameError && styles.usernameErrorHidden,
                                ]}
                            >
                                {usernameError || 'placeholder'}
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            <GoogleAuthButton
                                onSuccess={handleGoogleSuccess}
                                style={styles.googleButton}
                                shouldProceed={ensureUsernameReady}
                            />
                            <AuthButton
                                text="Continue"
                                onPress={toNewUserCreationScreen}
                                style={styles.primaryButton}
                                textStyle={styles.primaryButtonText}
                            />
                        </View>

                        <View style={styles.agreementContainer}>
                            <Text style={styles.agreementText}>By signing up, I agree to the</Text>
                            <View style={styles.agreementRow}>
                                <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                                    <Text style={styles.agreementLink}> Terms of Service</Text>
                                </TouchableOpacity>
                                <Text style={styles.agreementText}> and</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                                    <Text style={styles.agreementLink}> Privacy Policy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.footer, { bottom: insets.bottom + scaleSize(20) }]}>
                        <Text style={styles.footer_regular_text}>Already have an account?</Text>
                        <TouchableOpacity activeOpacity={0.5} onPress={toLogInScreen}>
                            <Text style={styles.log_in_text}>Log in</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    backgroundImage: {
        opacity: 0.75,
    },
    safeArea: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scaleSize(26),
        paddingTop: scaleSize(70),
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(10),
        marginBottom: HERO_TARGET_GAP,
    },
    heroTitle: {
        fontSize: scaleSize(25),
        fontFamily: 'Poppins_700Bold',
        color: theme.textPrimary,
        marginBottom: scaleSize(20),
    },
    heroSubtitle: {
        fontSize: scaleSize(13.5),
        textAlign: 'center',
        fontFamily: 'Nunito_700Bold',
        color: '#ffffffd2',
        lineHeight: scaleSize(21),
        marginHorizontal: scaleSize(20),
    },
    actions: {
        width: '100%',
        marginTop: ACTIONS_MARGIN_TOP,
    },
    agreementContainer: {
        alignItems: 'center',
        marginTop: scaleSize(12),
    },
    agreementText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        textAlign: 'center',
    },
    agreementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scaleSize(3),
    },
    agreementLink: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
        color: theme.primary,
    },
    usernameContainer: {
        width: '100%',
        marginBottom: USERNAME_CONTAINER_MARGIN_BOTTOM,
    },
    usernameLabel: {
        fontFamily: 'Outfit_600SemiBold',
        color: theme.textPrimary,
        fontSize: scaleSize(13.5),
        marginBottom: scaleSize(8),
    },
    usernameInputWrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(12),
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    usernameInput: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(14),
        color: theme.textPrimary,
    },
    usernamePrefix: {
        marginRight: scaleSize(6),
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14),
        color: theme.textSecondary,
    },
    usernameInputError: {
        borderColor: '#F97316',
    },
    usernameError: {
        marginTop: scaleSize(6),
        color: '#F97316',
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12),
    },
    usernameErrorHidden: {
        opacity: 0,
    },
    googleButton: {
        backgroundColor: '#fff',
        borderRadius: scaleSize(14),
        marginBottom: scaleSize(12),
        width: '100%',
    },
    primaryButton: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
        borderRadius: scaleSize(12),
        width: '100%',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: scaleSize(14),
        letterSpacing: scaleSize(0.4)
    },
    footer: {
        position: 'absolute',
        flexDirection: 'row',
        left: scaleSize(28),
        right: scaleSize(28),
        height: scaleSize(56),
        backgroundColor: theme.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        paddingHorizontal: scaleSize(18),
    },
    footer_regular_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(14.5),
        color: theme.textSecondary,
        marginRight: scaleSize(4),
    },
    log_in_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: theme.primary,
    },
});

export default SignUp;
