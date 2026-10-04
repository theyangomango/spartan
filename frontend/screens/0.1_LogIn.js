import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme/mfpDark';
import { scaleWidth375 } from '../helper/scaleSize';
import useAuthProviderFlow from '../hooks/useAuthProviderFlow';
import AuthButton from '../components/auth/AuthButton';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import AppleAuthButton from '../components/auth/AppleAuthButton';
import authBackground from '../assets/AUTH_BACKGROUND.jpg';
import useAuthBackgroundSource from '../hooks/useAuthBackgroundSource';

const HERO_TARGET_GAP = scaleWidth375(125);
const USERNAME_APPROX_HEIGHT = scaleWidth375(70); // mirrors SignUp username block height
const USERNAME_CONTAINER_MARGIN = scaleWidth375(16);
const MIN_HERO_MARGIN = scaleWidth375(20);
const HERO_MARGIN_BOTTOM = Math.max(
    MIN_HERO_MARGIN,
    HERO_TARGET_GAP - (USERNAME_APPROX_HEIGHT + USERNAME_CONTAINER_MARGIN)
);

const ACTIONS_MARGIN_TOP = scaleWidth375(12);

const LogIn = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const {
        errorMsg,
        handleSuccess: handleProviderSuccess,
        handleError: handleProviderError,
        clearError,
    } = useAuthProviderFlow(navigation);

    const toSignUpScreen = useCallback(() => {
        clearError();
        navigation.navigate('SignUp');
    }, [clearError, navigation]);

    const toUserLogInCredentials = useCallback(() => {
        clearError();
        navigation.navigate('UserLogInCredentials');
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
                <TouchableOpacity
                    style={[styles.backButton, { top: insets.top + scaleWidth375(6) }]}
                    onPress={toSignUpScreen}
                    activeOpacity={0.6}
                >
                    <Ionicons name="chevron-back" size={scaleWidth375(24)} color={theme.textSecondary} />
                </TouchableOpacity>

                <View style={[styles.inner, { paddingBottom: scaleWidth375(120) + insets.bottom }]}>
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>Log in to Spartan</Text>
                        <Text style={styles.heroSubtitle}>
                            Log in to track macros, see friends' workouts, and more.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        <GoogleAuthButton
                            label="Continue with Google"
                            busyText="Logging in…"
                            onSuccess={handleProviderSuccess}
                            onError={handleProviderError}
                            style={styles.googleButton}
                        />
                        <AppleAuthButton
                            label="Continue with Apple"
                            busyText="Logging in…"
                            onSuccess={handleProviderSuccess}
                            onError={handleProviderError}
                            style={styles.appleButton}
                        />
                        <AuthButton
                            text="Log in with Email / Phone"
                            onPress={toUserLogInCredentials}
                            style={styles.primaryButton}
                            textStyle={styles.primaryButtonText}
                        />
                    </View>
                </View>

                <View style={[styles.footer, { bottom: insets.bottom + scaleWidth375(20) }]}>
                    <Text style={styles.footer_regular_text}>Don't have an account?</Text>
                    <TouchableOpacity activeOpacity={0.5} onPress={toSignUpScreen}>
                        <Text style={styles.sign_up_text}> Sign Up</Text>
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
    backButton: {
        position: 'absolute',
        left: scaleWidth375(16),
        padding: scaleWidth375(8),
        zIndex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scaleWidth375(26),
        paddingTop: scaleWidth375(70),
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: scaleWidth375(10),
        marginBottom: HERO_MARGIN_BOTTOM,
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
    errorText: {
        color: '#F87171',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: scaleWidth375(8),
        textAlign: 'center',
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
        letterSpacing: scaleWidth375(0.4),
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
    sign_up_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(14.5),
        color: theme.primary,
    },
});

export default LogIn;
