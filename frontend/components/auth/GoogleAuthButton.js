import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import useGoogleAuth from '../../auth/useGoogleAuth';
import { upsertGoogleUser } from '../../auth/googleAccount';
import AuthButton from './AuthButton';

const DEFAULT_LABEL = 'Continue with Google';

const GoogleAuthButton = ({
  label = DEFAULT_LABEL,
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
    if (!isConfigured) {
      handleError('Add your EXPO_PUBLIC_GOOGLE_* client IDs to enable Google auth.');
      return;
    }
    if (busy) return;
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
    : (busy ? 'Signing in…' : label);

  return (
    <AuthButton
      icon="logo-google"
      text={buttonText}
      onPress={onPress}
      disabled={disabled || busy || !isConfigured}
      style={style}
    />
  );
};

export default GoogleAuthButton;
