import React, { useCallback, useEffect, useMemo, useRef, memo, useState } from "react";
import { View, StyleSheet, InteractionManager, Animated, ActivityIndicator, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import PagerView from "react-native-pager-view";
import SpectatingWorkoutModal from "../../3_Workout/NewWorkout/SpectatingWorkoutModal";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import CopyTemplateToast from "../../3_Workout/ui/CopyTemplateToast";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import makeID from "../../../../backend/helper/makeID";
import theme from "../../../theme/mfpDark";
import { canViewWorkout, sanitizeStatsForViewer } from "../../../utils/workoutPrivacy";

import scaleSize from "../../../helper/scaleSize";

const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";

// Feed-specific wrapper to view a workout using SpectatingWorkoutModal inside a bottom sheet
// Not full-screen; slides up to ~94% height. Locked to friend/past view.
const FeedWorkoutViewerSheet = ({
  expandToggle,
  items: itemsProp,
  activeIndex = 0,
  onChangeIndex,
  workout,
  friendUid,
  friendPfp,
  onClose,
}) => {
  const bottomSheetRef = useRef(null);
  const pagerRef = useRef(null);
  const snapPoints = useMemo(() => ["94%"], []);
  const timerRef = useRef("");
  const [mountContent, setMountContent] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState("Template added");
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, Math.min(activeIndex, (Array.isArray(itemsProp) && itemsProp.length ? itemsProp.length - 1 : 0))));
  const [, setStatsTick] = useState(0);
  const viewerData = (() => {
    try { return global?.userData || null; } catch { return null; }
  })();
  const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";

  const items = useMemo(() => {
    if (Array.isArray(itemsProp) && itemsProp.length) return itemsProp;
    if (workout) {
      const friendUidEff = String(friendUid || workout?.__friendUid || workout?.creatorUID || workout?.creatorUid || "");
      const friendPfpEff = friendPfp || workout?.__friendPfp || null;
      const friendPfpVersionEff = workout?.__friendPfpVersion ?? workout?.friendPfpVersion ?? workout?.pfpVersion ?? 0;
      const key = `${friendUidEff || "viewer"}:${workout?.wid || workout?.id || "wk"}`;
      return [{
        key,
        workout,
        friendUid: friendUidEff,
        friendPfp: friendPfpEff,
        friendPfpVersion: friendPfpVersionEff,
        chip: null,
      }];
    }
    return [];
  }, [itemsProp, workout, friendUid, friendPfp]);

  useEffect(() => {
    if (!items.length) {
      setMountContent(false);
      return;
    }
    setMountContent(true);
    requestAnimationFrame(() => bottomSheetRef.current?.expand());
  }, [expandToggle, items.length]);

  useEffect(() => {
    if (!items.length) return;
    const target = Math.max(0, Math.min(activeIndex, items.length - 1));
    setCurrentIndex(target);
    requestAnimationFrame(() => {
      const pager = pagerRef.current;
      if (!pager) return;
      try {
        if (typeof pager.setPageWithoutAnimation === "function") pager.setPageWithoutAnimation(target);
        else if (typeof pager.setPage === "function") pager.setPage(target);
      } catch {}
    });
  }, [activeIndex, items]);

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

  // Close handler for back chevron inside SpectatingWorkoutModal’s GroupHeader
  const handleBack = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Cheer is a no-op in feed context (could be wired later)
  const noop = useCallback(() => {}, []);

  const friendStatsCacheRef = useRef(new Map());
  const pendingStatsRef = useRef(new Set());

  const fetchFriendStats = useCallback(async (uid) => {
    const key = String(uid || "");
    if (!key) return;
    if (friendStatsCacheRef.current.has(key) || pendingStatsRef.current.has(key)) return;
    pendingStatsRef.current.add(key);
    try {
      const snap = await getDoc(doc(db, "users", key));
      const data = snap.exists() ? (snap.data() || {}) : {};
      friendStatsCacheRef.current.set(
        key,
        sanitizeStatsForViewer(data?.statsExercises || null, key, viewerUid, viewerData)
      );
      setStatsTick((tick) => (tick + 1) % 1_000_000);
    } catch {}
    finally {
      pendingStatsRef.current.delete(key);
    }
  }, []);

  const handleSheetChange = useCallback((index) => {
    if (index >= 0) {
      setMountContent(true);
      const entry = items[Math.max(0, Math.min(currentIndex, items.length - 1))];
      const workoutObj = entry?.workout || null;
      const uid = entry?.friendUid || workoutObj?.__friendUid || workoutObj?.creatorUID || workoutObj?.creatorUid;
      if (uid && canViewWorkout(workoutObj, viewerUid, viewerData)) {
        InteractionManager.runAfterInteractions(() => { fetchFriendStats(uid); });
      }
    } else {
      setMountContent(false);
    }
  }, [items, currentIndex, fetchFriendStats, viewerUid, viewerData]);

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
          type: (() => {
            const raw = typeof s?.type === 'string' ? s.type.toLowerCase() : '';
            return raw === 'warmup' || raw === 'dropset' || raw === 'failure' ? raw : null;
          })(),
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

  useEffect(() => {
    const entry = items[Math.max(0, Math.min(currentIndex, items.length - 1))];
    const workoutObj = entry?.workout || null;
    const uid = entry?.friendUid || workoutObj?.__friendUid || workoutObj?.creatorUID || workoutObj?.creatorUid;
    if (uid && canViewWorkout(workoutObj, viewerUid, viewerData)) {
      InteractionManager.runAfterInteractions(() => { fetchFriendStats(uid); });
    }
  }, [items, currentIndex, fetchFriendStats, viewerUid, viewerData]);

  const handlePageSelected = useCallback((event) => {
    const idx = event?.nativeEvent?.position ?? 0;
    setCurrentIndex(idx);
    onChangeIndex?.(idx);
  }, [onChangeIndex]);

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
        // Match SpectatingWorkoutModal background with the app background color
        backgroundStyle={{ backgroundColor: theme.bg }}
        // Styled like friend-view (warm accent) since this sheet is locked to past/friend view
        handleIndicatorStyle={{ backgroundColor: HANDLE_FRIEND_ACCENT }}
        handleStyle={{ backgroundColor: HANDLE_FRIEND_BACKGROUND }}
      >
        {mountContent && items.length > 0 && (
          <>
            <PagerView
              ref={pagerRef}
              style={styles.pager}
              initialPage={Math.max(0, Math.min(currentIndex, items.length - 1))}
              onPageSelected={handlePageSelected}
            >
              {items.map((item, idx) => {
                const key = item?.key || `${idx}`;
                const rawWorkout = item?.workout || null;
                const workoutEntry = (rawWorkout && typeof rawWorkout === 'object')
                  ? (rawWorkout.privacyMode ? rawWorkout : { ...rawWorkout, privacyMode: rawWorkout?.privacyMode ?? 'global' })
                  : null;
                const friendUidEff = String(
                  item?.friendUid ||
                  workoutEntry?.__friendUid ||
                  workoutEntry?.creatorUID ||
                  workoutEntry?.creatorUid ||
                  ""
                );
                const friendPfpEff = item?.friendPfp || workoutEntry?.__friendPfp || null;
                const friendPfpVersionEff = item?.friendPfpVersion ?? workoutEntry?.__friendPfpVersion ?? workoutEntry?.friendPfpVersion ?? 0;
                const stats = friendUidEff ? friendStatsCacheRef.current.get(friendUidEff) || undefined : undefined;

                return (
                  <View key={key} style={styles.page} collapsable={false}>
                    {workoutEntry ? (
                      canViewWorkout(workoutEntry, viewerUid, viewerData) ? (
                        <SpectatingWorkoutModal
                          timerRef={timerRef}
                          workout={workoutEntry}
                          userWorkoutStats={stats}
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
                          forceViewingFriend={friendUidEff || false}
                          friendPfp={friendPfpEff}
                          friendPfpVersion={friendPfpVersionEff}
                          streamLive={false}
                        />
                      ) : (
                        <View style={styles.lockedWrap}>
                          <Text style={styles.lockedTitle}>Workout is private</Text>
                          <Text style={styles.lockedSubtitle}>You are not able to view this workout.</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={theme.primary || '#fff'} />
                      </View>
                    )}
                  </View>
                );
              })}
            </PagerView>
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
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scaleSize(24),
  },
  lockedTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: scaleSize(16),
    color: theme.textPrimary,
    marginBottom: scaleSize(6),
    textAlign: "center",
  },
  lockedSubtitle: {
    fontFamily: "Outfit_500Medium",
    fontSize: scaleSize(13),
    color: theme.textSecondary,
    textAlign: "center",
  },
  // Position toast near the top of the sheet content
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: scaleSize(14),
    alignItems: "center",
    zIndex: 40,
  },
});

const areEqual = (prev, next) =>
  prev.expandToggle === next.expandToggle &&
  prev.items === next.items &&
  prev.activeIndex === next.activeIndex &&
  prev.workout === next.workout &&
  prev.friendUid === next.friendUid &&
  prev.friendPfp === next.friendPfp;

export default memo(FeedWorkoutViewerSheet, areEqual);
