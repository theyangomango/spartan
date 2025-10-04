import React, { useMemo, useCallback } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import SimpleFeedPost from "../components/1_Feed/SimpleFeedPost";
import PastWorkoutExerciseLog from "../components/1_Feed/PastWorkoutExerciseLog";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";

const HEADER_ICON_SIZE = scaleSize(20);

const ensureAtHandle = (handle) => {
  if (!handle) return "";
  const trimmed = String(handle).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
};

const PastWorkoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const workout = route.params?.workout ?? null;
  const owner = route.params?.owner ?? {};
  const postMeta = route.params?.postMeta ?? {};

  const handleBack = () => {
    navigation.goBack();
  };

  const exercises = useMemo(() => (
    Array.isArray(workout?.exercises)
      ? workout.exercises.filter((ex) => ex && typeof ex === "object")
      : []
  ), [workout?.exercises]);

  const ownerHandle = ensureAtHandle(owner?.handle || workout?.handle || workout?.username || "");
  const ownerPfp = owner?.pfp || workout?.pfp || workout?.pfpUrl || workout?.photoURL || workout?.photo || null;
  const caption = typeof postMeta?.caption === "string" ? postMeta.caption.trim() : "";

  const cardData = useMemo(() => {
    if (!workout) return null;

    const pid = String(postMeta?.pid
      || `${owner?.uid || "user"}:${workout?.wid || workout?.id || "workout"}`);
    const handleValue = ownerHandle.startsWith("@") ? ownerHandle.slice(1) : ownerHandle;
    const media = Array.isArray(postMeta?.media)
      ? postMeta.media
      : (Array.isArray(workout?.media) ? workout.media : []);

    const captionComment = caption
      ? [{
          content: caption,
          handle: handleValue,
          isCaption: true,
          pfp: ownerPfp,
          timestamp: postMeta?.created ?? workout?.created ?? Date.now(),
          uid: owner?.uid ? String(owner.uid) : null,
        }]
      : [];

    return {
      pid,
      uid: owner?.uid ? String(owner.uid) : "",
      handle: handleValue,
      name: owner?.name || "",
      pfp: ownerPfp || "",
      pfpVersion: owner?.pfpVersion ?? 0,
      created: postMeta?.created ?? workout?.created ?? Date.now(),
      caption,
      workout,
      likes: Array.isArray(postMeta?.likes) ? postMeta.likes : [],
      likeCount: postMeta?.likeCount ?? (Array.isArray(postMeta?.likes) ? postMeta.likes.length : 0),
      comments: Array.isArray(postMeta?.comments) ? postMeta.comments : captionComment,
      commentCount: postMeta?.commentCount ?? 0,
      media,
      images: Array.isArray(postMeta?.images) ? postMeta.images : [],
      shareCount: postMeta?.shareCount ?? 0,
      tags: Array.isArray(postMeta?.tags) ? postMeta.tags : [],
      tagged: Array.isArray(postMeta?.tagged) ? postMeta.tagged : [],
    };
  }, [workout, postMeta?.pid, postMeta?.created, postMeta?.likes, postMeta?.likeCount, postMeta?.comments, postMeta?.commentCount, postMeta?.media, postMeta?.images, postMeta?.shareCount, postMeta?.tags, postMeta?.tagged, owner?.uid, owner?.name, owner?.pfpVersion, ownerHandle, ownerPfp, caption]);

  const handlePressProfile = useCallback(() => {
    if (!owner?.uid) return;
    const user = {
      handle: ownerHandle.startsWith("@") ? ownerHandle.slice(1) : ownerHandle,
      uid: owner.uid,
      pfp: ownerPfp || undefined,
      name: owner?.name || "",
    };
    const rootNav = navigation?.getParent?.("ROOT");
    if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
    else navigation.navigate("ViewProfile", { user });
  }, [navigation, owner?.uid, owner?.name, ownerHandle, ownerPfp]);

  const noop = useCallback(() => {}, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBackButton}>
          <Ionicons name="chevron-back" size={HEADER_ICON_SIZE} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Past Workout
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {cardData ? (
          <View style={styles.cardWrapper}>
            <SimpleFeedPost
              data={cardData}
              index={0}
              highlightPid={null}
              highlightSignal={0}
              onPressProfile={handlePressProfile}
              onPressWorkout={noop}
              onPressComments={noop}
              onPressShare={noop}
              onPressLikes={noop}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No workout data</Text>
            <Text style={styles.emptyStateSubtitle}>
              This workout could not be loaded. Please return to the feed and try again.
            </Text>
          </View>
        )}

        {workout && exercises.length > 0 ? (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Detailed Sets</Text>
            {exercises.map((exercise, index) => (
              <PastWorkoutExerciseLog key={`${exercise?.name || "exercise"}-${index}`} exercise={exercise} index={index} />
            ))}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleSize(18),
    paddingVertical: scaleSize(12),
  },
  headerBackButton: {
    padding: scaleSize(4),
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: theme.textPrimary,
    fontFamily: "Outfit_600SemiBold",
    fontSize: scaleSize(17),
  },
  headerRightSpacer: {
    width: HEADER_ICON_SIZE,
  },
  content: {
    paddingTop: scaleSize(8),
    paddingBottom: scaleSize(28),
  },
  cardWrapper: {
    marginBottom: 0,
  },
  emptyState: {
    marginHorizontal: scaleSize(16),
    marginVertical: scaleSize(24),
    padding: scaleSize(18),
    borderRadius: scaleSize(14),
    backgroundColor: theme.surface,
  },
  emptyStateTitle: {
    color: theme.textPrimary,
    fontFamily: "Outfit_600SemiBold",
    fontSize: scaleSize(17),
    marginBottom: scaleSize(8),
  },
  emptyStateSubtitle: {
    color: theme.textSecondary,
    fontFamily: "Outfit_400Regular",
    fontSize: scaleSize(14),
  },
  detailSection: {
    marginTop: scaleSize(4),
  },
  sectionTitle: {
    color: theme.textPrimary,
    fontFamily: "Outfit_600SemiBold",
    fontSize: scaleSize(16),
    marginBottom: scaleSize(12),
    marginHorizontal: scaleSize(18),
  },
});

export default PastWorkoutScreen;
