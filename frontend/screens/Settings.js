import React, { useCallback, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Settings({ navigation }) {
  const [privateProfile, setPrivateProfile] = useState(false);
  const [unitsLbs, setUnitsLbs] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const logout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { try { global.setAuthUid?.(null); } catch {} navigation.reset({ index: 0, routes: [{ name: 'SignUp' }] }); } },
    ]);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Account</Text>
        <Row label="Private profile" value={privateProfile} onValueChange={setPrivateProfile} />
        <Row label={`Units: ${unitsLbs ? 'lb' : 'kg'}`} value={unitsLbs} onValueChange={setUnitsLbs} />
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Profile', { transition: 'slide-from-right' })}>
          <Text style={styles.linkText}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.section}>Notifications</Text>
        <Row label="Push notifications" value={pushEnabled} onValueChange={setPushEnabled} />
        <Row label="Sound effects" value={soundsEnabled} onValueChange={setSoundsEnabled} />

        <Text style={styles.section}>Privacy</Text>
        <Row label="Share anonymous analytics" value={analytics} onValueChange={setAnalytics} />
        <TouchableOpacity style={styles.link} onPress={() => Alert.alert('Blocked users', 'This is where blocked users would appear.') }>
          <Text style={styles.linkText}>Blocked users</Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.section}>Support</Text>
        <TouchableOpacity style={styles.link} onPress={() => Linking.openURL('mailto:support@spartan.app?subject=Spartan%20Support') }>
          <Text style={styles.linkText}>Contact support</Text>
          <Ionicons name="open-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('TermsOfService', { transition: 'slide-from-right' }) }>
          <Text style={styles.linkText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('PrivacyPolicy', { transition: 'slide-from-right' }) }>
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
    <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#E5E7EB', true: '#93C5FD' }} thumbColor={value ? '#2563EB' : Platform.select({ ios: '#fff', android: '#f9fafb' })} />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  iconBtn: { padding: 6, width: 40 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#111827' },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  section: { marginTop: 14, marginBottom: 8, fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#334155' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  rowLabel: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: '#0F172A' },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  linkText: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: '#0F172A' },
  logoutBtn: { marginTop: 10, backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  logoutText: { fontFamily: 'Outfit_700Bold', color: '#B91C1C' },
});
