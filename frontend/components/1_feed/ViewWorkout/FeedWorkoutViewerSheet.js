import React, { useCallback, useEffect, useMemo, useRef, memo, useState } from "react";
import { View, StyleSheet, InteractionManager, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from "../../3_Workout/NewWorkout/NewWorkoutModal";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import CopyTemplateToast from "../../3_Workout/ui/CopyTemplateToast";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import makeID from "../../../../backend/helper/makeID";

const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";

// Feed-specific wrapper to view a workout using NewWorkoutModal inside a bottom sheet
// Not full-screen; slides up to ~94% height. Locked to friend/past view.
const FeedWorkoutViewerSheet = ({
  expandToggle,
  workout,
  friendUid,
  friendPfp,
  onClose,
}) => {
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ["94%"], []);
  const timerRef = useRef("");
  const [mountContent, setMountContent] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState("Template added");
  const navigation = useNavigation();

  // Any flip of expandToggle expands the sheet, but skip first mount and wait until we have content
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!workout) return; // don't expand unless we have content
    // Mount core content right away to avoid perceived delay, rely on virtualization for smoothness
    setMountContent(true);
    requestAnimationFrame(() => bottomSheetRef.current?.expand());
  }, [expandToggle]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    []
  );

  // Close handler for back chevron inside NewWorkoutModal’s GroupHeader
  const handleBack = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Cheer is a no-op in feed context (could be wired later)
  const noop = useCallback(() => {}, []);

  const friendUidEff = String(friendUid || workout?.__friendUid || workout?.creatorUID || workout?.creatorUid || "");
  const friendPfpEff = friendPfp || workout?.__friendPfp || null;

  // Fetch friend stats once for accurate "Previous" in read-only viewer (no live stream here)
  const friendStatsRef = useRef(null);
  const pendingFetchRef = useRef(0);
  // Fetch friend stats once per friend after the sheet is opened to avoid competing with animation
  const fetchFriendStats = useCallback(async () => {
    const key = `${friendUidEff}`;
    if (!friendUidEff) return;
    // ensure only one in-flight
    if (pendingFetchRef.current && pendingFetchRef.current === key) return;
    pendingFetchRef.current = key;
    try {
      const snap = await getDoc(doc(db, "users", friendUidEff));
      const data = snap.exists() ? (snap.data() || {}) : {};
      friendStatsRef.current = data?.statsExercises || null;
    } catch {}
  }, [friendUidEff]);

  const handleSheetChange = useCallback((index) => {
    if (index >= 0) {
      setMountContent(true);
      // Best-effort: fetch in background after interactions; doesn't block paint
      InteractionManager.runAfterInteractions(() => { fetchFriendStats(); });
    } else {
      setMountContent(false);
    }
  }, [fetchFriendStats]);

  const showToast = useCallback((msg) => {
    setToastText(msg || "Template added");
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [toastAnim]);

  const handleCopyTemplate = useCallback((wk) => {
    try {
      const uid = String(global?.userData?.uid || "");
      if (!wk || !uid) return;
      const tid = makeID();
      const name = wk?.templateName || wk?.template?.name || "Copied Template";
      const exercises = (Array.isArray(wk?.exercises) ? wk.exercises : []).map((ex) => ({
        name: ex?.name || "",
        muscle: ex?.muscle || "",
        sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
          weight: Number(s?.weight) || 0,
          reps: Number(s?.reps) || 0,
        })),
      }));
      const newTemplate = { id: tid, tid, name, exercises, lastDate: null };
      const prev = Array.isArray(global?.userData?.templates) ? global.userData.templates : [];
      updateDoc("users", uid, { templates: [...prev, newTemplate] }).catch(() => {});
      // optimistic local update so next open of templates shows the copy immediately
      try { global.userData.templates = [...prev, newTemplate]; } catch {}
      showToast("Template copied ✓");
    } catch (e) {
      // ignore errors for now; network failures will just miss the toast
    }
  }, [showToast]);

  return (
    <View style={styles.outer} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onClose={onClose}
        onChange={handleSheetChange}
        // Styled like friend-view (warm accent) since this sheet is locked to past/friend view
        handleIndicatorStyle={{ backgroundColor: HANDLE_FRIEND_ACCENT }}
        handleStyle={{ backgroundColor: HANDLE_FRIEND_BACKGROUND }}
      >
        {workout && mountContent && (
          <>
          <NewWorkoutModal
            timerRef={timerRef}
            workout={workout}
            // Read-only: no editing/finishing
            cancelWorkout={noop}
            updateWorkout={noop}
            finishWorkout={noop}
            showGroupModal={noop}
            userWorkoutStats={friendStatsRef.current || undefined}
            onPressBack={handleBack}
            onCheer={noop}
            onCopyTemplate={handleCopyTemplate}
            onPressPfp={() => {
              try { bottomSheetRef.current?.close(); } catch {}
              if (!friendUidEff) return;
              const meUid = String(global?.userData?.uid || "");
              const rootNav = navigation?.getParent?.('ROOT');
              if (friendUidEff === meUid) {
                if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
                else navigation.navigate('Profile', { transition: 'slide-from-right' });
              } else {
                if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: { uid: friendUidEff } });
                else navigation.navigate('ViewProfile', { user: { uid: friendUidEff } });
              }
            }}
            // Hard-lock friend view so controls are read-only
            forceViewingFriend={friendUidEff}
            friendPfp={friendPfpEff}
            // No live stream for past workouts (avoids extra listeners)
            streamLive={false}
          />
          {/* Copy Template toast centered near top of sheet */}
          <View pointerEvents="none" style={styles.toastWrap}>
            <CopyTemplateToast anim={toastAnim} text={toastText} />
          </View>
          </>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  // Position toast near the top of the sheet content
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 14,
    alignItems: "center",
    zIndex: 40,
  },
});

const areEqual = (prev, next) => prev.expandToggle === next.expandToggle && prev.workout === next.workout;

export default memo(FeedWorkoutViewerSheet, areEqual);
