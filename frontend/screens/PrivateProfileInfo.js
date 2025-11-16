import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc as fsUpdateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import useUserDoc from '../hooks/useUserDoc';
import theme from '../theme/mfpDark';
import approveAllFollowRequests from '../../backend/user/approveAllFollowRequests';

export default function PrivateProfileInfo({ navigation }) {
  const uid = global?.userData?.uid || null;
  const user = useUserDoc(uid, { ignoreKeys: [] });
  const [isPrivate, setIsPrivate] = useState(false);
  const goBack = () => navigation.goBack();

  useEffect(() => {
    try {
      const next = user?.isPrivate ?? user?.settings?.profilePrivate ?? global?.userData?.settings?.profilePrivate;
      setIsPrivate(Boolean(next));
    } catch {}
  }, [user?.isPrivate, user?.settings?.profilePrivate]);

  const showPrivateAccountAlert = useCallback((next) => {
    const message = next
      ? 'Private Account is on. Only followers you approve can see your posts, workouts, and followers list, and follow requests must be approved manually.'
      : 'Private Account is off. Anyone can see your posts, workouts, and followers list, and pending follow requests will be approved automatically.';
    Alert.alert('Private Account', message, [{ text: 'Got it' }]);
  }, []);

  const onToggle = useCallback(async (next) => {
    setIsPrivate(next);
    showPrivateAccountAlert(next);
    try {
      if (!uid) return;
      await Promise.all([
        fsUpdateDoc(doc(db, 'usersPrivate', uid), { 'settings.profilePrivate': next }),
        fsUpdateDoc(doc(db, 'usersPublic', uid), { isPrivate: next }),
      ]);
      try { global.userData = { ...(global.userData || {}), settings: { ...(global.userData?.settings || {}), profilePrivate: next } }; } catch {}

      if (!next) {
        const pending = (() => {
          try { return Array.isArray(global?.userData?.followRequestsIn) ? [...global.userData.followRequestsIn] : []; }
          catch { return []; }
        })();

        try { await approveAllFollowRequests(uid); } catch {}

        try {
          if (!global.userData || typeof global.userData !== 'object') global.userData = {};
          const followers = Array.isArray(global.userData.followers) ? [...global.userData.followers] : [];
          const seen = new Set(followers.map((entry) => String(entry?.uid || entry?.id || entry)));
          pending.forEach((entry) => {
            const uid = String(entry?.uid || entry?.id || entry || '');
            if (uid && !seen.has(uid)) {
              followers.push(entry);
              seen.add(uid);
            }
          });
          global.userData.followers = followers;
          global.userData.followRequestsIn = [];
          const followerCount = Number.isFinite(Number(global.userData.followerCount)) ? Number(global.userData.followerCount) : followers.length;
          global.userData.followerCount = Math.max(followerCount, followers.length);
        } catch {}
      }
    } catch {}
  }, [showPrivateAccountAlert, uid]);
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
  p: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: ts(20), marginBottom: scaleSize(6) },
  li: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(14), color: theme.textSecondary, lineHeight: ts(20), marginLeft: scaleSize(6) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scaleSize(14), borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline, marginTop: scaleSize(12) },
  rowLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(14), color: theme.textPrimary },
});
