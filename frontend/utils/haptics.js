// utils/haptics.js
import * as Haptics from 'expo-haptics';

export function strong() {
  try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export function heavy() {
  try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Rigid); } catch {}
}

export function deep() {
  try { Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success); } catch {}
  try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export async function burst(count = 6, intervalMs = 45) {
  const taps = Math.max(1, Math.min(count, 10));
  try { await Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error); } catch {}
  for (let i = 0; i < taps; i += 1) {
    try { await Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Rigid); } catch {}
    if (i !== taps - 1) {
      try { await new Promise((resolve) => setTimeout(resolve, intervalMs)); } catch {}
    }
  }
}

export function withStrongPress(handler) {
  if (!handler) return undefined;
  return (...args) => {
    try { strong(); } catch {}
    return handler(...args);
  };
}

export function success() {
  try { Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success); } catch {}
}

export function warning() {
  try { Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Warning); } catch {}
}

export function error() {
  try { Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error); } catch {}
}

export default {
  strong,
  heavy,
  deep,
  burst,
  withStrongPress,
  success,
  warning,
  error,
};
