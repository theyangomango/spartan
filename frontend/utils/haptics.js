// utils/haptics.js
import * as Haptics from 'expo-haptics';

export function strong() {
  try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
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

