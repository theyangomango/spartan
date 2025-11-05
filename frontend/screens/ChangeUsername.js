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
      setError('Please choose a username.');
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
            <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={styles.heading}>
                <Text style={styles.title}>Change your username</Text>
                <Text style={styles.subtitle}>
                  Pick something easy for friends to search and find you.
                </Text>
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
                style={[styles.ctaButton, saving && styles.ctaButtonBusy]}
                onPress={onSubmit}
                disabled={saving}
              >
                {saving ? (
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
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(32),
  },
  backButton: {
    padding: scaleSize(6),
    width: scaleSize(40),
    marginBottom: scaleSize(12),
  },
  content: {
    flex: 1,
  },
  heading: {
    marginBottom: scaleSize(28),
  },
  title: {
    fontSize: scaleSize(24),
    fontFamily: 'Poppins_700Bold',
    color: theme.textPrimary,
    marginBottom: scaleSize(10),
    textAlign: 'left',
  },
  subtitle: {
    fontSize: scaleSize(14),
    fontFamily: 'Nunito_600SemiBold',
    color: '#f2f6ffdd',
    lineHeight: scaleSize(20),
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
    backgroundColor: theme.fieldDeep,
    borderWidth: scaleSize(1),
    borderColor: theme.fieldBorder,
  },
  usernamePrefix: {
    fontFamily: 'Outfit_600SemiBold',
    color: theme.textSecondary,
    fontSize: scaleSize(18),
    marginRight: scaleSize(6),
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    color: theme.textPrimary,
    fontSize: scaleSize(18),
  },
  helperText: {
    fontSize: scaleSize(12.5),
    fontFamily: 'Nunito_600SemiBold',
    color: theme.textSecondary,
    marginTop: scaleSize(10),
  },
  errorText: {
    color: theme.error,
  },
  ctaButton: {
    marginTop: scaleSize(32),
    backgroundColor: theme.primary,
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonBusy: {
    opacity: 0.7,
  },
  ctaButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#ffffff',
    fontSize: scaleSize(16),
  },
});

export default ChangeUsername;
