import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import AuthButton from '../components/auth/AuthButton';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const LogIn = ({ navigation }) => {
    const [errorMsg, setErrorMsg] = useState('');

    const toSignUpScreen = useCallback(() => {
        navigation.navigate('SignUp');
    }, [navigation]);

    const toUserLogInCredentials = useCallback(() => {
        navigation.navigate('UserLogInCredentials');
    }, [navigation]);

    const handleGoogleSuccess = useCallback(() => {
        setErrorMsg('');
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
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <TouchableOpacity onPress={toSignUpScreen} style={styles.closeHitSlop}>
                    <Ionicons name="chevron-back" size={scaleSize(24)} color={theme.textSecondary} />
                </TouchableOpacity>
                {/* Placeholder for future help action */}
            </View>
            <View style={styles.top_ctnr}>
                <Text style={styles.title}>Log In to Spartan</Text>
                <Text style={styles.subtitle}>
                    Log in to see past posts and workouts, message friends, see notifications, and more.
                </Text>
            </View>

            <View style={styles.bottomContainer}>
                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                <AuthButton icon="person" text="Phone / Email / Username" onPress={toUserLogInCredentials} />
                <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setErrorMsg} />

                <View pointerEvents="none" style={{ opacity: 0.4 }}>
                    <AuthButton icon="logo-apple" text="Continue with Apple" disabled />
                    <AuthButton icon="logo-instagram" text="Continue with Instagram" disabled />
                    <AuthButton icon="logo-facebook" text="Continue with Facebook" disabled />
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footer_regular_text}>Don't have an account? </Text>
                <TouchableOpacity activeOpacity={0.5} onPress={toSignUpScreen}>
                    <Text style={styles.sign_up_text}> Sign Up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingBottom: scaleSize(35),
        backgroundColor: theme.bg,
    },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: scaleSize(15),
        right: scaleSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    closeHitSlop: {
        padding: scaleSize(10),
    },
    top_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleSize(21),
        fontFamily: 'Poppins_600SemiBold',
        marginLeft: scaleSize(1),
        marginBottom: scaleSize(10),
        color: theme.textPrimary,
    },
    subtitle: {
        fontSize: scaleSize(12),
        marginHorizontal: scaleSize(45),
        textAlign: 'center',
        fontFamily: 'Mulish_400Regular',
        marginBottom: scaleSize(15),
        color: theme.textSecondary,
    },
    bottomContainer: {
        marginHorizontal: scaleSize(25),
    },
    errorText: {
        color: '#B91C1C',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: scaleSize(8),
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        flexDirection: 'row',
        bottom: '5.5%',
        left: 0,
        right: 0,
        height: scaleSize(68),
        backgroundColor: theme.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    footer_regular_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(14.5),
        color: theme.textSecondary,
    },
    sign_up_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: theme.primary,
    },
});

export default LogIn;
