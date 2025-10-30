import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as RNImage } from 'react-native';
import createDoc from '../../backend/helper/firebase/createDoc';
import readDoc from '../../backend/helper/firebase/readDoc';
import arrayAppend from '../../backend/helper/firebase/arrayAppend';
import updateDoc from '../../backend/helper/firebase/updateDoc';
import makeID from '../../backend/helper/makeID';
import buildInitialUser from '../utils/buildInitialUser';
import uploadImage from '../../backend/storage/uploadImage';
import DEFAULT_PFP from '../assets/DEFAULT_PFP.png';

function normalizeHandle(source) {
  if (!source) return '';
  const lowered = source.toLowerCase();
  const safe = lowered.replace(/[^a-z0-9_.]/g, '');
  return safe.slice(0, 20);
}

function extractFullName(fullName) {
  if (!fullName) return '';

  const given = typeof fullName.givenName === 'string' ? fullName.givenName : '';
  const family = typeof fullName.familyName === 'string' ? fullName.familyName : '';
  const middle = typeof fullName.middleName === 'string' ? fullName.middleName : '';
  const nickname = typeof fullName.nickname === 'string' ? fullName.nickname : '';

  const parts = [given, middle, family].map((part) => part?.trim()).filter(Boolean);
  const resolvedFromParts = parts.join(' ').trim();
  if (resolvedFromParts.length > 0) {
    return resolvedFromParts;
  }

  const trimmedNickname = nickname.trim();
  if (trimmedNickname.length > 0) {
    return trimmedNickname;
  }

  return '';
}

async function uploadDefaultPfp(uid) {
  try {
    const asset = RNImage.resolveAssetSource(DEFAULT_PFP);
    const localUri = asset?.uri;
    if (!localUri) {
      return '';
    }

    const url = await uploadImage(localUri, `pfps/${uid}.png`);
    return url || '';
  } catch (error) {
    console.warn('Apple auth default PFP upload failed:', error?.message || error);
    return '';
  }
}

function resolveDisplayName(credential) {
  const fullName = extractFullName(credential?.fullName);
  if (fullName) {
    return fullName;
  }

  const email = typeof credential?.email === 'string' ? credential.email : '';
  if (email) {
    const prefix = email.split('@')[0]?.trim();
    if (prefix) {
      return prefix;
    }
  }

  return 'Apple User';
}

export async function upsertAppleUser(credential, options = {}) {
  const { preferredHandle } = options || {};
  const usersSnapshot = await readDoc('global', 'users').catch(() => null);
  const allUsers = Array.isArray(usersSnapshot?.all) ? usersSnapshot.all : [];

  const appleId = credential?.user ? String(credential.user) : '';
  const email = credential?.email ? String(credential.email).toLowerCase() : null;

  const existingUser = allUsers.find((user) => {
    const emailMatch = email && user?.email && String(user.email).toLowerCase() === email;
    const providerMatch = appleId && user?.appleId === appleId;
    return emailMatch || providerMatch;
  });

  if (existingUser) {
    await AsyncStorage.setItem('uid', existingUser.uid);
    try { global.setAuthUid?.(existingUser.uid); } catch {}
    try { global.userData = { ...(global.userData || {}), ...existingUser }; } catch {}

    if (appleId && existingUser.appleId !== appleId) {
      try {
        await updateDoc('users', existingUser.uid, {
          appleId,
          authProvider: existingUser.authProvider || 'apple',
        });
      } catch {}
    }

    return { user: existingUser, isNew: false };
  }

  const uid = makeID();
  const normalizedPreferredHandle = normalizeHandle(preferredHandle);
  const fallbackHandle = `user${uid.slice(0, 6).toLowerCase()}`;

  const profileHandleSource = normalizeHandle(
    resolveDisplayName(credential)?.replace(/\s+/g, '')
      || email?.split('@')[0]
      || fallbackHandle
  );

  const baseHandleSource = profileHandleSource && profileHandleSource.length >= 6
    ? profileHandleSource
    : fallbackHandle;

  const baseHandle = normalizedPreferredHandle && normalizedPreferredHandle.length >= 6
    ? normalizedPreferredHandle
    : baseHandleSource;

  const handleExists = (candidate) => allUsers.some(
    (user) => String(user?.handle || '').toLowerCase() === candidate.toLowerCase()
  );

  let candidateHandle = baseHandle;
  let suffix = 1;
  while (handleExists(candidateHandle)) {
    const next = `${baseHandle}${suffix}`;
    suffix += 1;
    candidateHandle = next.slice(0, 20);
  }

  const resolvedName = resolveDisplayName(credential);

  const defaultPfpUrl = await uploadDefaultPfp(uid);

  const newUser = buildInitialUser({
    uid,
    handle: candidateHandle,
    name: resolvedName,
    email,
    phoneNumber: null,
    image: defaultPfpUrl,
    password: null,
    authProvider: 'apple',
    extra: { appleId },
  });

  await AsyncStorage.setItem('uid', uid);
  try { global.setAuthUid?.(uid); } catch {}
  try { global.userData = newUser; } catch {}

  try {
    await arrayAppend('global', 'users', 'all', newUser);
  } catch {}
  await createDoc('users', uid, newUser);

  return { user: newUser, isNew: true };
}
