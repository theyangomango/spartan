/**
 * Feed Screen. Displays posts in a simple scrolling list and manages feed overlays.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SafeAreaView,
  StyleSheet,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PostListItem from "../components/1_Feed/PostListItem";
import FeedHeader from "../components/1_Feed/FeedHeader";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import useFeedUserData from "./feed/hooks/useFeedUserData";
import useWorkoutFeed from "../helper/useWorkoutFeed";
import { toMillis as toMillisSafe } from "../utils/friends";

const HEADER_TOP_TRIM = scaleSize(4);
const LIST_BOTTOM_INSET = scaleSize(120);

export default function Feed({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const isScreenFocused = useIsFocused();

  const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

  const followingList = global.userData ? global.userData?.following : [];

  const posts = useFilteredFeed(followingList);
  const workoutFeed = useWorkoutFeed(followingList, UID);

  const {
    activeWorkout,
    footerKey,
    headerTimerRef,
    toMessagesScreen,
  } = useFeedUserData({ UID, navigation, route, isScreenFocused });

  const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({
    following: global.userData?.following,
    enablePrefetch: true,
  });

  const flatListRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState(-1);
  const [activeSheet, setActiveSheet] = useState(null); // 'comments' | 'share' | null
  const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
  const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
  const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
  const [likesSheetVisible, setLikesSheetVisible] = useState(false);
  const [likesSheetUsers, setLikesSheetUsers] = useState([]);
  const [likesSheetTitle, setLikesSheetTitle] = useState("Liked by");
  const [feedWorkoutExpandToggle, setFeedWorkoutExpandToggle] = useState(false);
  const [feedWorkoutItems, setFeedWorkoutItems] = useState([]);
  const [feedWorkoutActiveIndex, setFeedWorkoutActiveIndex] = useState(0);

  const highlightPidRef = useRef(null);
  const [highlightSignal, setHighlightSignal] = useState(0);
  const [pendingScrollRequest, setPendingScrollRequest] = useState(null);

  const activityViewerSessionRef = useRef(0);

  const resolveTimestamp = useCallback((item) => {
    if (!item) return 0;
    const fallback = item?.workout || null;
    const candidates = [
      item?.created,
      item?.createdAt,
      item?.updatedAt,
      fallback?.created,
      fallback?.createdAt,
      fallback?.completedAt,
      fallback?.finishedAt,
    ];
    for (const value of candidates) {
      const ms = toMillisSafe(value);
      if (ms) return ms;
    }
    return 0;
  }, []);

  const listData = useMemo(() => {
    const basePosts = Array.isArray(posts) ? posts : [];
    const workoutItems = Array.isArray(workoutFeed) ? workoutFeed : [];

    const seenWorkoutKeys = new Set();
    basePosts.forEach((item) => {
      const owner = String(item?.uid || item?.workout?.creatorUid || item?.workout?.creatorUID || "");
      const wid = String(item?.workout?.wid ?? item?.workout?.id ?? "");
      if (owner && wid) {
        seenWorkoutKeys.add(`${owner}:${wid}`);
      }
    });

    const dedupedWorkoutItems = workoutItems.filter((item) => {
      const owner = String(item?.uid || item?.workout?.creatorUid || item?.workout?.creatorUID || "");
      const wid = String(item?.workout?.wid ?? item?.workout?.id ?? "");
      if (owner && wid) {
        const key = `${owner}:${wid}`;
        if (seenWorkoutKeys.has(key)) return false;
      }
      return true;
    });

    const merged = [...basePosts, ...dedupedWorkoutItems];
    merged.sort((a, b) => resolveTimestamp(b) - resolveTimestamp(a));
    return merged;
  }, [posts, workoutFeed, resolveTimestamp]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openCommentsModal = useCallback((index) => {
    if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
      return;
    }
    setActivePostIndex(index);
    setActiveSheet("comments");
    setCommentsBottomSheetExpandFlag((flag) => !flag);
  }, [listData]);

  const dismissCommentsModal = useCallback(() => {
    setActiveSheet((current) => {
      if (current === "comments") {
        setActivePostIndex(-1);
        return null;
      }
      return current;
    });
  }, []);

  const openShareModal = useCallback((index) => {
    if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
      return;
    }
    setActivePostIndex(index);
    setActiveSheet("share");
    setShareBottomSheetExpandFlag((flag) => !flag);
  }, [listData]);

  const showLikesSheet = useCallback((users, title = "Liked by") => {
    const processed = Array.isArray(users)
      ? users
          .map((entry) => {
            if (!entry) return null;
            if (typeof entry === "string" || typeof entry === "number") {
              const uid = String(entry).trim();
              return uid ? uid : null;
            }
            if (typeof entry === "object") {
              const uid = entry?.uid ?? entry?.id;
              if (uid == null) return entry;
              const safeUid = String(uid).trim();
              if (!safeUid) return null;
              return { ...entry, uid: safeUid };
            }
            return null;
          })
          .filter(Boolean)
      : [];
    setLikesSheetUsers(processed);
    setLikesSheetTitle(title || "Liked by");
    setLikesSheetVisible(true);
  }, []);

  const openLikesSheet = useCallback((index) => {
    if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
      return;
    }
    const post = listData[index];
    if (!post) return;
    showLikesSheet(post.likes, "Liked by");
  }, [listData, showLikesSheet]);

  const handleOpenNotifications = useCallback(() => {
    try {
      navigation?.navigate?.("Notifications", { transition: "slide-from-right" });
    } catch {}
  }, [navigation]);

  const toViewProfilePosts = useCallback((index) => {
    const post = listData[index];
    if (!post) return;
    const user = { handle: post.handle, uid: post.uid, pfp: post.pfp, name: post.name };
    const rootNav = navigation?.getParent?.("ROOT");
    if (isThisUser(post.uid)) {
      if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
      else navigation.navigate("Profile", { transition: "slide-from-right" });
    } else {
      if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
      else navigation.navigate("ViewProfile", { user });
    }
  }, [navigation, listData]);

  const toViewProfileComments = useCallback((data) => {
    const user = { handle: data.handle, uid: data.uid, pfp: data.pfp, name: data.name };
    const rootNav = navigation?.getParent?.("ROOT");
    if (isThisUser(data.uid)) {
      if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
      else navigation.navigate("Profile", { transition: "slide-from-right" });
    } else {
      if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
      else navigation.navigate("ViewProfile", { user });
    }
  }, [navigation]);

  const openViewWorkoutModal = useCallback((index) => {
    if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
      return;
    }
    const post = listData[index];
    const w = post?.workout;
    if (!w) return;
    const fallback = {
      wid: w?.wid || w?.id,
      creatorUID: w?.creatorUID || w?.creatorUid || post?.uid || (global?.userData?.uid || ""),
      created: w?.created || w?.createdAt || Date.now(),
      exercises: Array.isArray(w?.exercises) ? w.exercises : [],
      duration: w?.duration,
      volume: w?.volume,
      reps: w?.reps,
      PBs: w?.PBs ?? w?.pbs ?? 0,
      templateName: w?.templateName || w?.template?.name,
    };
    const wk = { ...fallback, ...w };
    const friendUid = String(post?.uid || wk.creatorUID || wk.creatorUid || "");
    const friendPfp = post?.pfp || wk?.pfp || wk?.pfpUrl || post?.photoURL || post?.image || "";
    const friendPfpVersion = post?.pfpVersion ?? wk?.pfpVersion ?? wk?.version ?? 0;
    wk.__friendUid = friendUid;
    wk.__friendPfp = friendPfp || null;
    wk.__friendPfpVersion = friendPfpVersion ?? 0;

    activityViewerSessionRef.current += 1;
    const item = {
      key: `${friendUid}:${wk?.wid || wk?.id || index}`,
      workout: wk,
      friendUid,
      friendPfp: friendPfp || null,
      friendPfpVersion: friendPfpVersion ?? 0,
      chip: null,
    };
    setFeedWorkoutItems([item]);
    setFeedWorkoutActiveIndex(0);
    setFeedWorkoutExpandToggle((flag) => !flag);
  }, [listData]);

  const closeViewWorkoutModal = () => {
    // Keep last workout cached to avoid race clearing when reopening quickly.
  };

  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  useEffect(() => {
    try { global.scrollFeedToTop = scrollToTop; } catch {}
    return () => {
      try {
        if (global.scrollFeedToTop === scrollToTop) {
          global.scrollFeedToTop = undefined;
        }
      } catch {}
    };
  }, [scrollToTop]);

  const scrollToPid = useCallback((pid) => {
    if (!pid || !Array.isArray(listData) || listData.length === 0) return false;
    const idx = listData.findIndex((p) => String(p?.pid || "") === String(pid));
    if (idx < 0) return false;
    highlightPidRef.current = String(pid);
    setHighlightSignal(Date.now());
    try {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
    } catch {
      try { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); } catch {}
    }
    return true;
  }, [listData]);

  useEffect(() => {
    if (route?.params?.scrollToTop) {
      const id = setTimeout(() => scrollToTop(), 30);
      try { navigation.setParams({ scrollToTop: false }); } catch {}
      return () => clearTimeout(id);
    }
    return undefined;
  }, [route?.params?.scrollToTop, navigation, scrollToTop]);

  useEffect(() => {
    if (route?.params?.focusPid || route?.params?.scrollPid) {
      const rawPid = route?.params?.focusPid ?? route?.params?.scrollPid;
      if (rawPid !== undefined && rawPid !== null) {
        const pid = String(rawPid);
        setPendingScrollRequest({ pid });
        const id = setTimeout(() => {
          const ok = scrollToPid(pid);
          if (ok) setPendingScrollRequest(null);
        }, 50);
        const cleanup = () => clearTimeout(id);
        try { navigation.setParams({ focusPid: undefined, scrollPid: undefined }); } catch {}
        return cleanup;
      }
      try { navigation.setParams({ focusPid: undefined, scrollPid: undefined }); } catch {}
    }
    return undefined;
  }, [route?.params?.focusPid, route?.params?.scrollPid, navigation, scrollToPid]);

  useEffect(() => {
    if (!pendingScrollRequest?.pid) return;
    const ok = scrollToPid(pendingScrollRequest.pid);
    if (ok) setPendingScrollRequest(null);
  }, [pendingScrollRequest, scrollToPid]);

  useFocusEffect(
    useCallback(() => {
      const sig = Number(global?.scrollFeedToTopSignal || 0);
      const handled = Number(global?.scrollFeedToTopHandled || 0);
      if (sig && sig !== handled) {
        try { global.scrollFeedToTopHandled = sig; } catch {}
        const id = setTimeout(() => scrollToTop(), 30);
        return () => clearTimeout(id);
      }
      return undefined;
    }, [scrollToTop])
  );

  useEffect(() => {
    if (!listData || listData.length === 0) return;
    const seeded = listData
      .map((p) => ({ uid: p?.uid, handle: p?.handle, name: p?.name, pfp: p?.pfp }))
      .filter((u) => !!u.uid);
    mergeUsersIntoRef(seeded);
  }, [listData, mergeUsersIntoRef]);

  const listKeyExtractor = useCallback((item, index) => String(item?.pid || item?.id || index), []);

  const renderPost = useCallback(({ item, index }) => (
    <PostListItem
      item={item}
      index={index}
      highlightPid={highlightPidRef.current}
      highlightSignal={highlightSignal}
      openCommentsModal={openCommentsModal}
      openShareModal={openShareModal}
      openLikesSheet={openLikesSheet}
      toViewProfilePosts={toViewProfilePosts}
      openViewWorkoutModal={openViewWorkoutModal}
    />
  ), [highlightSignal, openCommentsModal, openShareModal, openLikesSheet, toViewProfilePosts, openViewWorkoutModal]);

  const headerComponent = useMemo(() => (
    <FeedHeader
      navigation={navigation}
      toMessagesScreen={toMessagesScreen}
      onOpenNotifications={handleOpenNotifications}
      scrollToTop={scrollToTop}
      allUsersRef={allUsersRef}
      workout={activeWorkout}
      timerRef={headerTimerRef}
      heightAdjust={-2}
      topAdjust={-HEADER_TOP_TRIM}
    />
  ), [navigation, toMessagesScreen, handleOpenNotifications, scrollToTop, allUsersRef, activeWorkout, headerTimerRef]);

  const commentsVisible = activeSheet === "comments" && activePostIndex >= 0;
  const shareSheetVisible = activeSheet === "share";
  const activePost = commentsVisible || shareSheetVisible
    ? listData[activePostIndex] || null
    : null;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.headerWrap}>{headerComponent}</View>
      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={listKeyExtractor}
        renderItem={renderPost}
        style={styles.list}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textPrimary}
            colors={[theme.textPrimary]}
            progressBackgroundColor={theme.bg}
          />
        )}
        contentContainerStyle={{
          paddingBottom: LIST_BOTTOM_INSET + Math.max(0, insets.bottom || 0),
        }}
        showsVerticalScrollIndicator={false}
      />

      <CommentsBottomSheet
        isVisible={commentsVisible}
        postData={commentsVisible ? activePost : null}
        commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
        toViewProfile={toViewProfileComments}
        collapseSignal={0}
        reopenSignal={0}
        interactiveProgress={0}
        interactiveProgressSV={null}
        interactiveScale={1}
        openPositionPx={undefined}
        unfocusGestureActive={false}
        onShowLikesSheet={showLikesSheet}
        onDismiss={dismissCommentsModal}
      />

      <FollowListBottomSheet
        isVisible={likesSheetVisible}
        setIsVisible={setLikesSheetVisible}
        title={likesSheetTitle}
        users={likesSheetUsers}
        navigation={navigation}
      />

      <ShareBottomSheet
        shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
        shareBottomSheetExpandFlag={shareSheetVisible ? shareBottomSheetExpandFlag : false}
        onDismiss={() => {
          setActiveSheet((current) => {
            if (current === "share") {
              setActivePostIndex(-1);
              return null;
            }
            return current;
          });
        }}
      />

      <Footer key={footerKey} currentScreenName="Feed" navigation={navigation} />

      <FeedWorkoutViewerSheet
        expandToggle={feedWorkoutExpandToggle}
        items={feedWorkoutItems}
        activeIndex={feedWorkoutActiveIndex}
        onChangeIndex={setFeedWorkoutActiveIndex}
        onClose={closeViewWorkoutModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  headerWrap: {
    backgroundColor: theme.bg,
    paddingBottom: scaleSize(2),
    zIndex: 2,
    elevation: 2,
  },
  list: {
    flex: 1,
  },
});
