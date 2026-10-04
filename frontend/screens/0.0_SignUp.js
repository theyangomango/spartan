import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme/mfpDark';
import { scaleWidth375 } from '../helper/scaleSize';

import AuthButton from '../components/auth/AuthButton';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import AppleAuthButton from '../components/auth/AppleAuthButton';
import authBackground from '../assets/AUTH_BACKGROUND.jpg';
import useAuthBackgroundSource from '../hooks/useAuthBackgroundSource';
import useAuthProviderFlow from '../hooks/useAuthProviderFlow';

const HERO_MARGIN_BOTTOM = scaleWidth375(40);
const ACTIONS_MARGIN_TOP = scaleWidth375(16);
const CONTENT_OFFSET = scaleWidth375(18);

const SignUp = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const {
        errorMsg,
        handleSuccess: handleProviderSuccess,
        handleError: handleProviderError,
        clearError,
    } = useAuthProviderFlow(navigation);

    const toLogInScreen = useCallback(() => {
        clearError();
        navigation.navigate('LogIn');
    }, [clearError, navigation]);

    const toNewUserCreationScreen = useCallback(() => {
        clearError();
        navigation.navigate('NewUserCreation');
    }, [clearError, navigation]);

    const backgroundSource = useAuthBackgroundSource();

    return (
        <ImageBackground
            source={backgroundSource}
            defaultSource={authBackground}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={[styles.inner, { paddingBottom: scaleWidth375(120) + insets.bottom }]}>
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>Welcome to Spartan</Text>
                        <Text style={styles.heroSubtitle}>
                            Find your tribe. Lift with purpose. Unlock relentless performance.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        <GoogleAuthButton
                            label="Continue with Google"
                            busyText="Signing up…"
                            onSuccess={handleProviderSuccess}
                            onError={handleProviderError}
                            style={styles.googleButton}
                        />
                        <AppleAuthButton
                            label="Continue with Apple"
                            busyText="Signing up…"
                            onSuccess={handleProviderSuccess}
                            onError={handleProviderError}
                            style={styles.appleButton}
                        />
                        <AuthButton
                            text="Sign up"
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

                <View style={[styles.footer, { bottom: insets.bottom + scaleWidth375(20) }]}>
                    <Text style={styles.footer_regular_text}>Already have an account?</Text>
                    <TouchableOpacity activeOpacity={0.5} onPress={toLogInScreen}>
                        <Text style={styles.log_in_text}>Log in</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    backgroundImage: {
        opacity: 0.62,
    },
    safeArea: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scaleWidth375(26),
        paddingTop: scaleWidth375(92),
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: scaleWidth375(10),
        marginBottom: HERO_MARGIN_BOTTOM,
        marginTop: CONTENT_OFFSET,
    },
    heroTitle: {
        fontSize: scaleWidth375(25),
        fontFamily: 'Poppins_700Bold',
        color: theme.textPrimary,
        marginBottom: scaleWidth375(20),
    },
    heroSubtitle: {
        fontSize: scaleWidth375(13.5),
        textAlign: 'center',
        fontFamily: 'Nunito_700Bold',
        color: '#ffffffd2',
        lineHeight: scaleWidth375(21),
        marginHorizontal: scaleWidth375(20),
    },
    actions: {
        width: '100%',
        marginTop: ACTIONS_MARGIN_TOP,
    },
    agreementContainer: {
        alignItems: 'center',
        marginTop: scaleWidth375(12),
    },
    agreementText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleWidth375(12),
        color: theme.textSecondary,
        textAlign: 'center',
    },
    agreementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scaleWidth375(3),
    },
    agreementLink: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(12),
        color: theme.primary,
    },
    errorText: {
        color: '#F87171',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: scaleWidth375(8),
        textAlign: 'center',
    },
    googleButton: {
        backgroundColor: '#fff',
        borderRadius: scaleWidth375(14),
        marginBottom: scaleWidth375(12),
        width: '100%',
    },
    appleButton: {
        marginBottom: scaleWidth375(12),
        width: '100%',
    },
    primaryButton: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
        borderRadius: scaleWidth375(12),
        width: '100%',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: scaleWidth375(13),
        letterSpacing: scaleWidth375(0.4)
    },
    footer: {
        position: 'absolute',
        flexDirection: 'row',
        left: scaleWidth375(28),
        right: scaleWidth375(28),
        height: scaleWidth375(56),
        backgroundColor: theme.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleWidth375(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        paddingHorizontal: scaleWidth375(18),
    },
    footer_regular_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleWidth375(14.5),
        color: theme.textSecondary,
        marginRight: scaleWidth375(4),
    },
    log_in_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(14.5),
        color: theme.primary,
    },
});

export default SignUp;
