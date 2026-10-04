import React, { useCallback, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import scaleSize from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../firebase.config';
import useUserDoc from '../hooks/useUserDoc';
import theme from '../theme/mfpDark';

export default function Settings({ navigation }) {
  const uid = global?.userData?.uid || null;
  // Called for its subscription only: it keeps global.userData in sync with usersPublic while this screen is open.
  useUserDoc(uid, { ignoreKeys: [] });

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const logout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          try {
            if (global.logout) {
              global.logout();
            } else {
              signOut(auth).catch(() => {});
            }
          } catch {}
          navigation.reset({ index: 0, routes: [{ name: 'SignUp' }] });
        },
      },
    ]);
  }, [navigation]);

  const deleteCallableRef = useRef(null);
  const deleteInFlightRef = useRef(false);

  const logoutAndReset = useCallback(() => {
    Promise.resolve()
      .then(() => {
        if (global?.logout) {
          return global.logout();
        }
        return signOut(auth).catch(() => {});
      })
      .catch((err) => {
        console.warn('settings: delete-account logout failed', err?.message || err);
      });
    try {
      navigation.reset({ index: 0, routes: [{ name: 'SignUp' }] });
    } catch (err) {
      console.warn('settings: navigation reset failed', err?.message || err);
    }
  }, [navigation]);

  const triggerDeletion = useCallback(() => {
    if (deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;

    const currentUid = typeof global?.userData?.uid === 'string' ? global.userData.uid : '';
    if (!currentUid) {
      Alert.alert(
        'Account unavailable',
        'We could not determine your account. Please log in again and retry account deletion.'
      );
      deleteInFlightRef.current = false;
      return;
    }

    if (!deleteCallableRef.current) {
      deleteCallableRef.current = httpsCallable(functions, 'deleteOwnAccount');
    }

    const handleHint = typeof global?.userData?.handle === 'string' ? global.userData.handle : '';

    deleteCallableRef.current({ uid: currentUid, handle: handleHint })
      .catch((error) => {
        console.error('settings: delete-account callable failed', error);
        const errorCode = typeof error?.code === 'string' ? error.code : '';
        if (errorCode.includes('not-found')) {
          return null;
        }
        Alert.alert(
          'Account deletion issue',
          'We were unable to remove your account automatically. Please contact support so we can finish the deletion.',
          [
            { text: 'Contact support', onPress: () => Linking.openURL('mailto:support@thespartan.app?subject=Account%20Deletion%20Issue') },
            { text: 'OK' },
          ]
        );
        return null;
      })
      .finally(() => {
        deleteInFlightRef.current = false;
      });

    logoutAndReset();
  }, [logoutAndReset]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all associated data, including posts, workouts, messages, and followers. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: triggerDeletion,
        },
      ]
    );
  }, [triggerDeletion]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: scaleSize(40) }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Account & Privacy</Text>
        <View style={styles.group}>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('PrivateProfileInfo', { transition: 'slide-from-right' })}>
          <Text style={styles.linkText}>Private profile</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.link, styles.linkLast]} onPress={confirmDelete}>
          <Text style={styles.linkText}>Delete account</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        </View>

        <Text style={styles.section}>Support</Text>
        <View style={styles.group}>
        <TouchableOpacity style={styles.link} onPress={() => Linking.openURL('mailto:support@thespartan.app?subject=Spartan%20Support') }>
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
        <TouchableOpacity style={[styles.link, styles.linkLast]} onPress={() => navigation.navigate('Credits', { transition: 'slide-from-right' }) }>
          <Text style={styles.linkText}>Credits</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        </View>

        <View style={{ height: scaleSize(22) }} />
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <View style={{ height: scaleSize(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scaleSize(14), paddingTop: scaleSize(8), paddingBottom: scaleSize(6) },
  iconBtn: { padding: scaleSize(6), width: scaleSize(40) },
  title: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(18), color: theme.textPrimary },
  content: { paddingHorizontal: scaleSize(14), paddingTop: scaleSize(10) },
  section: {
    marginTop: scaleSize(18),
    marginBottom: scaleSize(8),
    marginLeft: scaleSize(4),
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(11),
    color: theme.textSecondary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  group: {
    backgroundColor: theme.surface,
    borderRadius: scaleSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  linkLast: { borderBottomWidth: 0 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scaleSize(14), paddingHorizontal: scaleSize(16), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline },
  linkText: { fontFamily: 'Outfit_500Medium', fontSize: scaleSize(14), color: theme.textPrimary },
  logoutBtn: { marginTop: scaleSize(10), backgroundColor: 'rgba(185,28,28,0.18)', borderRadius: scaleSize(16), borderWidth: 1, borderColor: 'rgba(252,165,165,0.22)', alignItems: 'center', justifyContent: 'center', paddingVertical: scaleSize(13) },
  logoutText: { fontFamily: 'Outfit_700Bold', color: '#FCA5A5' },
});
