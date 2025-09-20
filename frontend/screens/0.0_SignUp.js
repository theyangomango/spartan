import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';
import theme from '../theme/mfpDark';

import scaleSizeFont from "../helper/scaleSize";
import useGoogleAuth from '../auth/useGoogleAuth';
import { upsertGoogleUser } from '../auth/googleAccount';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const SignUp = ({ navigation, route }) => {
    const [googleBusy, setGoogleBusy] = useState(false);
    const { signIn: startGoogleSignIn, isConfigured: isGoogleConfigured } = useGoogleAuth();

    const toLogInScreen = useCallback(() => {
        navigation.navigate('LogIn');
    }, [navigation]);

    const toNewUserCreationScreen = useCallback(() => {
        navigation.navigate('NewUserCreation');
    }, [navigation]);

    const handleGoogleSignUp = useCallback(async () => {
        if (!isGoogleConfigured) {
            Alert.alert('Google Sign-In', 'Add your EXPO_PUBLIC_GOOGLE_* client IDs to enable Google auth.');
            return;
        }
        if (googleBusy) return;
        setGoogleBusy(true);
        try {
            const profile = await startGoogleSignIn();
            if (!profile) return;

            await upsertGoogleUser(profile);

            try {
                const { jumpToTab } = require('../../navigationRef');
                if (jumpToTab) {
                    jumpToTab('Workout');
                    return;
                }
            } catch {}
            navigation.navigate('Tabs', { screen: 'Workout' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
            Alert.alert('Google Sign-In', message);
        } finally {
            setGoogleBusy(false);
        }
    }, [googleBusy, navigation, startGoogleSignIn]);

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}></View>
            <View style={styles.top_ctnr}>
                <Text style={styles.title}>Sign Up for Spartan</Text>
                <Text style={styles.subtitle}>
                    Create an account to view posts, track workouts, connect with friends, and more.
                </Text>
            </View>

            <View style={styles.bottomContainer}>
                <AuthButton icon="person" text="Phone / Email" onPress={toNewUserCreationScreen} />
                <AuthButton
                    icon="logo-google"
                    text={!isGoogleConfigured ? 'Google setup required' : (googleBusy ? 'Signing in…' : 'Continue with Google')}
                    onPress={handleGoogleSignUp}
                    disabled={googleBusy || !isGoogleConfigured}
                />

                <View pointerEvents="none" style={{ opacity: 0.4 }}>
                    <AuthButton icon="logo-apple" text="Continue with Apple" onPress={() => {}} disabled />
                    <AuthButton icon="logo-instagram" text="Continue with Instagram" onPress={() => {}} disabled />
                    <AuthButton icon="logo-facebook" text="Continue with Facebook" onPress={() => {}} disabled />
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footer_regular_text}>Already have an account? </Text>
                <TouchableOpacity activeOpacity={0.5} onPress={toLogInScreen}>
                    <Text style={styles.log_in_text}> Log in</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const AuthButton = ({ icon, text, onPress, disabled = false }) => (
    <RNBounceable
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
    >
        <Ionicons name={icon} size={scaleSize(19)} color={theme.textPrimary} style={styles.icon} />
        <Text style={styles.auth_button_text}>{text}</Text>
    </RNBounceable>
);

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
        left: scaleSizeFont(15),
        right: scaleSizeFont(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    top_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleSize(21), // Scaled font size
        fontFamily: 'Poppins_600SemiBold',
        marginLeft: scaleSize(1),
        marginBottom: scaleSize(10),
        color: theme.textPrimary,
    },
    subtitle: {
        fontSize: scaleSize(12), // Scaled font size
        marginHorizontal: scaleSize(45),
        textAlign: 'center',
        fontFamily: 'Mulish_400Regular',
        marginBottom: scaleSize(15),
        color: theme.textSecondary,
    },
    bottomContainer: {
        marginHorizontal: scaleSize(25),
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: scaleSize(1.3),
        borderColor: theme.hairline,
        backgroundColor: theme.field,
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(8),
        marginVertical: scaleSize(7),
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.55,
    },
    icon: {
        position: 'absolute',
        left: scaleSize(17),
    },
    auth_button_text: {
        fontSize: scaleSize(14.5),
        fontFamily: 'SourceSansPro_600SemiBold',
        color: theme.textPrimary,
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
    log_in_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: theme.primary,
    },
});

export default SignUp;
