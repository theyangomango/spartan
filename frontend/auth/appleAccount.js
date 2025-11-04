import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { prepareProfileForAuth } from '../services/userProfileService';

const appleProvider = new OAuthProvider('apple.com');

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

  const profilePayload = {
    displayName: user.displayName || resolveDisplayName(credential),
    photoURL: user.photoURL || '',
    email: user.email || credential?.email || '',
    emailVerified: user.emailVerified,
    providerId: 'apple.com',
  };

  const prepared = await prepareProfileForAuth(profilePayload);

  return {
    user,
    requiresHandle: !!prepared?.requiresHandle,
    publicProfile: prepared?.publicProfile || null,
    pendingProfile: prepared?.pendingProfile || null,
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
