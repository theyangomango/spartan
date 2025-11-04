import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

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
      const rawNonceBytes = await Crypto.getRandomBytesAsync(16);
      const rawNonce = Array.from(rawNonceBytes, (b) => b.toString(16).padStart(2, '0')).join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      return { credential, rawNonce };
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
