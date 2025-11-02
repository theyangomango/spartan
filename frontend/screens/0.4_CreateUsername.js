import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme/mfpDark';
import readDoc from '../../backend/helper/firebase/readDoc';
import updateDoc from '../../backend/helper/firebase/updateDoc';
import authBackground from '../assets/AUTH_BACKGROUND.jpg';
import scaleSize from '../helper/scaleSize';
import makeID from '../../backend/helper/makeID';
import useAuthBackgroundSource from '../hooks/useAuthBackgroundSource';
import {
  sanitizeHandle,
  USERNAME_REGEX,
  fetchAllUsers,
  isHandleTaken,
  persistPendingUserWithHandle,
} from '../utils/usernameRegistration';

const CreateUsername = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const pendingUser = route?.params?.pendingUser || null;
  const uidFromGlobal = useMemo(() => {
    try {
      const maybeUid = global?.userData?.uid;
      return typeof maybeUid === 'string' && maybeUid.length > 0 ? maybeUid : null;
    } catch {
      return null;
    }
  }, []);

  const routeUid = route?.params?.uid;
  const initialHandleParam = sanitizeHandle(
    route?.params?.initialHandle
    || pendingUser?.suggestedHandle
  );
  const resolvedUid = useMemo(() => {
    if (routeUid) return routeUid;
    if (pendingUser?.uid) return pendingUser.uid;
    if (uidFromGlobal) return uidFromGlobal;
    return makeID();
  }, [pendingUser?.uid, routeUid, uidFromGlobal]);
  const uid = resolvedUid;
  const nextRoute = route?.params?.nextRoute || 'Tabs';

  const [handle, setHandle] = useState(initialHandleParam);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userSnapshot, setUserSnapshot] = useState(null);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('SignUp');
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;

    if (pendingUser) {
      setLoading(false);
      setUserSnapshot(null);
      return () => { isMounted = false; };
    }

    if (!uid) {
      return () => { isMounted = false; };
    }

    setLoading(true);
    readDoc('users', uid)
      .then((docData) => {
        if (!isMounted) return;
        setUserSnapshot(docData || null);
        if (!initialHandleParam) {
          const derived = sanitizeHandle(docData?.handle);
          if (derived) {
            setHandle(derived);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load user snapshot for username setup:', err?.message || err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [pendingUser, uid, initialHandleParam]);

  const helperText = useMemo(() => {
    if (error) return error;
    return 'Usernames are 6–20 characters. Letters, numbers, underscores, and periods only.';
  }, [error]);

  const handleChange = useCallback((value) => {
    setError('');
    setHandle(sanitizeHandle(value));
  }, []);

  const applyHandleUpdate = useCallback(async () => {
    if (saving) return;
    const normalized = sanitizeHandle(handle);

    dismissKeyboard();

    if (!normalized) {
      setError('Please choose a username to continue.');
      return;
    }

    if (!USERNAME_REGEX.test(normalized)) {
      setError('Username must be 6–20 characters (a–z, 0–9, _ or .).');
      return;
    }

    setSaving(true);
    try {
      const allUsers = await fetchAllUsers();

      if (isHandleTaken(allUsers, normalized, uid)) {
        setError('Username is already taken.');
        return;
      }

      let mergedUser;

      if (pendingUser) {
        const result = await persistPendingUserWithHandle({
          pendingUser,
          handle: normalized,
          allUsers,
        });
        mergedUser = result.mergedUser;
        setUserSnapshot(result.mergedUser);
      } else {
        if (!uid) {
          setError('Something went wrong. Please try again.');
          return;
        }

        const userDoc = userSnapshot || await readDoc('users', uid).catch(() => ({}));

        mergedUser = {
          ...(userDoc || {}),
          uid,
          handle: normalized,
        };

        await updateDoc('users', uid, {
          handle: normalized,
        });

        const rewrittenAll = (() => {
          if (!allUsers.length) {
            return [mergedUser];
          }
          let found = false;
          const remapped = allUsers.map((entry) => {
            if (!entry || typeof entry !== 'object') return entry;
            if (String(entry.uid || '') === String(uid)) {
              found = true;
              return { ...entry, handle: normalized };
            }
            return entry;
          });
          if (!found) {
            remapped.push(mergedUser);
          }
          return remapped;
        })();

        await updateDoc('global', 'users', { all: rewrittenAll });

        try {
          global.userData = {
            ...(global.userData || {}),
            ...mergedUser,
          };
        } catch {}

        setUserSnapshot(mergedUser);
      }

      setError('');
      if (typeof nextRoute === 'string' && nextRoute.length > 0) {
        navigation.reset({
          index: 0,
          routes: [{ name: nextRoute }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tabs' }],
        });
      }
    } catch (err) {
      console.warn('Username assignment failed:', err?.message || err);
      setError('Unable to save username. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [dismissKeyboard, handle, navigation, nextRoute, pendingUser, saving, uid, userSnapshot]);

  const backgroundSource = useAuthBackgroundSource();
  const showSpinner = saving || loading;

  return (
    <ImageBackground
      source={backgroundSource}
      defaultSource={authBackground}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + scaleSize(6) }]}
          onPress={handleBack}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={scaleSize(24)} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <View style={[styles.container, { paddingBottom: insets.bottom + scaleSize(28) }]}>
            <View style={styles.content}>
              <View style={styles.heading}>
                <Text style={styles.title}>Create your Username</Text>
                <Text style={styles.subtitle}>
                  This is how your friends will find you on Spartan.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.usernamePrefix}>@</Text>
                  <TextInput
                    value={handle}
                    onChangeText={handleChange}
                    placeholder="yourusername"
                    placeholderTextColor={theme.textSecondary}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={applyHandleUpdate}
                  />
                </View>
                <Text style={[styles.helperText, error && styles.errorText]}>
                  {helperText}
                </Text>
              </View>

              <RNBounceable
                style={[styles.ctaButton, showSpinner && styles.ctaButtonBusy]}
                onPress={applyHandleUpdate}
                disabled={showSpinner}
              >
                {showSpinner ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.ctaButtonText}>Continue</Text>
                )}
              </RNBounceable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  backgroundImage: {
    opacity: 0.6,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: scaleSize(28),
    paddingTop: scaleSize(92),
  },
  backButton: {
    position: 'absolute',
    left: scaleSize(16),
    padding: scaleSize(8),
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  heading: {
    marginBottom: scaleSize(24),
  },
  title: {
    fontSize: scaleSize(26),
    fontFamily: 'Poppins_700Bold',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: scaleSize(12),
  },
  subtitle: {
    fontSize: scaleSize(14),
    fontFamily: 'Nunito_600SemiBold',
    color: '#f2f6ffdd',
    textAlign: 'center',
    lineHeight: scaleSize(22),
    marginHorizontal: scaleSize(36),
  },
  form: {
    width: '100%',
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    color: theme.textPrimary,
    fontSize: scaleSize(14.5),
    marginBottom: scaleSize(8),
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(14),
    borderRadius: scaleSize(12),
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.hairline,
  },
  usernamePrefix: {
    marginRight: scaleSize(6),
    fontFamily: 'Outfit_600SemiBold',
    fontSize: scaleSize(14.5),
    color: theme.textSecondary,
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: scaleSize(14.5),
    color: theme.textPrimary,
  },
  helperText: {
    marginTop: scaleSize(10),
    fontFamily: 'Outfit_400Regular',
    fontSize: scaleSize(12.5),
    color: '#f0f0f0cc',
    textAlign: 'center',
  },
  errorText: {
    color: '#fca5a5',
  },
  ctaButton: {
    marginTop: scaleSize(32),
    width: '100%',
    backgroundColor: theme.primary,
    borderRadius: scaleSize(12),
    paddingVertical: scaleSize(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonBusy: {
    opacity: 0.65,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: scaleSize(14),
    letterSpacing: scaleSize(0.4),
  },
});

export default CreateUsername;
