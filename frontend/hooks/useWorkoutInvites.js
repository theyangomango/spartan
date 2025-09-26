// hooks/useWorkoutInvites.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase.config";
import acceptWorkoutInvite from "../helper/workoutInvites";
import { usePfp } from "../helper/usePFPs";

/**
 * Handles live incoming workout invites for a user and exposes banner animation + actions.
 * - Listens to pending invites for `uid`
 * - Provides `accept` and `decline` handlers
 * - Optionally calls `onAccepted(wid, seedWorkout)` when joining
 */
export default function useWorkoutInvites({ uid, onAccepted, enabled = true } = {}) {
  const [invites, setInvites] = useState([]);
  const [currentInvite, setCurrentInvite] = useState(null);

  // banner animation height + translateY control
  const bannerY = useRef(new Animated.Value(0)).current;
  const [bannerHeight, setBannerHeight] = useState(0);
  const handleInviteLayout = useCallback((e) => {
    const h = e?.nativeEvent?.layout?.height || 0;
    if (h && h !== bannerHeight) setBannerHeight(h);
  }, [bannerHeight]);

  useEffect(() => {
    if (!enabled) return undefined;
    const me = String(uid || global?.userData?.uid || "");
    if (!me) return undefined;
    const qInv = query(collection(db, "workoutInvites"), where("toUid", "==", me), where("status", "==", "pending"));
    const unsub = onSnapshot(qInv, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));
      setInvites(list);
    });
    return () => unsub();
  }, [uid, enabled]);

  useEffect(() => { setCurrentInvite(invites?.[0] || null); }, [invites]);

  useEffect(() => {
    const hidden = -Math.max((bannerHeight || 80) + 12, 92);
    Animated.spring(bannerY, { toValue: currentInvite ? 0 : hidden, useNativeDriver: true, friction: 8, tension: 90 }).start();
  }, [currentInvite, bannerHeight, bannerY]);

  const inviterPfpUri =
    usePfp(currentInvite?.fromUid || null, currentInvite?.fromPfpVersion || 0) ||
    currentInvite?.fromPfp ||
    "";

  const accept = useCallback(async () => {
    if (!currentInvite) return;
    try {
      const me = String(uid || global?.userData?.uid || "");
      const wid = String(currentInvite?.wid || "");
      if (!me || !wid) return;

      const { seedWorkout } = await acceptWorkoutInvite({ inviteId: currentInvite.id, wid, toUid: me });

      onAccepted?.(wid, seedWorkout || null);
      setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
    } catch (e) {
      console.log("Accept invite error", e);
    }
  }, [currentInvite, uid, onAccepted]);

  const decline = useCallback(async () => {
    if (!currentInvite) return;
    try {
      await updateDoc(doc(db, "workoutInvites", currentInvite.id), { status: "declined", actedAt: serverTimestamp() });
      setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
    } catch (e) {
      console.log("Decline invite error", e);
      setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
    }
  }, [currentInvite]);

  return {
    currentInvite,
    inviterPfpUri,
    bannerY,
    handleInviteLayout,
    accept,
    decline,
  };
}
