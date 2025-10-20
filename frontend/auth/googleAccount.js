import AsyncStorage from '@react-native-async-storage/async-storage';
import createDoc from '../../backend/helper/firebase/createDoc';
import readDoc from '../../backend/helper/firebase/readDoc';
import arrayAppend from '../../backend/helper/firebase/arrayAppend';
import incrementDocValue from '../../backend/helper/firebase/incrementDocValue';
import updateDoc from '../../backend/helper/firebase/updateDoc';
import makeID from '../../backend/helper/makeID';
import buildInitialUser from '../utils/buildInitialUser';
import { SPARTAN_ACCOUNT } from '../constants/spartanAccount';

function normalizeHandle(source) {
  if (!source) return '';
  const lowered = source.toLowerCase();
  const safe = lowered.replace(/[^a-z0-9_.]/g, '');
  return safe.slice(0, 20);
}

export async function upsertGoogleUser(profile, options = {}) {
  const { preferredHandle } = options || {};
  const usersSnapshot = await readDoc('global', 'users').catch(() => null);
  const allUsers = Array.isArray(usersSnapshot?.all) ? usersSnapshot.all : [];

  const email = profile?.email ? String(profile.email).toLowerCase() : null;
  const googleId = profile?.id ? String(profile.id) : profile?.sub ? String(profile.sub) : '';

  const existingUser = allUsers.find((user) => {
    const emailMatch = email && user?.email && String(user.email).toLowerCase() === email;
    const providerMatch = googleId && user?.googleId === googleId;
    return emailMatch || providerMatch;
  });

  if (existingUser) {
    await AsyncStorage.setItem('uid', existingUser.uid);
    try { global.setAuthUid?.(existingUser.uid); } catch {}
    try { global.userData = { ...(global.userData || {}), ...existingUser }; } catch {}

    if (googleId && existingUser.googleId !== googleId) {
      try { await updateDoc('users', existingUser.uid, { googleId, authProvider: existingUser.authProvider || 'google' }); } catch {}
    }

    return { user: existingUser, isNew: false };
  }

  const uid = makeID();
  const normalizedPreferredHandle = normalizeHandle(preferredHandle);
  const profileHandleSource = normalizeHandle(
    email?.split('@')[0]
      || profile?.given_name
      || profile?.family_name
      || profile?.name
      || ''
  );

  const fallbackHandle = `user${uid.slice(0, 6).toLowerCase()}`;
  const baseHandleSource = profileHandleSource && profileHandleSource.length >= 3
    ? profileHandleSource
    : fallbackHandle;
  const baseHandle = normalizedPreferredHandle && normalizedPreferredHandle.length >= 3
    ? normalizedPreferredHandle
    : baseHandleSource;
  const handleExists = (candidate) => allUsers.some((user) => String(user?.handle || '').toLowerCase() === candidate.toLowerCase());

  let candidateHandle = baseHandle;
  let suffix = 1;
  while (handleExists(candidateHandle)) {
    const next = `${baseHandle}${suffix}`;
    suffix += 1;
    candidateHandle = next.slice(0, 20);
  }

  const displayName = profile?.name
    || [profile?.given_name, profile?.family_name].filter(Boolean).join(' ')
    || (email ? email.split('@')[0] : 'New Spartan');

  const avatar = typeof profile?.picture === 'string' ? profile.picture : '';

  const newUser = buildInitialUser({
    uid,
    handle: candidateHandle,
    name: displayName,
    email,
    phoneNumber: null,
    image: avatar,
    password: null,
    authProvider: 'google',
    extra: { googleId },
  });

  await AsyncStorage.setItem('uid', uid);
  try { global.setAuthUid?.(uid); } catch {}
  try { global.userData = newUser; } catch {}

  try {
    await arrayAppend('global', 'users', 'all', newUser);
  } catch {}
  await createDoc('users', uid, newUser);

  try {
    const followerRef = { uid, handle: candidateHandle, name: displayName, pfp: avatar || '' };
    await arrayAppend('users', SPARTAN_ACCOUNT.uid, 'followers', followerRef);
    await incrementDocValue('users', SPARTAN_ACCOUNT.uid, 'followerCount', 1);
  } catch {}

  return { user: newUser, isNew: true };
}
