import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme/mfpDark';
import scaleSize from '../../helper/scaleSize';

const AuthButton = ({ icon, text, onPress, disabled = false, style, textStyle }) => (
  <RNBounceable
    style={[styles.button, disabled && styles.buttonDisabled, style]}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    {icon ? (
      <Ionicons name={icon} size={scaleSize(19)} color={theme.textPrimary} style={styles.icon} />
    ) : null}
    <Text style={[styles.text, textStyle]}>{text}</Text>
  </RNBounceable>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: scaleSize(1.3),
    borderColor: theme.hairline,
    backgroundColor: theme.field,
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(8),
    marginVertical: scaleSize(7),
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  icon: {
    position: 'absolute',
    left: scaleSize(17),
  },
  text: {
    fontSize: scaleSize(14.5),
    fontFamily: 'SourceSansPro_600SemiBold',
    color: theme.textPrimary,
  },
});

export default AuthButton;
