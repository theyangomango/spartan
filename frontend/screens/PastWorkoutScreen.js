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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import SimpleFeedPost from "../components/1_Feed/SimpleFeedPost";
import PastWorkoutExerciseLog from "../components/1_Feed/PastWorkoutExerciseLog";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import FastImage from "react-native-fast-image";
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

    const hasTemplate = useMemo(() => (
        !!(workout?.templateName || workout?.template?.name || workout?.tid || workout?.templateId)
    ), [workout?.templateName, workout?.template?.name, workout?.tid, workout?.templateId]);

    const cleanHandle = useMemo(() => (
        ownerHandle.startsWith("@") ? ownerHandle.slice(1).trim() : ownerHandle.trim()
    ), [ownerHandle]);

    const subtitleText = useMemo(() => {
        if (hasTemplate) {
            return cleanHandle || "Template workout";
        }
        return "No template";
    }, [hasTemplate, cleanHandle]);

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
                    Workout
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
                                    <Text style={styles.logsSubtitle} numberOfLines={1}>{subtitleText}</Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={handleCopyTemplate}
                                style={[styles.copyButton, (isCopying || !hasTemplate) && styles.copyButtonDisabled]}
                                disabled={isCopying || !hasTemplate}
                            >
                                <Text style={styles.copyButtonText}>{isCopying ? "Copying..." : "Copy Template"}</Text>
                            </Pressable>
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
        marginTop: scaleSize(16),
        paddingVertical: scaleSize(14),
        backgroundColor: theme.surface
    },
    logsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(18),
    },
    logsTitleWrap: {
        flex: 1,
        marginRight: scaleSize(12),
    },
    logsTitle: {
        color: theme.textPrimary,
        fontFamily: "Mulish_800ExtraBold",
        fontSize: scaleSize(16),
    },
    subtitleRow: {
        flexDirection: "row",
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
        fontSize: scaleSize(14),
    },
    copyButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(14),
        backgroundColor: '#254a79ff',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(74,141,255,0.55)",
        shadowColor: "#4A8DFF",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: scaleSize(6) },
        shadowRadius: scaleSize(10),
        elevation: 6,
    },
    copyButtonDisabled: {
        opacity: 0.6,
    },
    copyButtonIcon: {
        marginRight: scaleSize(6),
    },
    copyButtonText: {
        color: "#ffffff",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13.5),
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
