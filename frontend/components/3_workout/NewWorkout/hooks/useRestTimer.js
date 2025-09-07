// hooks/useRestTimer.js
import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";
// Lazy import expo-notifications to avoid native crashes on simulators/dev clients
let ExpoNotifications = null;
try { ExpoNotifications = require('expo-notifications'); } catch {}
import * as Haptics from "expo-haptics";

export default function useRestTimer() {
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [restModalKey, setRestModalKey] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const endAtRef = useRef(0); // epoch ms when the current rest ends
  const scheduledNotifIdRef = useRef(null);
  const lastScheduledRemainingRef = useRef(0);

  const openRestModal = useCallback(() => {
    setRestModalKey((k) => k + 1);
    setRestModalVisible(true);
  }, []);
  const closeRestModal = useCallback(() => setRestModalVisible(false), []);

  // On mount, hydrate any in-progress rest from global cache
  useEffect(() => {
    try {
      const endAt = Number(global.__restTimerEndAt || 0);
      const total = Number(global.__restTimerTotal || 0);
      if (endAt && endAt > Date.now()) {
        endAtRef.current = endAt;
        setRestTotal(total > 0 ? total : Math.ceil((endAt - Date.now()) / 1000));
        setCountdown(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      }
    } catch {}
  }, []);

  // Tick countdown every second based on endAt (robust across unmount/remount)
  useEffect(() => {
    let t = setInterval(() => {
      const endAt = endAtRef.current || 0;
      if (!endAt || endAt <= 0) return;
      const remain = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setCountdown((prev) => (prev !== remain ? remain : prev));
      if (remain === 0) {
        // clear globals once reached zero
        endAtRef.current = 0;
        try { global.__restTimerEndAt = 0; global.__restTimerTotal = 0; } catch {}
      }
    }, 1000);
    return () => { if (t) clearInterval(t); };
  }, []);

  const startCountdown = useCallback((secs) => {
    const v = Number(secs) || 0;
    setRestTotal(v);
    endAtRef.current = v > 0 ? (Date.now() + v * 1000) : 0;
    try { global.__restTimerEndAt = endAtRef.current; global.__restTimerTotal = v; } catch {}
    lastScheduledRemainingRef.current = v;
    setCountdown(v);
    // schedule now for v seconds
    if (v > 0) scheduleLocalPush(v);
  }, [scheduleLocalPush]);
  const addCountdown = useCallback((secs) => {
    const delta = Number(secs) || 0;
    if (delta > 0) {
      lastScheduledRemainingRef.current = (lastScheduledRemainingRef.current || 0) + delta;
      setRestTotal((t) => (t || 0) + delta);
      if (endAtRef.current && endAtRef.current > 0) {
        endAtRef.current += delta * 1000;
      } else {
        endAtRef.current = Date.now() + delta * 1000;
      }
      try { global.__restTimerEndAt = endAtRef.current; global.__restTimerTotal = (lastScheduledRemainingRef.current || delta); } catch {}
      scheduleLocalPush(lastScheduledRemainingRef.current);
    }
    setCountdown((s) => s + delta);
  }, [scheduleLocalPush]);
  const resetCountdown = useCallback(() => { setCountdown(0); setRestTotal(0); cancelLocalPush(); }, [cancelLocalPush]);

  // Schedule/cancel a local push notification when the timer is running.
  const scheduleLocalPush = useCallback(async (secondsFromNow) => {
    try {
      if (!ExpoNotifications || !secondsFromNow || secondsFromNow <= 0) return;
      // Cancel any previous scheduled push
      if (scheduledNotifIdRef.current) {
        try { await ExpoNotifications.cancelScheduledNotificationAsync(scheduledNotifIdRef.current); } catch {}
        scheduledNotifIdRef.current = null;
      }
      const id = await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: 'Rest complete',
          body: "Let's get back to your set!",
          sound: true,
          badge: null,
        },
        trigger: { seconds: Math.max(1, Math.floor(secondsFromNow)), channelId: 'default', repeats: false },
        // On Android, ensure it fires even in Doze
        allowWhileIdle: true,
      });
      scheduledNotifIdRef.current = id;
    } catch { /* ignore */ }
  }, []);

  const cancelLocalPush = useCallback(async () => {
    try {
      if (ExpoNotifications && scheduledNotifIdRef.current) {
        await ExpoNotifications.cancelScheduledNotificationAsync(scheduledNotifIdRef.current);
        scheduledNotifIdRef.current = null;
      }
    } catch { /* ignore */ }
  }, []);

  // When countdown transitions from >0 to 0: vibrate + global overlay reminder
  const prevCountdownRef = useRef(0);
  useEffect(() => {
    const prev = prevCountdownRef.current || 0;
    if (prev > 0 && countdown === 0) {
      cancelLocalPush();
      endAtRef.current = 0;
      try { global.__restTimerEndAt = 0; global.__restTimerTotal = 0; } catch {}
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      try { Vibration.vibrate(150); } catch {}
      try { if (typeof global?.triggerRestReminder === 'function') global.triggerRestReminder(); } catch {}
    }
    prevCountdownRef.current = countdown;
  }, [countdown, cancelLocalPush]);

  // No per-second reschedule; start/add handlers schedule directly. Just cancel at zero.

  return {
    // state
    restModalVisible,
    restModalKey,
    countdown,
    restTotal,
    // controls
    openRestModal,
    closeRestModal,
    startCountdown,
    addCountdown,
    resetCountdown,
    setCountdown, // expose raw setter if needed
  };
}
