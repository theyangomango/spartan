import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import theme from '../../theme/mfpDark';
import scaleSize from '../../helper/scaleSize';
import { withStrongPress } from '../../utils/haptics';
import reportContentHelper from '../../helper/reportContent';

const REASONS = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'harassment', label: 'Harassment or hate' },
  { key: 'nudity', label: 'Nudity, sexual content, or minors at risk' },
  { key: 'self-harm', label: 'Self-harm or dangerous acts' },
  { key: 'misinformation', label: 'Misinformation or deceptive content' },
  { key: 'other', label: 'Something else' },
];

function ReasonRow({ item, selected, onSelect }) {
  const handlePress = useCallback(() => onSelect(item.key), [item.key, onSelect]);
  return (
    <Pressable onPress={withStrongPress(handlePress)} style={styles.reasonRow}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        <View style={[styles.radioInner, selected && styles.radioInnerSelected]} />
      </View>
      <Text style={styles.reasonLabel}>{item.label}</Text>
    </Pressable>
  );
}

export default function ReportContentSheet({
  visible,
  onClose,
  context = {},
  onSubmit,
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setReason('');
      setDetails('');
      setSubmitting(false);
      setError('');
    }
  }, [visible]);

  const title = useMemo(() => {
    const type = context?.targetType || 'content';
    switch (type) {
      case 'post':
        return 'Report Post';
      case 'comment':
      case 'comment-reply':
        return 'Report Comment';
      case 'message':
        return 'Report Message';
      case 'profile':
        return 'Report User';
      default:
        return 'Report Content';
    }
  }, [context?.targetType]);

  const ownerHandleDisplay = useMemo(() => {
    if (!context?.ownerHandle) return null;
    return `About @${String(context.ownerHandle).replace(/^@+/, '')}`;
  }, [context?.ownerHandle]);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      setError('Select a reason to continue.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      setError('Please share a few details so we can review.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const fn = typeof onSubmit === 'function' ? onSubmit : reportContentHelper;
      const payload = {
        ...context,
        reason,
        details: details.trim(),
        submittedAt: Date.now(),
        reporterUid: String(global?.userData?.uid || ''),
      };
      const result = await fn(payload);
      if (result?.ok !== false) {
        Alert.alert('Report sent', 'Thanks for letting us know. Our team will review it shortly.');
        onClose?.();
      } else if (result?.error) {
        setError(result.error?.message || 'Unable to submit right now.');
      } else {
        setError('Unable to submit right now. Please try again.');
      }
    } catch (err) {
      console.error('ReportContentSheet submit error', err);
      setError('Unable to submit right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [context, details, onClose, onSubmit, reason]);

  const handleDismiss = useCallback(() => {
    setReason('');
    setDetails('');
    setSubmitting(false);
    setError('');
    onClose?.();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.absoluteFill}>
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {ownerHandleDisplay ? <Text style={styles.subtitle}>{ownerHandleDisplay}</Text> : null}

          <View style={styles.reasonList}>
            {REASONS.map((item) => (
              <ReasonRow
                key={item.key}
                item={item}
                selected={reason === item.key}
                onSelect={setReason}
              />
            ))}
          </View>

          {reason === 'other' ? (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Tell us more</Text>
              <TextInput
                style={styles.input}
                placeholder="Share a brief description"
                placeholderTextColor="#6B7280"
                multiline
                value={details}
                onChangeText={setDetails}
                editable={!submitting}
                maxLength={500}
              />
              <Text style={styles.charCount}>{`${details.length}/500`}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.submitButton, (!reason || submitting) && styles.submitButtonDisabled]}
            disabled={!reason || submitting}
            onPress={withStrongPress(handleSubmit)}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit report</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={withStrongPress(handleDismiss)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '86%',
    backgroundColor: theme.surface,
    borderRadius: scaleSize(20),
    paddingHorizontal: scaleSize(20),
    paddingVertical: scaleSize(20),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(18),
    color: theme.textPrimary,
    marginBottom: scaleSize(4),
  },
  subtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: scaleSize(13),
    color: theme.textSecondary,
    marginBottom: scaleSize(12),
  },
  reasonList: {
    marginBottom: scaleSize(12),
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSize(9),
  },
  radioOuter: {
    width: scaleSize(20),
    height: scaleSize(20),
    borderRadius: scaleSize(10),
    borderWidth: scaleSize(1.2),
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleSize(10),
  },
  radioOuterSelected: {
    borderColor: '#2D9EFF',
  },
  radioInner: {
    width: scaleSize(10),
    height: scaleSize(10),
    borderRadius: scaleSize(5),
  },
  radioInnerSelected: {
    backgroundColor: '#2D9EFF',
  },
  reasonLabel: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: scaleSize(14),
    color: theme.textPrimary,
  },
  inputWrapper: {
    backgroundColor: theme.surface,
    borderRadius: scaleSize(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.hairline,
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(8),
    marginBottom: scaleSize(12),
  },
  inputLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: scaleSize(12),
    color: theme.textSecondary,
    marginBottom: scaleSize(6),
  },
  input: {
    minHeight: scaleSize(86),
    maxHeight: scaleSize(140),
    color: theme.textPrimary,
    fontFamily: 'Outfit_400Regular',
    fontSize: scaleSize(14),
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontFamily: 'Outfit_400Regular',
    fontSize: scaleSize(12),
    color: '#6B7280',
  },
  errorText: {
    color: '#F87171',
    fontFamily: 'Outfit_500Medium',
    fontSize: scaleSize(13),
    marginBottom: scaleSize(8),
  },
  submitButton: {
    backgroundColor: '#2D9EFF',
    borderRadius: scaleSize(14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSize(12),
  },
  submitButtonDisabled: {
    backgroundColor: '#1f3a5f',
  },
  submitText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(15),
    color: '#fff',
  },
  cancelButton: {
    marginTop: scaleSize(12),
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: scaleSize(14),
    color: theme.textSecondary,
  },
});
