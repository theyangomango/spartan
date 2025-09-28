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
import authBackground from '../assets/AUTH_BACKGROUND.jpg';

const { width: screenWidth } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const SignUp = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const toLogInScreen = useCallback(() => {
        navigation.navigate('LogIn');
    }, [navigation]);

    const toNewUserCreationScreen = useCallback(() => {
        navigation.navigate('NewUserCreation');
    }, [navigation]);

    const handleGoogleSuccess = useCallback(() => {
        try {
            const { jumpToTab } = require('../../navigationRef');
            if (jumpToTab) {
                jumpToTab('Workout');
                return;
            }
        } catch {}
        navigation.navigate('Tabs', { screen: 'Workout' });
    }, [navigation]);

    return (
        <ImageBackground
            source={authBackground}
            style={styles.background}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={[styles.inner, { paddingBottom: scaleSize(120) + insets.bottom }]}>
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>Welcome to Spartan</Text>
                        <Text style={styles.heroSubtitle}>
                            Lift with purpose. Rally your crew. Unlock relentless performance.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <GoogleAuthButton
                            onSuccess={handleGoogleSuccess}
                            style={styles.googleButton}
                        />
                        <AuthButton
                            text="Continue"
                            onPress={toNewUserCreationScreen}
                            style={styles.primaryButton}
                            textStyle={styles.primaryButtonText}
                        />
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
    safeArea: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scaleSize(22),
        paddingTop: scaleSize(70),
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(10),
        marginBottom: scaleSize(85),
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
        lineHeight: scaleSize(20),
        marginHorizontal: scaleSize(20)
    },
    actions: {
        width: '100%',
        marginTop: scaleSize(12),
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
