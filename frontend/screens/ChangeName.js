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
import { updateUserName } from '../services/userProfileService';

const MAX_NAME_LENGTH = 60;

const ChangeName = ({ navigation, route }) => {
  const initialName = typeof route?.params?.initialName === 'string'
    ? route.params.initialName
    : (typeof global?.userData?.displayName === 'string' ? global.userData.displayName : '');
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const helperText = useMemo(() => {
    if (error) return error;
    return 'Enter the name you want others to see on your profile.';
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
    if (typeof value !== 'string') {
      setName('');
      return;
    }
    const trimmed = value.replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
    setName(trimmed);
  }, []);

  const onSubmit = useCallback(async () => {
    if (saving) return;
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    setSaving(true);
    Keyboard.dismiss();
    try {
      await updateUserName(trimmed);
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update name.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [name, navigation, saving]);

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
                <Text style={styles.title}>Change your name</Text>
                <Text style={styles.subtitle}>
                  Update how your name appears across the app.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={onChangeText}
                  placeholder="Your name"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="words"
                  autoCorrect
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                />
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
  input: {
    width: '100%',
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(14),
    borderRadius: scaleSize(12),
    backgroundColor: theme.fieldDeep,
    borderWidth: scaleSize(1),
    borderColor: theme.fieldBorder,
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

export default ChangeName;
