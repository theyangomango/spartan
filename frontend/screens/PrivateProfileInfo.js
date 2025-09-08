import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc as fsUpdateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import useUserDoc from '../hooks/useUserDoc';

export default function PrivateProfileInfo({ navigation }) {
  const uid = global?.userData?.uid || null;
  const user = useUserDoc(uid, { ignoreKeys: [] });
  const [isPrivate, setIsPrivate] = useState(false);
  const goBack = () => navigation.goBack();

  useEffect(() => {
    try { setIsPrivate(Boolean(user?.settings?.profilePrivate)); } catch {}
  }, [user?.settings?.profilePrivate]);

  const onToggle = useCallback(async (next) => {
    setIsPrivate(next);
    try {
      if (!uid) return;
      await fsUpdateDoc(doc(db, 'users', uid), { 'settings.profilePrivate': next });
      try { global.userData = { ...(global.userData || {}), settings: { ...(global.userData?.settings || {}), profilePrivate: next } }; } catch {}
    } catch {}
  }, [uid]);
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Private Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.p}>When your profile is private:</Text>
        <Text style={styles.li}>• Only approved followers can see your posts, workouts, and followers list.</Text>
        <Text style={styles.li}>• Your account may still be discoverable by handle, but content remains hidden.</Text>
        <Text style={styles.li}>• Follow requests must be approved by you.</Text>
        <Text style={styles.p}>You can switch this at any time.</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Make my profile private</Text>
          <Switch value={isPrivate} onValueChange={onToggle} trackColor={{ false: '#E5E7EB', true: '#93C5FD' }} thumbColor={isPrivate ? '#2563EB' : Platform.select({ ios: '#fff', android: '#f9fafb' })} />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  iconBtn: { padding: 6, width: 40 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#111827' },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 },
  p: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 6 },
  li: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#334155', lineHeight: 20, marginLeft: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', marginTop: 12 },
  rowLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: '#0F172A' },
});
