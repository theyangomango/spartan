import arrayErase from "../helper/firebase/arrayErase";

// Normalize objects stored inside arrays so arrayRemove matches reliably
const normalizeRef = (u) => ({
  uid: String(u?.uid || u?.id || ''),
  handle: u?.handle || u?.username || '',
  name: u?.name || u?.displayName || '',
  pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function unblockUser(this_user, user) {
  const meRef = normalizeRef(this_user);
  const otherRef = normalizeRef(user);

  if (!meRef.uid || !otherRef.uid) return;

  try { await arrayErase('users', meRef.uid, 'blocked', otherRef); } catch {}
  try { await arrayErase('users', otherRef.uid, 'blockedBy', meRef); } catch {}
}
