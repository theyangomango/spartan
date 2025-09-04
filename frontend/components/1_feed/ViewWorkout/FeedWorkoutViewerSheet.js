import React, { useCallback, useEffect, useMemo, useRef, memo, useState } from "react";
import { View, StyleSheet, InteractionManager } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from "../../3_Workout/NewWorkout/NewWorkoutModal";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../../firebase.config";

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

  // Any flip of expandToggle expands the sheet, but skip first mount and wait until we have content
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!workout) return; // don't expand unless we have content
    // Immediately open the sheet; mount heavy content after animation/gestures finish
    setMountContent(false);
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
      // Defer heavy mount until current interactions finish for a smoother pop
      InteractionManager.runAfterInteractions(() => {
        setMountContent(true);
        // best-effort: kick off friend stats fetch in background
        fetchFriendStats();
      });
    } else {
      setMountContent(false);
    }
  }, [fetchFriendStats]);

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
            onCopyTemplate={undefined}
            // Hard-lock friend view so controls are read-only
            forceViewingFriend={friendUidEff}
            friendPfp={friendPfpEff}
            // No live stream for past workouts (avoids extra listeners)
            streamLive={false}
          />
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
});

const areEqual = (prev, next) => prev.expandToggle === next.expandToggle && prev.workout === next.workout;

export default memo(FeedWorkoutViewerSheet, areEqual);
