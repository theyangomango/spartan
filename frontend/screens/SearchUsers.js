import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import scaleSize, { ts } from '../helper/scaleSize';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileCard from '../components/1_Feed/FeedHeader/ProfileCard';
import { collection, getDocs, orderBy, where, query, limit } from 'firebase/firestore';
import { db } from '../../firebase.config';
import getAllUsers from '../helper/getAllUsers';
import theme from '../theme/mfpDark';
import { strong as hapticStrong } from '../utils/haptics';

export default function SearchUsers({ navigation }) {
  const insets = useSafeAreaInsets();
  const [qStr, setQStr] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const users = await getAllUsers();
        setAllUsers(users || []);
        const me = global?.userData?.uid;
        setSuggestions((users || []).filter((u) => u?.uid && u.uid !== me).slice(0, 50));
      } catch {
        setAllUsers([]);
        setSuggestions([]);
      }
    })();
  }, []);

  const remotePrefixQuery = useCallback(async (text) => {
    const needle = (text || '').toLowerCase();
    if (!needle) return [];
    const usersCol = collection(db, 'users');
    try {
      const handleQ = query(usersCol, orderBy('handle_lower'), where('handle_lower', '>=', needle), where('handle_lower', '<=', needle + '\uf8ff'), limit(20));
      const nameQ = query(usersCol, orderBy('name_lower'), where('name_lower', '>=', needle), where('name_lower', '<=', needle + '\uf8ff'), limit(20));
      const [hSnap, nSnap] = await Promise.all([getDocs(handleQ), getDocs(nameQ)]);
      const map = new Map();
      hSnap.forEach((d) => map.set(d.id, d.data()));
      nSnap.forEach((d) => map.set(d.id, d.data()));
      const me = global?.userData?.uid;
      const arr = Array.from(map.entries())
        .map(([uid, data]) => ({ uid, handle: data?.handle || '', name: data?.name || '', pfp: data?.pfp || data?.photoURL || data?.image || '' }))
        .filter((u) => u.uid !== me);
      if (arr.length) return arr;
    } catch {}
    const me = global?.userData?.uid;
    return (allUsers || [])
      .filter((u) => u?.uid && u.uid !== me)
      .filter((u) => (u.handle || '').toLowerCase().includes(needle) || (u.name || '').toLowerCase().includes(needle))
      .slice(0, 50)
      .map((u) => ({ uid: u.uid, handle: u.handle, name: u.name, pfp: u.pfp || u.image || '' }));
  }, [allUsers]);

  useEffect(() => {
    let active = true;
    (async () => {
      const q = qStr.trim();
      if (!q) { setResults([]); return; }
      try {
        const remote = await remotePrefixQuery(q);
        if (active) setResults(remote);
      } catch { if (active) setResults([]); }
    })();
    return () => { active = false; };
  }, [qStr, remotePrefixQuery]);

  const goBack = () => navigation.goBack();
  const openUser = (item) => {
    if (!item) return;
    hapticStrong();
    const rootNav = navigation?.getParent?.('ROOT');
    if (item.uid === global?.userData?.uid) {
      if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
      else navigation.navigate('Profile', { transition: 'slide-from-right' });
    } else {
      if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: item });
      else navigation.navigate('ViewProfile', { user: item });
    }
  };

  return (
    <SafeAreaView style={[styles.root, { paddingTop: scaleSize(insets.top + 6) }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={goBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: scaleSize(8) }} />
          <TextInput
            style={styles.input}
            placeholder="Search people"
            placeholderTextColor={theme.textSecondary}
            value={qStr}
            onChangeText={setQStr}
            autoFocus
            returnKeyType="search"
          />
          {qStr.length > 0 && (
            <TouchableOpacity onPress={() => setQStr('')}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.sectionTitle}>{qStr ? 'Results' : 'Suggested'}</Text>
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={qStr ? results : suggestions}
        keyExtractor={(it) => it.uid}
        renderItem={({ item }) => (
          <ProfileCard user={item} query={qStr} onPress={() => openUser(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scaleSize(16), marginBottom: scaleSize(12) },
  iconBtn: { padding: scaleSize(6), marginRight: scaleSize(8) },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.field,
    height: scaleSize(44),
    borderRadius: scaleSize(24),
    paddingHorizontal: scaleSize(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.hairline
  },
  input: { flex: 1, fontSize: scaleSize(15), color: theme.textPrimary, fontFamily: 'Outfit_600SemiBold' },
  sectionTitle: { paddingHorizontal: scaleSize(16), paddingVertical: scaleSize(10), fontFamily: 'Outfit_700Bold', color: theme.textPrimary, fontSize: scaleSize(14) },
  listContent: { paddingBottom: scaleSize(30) },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.hairline, marginLeft: scaleSize(16) },
});
