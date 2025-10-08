import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
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
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import readDoc from "../../backend/helper/firebase/readDoc";
import FastImage from "react-native-fast-image";
import isThisUser from "../helper/isThisUser";
import { usePfp } from "../helper/usePFPs";

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
    const onCopyTemplateParam = route.params?.onCopyTemplate;
    const [isCopying, setIsCopying] = useState(false);
    const [copyStatus, setCopyStatus] = useState("");
    const copyTimeoutRef = useRef(null);
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [fetchedPost, setFetchedPost] = useState(null);
    const postPid = useMemo(() => {
        const rawPid = postMeta?.pid ?? postMeta?.id ?? null;
        if (!rawPid && workout?.postPid) return String(workout.postPid);
        return rawPid ? String(rawPid) : "";
    }, [postMeta?.pid, postMeta?.id, workout?.postPid]);

    useEffect(() => {
        let cancelled = false;
        if (!postPid) {
            setFetchedPost(null);
            return () => { cancelled = true; };
        }

        (async () => {
            try {
                const data = await readDoc("posts", postPid);
                if (cancelled) return;
                if (data) {
                    setFetchedPost({ pid: data?.pid ?? postPid, ...data });
                } else {
                    setFetchedPost(null);
                }
            } catch {
                if (!cancelled) setFetchedPost(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [postPid]);

    const [likesSheetVisible, setLikesSheetVisible] = useState(false);
    const [likesSheetUsers, setLikesSheetUsers] = useState([]);
    const [likesSheetTitle, setLikesSheetTitle] = useState("Liked by");

    const handleBack = () => {
        navigation.goBack();
    };

    const showCopyStatus = useCallback((message) => {
        setCopyStatus(message);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopyStatus(""), 1800);
    }, []);

    useEffect(() => () => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    }, []);

    const exercises = useMemo(() => (
        Array.isArray(workout?.exercises)
            ? workout.exercises.filter((ex) => ex && typeof ex === "object")
            : []
    ), [workout?.exercises]);

    const ownerHandle = ensureAtHandle(owner?.handle || workout?.handle || workout?.username || "");
    const ownerPfp = owner?.pfp || workout?.pfp || workout?.pfpUrl || workout?.photoURL || workout?.photo || null;
    const caption = typeof postMeta?.caption === "string" ? postMeta.caption.trim() : "";
    const subtitlePfp = usePfp(
        owner?.uid ? String(owner.uid) : "",
        owner?.pfpVersion ?? 0,
        ownerPfp || owner?.image || owner?.photoURL || ""
    );

    const fallbackCardData = useMemo(() => {
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
    }, [workout, postMeta?.pid, postMeta?.id, postMeta?.created, postMeta?.likes, postMeta?.likeCount, postMeta?.comments, postMeta?.commentCount, postMeta?.media, postMeta?.images, postMeta?.shareCount, postMeta?.tags, postMeta?.tagged, owner?.uid, owner?.name, owner?.pfpVersion, ownerHandle, ownerPfp, caption]);

    const cardData = useMemo(() => {
        if (fetchedPost && fetchedPost.pid) {
            const pid = String(fetchedPost.pid);
            const handleValue = ownerHandle.startsWith("@") ? ownerHandle.slice(1) : ownerHandle;
            const mergedWorkout = {
                ...(fetchedPost.workout || {}),
                ...(workout || {}),
                postPid: pid,
                pid,
            };

            const likes = Array.isArray(fetchedPost.likes) ? fetchedPost.likes : [];
            const likeCount = Number.isFinite(Number(fetchedPost.likeCount))
                ? Number(fetchedPost.likeCount)
                : likes.length;

            const baseCaption = typeof fetchedPost.caption === "string"
                ? fetchedPost.caption
                : (fallbackCardData?.caption || "");

            const comments = Array.isArray(fetchedPost.comments) && fetchedPost.comments.length
                ? fetchedPost.comments
                : (baseCaption
                    ? [{
                        content: baseCaption,
                        handle: handleValue,
                        isCaption: true,
                        pfp: fetchedPost.pfp ?? ownerPfp ?? "",
                        timestamp: fetchedPost.created ?? mergedWorkout.created ?? Date.now(),
                        uid: owner?.uid ? String(owner.uid) : null,
                    }]
                    : []);

            const commentCount = Number.isFinite(Number(fetchedPost.commentCount))
                ? Number(fetchedPost.commentCount)
                : comments.length;

            return {
                pid,
                id: pid,
                uid: String(fetchedPost.uid ?? owner?.uid ?? fallbackCardData?.uid ?? ""),
                handle: fetchedPost.handle ?? handleValue,
                name: fetchedPost.name ?? owner?.name ?? fallbackCardData?.name ?? "",
                pfp: fetchedPost.pfp ?? ownerPfp ?? fallbackCardData?.pfp ?? "",
                pfpVersion: Number(fetchedPost.pfpVersion ?? owner?.pfpVersion ?? fallbackCardData?.pfpVersion ?? 0),
                created: fetchedPost.created ?? fallbackCardData?.created ?? mergedWorkout.created ?? Date.now(),
                caption: baseCaption,
                workout: mergedWorkout,
                likes,
                likeCount,
                comments,
                commentCount,
                media: Array.isArray(fetchedPost.media) ? fetchedPost.media : [],
                images: Array.isArray(fetchedPost.images) ? fetchedPost.images : [],
                shareCount: Number(fetchedPost.shareCount ?? fallbackCardData?.shareCount ?? 0),
                tags: Array.isArray(fetchedPost.tags) ? fetchedPost.tags : [],
                tagged: Array.isArray(fetchedPost.tagged) ? fetchedPost.tagged : [],
            };
        }
        return fallbackCardData;
    }, [fetchedPost, fallbackCardData, owner?.uid, owner?.name, owner?.pfpVersion, ownerHandle, ownerPfp, workout]);

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

    const handlePressComments = useCallback((_index, data) => {
        const target = data || cardData;
        if (!target) return;
        setCommentsVisible(true);
        setCommentsBottomSheetExpandFlag((flag) => !flag);
    }, [cardData]);

    const handleDismissComments = useCallback(() => {
        setCommentsVisible(false);
    }, []);

    const handlePressLikes = useCallback((_index, data) => {
        const target = data || cardData;
        if (!target) return;
        showLikesSheet(target.likes, "Liked by");
    }, [cardData, showLikesSheet]);

    const handleViewProfileFromComments = useCallback((data) => {
        if (!data) return;
        const user = {
            handle: data?.handle,
            uid: data?.uid,
            pfp: data?.pfp,
            name: data?.name,
        };
        const rootNav = navigation?.getParent?.("ROOT");
        if (isThisUser(data?.uid)) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
        } else {
            if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
            else navigation.navigate("ViewProfile", { user });
        }
    }, [navigation]);

    useEffect(() => {
        if (!cardData) {
            setCommentsVisible(false);
            setLikesSheetVisible(false);
        }
    }, [cardData]);

    const hasTemplate = useMemo(() => (
        !!(workout?.templateName || workout?.template?.name || workout?.tid || workout?.templateId)
    ), [workout?.templateName, workout?.template?.name, workout?.tid, workout?.templateId]);

    const cleanHandle = useMemo(() => (
        ownerHandle.startsWith("@") ? ownerHandle.slice(1).trim() : ownerHandle.trim()
    ), [ownerHandle]);

    const subtitleInitials = useMemo(() => {
        const base = owner?.name || cleanHandle || "W";
        const trimmed = String(base || "W").trim();
        if (!trimmed) return "W";
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }, [owner?.name, cleanHandle]);

    const handleCopyTemplate = useCallback(async () => {
        if (isCopying) return;
        const source = cardData?.workout || workout;
        const uid = String(global?.userData?.uid || "").trim();
        if (!source || !uid) {
            showCopyStatus("Copy unavailable");
            return;
        }

        setIsCopying(true);
        try {
            const tid = makeID();
            const name = source?.templateName || source?.template?.name || source?.name || "Copied Template";
            const exercisesPayload = (Array.isArray(source?.exercises) ? source.exercises : []).map((ex) => ({
                name: ex?.name || "",
                muscle: ex?.muscle || "",
                sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
                    weight: Number(s?.weight) || 0,
                    reps: Number(s?.reps) || 0,
                    type: (() => {
                        const raw = typeof s?.type === "string" ? s.type.toLowerCase() : "";
                        return raw === "warmup" || raw === "dropset" || raw === "failure" ? raw : null;
                    })(),
                })),
            }));

            const newTemplate = { id: tid, tid, name, exercises: exercisesPayload, lastDate: null };
            const prevTemplates = Array.isArray(global?.userData?.templates) ? global.userData.templates : [];

            updateDoc("users", uid, { templates: [...prevTemplates, newTemplate] }).catch(() => { });
            try { global.userData.templates = [...prevTemplates, newTemplate]; } catch { }

            if (typeof onCopyTemplateParam === 'function') {
                try { onCopyTemplateParam(source); } catch { }
            }

            showCopyStatus("Template copied ✓");
        } catch (err) {
            showCopyStatus("Copy failed");
        } finally {
            setIsCopying(false);
        }
    }, [cardData, workout, isCopying, showCopyStatus, onCopyTemplateParam]);

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

    const noop = useCallback(() => { }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBackButton}>
                    <Ionicons name="chevron-back" size={HEADER_ICON_SIZE} color={theme.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Workout Details
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
                            onPressComments={handlePressComments}
                            onPressShare={noop}
                            onPressLikes={handlePressLikes}
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
                        <View style={styles.logsHeader}>
                            <View style={styles.logsTitleWrap}>
                                <Text style={styles.logsTitle} numberOfLines={1}>{workout?.name || workout?.templateName || "Workout"}</Text>
                                <View style={styles.subtitleRow}>
                                    {hasTemplate ? (
                                        <View style={styles.subtitleAvatarWrap}>
                                            {subtitlePfp ? (
                                                <FastImage
                                                    source={{
                                                        uri: subtitlePfp,
                                                        priority: FastImage.priority.high,
                                                        cache: FastImage.cacheControl.immutable,
                                                    }}
                                                    style={styles.subtitleAvatar}
                                                />
                                            ) : (
                                                <View style={[styles.subtitleAvatar, styles.subtitleAvatarFallback]}>
                                                    <Text style={styles.subtitleAvatarInitials}>{subtitleInitials}</Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : null}
                                    <Pressable
                                        onPress={handleCopyTemplate}
                                        style={styles.copySubtitlePressable}
                                        disabled={isCopying}
                                        hitSlop={8}
                                    >
                                        <Text
                                            style={[
                                                styles.logsSubtitle,
                                                styles.copySubtitleText,
                                                isCopying && styles.copySubtitleTextDisabled,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {isCopying ? "Copying..." : "Copy as Template"}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                        {copyStatus ? (
                            <Text style={styles.copyStatusText}>{copyStatus}</Text>
                        ) : null}
                        {exercises.map((exercise, index) => (
                            <PastWorkoutExerciseLog key={`${exercise?.name || "exercise"}-${index}`} exercise={exercise} index={index} />
                        ))}
                    </View>
                ) : null}

            </ScrollView>

            <CommentsBottomSheet
                isVisible={commentsVisible}
                postData={commentsVisible && cardData ? cardData : null}
                commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                toViewProfile={handleViewProfileFromComments}
                onShowLikesSheet={showLikesSheet}
                onDismiss={handleDismissComments}
            />

            <FollowListBottomSheet
                isVisible={likesSheetVisible}
                setIsVisible={setLikesSheetVisible}
                title={likesSheetTitle}
                users={likesSheetUsers}
                navigation={navigation}
            />
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
        paddingBottom: scaleSize(28),
    },
    cardWrapper: {
        marginBottom: 0,
    },
    metaSection: {
        marginTop: scaleSize(16),
    },
    sectionTitle: {
        marginHorizontal: scaleSize(18),
        marginBottom: scaleSize(8),
        color: theme.textPrimary,
        fontFamily: "Mulish_800ExtraBold",
        fontSize: scaleSize(16),
        letterSpacing: 0.2,
    },
    detailsCard: {
        marginHorizontal: scaleSize(16),
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
        paddingVertical: scaleSize(14),
        backgroundColor: theme.surface
    },
    logsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
    },
    logsTitleWrap: {
        flex: 1,
        marginRight: scaleSize(12),
    },
    logsTitle: {
        color: theme.textPrimary,
        fontFamily: "Mulish_800ExtraBold",
        fontSize: scaleSize(14),
    },
    subtitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: scaleSize(5),
    },
    subtitleAvatarWrap: {
        width: scaleSize(18),
        aspectRatio: 1,
        borderRadius: scaleSize(11),
        overflow: "hidden",
        marginRight: scaleSize(6),
    },
    subtitleAvatar: {
        width: "100%",
        height: "100%",
        borderRadius: scaleSize(11),
    },
    subtitleAvatarFallback: {
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    subtitleAvatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11),
    },
    logsSubtitle: {
        color: theme.textSecondary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
    },
    copySubtitlePressable: {
        paddingVertical: scaleSize(2),
    },
    copySubtitleText: {
        color: theme.primary,
    },
    copySubtitleTextDisabled: {
        color: theme.primaryHairline,
    },
    copyStatusText: {
        marginBottom: scaleSize(6),
        marginHorizontal: scaleSize(18),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
    },
});

export default PastWorkoutScreen;
