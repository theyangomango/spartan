import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase.config';

export const USERS_PUBLIC_COLLECTION = 'usersPublic';
export const USERS_PRIVATE_COLLECTION = 'usersPrivate';

export const userPublicDoc = (uid) => doc(db, USERS_PUBLIC_COLLECTION, uid);
export const userPrivateDoc = (uid) => doc(db, USERS_PRIVATE_COLLECTION, uid);

export const userPublicCollection = (uid, path) =>
  collection(db, USERS_PUBLIC_COLLECTION, uid, path);

export const userPrivateCollection = (uid, path) =>
  collection(db, USERS_PRIVATE_COLLECTION, uid, path);

export const getUserDocRef = (scope, uid) => {
  const normalized = uid ? String(uid) : '';
  if (!normalized) throw new Error('Invalid uid for user doc reference');
  if (scope === 'private') return userPrivateDoc(normalized);
  return userPublicDoc(normalized);
};
