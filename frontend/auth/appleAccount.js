import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { prepareProfileForAuth } from '../services/userProfileService';
import { extractEmailFromIdToken, shouldDeferByEmail } from './socialAuthUtils';

const appleProvider = new OAuthProvider('apple.com');

const PROVIDER_ID = 'apple.com';

function buildPendingProfile(credential = {}) {
  return {
    displayName: resolveDisplayName(credential) || '',
    photoURL: '',
    email: credential?.email || '',
    emailVerified: true,
    providerId: PROVIDER_ID,
  };
}

export async function signInWithAppleCredential({ credential, rawNonce }) {
  if (!credential?.identityToken) {
    throw new Error('Missing Apple identity token.');
  }

  const email = credential?.email || extractEmailFromIdToken(credential.identityToken);
  const deferAuth = await shouldDeferByEmail(email);
  if (deferAuth) {
    const pendingProfile = buildPendingProfile(credential);
    return {
      user: null,
      isNewUser: true,
      requiresHandle: true,
      publicProfile: null,
      pendingProfile,
      provider: 'apple',
      pendingSocialAuth: {
        providerId: PROVIDER_ID,
        credential: {
          identityToken: credential.identityToken,
        },
        rawNonce: rawNonce || null,
        profile: pendingProfile,
      },
    };
  }

  const firebaseCredential = appleProvider.credential({
    idToken: credential.identityToken,
    rawNonce,
  });
  const userCredential = await signInWithCredential(auth, firebaseCredential);
  const user = userCredential.user;
  const isNewUser = userCredential.additionalUserInfo?.isNewUser ?? null;

  const profilePayload = {
    displayName: user.displayName || resolveDisplayName(credential),
    photoURL: user.photoURL || '',
    email: user.email || credential?.email || '',
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
    provider: 'apple',
  };
}

function resolveDisplayName(appleCredential) {
  if (!appleCredential?.fullName) return '';
  const { givenName, familyName, nickname } = appleCredential.fullName;
  const segments = [givenName, familyName].map((value) => (value || '').trim()).filter(Boolean);
  if (segments.length) {
    return segments.join(' ');
  }
  return typeof nickname === 'string' ? nickname.trim() : '';
}
