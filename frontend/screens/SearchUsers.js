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
import isThisUser from '../helper/isThisUser';
import useSuggestedUsersList from '../hooks/useSuggestedUsersList';

export default function SearchUsers({ navigation }) {
  const insets = useSafeAreaInsets();
  const [qStr, setQStr] = useState('');
  const [results, setResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const { suggestedUsers: curatedSuggestedUsers } = useSuggestedUsersList();

  const viewerUid = global?.userData?.uid || '';

  const fallbackSuggestions = useMemo(() => {
    const seen = new Set();
    return (allUsers || [])
      .filter((u) => {
        const uid = u?.uid;
        if (!uid || uid === viewerUid || seen.has(uid)) return false;
        seen.add(uid);
        return true;
      })
      .slice(0, 50)
      .map((u) => ({
        uid: u.uid,
        handle: u.handle || '',
        name: u.name || '',
        pfp: u.pfp || u.photoURL || '',
        photoURL: u.photoURL || u.pfp || '',
      }));
  }, [allUsers, viewerUid]);

  const curatedSuggestions = useMemo(() => {
    const list = Array.isArray(curatedSuggestedUsers) ? curatedSuggestedUsers : [];
    if (!list.length) return [];
    const seen = new Set();
    const out = [];
    for (const entry of list) {
      const uid = entry?.uid;
      if (!uid || uid === viewerUid || seen.has(uid)) continue;
      seen.add(uid);
      out.push({
        uid,
        handle: entry?.handle || '',
        name: entry?.name || '',
        pfp: entry?.pfp || entry?.photoURL || '',
        photoURL: entry?.photoURL || entry?.pfp || '',
        tagline: entry?.tagline || '',
      });
      if (out.length >= 50) break;
    }
    return out;
  }, [curatedSuggestedUsers, viewerUid]);

  const suggestions = curatedSuggestions.length ? curatedSuggestions : fallbackSuggestions;

  useEffect(() => {
    (async () => {
      try {
        const users = await getAllUsers();
        setAllUsers(users || []);
      } catch {
        setAllUsers([]);
      }
    })();
  }, []);

  const remotePrefixQuery = useCallback(async (text) => {
    const needle = (text || '').toLowerCase();
    if (!needle) return [];
    const usersCol = collection(db, 'usersPublic');
    try {
      const handleQ = query(usersCol, orderBy('handle_lower'), where('handle_lower', '>=', needle), where('handle_lower', '<=', needle + '\uf8ff'), limit(20));
      const nameQ = query(usersCol, orderBy('name_lower'), where('name_lower', '>=', needle), where('name_lower', '<=', needle + '\uf8ff'), limit(20));
      const [hSnap, nSnap] = await Promise.all([getDocs(handleQ), getDocs(nameQ)]);
      const map = new Map();
      hSnap.forEach((d) => map.set(d.id, d.data()));
      nSnap.forEach((d) => map.set(d.id, d.data()));
      const me = global?.userData?.uid;
      const arr = Array.from(map.entries())
        .map(([uid, data]) => ({
          uid,
          handle: data?.handle || '',
          name: data?.name || '',
          pfp: data?.pfp || data?.photoURL || data?.image || '',
          photoURL: data?.photoURL || data?.image || data?.pfp || '',
        }))
        .filter((u) => u.uid !== me);
      if (arr.length) return arr;
    } catch {}
    const me = global?.userData?.uid;
    return (allUsers || [])
      .filter((u) => u?.uid && u.uid !== me)
      .filter((u) => (u.handle || '').toLowerCase().includes(needle) || (u.name || '').toLowerCase().includes(needle))
      .slice(0, 50)
      .map((u) => ({ uid: u.uid, handle: u.handle, name: u.name, pfp: u.pfp || u.photoURL || '' }));
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
    if (isThisUser(item)) {
      if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
      else navigation.navigate('Profile', { transition: 'slide-from-right' });
      return;
    }
    if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: item });
    else navigation.navigate('ViewProfile', { user: item });
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
    height: scaleSize(40),
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
