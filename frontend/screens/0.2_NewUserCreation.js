import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import theme from '../theme/mfpDark';
import scaleSize from '../helper/scaleSize';
import { auth } from '../../firebase.config';
import { sanitizeHandle, USERNAME_REGEX } from '../utils/usernameRegistration';
import { finalizeUserProfile } from '../services/userProfileService';

const NewUserCreation = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailInputRef = useRef(null);

  const goBack = () => navigation.goBack();

  const handleChangeHandle = (value) => {
    setHandle(sanitizeHandle(value));
  };

  const signUp = async () => {
    if (submitting) return;
    setErrorMsg('');

    const rawContact = email.trim();
    const trimmedEmail = rawContact.toLowerCase();
    const trimmedName = name.trim();
    const sanitizedHandle = sanitizeHandle(handle);
    const trimmedPassword = password.trim();

    if (!rawContact || !trimmedName || !trimmedPassword || !sanitizedHandle) {
      setErrorMsg('Please fill out all fields.');
      return;
    }

    const isEmail = trimmedEmail.includes('@');
    let phoneDigits = '';
    if (!isEmail) {
      phoneDigits = rawContact.replace(/[^0-9+]/g, '');
      if (!phoneDigits || phoneDigits.replace(/[^0-9]/g, '').length < 8) {
        setErrorMsg('Enter a valid email or phone number.');
        return;
      }
    } else if (!/^([^@\s]+)@([^@\s]+)\.([^@\s]+)$/.test(trimmedEmail)) {
      setErrorMsg('Enter a valid email or phone number.');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 40) {
      setErrorMsg('Name must be 2–40 characters.');
      return;
    }

    if (!USERNAME_REGEX.test(sanitizedHandle)) {
      setErrorMsg('Username must be 6–20 characters (a–z, 0–9, _ or .).');
      return;
    }

    if (trimmedPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    Keyboard.dismiss();
    try {
      const derivedEmail = isEmail ? trimmedEmail : `${phoneDigits.replace(/[^0-9]/g, '')}@phone.spartan.app`;
      const credential = await createUserWithEmailAndPassword(auth, derivedEmail, trimmedPassword);
      const user = credential.user;

      await updateProfile(user, { displayName: trimmedName });
      const ensure = await finalizeUserProfile({
        handle: sanitizedHandle,
        displayName: trimmedName,
        email: isEmail ? trimmedEmail : '',
        phoneNumber: phoneDigits,
        emailVerified: false,
        providerId: 'password',
      });

      navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { transition: 'none' } }] });
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErrorMsg('That email is already registered.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('Enter a valid email address.');
      } else {
        setErrorMsg('Sign-up failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <View style={styles.iconSide}>
            <RNBounceable onPress={goBack}>
              <Feather name="chevron-left" size={scaleSize(27)} color={theme.textSecondary} style={styles.backIcon} />
            </RNBounceable>
          </View>
          <View style={styles.iconSide} />
        </View>

        <View style={styles.formWrapper}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.title}>Email or phone</Text>
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              placeholder="Enter your email or phone"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.title}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.title}>Username</Text>
            <View style={styles.usernameWrapper}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.usernameInput}
                placeholder="yourusername"
                placeholderTextColor={theme.textSecondary}
                value={handle}
                onChangeText={handleChangeHandle}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={signUp}
              />
            </View>
            <Text style={styles.usernameHelper}>
              Usernames are 6–20 characters. Letters, numbers, underscores, and periods only.
            </Text>
          </View>

          <View style={styles.footerContainer}>
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            <TouchableOpacity style={styles.button} onPress={signUp} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Creating account…' : 'Create account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    top: scaleSize(42),
    left: scaleSize(15),
    right: scaleSize(15),
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  iconSide: {
    width: scaleSize(40),
  },
  backIcon: {
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(6),
  },
  formWrapper: {
    flex: 1,
    paddingTop: scaleSize(120),
  },
  formContainer: {
    paddingHorizontal: scaleSize(22),
  },
  title: {
    fontSize: scaleSize(15),
    fontWeight: '400',
    color: theme.textPrimary,
    paddingLeft: scaleSize(3),
    marginBottom: scaleSize(8),
    fontFamily: 'Outfit_500Medium',
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    paddingVertical: scaleSize(11.5),
    paddingHorizontal: scaleSize(12),
    borderRadius: scaleSize(6),
    backgroundColor: theme.field,
    fontSize: scaleSize(14),
    color: theme.textPrimary,
    fontFamily: 'Outfit_500Medium',
    marginBottom: scaleSize(20),
  },
  usernameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scaleSize(6),
    backgroundColor: theme.field,
    paddingHorizontal: scaleSize(12),
    marginBottom: scaleSize(10),
  },
  usernamePrefix: {
    fontFamily: 'Outfit_600SemiBold',
    color: theme.textSecondary,
    marginRight: scaleSize(6),
  },
  usernameInput: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    color: theme.textPrimary,
    fontSize: scaleSize(14),
    paddingVertical: scaleSize(11.5),
  },
  usernameHelper: {
    fontFamily: 'Outfit_400Regular',
    fontSize: scaleSize(12),
    color: theme.textSecondary,
    marginBottom: scaleSize(20),
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: scaleSize(10),
    marginHorizontal: scaleSize(22),
    marginBottom: scaleSize(20),
  },
  button: {
    width: '100%',
    backgroundColor: theme.primary,
    borderRadius: scaleSize(12),
    paddingVertical: scaleSize(14),
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(15),
  },
  errorText: {
    color: '#B91C1C',
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: scaleSize(10),
  },
});

export default NewUserCreation;
