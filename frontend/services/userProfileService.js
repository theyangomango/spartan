import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, functions } from '../../firebase.config';
import { emitUserDataUpdate } from '../utils/userDataEvents';

const DEFAULT_PFP_REMOTE_URL = 'https://firebasestorage.googleapis.com/v0/b/spartan-8a55f.appspot.com/o/pfps%2FDEFAULT_PFP.png?alt=media';

const ensureProfileCallable = httpsCallable(functions, 'ensureUserProfile');
const setHandleCallable = httpsCallable(functions, 'setUserHandle');
const setDisplayNameCallable = httpsCallable(functions, 'setUserDisplayName');

const FUNCTION_NOT_FOUND = 'functions/not-found';
const HANDLE_REGEX = /^[a-z0-9_.]{6,20}$/;
const HANDLE_KEYS = ['handle', 'handleLower', 'handle_lower', 'username', 'usernameLower', 'username_lower', 'tag', 'tagLower', 'tag_lower'];

function resolveHandle(...sources) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of HANDLE_KEYS) {
      const value = source[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
    }
  }
  return '';
}

function isFunctionsNotFound(error) {
  if (!error) return false;
  if (error.code === FUNCTION_NOT_FOUND) return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes(FUNCTION_NOT_FOUND);
}

function coerceDisplayName(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'New User';
}

function collectProviders(base = [], extra = []) {
  const set = new Set();
  base.forEach((id) => id && set.add(id));
  extra.forEach((id) => id && set.add(id));
  return Array.from(set);
}

async function ensureUserProfileFallback(options = {}) {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('Missing authenticated user for profile bootstrap.');
  }
  const uid = user.uid;
  const publicRef = doc(db, 'usersPublic', uid);
  const privateRef = doc(db, 'usersPrivate', uid);
  const usersRef = doc(db, 'users', uid);

  const [publicSnap, privateSnap] = await Promise.all([
    getDoc(publicRef),
    getDoc(privateRef),
  ]);

  const now = new Date();
  const displayName = coerceDisplayName(
    options.displayName,
    user.displayName,
    options.email?.split?.('@')?.[0],
    user.email?.split?.('@')?.[0]
  );
  const photoURL = options.photoURL || user.photoURL || '';
  const email = options.email || user.email || '';
  const phoneNumber = options.phoneNumber || '';
  const emailVerified = options.emailVerified ?? user.emailVerified ?? false;
  const providerIds = collectProviders(
    privateSnap.exists() ? privateSnap.data()?.authProviders || [] : [],
    [
      options.providerId,
      ...(user.providerData || []).map((provider) => provider?.providerId),
    ]
  );

  const basePublic = publicSnap.exists() ? publicSnap.data() || {} : {};
  const resolvedName = displayName || basePublic.displayName || basePublic.name || '';
  const resolvedPhoto = photoURL || basePublic.photoURL || DEFAULT_PFP_REMOTE_URL;
  const defaultRank = {
    currentRank: {
      key: 'bronze-i',
      tier: 'bronze',
      level: 'I',
      label: 'Bronze I',
      index: 0,
    },
    rankTier: 'bronze',
    rankLabel: 'Bronze I',
    rankLevel: 'I',
  };
  const nextPublic = {
    ...basePublic,
    uid,
    displayName: resolvedName,
    name: resolvedName,
    photoURL: resolvedPhoto,
    image: resolvedPhoto || basePublic.image || DEFAULT_PFP_REMOTE_URL,
    isPrivate: typeof basePublic.isPrivate === 'boolean' ? basePublic.isPrivate : false,
    followersCount: Number.isFinite(basePublic.followersCount) ? basePublic.followersCount : 0,
    followingCount: Number.isFinite(basePublic.followingCount) ? basePublic.followingCount : 0,
    updatedAt: now,
    ...defaultRank,
  };
  if (!basePublic.createdAt) nextPublic.createdAt = now;

  const existingHandle = resolveHandle(basePublic, options);
  if (existingHandle && !nextPublic.handle) {
    nextPublic.handle = existingHandle;
  }
  if (existingHandle && !nextPublic.handleLower) {
    nextPublic.handleLower = existingHandle.toLowerCase();
  }

  const basePrivate = privateSnap.exists() ? privateSnap.data() || {} : {};
  const nextPrivate = {
    ...basePrivate,
    email: email || basePrivate.email || '',
    phoneNumber: phoneNumber || basePrivate.phoneNumber || '',
    emailVerified,
    authProviders: providerIds,
    blocked: Array.isArray(basePrivate.blocked) ? basePrivate.blocked : [],
    blockedUidList: Array.isArray(basePrivate.blockedUidList) ? basePrivate.blockedUidList : [],
    blockedBy: Array.isArray(basePrivate.blockedBy) ? basePrivate.blockedBy : [],
    blockedByUidList: Array.isArray(basePrivate.blockedByUidList) ? basePrivate.blockedByUidList : [],
    deviceTokens: Array.isArray(basePrivate.deviceTokens) ? basePrivate.deviceTokens : [],
    lastLoginAt: now,
    ...defaultRank,
  };
  if (!basePrivate.createdAt) nextPrivate.createdAt = now;

  await Promise.all([
    setDoc(publicRef, nextPublic, { merge: true }),
    setDoc(privateRef, nextPrivate, { merge: true }),
    setDoc(usersRef, {
      uid,
      displayName: nextPublic.displayName,
      name: nextPublic.displayName,
      photoURL: nextPublic.photoURL || '',
      image: nextPublic.photoURL || '',
      isPrivate: nextPublic.isPrivate,
      followersCount: nextPublic.followersCount,
      followingCount: nextPublic.followingCount,
      updatedAt: now,
      ...defaultRank,
    }, { merge: true }),
  ]);

  return {
    uid,
    requiresHandle: !resolveHandle(nextPublic),
    publicProfile: nextPublic,
  };
}

