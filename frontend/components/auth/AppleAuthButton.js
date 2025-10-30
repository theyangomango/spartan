import React, { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import useAppleAuth from '../../auth/useAppleAuth';
import { upsertAppleUser } from '../../auth/appleAccount';
import scaleSize from '../../helper/scaleSize';
import AuthButton from './AuthButton';

const AppleAuthButton = ({
  onSuccess,
  onError,
  disabled,
  style,
  shouldProceed,
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

    let proceedPayload;
    try {
      if (typeof shouldProceed === 'function') {
        proceedPayload = await shouldProceed();
        if (!proceedPayload) {
          return;
        }
      }
    } catch (preCheckError) {
      console.warn('Apple auth pre-check failed:', preCheckError?.message || preCheckError);
      return;
    }

    if (!isAvailable) {
      handleError(
        Platform.OS === 'ios'
          ? 'Sign in with Apple is not available on this device.'
          : 'Sign in with Apple is only available on iOS devices.'
      );
      return;
    }

    setBusy(true);
    try {
      const credential = await signIn();
      if (!credential) return;

      const preferredHandle = (() => {
        if (typeof proceedPayload === 'string') return proceedPayload;
        if (proceedPayload && typeof proceedPayload === 'object') {
          if (typeof proceedPayload.preferredHandle === 'string') {
            return proceedPayload.preferredHandle;
          }
          if (typeof proceedPayload.handle === 'string') {
            return proceedPayload.handle;
          }
        }
        return undefined;
      })();

      const result = await upsertAppleUser(credential, { preferredHandle });
      handleSuccess(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in with Apple failed. Please try again.';
      handleError(message);
    } finally {
      setBusy(false);
    }
  }, [busy, handleError, handleSuccess, isAvailable, shouldProceed, signIn]);

  if (!isAvailable) {
    return null;
  }

  const buttonText = busy ? 'Signing in…' : 'Sign in with Apple';

  return (
    <AuthButton
      icon="logo-apple"
      iconColor="#f5f6f9"
      text={buttonText}
      onPress={onPress}
      disabled={disabled || busy}
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
