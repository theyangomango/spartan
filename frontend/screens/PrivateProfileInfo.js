import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc as fsUpdateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import useUserDoc from '../hooks/useUserDoc';
import theme from '../theme/mfpDark';

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
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Private Profile</Text>
        <View style={{ width: scaleSize(40) }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.p}>When your profile is private:</Text>
        <Text style={styles.li}>• Only approved followers can see your posts, workouts, and followers list.</Text>
        <Text style={styles.li}>• Your account may still be discoverable by handle, but content remains hidden.</Text>
        <Text style={styles.li}>• Follow requests must be approved by you.</Text>
        <Text style={styles.p}>You can switch this at any time.</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Make my profile private</Text>
          <Switch
            value={isPrivate}
            onValueChange={onToggle}
            trackColor={{ false: 'rgba(255,255,255,0.25)', true: 'rgba(45,158,255,0.45)' }}
            thumbColor={isPrivate ? theme.primary : Platform.select({ ios: '#fff', android: '#f3f4f6' })}
          />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scaleSize(14), paddingTop: scaleSize(8), paddingBottom: scaleSize(6) },
  iconBtn: { padding: scaleSize(6), width: scaleSize(40) },
  title: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(18), color: theme.textPrimary },
  content: { paddingHorizontal: scaleSize(16), paddingTop: scaleSize(10), paddingBottom: scaleSize(18) },
  p: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(ts(20)), marginBottom: scaleSize(6) },
  li: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: scaleSize(ts(20)), marginLeft: scaleSize(6) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scaleSize(14), borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline, marginTop: scaleSize(12) },
  rowLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(14), color: theme.textPrimary },
});
