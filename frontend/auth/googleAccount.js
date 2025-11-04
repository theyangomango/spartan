import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { prepareProfileForAuth } from '../services/userProfileService';

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
    providerId: 'google.com',
  };

  const prepared = await prepareProfileForAuth(profilePayload);

  return {
    user,
    isNewUser,
    requiresHandle: !!prepared?.requiresHandle,
    publicProfile: prepared?.publicProfile || null,
    pendingProfile: prepared?.pendingProfile || null,
  };
}
