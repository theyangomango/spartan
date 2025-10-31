import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Image } from 'react-native';
import useGoogleAuth from '../../auth/useGoogleAuth';
import { upsertGoogleUser } from '../../auth/googleAccount';
import AuthButton from './AuthButton';
import scaleSize from '../../helper/scaleSize';

const DEFAULT_LABEL = 'Continue with Google';
const DEFAULT_BUSY_LABEL = 'Signing in…';

const GoogleAuthButton = ({
  label = DEFAULT_LABEL,
  busyText = DEFAULT_BUSY_LABEL,
  onSuccess,
  onError,
  disabled,
  style,
}) => {
  const { signIn, isConfigured } = useGoogleAuth();
  const [busy, setBusy] = useState(false);

  const handleError = useCallback((message) => {
    if (typeof onError === 'function') {
      onError(message);
    } else {
      Alert.alert('Google Sign-In', message);
    }
  }, [onError]);

  const handleSuccess = useCallback((payload) => {
    if (typeof onSuccess === 'function') {
      onSuccess(payload);
    }
  }, [onSuccess]);

  const onPress = useCallback(async () => {
    if (busy) return;

    if (!isConfigured) {
      handleError('Add your EXPO_PUBLIC_GOOGLE_* client IDs to enable Google auth.');
      return;
    }
    setBusy(true);
    try {
      const profile = await signIn();
      if (!profile) return;

      const result = await upsertGoogleUser(profile);
      handleSuccess(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      handleError(message);
    } finally {
      setBusy(false);
    }
  }, [busy, handleError, handleSuccess, isConfigured, signIn]);

  const buttonText = !isConfigured
    ? 'Google setup required'
    : (busy ? busyText : label);

  return (
    <AuthButton
      iconComponent={(
        <Image
          source={require('../../assets/google_g_logo.png')}
          style={styles.googleIcon}
        />
      )}
      text={buttonText}
      onPress={onPress}
      disabled={disabled || busy || !isConfigured}
      style={[styles.button, style]}
      textStyle={styles.buttonText}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: scaleSize(1.2),
    borderRadius: scaleSize(10),
    paddingVertical: scaleSize(13.5),
  },
  buttonText: {
    color: '#3b3e47ff',
    fontSize: scaleSize(14),
    fontFamily: 'Nunito_800ExtraBold',
  },
  googleIcon: {
    width: scaleSize(20),
    height: scaleSize(20),
    resizeMode: 'contain',
  },
});

export default GoogleAuthButton;
