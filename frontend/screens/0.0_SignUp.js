import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme/mfpDark';

import AuthButton from '../components/auth/AuthButton';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import AppleAuthButton from '../components/auth/AppleAuthButton';
import authBackground from '../assets/AUTH_BACKGROUND.jpg';

const { width: screenWidth } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const HERO_MARGIN_BOTTOM = scaleSize(40);
const ACTIONS_MARGIN_TOP = scaleSize(16);
const CONTENT_OFFSET = scaleSize(18);

const SignUp = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const toLogInScreen = useCallback(() => {
        navigation.navigate('LogIn');
    }, [navigation]);

    const toNewUserCreationScreen = useCallback(() => {
        navigation.navigate('NewUserCreation');
    }, [navigation]);

    const handleProviderSuccess = useCallback((result) => {
        if (result?.pendingUser) {
            navigation.navigate('CreateUsername', {
                pendingUser: result.pendingUser,
                initialHandle: result.pendingUser?.suggestedHandle || '',
                nextRoute: 'Tabs',
            });
            return;
        }

        const user = result?.user;
        try {
            navigation.navigate('Tabs');
        } catch {}
    }, [navigation]);

    return (
        <ImageBackground
            source={authBackground}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={[styles.inner, { paddingBottom: scaleSize(120) + insets.bottom }]}>
                    <View style={[styles.heroSection, { marginBottom: HERO_MARGIN_BOTTOM, marginTop: CONTENT_OFFSET }]}>
                        <Text style={styles.heroTitle}>Welcome to Spartan</Text>
                        <Text style={styles.heroSubtitle}>
                            Find your tribe. Lift with purpose. Unlock relentless performance.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <GoogleAuthButton
                            onSuccess={handleProviderSuccess}
                            style={styles.googleButton}
                        />
                        <AppleAuthButton
                            onSuccess={handleProviderSuccess}
                            style={styles.appleButton}
                        />
                        <AuthButton
                            text="Continue with Email"
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
        paddingHorizontal: scaleSize(26),
        paddingTop: scaleSize(92),
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(10),
        marginBottom: HERO_MARGIN_BOTTOM,
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
    googleButton: {
        backgroundColor: '#fff',
        borderRadius: scaleSize(14),
        marginBottom: scaleSize(12),
        width: '100%',
    },
    appleButton: {
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
        fontSize: scaleSize(13),
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
