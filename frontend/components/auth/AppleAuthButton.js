import React, { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import useAppleAuth from '../../auth/useAppleAuth';
import { upsertAppleUser } from '../../auth/appleAccount';
import scaleSize from '../../helper/scaleSize';

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

  return (
    <View style={[styles.wrapper, style]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={scaleSize(10)}
        onPress={onPress}
        style={styles.button}
        disabled={disabled || busy}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: scaleSize(10),
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    height: scaleSize(48),
  },
});

export default AppleAuthButton;
