import readDoc from './readDoc';

export default async function readUserProfiles(uid) {
    if (!uid) return { publicProfile: null, privateProfile: null };
    const safeUid = String(uid);
    const [publicProfile, privateProfile] = await Promise.all([
        readDoc('usersPublic', safeUid).catch(() => null),
        readDoc('usersPrivate', safeUid).catch(() => null),
    ]);
    return { publicProfile: publicProfile || null, privateProfile: privateProfile || null };
}
