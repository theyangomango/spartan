import React, { useCallback, useEffect, useMemo, useRef, memo } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from "../../3_Workout/NewWorkout/NewWorkoutModal";
import { onSnapshot, doc } from "firebase/firestore";
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

  // Any flip of expandToggle expands the sheet, but skip first mount and wait until we have content
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!workout) return; // don't expand unless we have content
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
  useEffect(() => {
    if (!friendUidEff) return;
    const unsub = onSnapshot(doc(db, "users", friendUidEff), (snap) => {
      const data = snap.data() || {};
      friendStatsRef.current = data?.statsExercises || null;
    });
    return () => { try { unsub && unsub(); } catch {} };
  }, [friendUidEff]);

  return (
    <View style={styles.outer} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onClose={onClose}
        // Styled like friend-view (warm accent) since this sheet is locked to past/friend view
        handleIndicatorStyle={{ backgroundColor: HANDLE_FRIEND_ACCENT }}
        handleStyle={{ backgroundColor: HANDLE_FRIEND_BACKGROUND }}
      >
        {workout && (
          <NewWorkoutModal
            timerRef={timerRef}
            workout={workout}
            // Read-only: no editing/finishing
            cancelWorkout={noop}
            updateWorkout={noop}
            finishWorkout={noop}
            showGroupModal={noop}
            userWorkoutStats={friendStatsRef.current || {}}
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
    zIndex: 50,
  },
});

const areEqual = (prev, next) => prev.expandToggle === next.expandToggle && prev.workout === next.workout;

export default memo(FeedWorkoutViewerSheet, areEqual);
