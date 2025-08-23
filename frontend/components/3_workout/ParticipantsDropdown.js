import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../../firebase.config";
import { collection, onSnapshot } from "firebase/firestore";

export default function ParticipantsDropdown({ wid, selfUid, onSelect }) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState([]);

    useEffect(() => {
        if (!wid) return;
        const ref = collection(db, "workouts", wid, "live");
        const unsub = onSnapshot(ref, (snap) => {
            const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setMembers(list);
        });
        return unsub;
    }, [wid]);

    const label = useMemo(() => {
        const me = members.find(m => m.uid === selfUid);
        return me?.handle ? `Viewing: @${me.handle}` : "Participants";
    }, [members, selfUid]);

    return (
        <View style={styles.wrap}>
            <Pressable style={styles.pill} onPress={() => setOpen(v => !v)}>
                <Ionicons name="people" size={16} color="#2A65D9" style={{ marginRight: 6 }} />
                <Text style={styles.pillText} numberOfLines={1}>{label}</Text>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#2A65D9" />
            </Pressable>

            {open && (
                <View style={styles.menu}>
                    {members.length === 0 ? (
                        <Text style={styles.empty}>No one else here yet</Text>
                    ) : members.map(m => (
                        <Pressable key={m.uid} style={styles.item} onPress={() => { setOpen(false); onSelect?.(m); }}>
                            <Text style={styles.itemText} numberOfLines={1}>@{m.handle || m.uid?.slice(0, 6)}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 20, marginBottom: 8 },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F6FF",
        borderColor: "#DBE9FF",
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    pillText: { fontFamily: "Nunito_800ExtraBold", color: "#2A65D9", marginRight: 6 },
    menu: {
        marginTop: 6,
        borderRadius: 12,
        backgroundColor: "#fff",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#e6ecf5",
        overflow: "hidden",
    },
    empty: { padding: 10, fontFamily: "Nunito_600SemiBold", color: "#667" },
    item: { paddingVertical: 10, paddingHorizontal: 12 },
    itemText: { fontFamily: "Nunito_700Bold", color: "#111" },
});
