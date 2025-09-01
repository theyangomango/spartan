// hooks/useRestTimer.js
import { useCallback, useEffect, useState } from "react";

export default function useRestTimer() {
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [restModalKey, setRestModalKey] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const openRestModal = useCallback(() => {
    setRestModalKey((k) => k + 1);
    setRestModalVisible(true);
  }, []);
  const closeRestModal = useCallback(() => setRestModalVisible(false), []);

  // Tick countdown every second
  useEffect(() => {
    let t = null;
    if (countdown > 0) t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => t && clearInterval(t);
  }, [countdown]);

  const startCountdown = useCallback((secs) => setCountdown(Number(secs) || 0), []);
  const addCountdown = useCallback((secs) => setCountdown((s) => s + (Number(secs) || 0)), []);
  const resetCountdown = useCallback(() => setCountdown(0), []);

  return {
    // state
    restModalVisible,
    restModalKey,
    countdown,
    // controls
    openRestModal,
    closeRestModal,
    startCountdown,
    addCountdown,
    resetCountdown,
    setCountdown, // expose raw setter if needed
  };
}

