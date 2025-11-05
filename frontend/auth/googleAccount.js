import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { prepareProfileForAuth } from '../services/userProfileService';
import { extractEmailFromIdToken, shouldDeferByEmail } from './socialAuthUtils';

const PROVIDER_ID = 'google.com';

function buildPendingProfile(profile = {}) {
  return {
    displayName: profile?.name || '',
    photoURL: profile?.picture || '',
    email: profile?.email || '',
    emailVerified: true,
    providerId: PROVIDER_ID,
  };
}

export async function signInWithGoogleResponse({ profile, tokens }) {
  if (!tokens?.idToken) {
    throw new Error('Missing Google ID token.');
  }

  const email = profile?.email || extractEmailFromIdToken(tokens.idToken);
  const deferAuth = await shouldDeferByEmail(email);
  if (deferAuth) {
    const pendingProfile = buildPendingProfile(profile);
    return {
      user: null,
      isNewUser: true,
      requiresHandle: true,
      publicProfile: null,
      pendingProfile,
      provider: 'google',
      pendingSocialAuth: {
        providerId: PROVIDER_ID,
        tokens: {
          idToken: tokens.idToken,
          accessToken: tokens.accessToken || '',
        },
        profile: pendingProfile,
      },
    };
  }

  const credential = GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken);
  const userCredential = await signInWithCredential(auth, credential);
  const user = userCredential.user;
  const isNewUser = userCredential.additionalUserInfo?.isNewUser ?? null;

  if (!user?.uid) {
    throw new Error('Failed to authenticate with Google.');
  }

  const profilePayload = {
    displayName: user.displayName || profile?.name || '',
    photoURL: user.photoURL || profile?.picture || '',
    email: user.email || profile?.email || '',
    emailVerified: user.emailVerified,
    providerId: PROVIDER_ID,
  };

  const prepared = await prepareProfileForAuth(profilePayload);

  return {
    user,
    isNewUser,
    requiresHandle: !!prepared?.requiresHandle,
    publicProfile: prepared?.publicProfile || null,
    pendingProfile: prepared?.pendingProfile || null,
    provider: 'google',
  };
}
