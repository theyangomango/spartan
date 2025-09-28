import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme/mfpDark';
import scaleSize from '../../helper/scaleSize';

const AuthButton = ({
  icon,
  iconColor = theme.textPrimary,
  iconComponent,
  text,
  onPress,
  disabled = false,
  style,
  textStyle,
}) => (
  <RNBounceable
    style={[styles.button, disabled && styles.buttonDisabled, style]}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    {(iconComponent || icon) ? (
      <View style={styles.iconWrapper}>
        {iconComponent || (
          <Ionicons name={icon} size={scaleSize(19)} color={iconColor} style={styles.icon} />
        )}
      </View>
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
    paddingVertical: scaleSize(11.5),
    borderRadius: scaleSize(10),
    marginVertical: scaleSize(4),
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  iconWrapper: {
    position: 'absolute',
    left: scaleSize(17),
    width: scaleSize(24),
    height: scaleSize(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});

export default AuthButton;
