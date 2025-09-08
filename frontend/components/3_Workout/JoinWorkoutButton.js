// components/3_Workout/InviteBanner.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { collection, query, where, onSnapshot, doc, serverTimestamp } from "firebase/firestore";
import { updateDoc as fsUpdateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebase.config";
import { usePfp } from "../../helper/usePFPs";
import FastImage from "react-native-fast-image";

const s = (n) => n; // simple pass-through; your parent coordinates already use scale

export default function InviteBanner({ uid, headerHeight = 0, onJoin }) {
    const [invites, setInvites] = useState([]);
    const [currentInvite, setCurrentInvite] = useState(null);
    const bannerY = useRef(new Animated.Value(0)).current;
    const [bannerHeight, setBannerHeight] = useState(0);

    useEffect(() => {
        const me = String(uid || global?.userData?.uid || "");
        if (!me) return;

        const qInv = query(
            collection(db, "workoutInvites"),
            where("toUid", "==", me),
            where("status", "==", "pending")
        );

        const unsub = onSnapshot(qInv, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a?.createdAt?.seconds || 0;
                const tb = b?.createdAt?.seconds || 0;
                return tb - ta;
            });
            setInvites(list);
        });

        return () => unsub();
    }, [uid]);

    useEffect(() => {
        setCurrentInvite(invites?.[0] || null);
    }, [invites]);

    useEffect(() => {
        const hidden = -Math.max((bannerHeight || 80) + 12, 92);
        Animated.spring(bannerY, {
            toValue: currentInvite ? 0 : hidden,
            useNativeDriver: true,
            friction: 8,
            tension: 90,
        }).start();
    }, [currentInvite, bannerHeight, bannerY]);

    const handleInviteLayout = useCallback((e) => {
        const h = e?.nativeEvent?.layout?.height || 0;
        if (h && h !== bannerHeight) setBannerHeight(h);
    }, [bannerHeight]);

    const inviterPfpUri =
        usePfp(currentInvite?.fromUid || null, currentInvite?.fromPfpVersion || 0) ||
        currentInvite?.fromPfp ||
        "";

    const acceptInvite = useCallback(async () => {
        if (!currentInvite) return;
        try {
            const me = String(uid || global?.userData?.uid || "");
            const wid = String(currentInvite?.wid || "");
            if (!me || !wid) return;

            await fsUpdateDoc(doc(db, "workouts", wid), {
                members: arrayUnion(me),
                updatedAt: serverTimestamp(),
                active: true,
            });
            await fsUpdateDoc(doc(db, "workoutInvites", currentInvite.id), {
                status: "accepted",
                actedAt: serverTimestamp(),
            });

            // optional: fetch workout doc to pass a seed up (kept same as earlier behavior)
            let seed = null;
            try {
                const snap = await getDoc(doc(db, "workouts", wid));
                seed = snap.exists() ? snap.data() : null;
            } catch { }

            onJoin?.(wid, seed);

            // drop this invite locally
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        } catch (e) {
            console.log("Accept invite error", e);
        }
    }, [currentInvite, uid, onJoin]);

    const declineInvite = useCallback(async () => {
        if (!currentInvite) return;
        try {
            await fsUpdateDoc(doc(db, "workoutInvites", currentInvite.id), {
                status: "declined",
                actedAt: serverTimestamp(),
            });
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        } catch (e) {
            console.log("Decline invite error", e);
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        }
    }, [currentInvite]);

    return (
        <Animated.View
            style={[
                styles.inviteBannerWrap,
                { top: headerHeight + 6, transform: [{ translateY: bannerY }] },
            ]}
            pointerEvents={currentInvite ? "auto" : "none"}
            onLayout={handleInviteLayout}
        >
            {currentInvite && (
                <View style={styles.inviteCard}>
                    <View style={styles.inviteLeft}>
                        <View style={styles.invitePfpWrap}>
                            {inviterPfpUri ? (
                                <FastImage
                                    source={{
                                        uri: inviterPfpUri,
                                        priority: FastImage.priority.normal,
                                        cache: FastImage.cacheControl.immutable,
                                    }}
                                    style={styles.invitePfp}
                                />
                            ) : (
                                <View style={[styles.invitePfp, { backgroundColor: "#E5E7EB" }]} />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inviteTitle}>
                                {currentInvite.fromHandle ? `@${currentInvite.fromHandle} invited you` : "You’ve been invited"}
                            </Text>
                            <Text style={styles.inviteSub}>Join their workout?</Text>
                        </View>
                    </View>
                    <View style={styles.inviteActions}>
                        <Pressable onPress={acceptInvite} style={styles.inviteAccept} hitSlop={8}>
                            <Text style={styles.inviteAcceptText}>Accept</Text>
                        </Pressable>
                        <Pressable onPress={declineInvite} hitSlop={8} style={styles.inviteDismiss}>
                            <Text style={styles.inviteDismissText}>Dismiss</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    inviteBannerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: "center",
        paddingTop: 0,
    },
    inviteCard: {
        width: "92%",
        borderRadius: 14,
        backgroundColor: "#F7FAFF",
        borderWidth: 1,
        borderColor: "#E5EEF9",
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    inviteLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    invitePfpWrap: {
        width: 36, height: 36, borderRadius: 18, overflow: "hidden",
        marginRight: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#fff",
    },
    invitePfp: { width: "100%", height: "100%" },
    inviteTitle: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: "#0F172A" },
    inviteSub: { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B", marginTop: 2 },
    inviteActions: { flexDirection: "row", alignItems: "center" },
    inviteAccept: {
        height: 30, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#10B981",
        alignItems: "center", justifyContent: "center", marginRight: 8,
    },
    inviteAcceptText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: 13 },
    inviteDismiss: { paddingHorizontal: 6, paddingVertical: 4 },
    inviteDismissText: { color: "#64748B", fontFamily: "Outfit_600SemiBold", fontSize: 12.5 },
});
