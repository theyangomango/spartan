import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { usePfp } from '../../../helper/usePFPs';
import theme from '../../../theme/mfpDark';

import scaleSize from "../../../helper/scaleSize";
import { withStrongPress } from '../../../utils/haptics';
import VerifiedHandle from '../../common/VerifiedHandle';
import useUserVerified from '../../../hooks/useUserVerified';
import { resolvePhotoURL } from '../../../utils/profilePhoto';

const scale = (w) => w / 375;

const ProfileCard = ({ user, query, onPress }) => {
  const s = (n) => Math.round(n * scale(375));
  const avatarSize = s(44);
  const fallbackPfp = resolvePhotoURL(user, user?.pfp || '');
  const pfpUri = usePfp(String(user?.uid || ''), user?.pfpVersion || 0, fallbackPfp) || fallbackPfp;
  const hasPfp = !!pfpUri;
  const sanitizedHandle = useMemo(() => {
    const base = typeof user?.handle === 'string' ? user.handle : '';
    return base.replace(/^@+/, '').trim() || 'user';
  }, [user?.handle]);
  const isVerified = useUserVerified(user?.uid, Boolean(user?.isVerified ?? user?.verified));

  return (
    <RNBounceable onPress={withStrongPress(onPress)} style={styles.profileCard} bounceEffectIn={0.96}>
      <View style={styles.profileLeft}>
        <View style={[styles.avatarRing, { width: avatarSize, height: avatarSize, borderRadius: scaleSize(avatarSize / 2) }] }>
          {hasPfp ? (
            <FastImage
              source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
              style={{ width: scaleSize(avatarSize - 4), height: scaleSize(avatarSize - 4), borderRadius: scaleSize((avatarSize - 4) / 2), backgroundColor: '#f3f4f6' }}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <Ionicons name="person-circle" size={avatarSize} color="#C7C7CC" />
          )}
        </View>
        <View style={{ marginLeft: scaleSize(12), flex: 1, minWidth: 0 }}>
          <VerifiedHandle
            handle={sanitizedHandle}
            isVerified={isVerified}
            textStyle={styles.cardHandle}
            iconSize={scaleSize(14)}
            numberOfLines={1}
            containerStyle={styles.cardHandleRow}
          />
          {!!user?.name && <Text numberOfLines={1} style={styles.cardName}>{user.name}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9AA1A9" />
    </RNBounceable>
  );
};

export default memo(ProfileCard);

const styles = StyleSheet.create({
  profileCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(18),
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  // Remove blue border ring; keep container for centering only
  avatarRing: { alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent' },
  cardHandleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  cardHandle: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(14), color: '#E5E7EB' },
  cardName: { marginTop: scaleSize(2), fontFamily: 'Outfit_400Regular', fontSize: scaleSize(12.5), color: '#A1A7B3' },
});