async function setUserHandleFallback(handle) {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('Missing authenticated user for handle update.');
  }
  const uid = user.uid;
  const normalized = typeof handle === 'string' ? handle.trim() : '';
  if (!normalized) {
    throw new Error('Handle is required.');
  }
  const handleLower = normalized.toLowerCase();
  const now = new Date();

  const handleRef = doc(db, 'userHandles', handleLower);
  const snap = await getDoc(handleRef);
  const existingUid = snap.exists() ? snap.data()?.uid : null;
  if (existingUid && existingUid !== uid) {
    throw new Error('Username is already taken.');
  }

  await Promise.all([
    setDoc(handleRef, { uid, updatedAt: now }, { merge: true }),
    setDoc(doc(db, 'usersPublic', uid), {
      handle: normalized,
      handleLower,
      updatedAt: now,
    }, { merge: true }),
    setDoc(doc(db, 'users', uid), {
      handle: normalized,
      handleLower,
      updatedAt: now,
    }, { merge: true }),
  ]);

  return { handle: normalized };
}

export async function ensureUserProfile(options = {}) {
  throw new Error('ensureUserProfile should not be called until username is confirmed.');
}

export async function setUserHandle(handle) {
  throw new Error('setUserHandle should not be called directly.');
}

export async function prepareProfileForAuth(options = {}) {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('Missing authenticated user.');
  }
  const uid = user.uid;

  const [publicSnap, privateSnap, legacySnap] = await Promise.all([
    getDoc(doc(db, 'usersPublic', uid)).catch(() => null),
    getDoc(doc(db, 'usersPrivate', uid)).catch(() => null),
    getDoc(doc(db, 'users', uid)).catch(() => null),
  ]);

  const publicData = publicSnap?.exists() ? publicSnap.data() || {} : null;
  const privateData = privateSnap?.exists() ? privateSnap.data() || {} : null;
  const legacyData = legacySnap?.exists() ? legacySnap.data() || {} : null;

  const handle = resolveHandle(publicData, legacyData, privateData, options, global?.userData);
  const requiresHandle = !handle;

  const publicProfile = publicData ? { ...publicData } : null;
  if (publicProfile && handle && !publicProfile.handle) {
    publicProfile.handle = handle;
  }

  const legacyProfile = legacyData ? { ...legacyData } : null;
  if (legacyProfile && handle && !legacyProfile.handle) {
    legacyProfile.handle = handle;
  }

  const displayName = options.displayName
    || user.displayName
    || publicProfile?.displayName
    || publicProfile?.name
    || legacyProfile?.displayName
    || legacyProfile?.name
    || '';
  const photoURL = options.photoURL
    || user.photoURL
    || publicProfile?.photoURL
    || publicProfile?.image
    || legacyProfile?.photoURL
    || legacyProfile?.image
    || DEFAULT_PFP_REMOTE_URL;
  const email = options.email || user.email || '';
  const phoneNumber = options.phoneNumber || privateData?.phoneNumber || legacyProfile?.phoneNumber || '';
  const emailVerified = options.emailVerified ?? user.emailVerified ?? false;
  const providerId = options.providerId || user.providerData?.[0]?.providerId || '';

  return {
    uid,
    requiresHandle,
    publicProfile,
    privateProfile: privateData,
    legacyProfile,
    pendingProfile: requiresHandle
      ? {
          displayName,
          photoURL,
          email,
          phoneNumber,
          emailVerified,
          providerId,
        }
      : null,
  };
}

