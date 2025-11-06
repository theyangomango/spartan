import React, { useCallback, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import scaleSize from '../helper/scaleSize';
import useAuthBackgroundSource from '../hooks/useAuthBackgroundSource';
import { sanitizeHandle, USERNAME_REGEX } from '../utils/usernameRegistration';
import { updateUserHandle } from '../services/userProfileService';

const ChangeUsername = ({ navigation, route }) => {
  const initialHandle = sanitizeHandle(route?.params?.initialHandle) || '';
  const [handle, setHandle] = useState(initialHandle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const helperText = useMemo(() => {
    if (error) return error;
    return 'Usernames are 6–20 characters. Letters, numbers, underscores, and periods only.';
  }, [error]);

  const backgroundSource = useAuthBackgroundSource();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Tabs');
    }
  }, [navigation]);

  const onChangeText = useCallback((value) => {
    setError('');
    setHandle(sanitizeHandle(value));
  }, []);

  const onSubmit = useCallback(async () => {
    if (saving) return;
    const normalized = sanitizeHandle(handle);
    if (!normalized) {
      setError('Please choose a username to continue.');
      return;
    }
    if (!USERNAME_REGEX.test(normalized)) {
      setError('Username must be 6–20 characters (a–z, 0–9, _ or .).');
      return;
    }
    setSaving(true);
    Keyboard.dismiss();
    try {
      await updateUserHandle(normalized);
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update username.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [handle, navigation, saving]);

  const showSpinner = saving;

  return (
    <ImageBackground
      source={backgroundSource}
      defaultSource={require('../assets/AUTH_BACKGROUND.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <RNBounceable onPress={handleBack} style={styles.backButton} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={theme.textSecondary} />
            </RNBounceable>

            <View style={styles.content}>
              <View style={styles.heading}>
                <Text style={styles.title}>Change your username</Text>
                <Text style={styles.subtitle}>Update your handle so friends can still find you.</Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.usernamePrefix}>@</Text>
                  <TextInput
                    style={styles.input}
                    value={handle}
                    onChangeText={onChangeText}
                    placeholder="yourusername"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                  />
                </View>
                <Text style={[styles.helperText, error && styles.errorText]}>{helperText}</Text>
              </View>

              <TouchableOpacity
                style={[styles.ctaButton, showSpinner && styles.ctaButtonBusy]}
                onPress={onSubmit}
                disabled={showSpinner}
              >
                {showSpinner ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.ctaButtonText}>Save</Text>
                )}
              </TouchableOpacity>
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
    opacity: 0.62,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: scaleSize(28),
    paddingTop: scaleSize(96),
  },
  backButton: {
    position: 'absolute',
    top: scaleSize(18),
    left: scaleSize(20),
    padding: scaleSize(8),
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  heading: {
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
  title: {
    fontSize: scaleSize(26),
    fontFamily: 'Poppins_700Bold',
    color: theme.textPrimary,
    marginBottom: scaleSize(12),
    textAlign: 'center',
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
    fontSize: scaleSize(15),
    color: theme.textSecondary,
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: scaleSize(15),
    color: theme.textPrimary,
  },
  helperText: {
    marginTop: scaleSize(12),
    fontFamily: 'Outfit_400Regular',
    fontSize: scaleSize(12.5),
    color: '#f0f0f0cc',
    textAlign: 'center',
  },
  errorText: {
    color: '#fca5a5',
  },
  ctaButton: {
    marginTop: scaleSize(36),
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

export default ChangeUsername;
