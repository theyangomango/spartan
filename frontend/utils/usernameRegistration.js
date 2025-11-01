import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as RNImage } from 'react-native';
import readDoc from '../../backend/helper/firebase/readDoc';
import updateDoc from '../../backend/helper/firebase/updateDoc';
import createDoc from '../../backend/helper/firebase/createDoc';
import uploadImage from '../../backend/storage/uploadImage';
import buildInitialUser from './buildInitialUser';
import DEFAULT_PFP from '../assets/DEFAULT_PFP.png';
import makeID from '../../backend/helper/makeID';

export const USERNAME_REGEX = /^[a-z0-9_.]{6,20}$/;

export const sanitizeHandle = (value) => {
    if (!value) return '';
    return value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase().slice(0, 20);
};

export const fetchAllUsers = async () => {
    const usersDoc = await readDoc('global', 'users').catch(() => null);
    return Array.isArray(usersDoc?.all) ? usersDoc.all : [];
};

export const isHandleTaken = (allUsers, handle, uidToIgnore = null) => {
    const normalized = (handle || '').toLowerCase();
    const ignore = uidToIgnore == null ? null : String(uidToIgnore);
    return allUsers.some((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const entryUid = String(entry.uid || '');
        if (ignore && entryUid === ignore) return false;
        const entryHandle = typeof entry.handle === 'string' ? entry.handle : '';
        return entryHandle.toLowerCase() === normalized;
    });
};

const uploadDefaultPfpIfNeeded = async (pendingUser, uid) => {
    if (!pendingUser || pendingUser.skipDefaultPfp) {
        return pendingUser?.image || '';
    }
    const existing = pendingUser.image;
    if (existing && !pendingUser.needsDefaultPfp) {
        return existing;
    }
    try {
        const asset = RNImage.resolveAssetSource(DEFAULT_PFP);
        const localUri = asset?.uri;
        if (localUri) {
            return await uploadImage(localUri, `pfps/${uid}.png`);
        }
    } catch (err) {
        console.warn('Default avatar upload failed:', err?.message || err);
    }
    return existing || '';
};

export const persistPendingUserWithHandle = async ({ pendingUser, handle, allUsers }) => {
    if (!pendingUser) {
        throw new Error('pendingUser is required');
    }

    const uidFinal = pendingUser.uid || makeID();
    const image = await uploadDefaultPfpIfNeeded(pendingUser, uidFinal);

    const mergedUser = buildInitialUser({
        uid: uidFinal,
        handle,
        name: pendingUser.name || 'New Spartan',
        email: pendingUser.email ?? null,
        phoneNumber: pendingUser.phoneNumber ?? null,
        image,
        password: pendingUser.password ?? null,
        authProvider: pendingUser.authProvider || 'password',
        extra: pendingUser.extra || {},
    });

    await createDoc('users', uidFinal, mergedUser);

    const updatedAll = [
        ...allUsers.filter((entry) => String(entry?.uid || '') !== String(uidFinal)),
        mergedUser,
    ];

    await updateDoc('global', 'users', { all: updatedAll });

    try { await AsyncStorage.setItem('uid', uidFinal); } catch {}
    try { global.setAuthUid?.(uidFinal); } catch {}
    try { global.userData = mergedUser; } catch {}

    return {
        uid: uidFinal,
        mergedUser,
        allUsers: updatedAll,
    };
};