export async function finalizeUserProfile({ handle, profile } = {}) {
  const payload = {
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || DEFAULT_PFP_REMOTE_URL,
    email: profile?.email || '',
    phoneNumber: profile?.phoneNumber || '',
    emailVerified: profile?.emailVerified,
    providerId: profile?.providerId || '',
  };

  let ensure;
  try {
    ensure = await ensureProfileCallable(payload).then((res) => res?.data || {});
  } catch (error) {
    if (isFunctionsNotFound(error)) {
      ensure = await ensureUserProfileFallback(payload);
    } else {
      throw error;
    }
  }

  if (handle) {
    try {
      await setHandleCallable({ handle });
    } catch (error) {
      if (isFunctionsNotFound(error)) {
        await setUserHandleFallback(handle);
      } else {
        throw error;
      }
    }
    ensure = {
      ...ensure,
      handle,
      requiresHandle: false,
      publicProfile: {
        ...(ensure?.publicProfile || {}),
        handle,
      },
    };
  }

  if (!ensure.publicProfile) ensure.publicProfile = {};
  if (!ensure.publicProfile.photoURL) {
    ensure.publicProfile.photoURL = DEFAULT_PFP_REMOTE_URL;
  }
  if (!ensure.publicProfile.image) {
    ensure.publicProfile.image = DEFAULT_PFP_REMOTE_URL;
  }

  return ensure;
}

export async function updateUserHandle(handle) {
  const trimmed = typeof handle === 'string' ? handle.trim() : '';
  if (!trimmed) {
    throw new Error('Handle is required.');
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase().slice(0, 20);
  if (!HANDLE_REGEX.test(sanitized)) {
    throw new Error('Username must be 6–20 characters (a–z, 0–9, _ or .).');
  }
  try {
    await setHandleCallable({ handle: sanitized });
  } catch (error) {
    if (isFunctionsNotFound(error)) {
      await setUserHandleFallback(sanitized);
    } else {
      throw error;
    }
  }
  try {
    if (global?.userData && typeof global.userData === 'object') {
      global.userData.handle = sanitized;
      global.userData.handleLower = sanitized.toLowerCase();
    }
  } catch {
    // ignore global mutations
  }
  emitUserDataUpdate();
  return { handle: sanitized };
}

async function setDisplayNameFallback(name) {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('Missing authenticated user for name update.');
  }
  const uid = user.uid;
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized) {
    throw new Error('Name is required.');
  }
  const now = new Date();
  const publicRef = doc(db, 'usersPublic', uid);
  const usersRef = doc(db, 'users', uid);
  await Promise.all([
    setDoc(publicRef, {
      displayName: normalized,
      name: normalized,
      updatedAt: now,
    }, { merge: true }),
    setDoc(usersRef, {
      displayName: normalized,
      name: normalized,
      updatedAt: now,
    }, { merge: true }),
  ]);
  try {
    if (global?.userData && typeof global.userData === 'object') {
      global.userData.displayName = normalized;
      global.userData.name = normalized;
    }
  } catch {
    // ignore
  }
  emitUserDataUpdate();
  return { name: normalized };
}

export async function updateUserName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new Error('Name is required.');
  }
  const limited = trimmed.slice(0, 60);
  try {
    await setDisplayNameCallable({ name: limited });
  } catch (error) {
    if (isFunctionsNotFound(error)) {
      return setDisplayNameFallback(limited);
    }
    throw error;
  }
  try {
    if (global?.userData && typeof global.userData === 'object') {
      global.userData.displayName = limited;
      global.userData.name = limited;
    }
  } catch {
    // ignore
  }
  emitUserDataUpdate();
  return { name: limited };
}
