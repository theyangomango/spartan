import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc as fsUpdateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import useUserDoc from '../hooks/useUserDoc';
import theme from '../theme/mfpDark';

export default function Settings({ navigation }) {
  const uid = global?.userData?.uid || null;
  const user = useUserDoc(uid, { ignoreKeys: [] });
  const [unitsLbs, setUnitsLbs] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [foodPrivate, setFoodPrivate] = useState(false);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const logout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { try { global.setAuthUid?.(null); } catch {} navigation.reset({ index: 0, routes: [{ name: 'SignUp' }] }); } },
    ]);
  }, [navigation]);

  // Hydrate from user doc when available/changes
  useEffect(() => {
    try {
      const s = user?.settings || {};
      if (typeof s?.units === 'string') setUnitsLbs(String(s.units).toLowerCase() !== 'kg');
      if (typeof s?.push === 'boolean') setPushEnabled(s.push);
      if (typeof s?.sounds === 'boolean') setSoundsEnabled(s.sounds);
      if (typeof s?.foodPrivate === 'boolean') setFoodPrivate(s.foodPrivate);
    } catch {}
  }, [user?.settings]);

  const persistSetting = useCallback(async (path, value) => {
    try {
      if (!uid) return;
      const ref = doc(db, 'users', uid);
      await fsUpdateDoc(ref, { [path]: value });
      // keep global in sync for immediate UX
      try {
        global.userData = {
          ...(global.userData || {}),
          settings: { ...(global.userData?.settings || {}), [path.split('.').pop()]: value },
        };
      } catch {}
    } catch (e) {
      console.warn('Failed to update setting', path, e?.message || e);
    }
  }, [uid]);

  const toggleUnits = useCallback((next) => {
    setUnitsLbs(next);
    persistSetting('settings.units', next ? 'lb' : 'kg');
  }, [persistSetting]);

  const togglePush = useCallback((next) => {
    setPushEnabled(next);
    persistSetting('settings.push', next);
  }, [persistSetting]);

  const toggleSounds = useCallback((next) => {
    setSoundsEnabled(next);
    persistSetting('settings.sounds', next);
  }, [persistSetting]);

  const toggleFoodPrivate = useCallback((next) => {
    setFoodPrivate(next);
    persistSetting('settings.foodPrivate', next);
  }, [persistSetting]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Account</Text>
        <Row label={`Units: ${unitsLbs ? 'lb' : 'kg'}`} value={unitsLbs} onValueChange={toggleUnits} />
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('PrivateProfileInfo', { transition: 'slide-from-right' })}>
          <Text style={styles.linkText}>Private profile</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.section}>Notifications</Text>
        <Row label="Push notifications" value={pushEnabled} onValueChange={togglePush} />
        <Row label="Sound effects" value={soundsEnabled} onValueChange={toggleSounds} />

        <Text style={styles.section}>Privacy</Text>
        <Row label="Keep foods/macros private" value={foodPrivate} onValueChange={toggleFoodPrivate} />
        <TouchableOpacity style={styles.link} onPress={() => Alert.alert('Blocked users', 'This is where blocked users would appear.') }>
          <Text style={styles.linkText}>Blocked users</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.section}>Support</Text>
        <TouchableOpacity style={styles.link} onPress={() => Linking.openURL('mailto:support@spartan.app?subject=Spartan%20Support') }>
          <Text style={styles.linkText}>Contact support</Text>
          <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('TermsOfService', { transition: 'slide-from-right' }) }>
          <Text style={styles.linkText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('PrivacyPolicy', { transition: 'slide-from-right' }) }>
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <View style={{ height: 22 }} />
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value, onValueChange }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: 'rgba(255,255,255,0.25)', true: 'rgba(45,158,255,0.45)' }}
      thumbColor={value ? theme.primary : Platform.select({ ios: '#fff', android: '#f3f4f6' })}
    />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  iconBtn: { padding: 6, width: 40 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: theme.textPrimary },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  section: {
    marginTop: 18,
    marginBottom: 10,
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: theme.textSecondary,
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline },
  rowLabel: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: theme.textPrimary },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline },
  linkText: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: theme.textPrimary },
  logoutBtn: { marginTop: 10, backgroundColor: 'rgba(185,28,28,0.18)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  logoutText: { fontFamily: 'Outfit_700Bold', color: '#FCA5A5' },
});
