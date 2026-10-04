import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import useAppleAuth from '../../auth/useAppleAuth';
import { signInWithAppleCredential } from '../../auth/appleAccount';
import scaleSize from '../../helper/scaleSize';
import AuthButton from './AuthButton';

const DEFAULT_LABEL = 'Continue with Apple';
const DEFAULT_BUSY_LABEL = 'Signing in…';

const AppleAuthButton = ({
  label = DEFAULT_LABEL,
  busyText = DEFAULT_BUSY_LABEL,
  onSuccess,
  onError,
  style,
}) => {
  const { signIn, isAvailable } = useAppleAuth();
  const [busy, setBusy] = useState(false);

  const handleError = useCallback((message) => {
    if (typeof onError === 'function') {
      onError(message);
    } else {
      Alert.alert('Sign in with Apple', message);
    }
  }, [onError]);

  const handleSuccess = useCallback((payload) => {
    if (typeof onSuccess === 'function') {
      onSuccess(payload);
    }
  }, [onSuccess]);

  const onPress = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    try {
      const response = await signIn();
      if (!response) return;

      const result = await signInWithAppleCredential(response);
      handleSuccess({ provider: 'apple', ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in with Apple failed. Please try again.';
      handleError(message);
    } finally {
      setBusy(false);
    }
  }, [busy, handleError, handleSuccess, signIn]);

  if (!isAvailable) {
    return null;
  }

  const buttonText = busy ? busyText : label;

  return (
    <AuthButton
      icon="logo-apple"
      iconColor="#f5f6f9"
      text={buttonText}
      onPress={onPress}
      disabled={busy}
      style={[styles.button, style]}
      textStyle={styles.buttonText}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#121316',
    borderRadius: scaleSize(14),
    borderWidth: scaleSize(1.1),
    borderColor: '#1f2025',
    paddingVertical: scaleSize(13.5),
  },
  buttonText: {
    color: '#f5f6f9',
    fontSize: scaleSize(14),
    fontFamily: 'Nunito_800ExtraBold',
  },
});

export default AppleAuthButton;
