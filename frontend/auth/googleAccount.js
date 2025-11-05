import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { prepareProfileForAuth } from '../services/userProfileService';

const PROVIDER_ID = 'google.com';

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

export async function signInWithGoogleResponse({ profile, tokens }) {
  if (!tokens?.idToken) {
    throw new Error('Missing Google ID token.');
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
  const existingHandle = resolveHandle(prepared?.publicProfile, prepared?.legacyProfile, prepared?.privateProfile, profilePayload, profile);
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
    provider: 'google',
  };
}
