import arrayAppend from "../helper/firebase/arrayAppend";
import unfollowUser from "./unfollowUser";
import arrayErase from "../helper/firebase/arrayErase";

// Normalize objects stored inside arrays so arrayUnion matches reliably
const normalizeRef = (u) => ({
  uid: String(u?.uid || u?.id || ''),
  handle: u?.handle || u?.username || '',
  name: u?.name || u?.displayName || '',
  pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function blockUser(this_user, user) {
  const meRef = normalizeRef(this_user);
  const otherRef = normalizeRef(user);

  if (!meRef.uid || !otherRef.uid) return;

  // 1) Ensure all follow relationships are removed in both directions
  try { await unfollowUser(meRef, otherRef); } catch {}
  try { await unfollowUser(otherRef, meRef); } catch {}

  // 2) Append normalized entry to my 'blocked'; arrayUnion prevents duplicates
  try { await arrayAppend('users', meRef.uid, 'blocked', otherRef); } catch {}

  // 3) Mark on the other user that I have blocked them (so their client can filter me everywhere)
  try { await arrayAppend('users', otherRef.uid, 'blockedBy', meRef); } catch {}
}
