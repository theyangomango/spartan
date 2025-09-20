import { useCallback, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_CLIENT_IDS = {
  ios: '962581589411-u112tvocrct1o9b0j7e50e1qv4lam22r.apps.googleusercontent.com',
};

const sanitize = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const baseConfig = {
  expoClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID),
  iosClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) || DEFAULT_CLIENT_IDS.ios,
  androidClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  webClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
};

const fallbackClientId = baseConfig.expoClientId
  || baseConfig.webClientId
  || baseConfig.iosClientId
  || baseConfig.androidClientId;

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const hasAnyClientId = Boolean(fallbackClientId);

const nativeRedirectForClient = (clientId) => (
  clientId ? `com.googleusercontent.apps.${clientId}:/oauthredirect` : undefined
);

export default function useGoogleAuth() {
  const executionEnvironment = Constants.executionEnvironment || 'standalone';
  const isStoreClient = executionEnvironment === 'storeClient';
  const isStandaloneLike = executionEnvironment === 'standalone' || executionEnvironment === 'bare';
  const isUsingExpoProxy = isStoreClient && !isStandaloneLike;
  const nativeClientId = Platform.select({
    ios: baseConfig.iosClientId,
    android: baseConfig.androidClientId,
    default: undefined,
  });
  const proxyClientId = baseConfig.expoClientId || baseConfig.webClientId;
  const effectiveClientId = isUsingExpoProxy
    ? (proxyClientId || nativeClientId || fallbackClientId)
    : (nativeClientId || proxyClientId || fallbackClientId);

  const useProxyDefault = Platform.select({
    web: false,
    default: isUsingExpoProxy && !isStandaloneLike,
  });
  const nativeRedirectUri = nativeRedirectForClient(nativeClientId) || 'spartan://auth';
  const resolvedRedirectUri = AuthSession.makeRedirectUri({
    useProxy: useProxyDefault,
    native: nativeRedirectUri,
  });

  const [request, , promptAsync] = Google.useAuthRequest({
    responseType: 'code',
    usePKCE: true,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolvedRedirectUri,
    ...(baseConfig.expoClientId ? { expoClientId: baseConfig.expoClientId } : {}),
    ...(baseConfig.webClientId ? { webClientId: baseConfig.webClientId } : {}),
    ...(baseConfig.iosClientId || fallbackClientId
      ? { iosClientId: baseConfig.iosClientId || fallbackClientId }
      : {}),
    ...(baseConfig.androidClientId || fallbackClientId
      ? { androidClientId: baseConfig.androidClientId || fallbackClientId }
      : {}),
  });
  const [loading, setLoading] = useState(false);

  const activeClientId = useMemo(() => {
    return effectiveClientId;
  }, [effectiveClientId]);

  const signIn = useCallback(async () => {
    if (!hasAnyClientId) {
      throw new Error('Google Sign-In is not configured. Set your EXPO_PUBLIC_GOOGLE_* client IDs.');
    }
    if (!request) {
      throw new Error('Google Sign-In is still initializing. Please try again.');
    }

    setLoading(true);
    try {
      const useProxy = useProxyDefault;
      const redirectUri = resolvedRedirectUri;
      const result = await promptAsync({ useProxy });
      if (!result) return null;
      if (result.type !== 'success') {
        if (result.type === 'dismiss' || result.type === 'cancel') {
          return null;
        }
        const message = typeof result.error === 'string' && result.error.length > 0
          ? result.error
          : 'Google Sign-In was cancelled.';
        throw new Error(message);
      }

      const authorizationCode = result.params?.code;
      if (!authorizationCode) {
        throw new Error('Google Sign-In did not return an authorization code.');
      }

      if (!request?.codeVerifier) {
        throw new Error('Missing PKCE code verifier. Please try again.');
      }

      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code: authorizationCode,
          clientId: activeClientId,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        DISCOVERY,
      );

      const accessToken = tokenResponse?.accessToken;
      if (!accessToken) {
        throw new Error('Google Sign-In token exchange failed.');
      }

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const debugBody = await response.text().catch(() => '');
        throw new Error(debugBody || 'Unable to fetch Google profile.');
      }

      const profile = await response.json();
      if (!profile || !profile.id) {
        throw new Error('Google profile response was missing required fields.');
      }

      return profile;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  }, [activeClientId, hasAnyClientId, promptAsync, request, resolvedRedirectUri, useProxyDefault]);

  return { signIn, loading, isConfigured: hasAnyClientId };
}
