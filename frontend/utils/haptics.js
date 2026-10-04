// utils/haptics.js
import * as Haptics from 'expo-haptics';

export function strong() {
  try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export function deep() {
  try { Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success); } catch {}
  try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export function withStrongPress(handler) {
  if (!handler) return undefined;
  return (...args) => {
    try { strong(); } catch {}
    return handler(...args);
  };
}
