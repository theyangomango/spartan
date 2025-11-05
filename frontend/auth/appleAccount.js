import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { prepareProfileForAuth } from '../services/userProfileService';

const appleProvider = new OAuthProvider('apple.com');

const PROVIDER_ID = 'apple.com';

const HANDLE_FIELDS = ['handle', 'handleLower', 'handle_lower', 'username', 'usernameLower', 'username_lower', 'tag', 'tagLower', 'tag_lower'];

const resolveHandle = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const field of HANDLE_FIELDS) {
      const value = source[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return '';
};

export async function signInWithAppleCredential({ credential, rawNonce }) {
  if (!credential?.identityToken) {
    throw new Error('Missing Apple identity token.');
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
  const existingHandle = resolveHandle(prepared?.publicProfile, prepared?.legacyProfile, prepared?.privateProfile, profilePayload, credential);
  const requiresHandle = isNewUser === false ? false : (!existingHandle && !!prepared?.requiresHandle);
  let publicProfile = prepared?.publicProfile || null;
  if (publicProfile && existingHandle && !publicProfile.handle) {
    publicProfile = { ...publicProfile, handle: existingHandle };
  }

  return {
    user,
    isNewUser,
    requiresHandle,
    publicProfile,
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
