// Shared StyleSheet of the handle and name form screens (CreateUsername, ChangeUsername, ChangeName).
import { StyleSheet } from 'react-native';
import theme from '../theme/mfpDark';
import scaleSize from '../helper/scaleSize';

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
  inputIcon: {
    marginRight: scaleSize(8),
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

export default styles;
