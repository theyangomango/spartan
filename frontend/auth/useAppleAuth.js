import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function useAppleAuth() {
  const [isAvailable, setIsAvailable] = useState(Platform.OS === 'ios');

  useEffect(() => {
    let mounted = true;

    if (Platform.OS !== 'ios') {
      setIsAvailable(false);
      return () => { mounted = false; };
    }

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) {
          setIsAvailable(Boolean(available));
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async () => {
    if (!isAvailable) {
      throw new Error('Sign in with Apple is not available on this device.');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      return credential;
    } catch (error) {
      if (error?.code === 'ERR_CANCELED') {
        return null;
      }

      const message = error instanceof Error ? error.message : 'Sign in with Apple failed.';
      throw new Error(message);
    }
  }, [isAvailable]);

  return { signIn, isAvailable };
}
