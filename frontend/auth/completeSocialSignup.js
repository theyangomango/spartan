import { GoogleAuthProvider, signInWithCredential, OAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { finalizeUserProfile } from '../services/userProfileService';

const appleProvider = new OAuthProvider('apple.com');

async function signInWithGoogle(tokens = {}) {
  if (!tokens?.idToken) {
    throw new Error('Missing Google ID token.');
  }
  const credential = GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken || undefined);
  return signInWithCredential(auth, credential);
}

async function signInWithApple(options = {}) {
  const identityToken = options?.credential?.identityToken;
  if (!identityToken) {
    throw new Error('Missing Apple identity token.');
  }
  const firebaseCredential = appleProvider.credential({
    idToken: identityToken,
    rawNonce: options?.rawNonce || undefined,
  });
  return signInWithCredential(auth, firebaseCredential);
}

export async function completePendingSocialSignup({
  handle,
  profile,
  socialAuth,
} = {}) {
  if (!socialAuth?.providerId) {
    throw new Error('Missing social auth provider.');
  }
  const normalizedHandle = typeof handle === 'string' ? handle.trim() : '';
  if (!normalizedHandle) {
    throw new Error('Handle is required to complete sign-up.');
  }

  let userCredential;
  const providerId = socialAuth.providerId;
  if (providerId === 'google.com') {
    userCredential = await signInWithGoogle(socialAuth.tokens);
  } else if (providerId === 'apple.com') {
    userCredential = await signInWithApple(socialAuth);
  } else {
    throw new Error(`Unsupported social provider: ${providerId}`);
  }

  const preparedProfile = {
    displayName: profile?.displayName || userCredential.user.displayName || '',
    photoURL: profile?.photoURL || userCredential.user.photoURL || '',
    email: profile?.email || userCredential.user.email || '',
    phoneNumber: profile?.phoneNumber || '',
    emailVerified: profile?.emailVerified ?? userCredential.user.emailVerified ?? false,
    providerId,
  };

  const ensure = await finalizeUserProfile({
    handle: normalizedHandle,
    profile: preparedProfile,
  });

  return {
    user: userCredential.user,
    result: ensure,
  };
}
