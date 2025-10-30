import AsyncStorage from '@react-native-async-storage/async-storage';
import readDoc from '../../backend/helper/firebase/readDoc';
import updateDoc from '../../backend/helper/firebase/updateDoc';
import makeID from '../../backend/helper/makeID';

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
  const baseHandle = normalizedPreferredHandle && normalizedPreferredHandle.length >= 6
    ? normalizedPreferredHandle
    : (profileHandleSource && profileHandleSource.length >= 6
      ? profileHandleSource
      : fallbackHandle);

  const displayName = profile?.name
    || [profile?.given_name, profile?.family_name].filter(Boolean).join(' ')
    || (email ? email.split('@')[0] : 'New Spartan');

  const avatar = typeof profile?.picture === 'string' ? profile.picture : '';

  const pendingUser = {
    uid,
    name: displayName,
    email,
    phoneNumber: null,
    image: avatar,
    password: null,
    authProvider: 'google',
    extra: { googleId },
    suggestedHandle: baseHandle,
  };

  return { user: null, isNew: true, pendingUser };
}
