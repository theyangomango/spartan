import React, { useCallback, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';

export default function DeleteAccount({ navigation }) {
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const deleteCallableRef = useRef(null);
  const deleteInFlightRef = useRef(false);

  const logoutAndReset = useCallback(() => {
    try {
      if (global?.logout) {
        global.logout();
      } else if (typeof global?.setAuthUid === 'function') {
        global.setAuthUid(null);
      }
    } catch (err) {
      console.warn('delete-account: local logout failed', err?.message || err);
    }
    try {
      navigation.reset({ index: 0, routes: [{ name: 'SignUp' }] });
    } catch (err) {
      console.warn('delete-account: navigation reset failed', err?.message || err);
    }
  }, [navigation]);

  const triggerDeletion = useCallback(() => {
    if (deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;

    const uid = typeof global?.userData?.uid === 'string' ? global.userData.uid : '';
    if (!uid) {
      Alert.alert(
        'Account unavailable',
        'We could not determine your account. Please log in again and retry account deletion.'
      );
      return;
    }

    if (!deleteCallableRef.current) {
      deleteCallableRef.current = httpsCallable(functions, 'deleteOwnAccount');
    }

    const handleHint = typeof global?.userData?.handle === 'string' ? global.userData.handle : '';

    deleteCallableRef.current({ uid, handle: handleHint })
      .catch((error) => {
        console.error('delete-account: remote deletion failed', error);
        const errorCode = typeof error?.code === 'string' ? error.code : '';
        if (errorCode.includes('not-found')) {
          // Treat missing account as already removed; no user alert necessary.
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
        <Text style={styles.title}>Delete Account</Text>
        <View style={{ width: scaleSize(40) }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.p}>Deleting your account will:</Text>
        <Text style={styles.li}>• Permanently remove your profile and account data.</Text>
        <Text style={styles.li}>• Delete posts, workouts, messages, and followers.</Text>
        <Text style={styles.li}>• Revoke access to your handle and username.</Text>
        <Text style={styles.p}>This action is irreversible.</Text>

        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Delete my account</Text>
        </TouchableOpacity>
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
  deleteBtn: { marginTop: scaleSize(14), backgroundColor: 'rgba(185,28,28,0.18)', borderRadius: scaleSize(12), alignItems: 'center', justifyContent: 'center', paddingVertical: scaleSize(12), borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(185,28,28,0.35)' },
  deleteText: { fontFamily: 'Outfit_700Bold', color: '#FCA5A5' },
});
