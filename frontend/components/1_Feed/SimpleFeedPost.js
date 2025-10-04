import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    FlatList,
    Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import { Heart, Messages1 } from "iconsax-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Video from "react-native-video";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { usePfp } from "../../helper/usePFPs";
import usePostFooterInteractions from "./Posts/hooks/usePostFooterInteractions";
import { buildExerciseSummaries } from "../../utils/workoutSummary";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const formatTimestamp = (value) => {
    if (!value && value !== 0) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    let datePart = "";
    let timePart = "";
    try {
        datePart = date.toLocaleDateString(undefined, {
            month: "long",
            day: "2-digit",
            year: "numeric",
        });
    } catch { }
    try {
        timePart = date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        });
    } catch { }

    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || "";
};

const formatDuration = (durationMs) => {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms <= 0) return "--";
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds >= 60) {
        const mins = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${mins}m ${seconds}s`;
    }
    return `${totalSeconds}s`;
};

const formatNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "--";
    try {
        return num.toLocaleString();
    } catch {
        return String(num);
    }
};

const resolveWorkoutTitle = (workout, caption) => (
    workout?.templateName ||
    workout?.template?.name ||
    workout?.name ||
    caption ||
    "Workout"
);

const resolveWeightUnit = () => {
    try {
        const raw = global?.userData?.settings?.units || global?.userData?.units;
        if (!raw) return "lb";
        const normalized = String(raw).toLowerCase();
        return normalized === "kg" ? "kg" : "lb";
    } catch {
        return "lb";
    }
};

const normalizeMediaEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === "string") {
        const uri = entry.trim();
        return uri ? { uri, type: "image" } : null;
    }
    if (typeof entry === "object") {
        const uri = entry.uri || entry.url || entry.image || entry.photoURL || null;
        if (!uri) return null;
        const rawType = (entry.type || entry.mediaType || entry.kind || "image").toLowerCase();
        const type = rawType.includes("video") ? "video" : "image";
        return { ...entry, uri, type };
    }
    return null;
};

const initialsFrom = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const SimpleFeedPost = ({
    data,
    index,
    highlightPid,
    highlightSignal,
    onPressProfile,
    onPressWorkout,
    onPressComments,
    onPressShare,
    onPressLikes,
}) => {
    const highlightOpacity = useRef(new Animated.Value(0)).current;
    const isHighlighted = useMemo(() => {
        if (!highlightPid) return false;
        const pid = data?.pid ?? data?.id;
        if (pid === undefined || pid === null) return false;
        return String(pid) === String(highlightPid);
    }, [data?.pid, data?.id, highlightPid]);

    useEffect(() => {
        if (!isHighlighted) {
            highlightOpacity.setValue(0);
            return;
        }
        if (!highlightSignal) return;
        highlightOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(highlightOpacity, {
                toValue: 0.35,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(highlightOpacity, {
                toValue: 0,
                duration: 420,
                useNativeDriver: true,
            }),
        ]).start();
    }, [highlightSignal, isHighlighted, highlightOpacity]);

    const workout = data?.workout || null;
    const title = resolveWorkoutTitle(workout, data?.caption);
    const timestamp = formatTimestamp(data?.created);
    const caption = (data?.caption || "").trim();
    const weightUnit = resolveWeightUnit();

    const shouldShowSubtitle = useMemo(() => {
        if (!workout) return false;
        if (caption.length === 0) return false;
        const normalizedCaption = caption.toLowerCase();
        const normalizedTitle = (title || "").trim().toLowerCase();
        if (!normalizedTitle) return true;
        return normalizedCaption !== normalizedTitle;
    }, [caption, workout, title]);

    const exerciseSummaries = useMemo(() => {
        if (!workout) return [];
        return buildExerciseSummaries(workout, Number.MAX_SAFE_INTEGER);
    }, [workout]);

    const workoutName = useMemo(() => {
        if (!workout) return "";
        const candidate = workout?.templateName || workout?.template?.name || workout?.name;
        if (typeof candidate === "string") return candidate.trim();
        if (candidate) return String(candidate).trim();
        return "";
    }, [workout]);

    const isWorkoutTitle = useMemo(() => {
        if (!workoutName) return false;
        const normalizedTitle = (title || "").trim();
        if (!normalizedTitle) return false;
        return normalizedTitle.toLowerCase() === workoutName.toLowerCase();
    }, [title, workoutName]);

    const mediaList = useMemo(() => {
        const fromMedia = Array.isArray(data?.media) ? data.media.map(normalizeMediaEntry) : [];
        const fromImages = Array.isArray(data?.images) ? data.images.map(normalizeMediaEntry) : [];
        const merged = [...fromMedia, ...fromImages].filter(Boolean);
        if (merged.length === 0) return [];
        const seen = new Set();
        const deduped = [];
        merged.forEach((entry) => {
            const key = typeof entry?.uri === 'string' ? entry.uri : JSON.stringify(entry);
            if (key && !seen.has(key)) {
                seen.add(key);
                deduped.push(entry);
            }
        });
        return deduped;
    }, [data?.media, data?.images]);

    const [mediaIndex, setMediaIndex] = useState(0);
    const [mediaSize, setMediaSize] = useState(0);

    useEffect(() => {
        if (mediaIndex >= mediaList.length) {
            setMediaIndex(0);
        }
    }, [mediaList.length, mediaIndex]);

    const handleMediaLayout = useCallback((event) => {
        const width = event?.nativeEvent?.layout?.width;
        if (!width) return;
        if (Math.abs(width - mediaSize) < 0.5) return;
        setMediaSize(width);
    }, [mediaSize]);

    const handleMediaScroll = useCallback((event) => {
        if (!mediaSize) return;
        const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
        const nextIndex = Math.round(offsetX / mediaSize);
        if (Number.isFinite(nextIndex)) setMediaIndex(nextIndex);
    }, [mediaSize]);

    const renderMediaItem = useCallback(({ item }) => {
        const containerStyle = [
            styles.mediaSlide,
            { width: mediaSize || SCREEN_WIDTH, height: mediaSize || SCREEN_WIDTH },
        ];
        if (!item?.uri) {
            return <View style={containerStyle} />;
        }
        if (item.type === "video") {
            const source = typeof item.uri === "string" ? { uri: item.uri } : item.uri;
            return (
                <View style={containerStyle}>
                    <Video
                        source={source}
                        style={styles.mediaContent}
                        resizeMode="cover"
                        paused
                        repeat
                        muted
                    />
                </View>
            );
        }
        return (
            <View style={containerStyle}>
                <FastImage
                    source={{
                        uri: item.uri,
                        priority: FastImage.priority.normal,
                        cache: FastImage.cacheControl.immutable,
                    }}
                    style={styles.mediaContent}
                    resizeMode={FastImage.resizeMode.cover}
                />
            </View>
        );
    }, [mediaSize]);

    const pfpUri = usePfp(
        data?.uid ? String(data.uid) : "",
        data?.pfpVersion ?? 0,
        data?.pfp || data?.pfpUrl || data?.image || data?.photoURL || ""
    );

    const likeCount = useMemo(() => (
        Array.isArray(data?.likes)
            ? data.likes.length
            : toNumber(data?.likeCount)
    ), [data?.likes, data?.likeCount]);

    const commentCount = useMemo(() => (
        Array.isArray(data?.comments)
            ? Math.max(0, data.comments.length - 1)
            : toNumber(data?.commentCount)
    ), [data?.comments, data?.commentCount]);

    const {
        isLiked,
        assignButtonRef,
        handlePressLikeButton,
        pressComment,
        handlePressSaveButton,
        isSaved,
    } = usePostFooterInteractions({
        data,
        onPressCommentButton: () => onPressComments?.(index, data),
        onPressShareButton: () => onPressShare?.(index, data),
    });

    const normalizedLikes = useMemo(() => {
        if (!Array.isArray(data?.likes)) return [];
        const seen = new Set();

        return data.likes
            .map((entry) => {
                if (!entry) return null;
                if (typeof entry === "string" || typeof entry === "number") {
                    const uid = String(entry).trim();
                    if (!uid) return null;
                    return { uid };
                }

                const uid = entry?.uid ?? entry?.id ?? null;
                const handle = entry?.handle ?? entry?.username ?? entry?.tag ?? "";
                const name = entry?.name ?? entry?.displayName ?? "";
                const avatar = entry?.pfp || entry?.pfpUrl || entry?.avatar || entry?.image || entry?.photoURL || entry?.photoUrl || null;

                return {
                    uid: uid ? String(uid) : null,
                    handle: typeof handle === "string" ? handle : "",
                    name: typeof name === "string" ? name : "",
                    avatar,
                };
            })
            .filter((entry) => {
                if (!entry) return false;
                if (!entry.uid && !entry.handle && !entry.name) return false;
                const key = entry.uid || entry.handle?.toLowerCase() || entry.name?.toLowerCase();
                if (!key) return true;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [data?.likes]);

    const firstLiker = normalizedLikes[0] || null;

    const formattedFirstHandle = useMemo(() => {
        if (!firstLiker) return "";
        const handle = (firstLiker.handle || "").trim();
        if (handle) return `${handle}`;
        const name = (firstLiker.name || "").trim();
        if (name) return name;
        if (firstLiker.uid) return `User ${firstLiker.uid.slice(-4)}`;
        return "someone";
    }, [firstLiker]);

    const likeMessage = useMemo(() => {
        if (likeCount <= 0) return "No likes yet — be the first!";
        if (likeCount === 1) {
            if (formattedFirstHandle) return `Liked by ${formattedFirstHandle}`;
            return "Liked by someone";
        }
        if (formattedFirstHandle) {
            const others = Math.max(0, likeCount - 1);
            return `Liked by ${formattedFirstHandle} and ${formatNumber(others)} more`;
        }
        return `Liked by ${formatNumber(likeCount)} people`;
    }, [likeCount, formattedFirstHandle]);

    const firstLikerAvatar = useMemo(() => firstLiker?.avatar || null, [firstLiker]);
    const firstLikerInitials = useMemo(() => {
        if (!firstLiker) return "";
        const source = (firstLiker.name || firstLiker.handle || "").replace(/^@/, "");
        return initialsFrom(source);
    }, [firstLiker]);

    const durationLabel = formatDuration(workout?.duration);
    const volumeLabel = formatNumber(workout?.volume);
    const recordsLabel = formatNumber(workout?.PBs ?? workout?.pbs ?? 0);

    const displayName = useMemo(() => {
        const name = (data?.name || "").trim();
        if (name) return name;
        const handle = (data?.handle || "user").trim();
        return `${handle}`;
    }, [data?.name, data?.handle]);

    const likeColor = isLiked ? "#FE5555" : theme.textPrimary;
    const keyExtractor = useCallback((item, idx) => `${item?.uri || 'media'}-${idx}`, []);

    return (
        <View style={styles.wrapper}>
            <View style={styles.card}>
                <View style={styles.sectionTop}>
                    <View style={styles.headerRow}>
                        <Pressable style={styles.avatarWrap} onPress={() => onPressProfile?.(index, data)}>
                            {pfpUri ? (
                                <FastImage
                                    source={{
                                        uri: pfpUri,
                                        priority: FastImage.priority.high,
                                        cache: FastImage.cacheControl.immutable,
                                    }}
                                    style={styles.avatar}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback]}>
                                    <Text style={styles.avatarInitials}>{initialsFrom(displayName)}</Text>
                                </View>
                            )}
                        </Pressable>

                        <View style={styles.headerTextCol}>
                            <Pressable onPress={() => onPressProfile?.(index, data)}>
                                <Text style={styles.nameText} numberOfLines={1}>
                                    {displayName}
                                </Text>
                            </Pressable>
                            {!!timestamp && (
                                <Text style={styles.timestampText} numberOfLines={1}>
                                    {timestamp}
                                </Text>
                            )}
                        </View>

                        <Pressable
                            style={styles.moreButton}
                            onPress={() => {
                                if (workout) onPressWorkout?.(index, data);
                            }}
                            disabled={!workout}
                            hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                        >
                            <MaterialCommunityIcons name="dots-vertical" size={scaleSize(20)} color={theme.textPrimary} />
                        </Pressable>
                    </View>

                    <View style={styles.titleBlock}>
                        <Text style={[styles.titleText, isWorkoutTitle ? styles.workoutTitleText : null]} numberOfLines={2}>
                            {title}
                        </Text>
                        {shouldShowSubtitle ? (
                            <Text style={styles.captionText} numberOfLines={3}>
                                {caption}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {workout ? (
                    <Pressable
                        onPress={() => onPressWorkout?.(index, data)}
                        style={styles.metricsRow}
                    >
                        <View style={styles.metricsLeft}>
                            <View style={styles.metricColumnLeft}>
                                <Text style={styles.metricLabel}>Duration</Text>
                                <Text style={styles.metricValue}>{durationLabel}</Text>
                            </View>

                            <View style={[styles.metricColumnLeft, styles.metricCenter]}>
                                <Text style={styles.metricLabel}>Volume</Text>
                                <Text style={styles.metricValue}>{volumeLabel} {weightUnit}</Text>
                            </View>
                        </View>

                        <View style={[styles.metricColumn, styles.metricRight]}>
                            <Text style={styles.metricLabel}>Records</Text>
                            <View style={styles.recordsValueRow}>
                                <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#FFD700" style={styles.recordsIconFirst} />
                                <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#C0C0C0" style={styles.recordsIcon} />
                                <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#CD7F32" style={styles.recordsIcon} />
                                <Text style={[styles.metricValue, styles.recordsValueText]}>{recordsLabel}</Text>
                            </View>
                        </View>
                    </Pressable>
                ) : null}

                {workout && mediaList.length === 0 && exerciseSummaries.length > 0 ? (
                    <View style={styles.workoutSummaryBlock}>
                        <View style={styles.workoutSummaryHeader}>
                            <Text style={[styles.workoutSummaryHeaderText, styles.workoutSummaryHeaderExercise]}>Exercise</Text>
                            <Text style={[styles.workoutSummaryHeaderText, styles.workoutSummaryHeaderBest]}>Best Set</Text>
                        </View>
                        {exerciseSummaries.map((row, idx) => {
                            const key = `${row.exercise || 'exercise'}-${idx}`;
                            const isLast = idx === exerciseSummaries.length - 1;
                            return (
                                <View
                                    style={[styles.workoutSummaryRow, !isLast && styles.workoutSummaryRowBorder]}
                                    key={key}
                                >
                                    <Text style={styles.workoutSummaryExercise} numberOfLines={1}>{row.exercise || 'Exercise'}</Text>
                                    <Text style={styles.workoutSummaryBest} numberOfLines={1}>{row.bestSet || '--'}</Text>
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {mediaList.length > 0 ? (
                    <View
                        style={[styles.mediaContainer, mediaSize ? { height: mediaSize } : null]}
                        onLayout={handleMediaLayout}
                    >
                        {mediaSize > 0 ? (
                            <FlatList
                                data={mediaList}
                                horizontal
                                pagingEnabled
                                snapToInterval={mediaSize}
                                decelerationRate="fast"
                                bounces={false}
                                alwaysBounceHorizontal={false}
                                overScrollMode="never"
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={keyExtractor}
                                renderItem={renderMediaItem}
                                style={styles.mediaList}
                                onScroll={handleMediaScroll}
                                onMomentumScrollEnd={handleMediaScroll}
                                scrollEventThrottle={16}
                                nestedScrollEnabled
                            />
                        ) : null}
                    </View>
                ) : null}

                {mediaList.length > 1 && (
                    <View style={styles.mediaIndicatorRow} pointerEvents="none">
                        {mediaList.map((_, idx) => (
                            <View
                                key={`${idx}-indicator`}
                                style={idx === mediaIndex ? styles.mediaDash : styles.mediaDot}
                            />
                        ))}
                    </View>
                )}

                <View style={[
                    styles.sectionBottom,
                    mediaList.length === 0 ? styles.sectionBottomDivider : null,
                ]}>
                    <View style={styles.actionsRow}>
                        <Pressable
                            onPress={() => onPressLikes?.(index, data)}
                            disabled={!onPressLikes}
                            style={({ pressed }) => [
                                styles.likesContainer,
                                pressed ? styles.likesContainerPressed : null,
                            ]}
                        >
                            {likeCount === 1 && (firstLikerAvatar || firstLikerInitials) ? (
                                <View style={styles.likesAvatarWrap}>
                                    {firstLikerAvatar ? (
                                        <FastImage
                                            source={{
                                                uri: firstLikerAvatar,
                                                priority: FastImage.priority.low,
                                                cache: FastImage.cacheControl.immutable,
                                            }}
                                            style={styles.likesAvatar}
                                            resizeMode={FastImage.resizeMode.cover}
                                        />
                                    ) : (
                                        <View style={[styles.likesAvatar, styles.likesAvatarFallback]}>
                                            <Text style={styles.likesAvatarInitials}>{firstLikerInitials}</Text>
                                        </View>
                                    )}
                                </View>
                            ) : null}
                            <Text style={styles.likesText} numberOfLines={2}>
                                {likeMessage}
                            </Text>
                        </Pressable>

                        <View style={styles.buttonsContainer}>
                            <AnimatedPressable
                                ref={(node) => assignButtonRef?.("like", node)}
                                style={styles.actionButton}
                                onPress={handlePressLikeButton}
                            >
                                <Heart size={scaleSize(20)} color={likeColor} variant="Bold" />
                                <Text style={styles.actionText}>{formatNumber(likeCount)}</Text>
                            </AnimatedPressable>

                            <AnimatedPressable
                                ref={(node) => assignButtonRef?.("comment", node)}
                                style={[styles.actionButton, styles.actionButtonMiddle]}
                                onPress={pressComment}
                            >
                                <Messages1 size={scaleSize(20)} color={theme.textPrimary} variant="Bold" />
                                <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
                            </AnimatedPressable>

                            {/* <AnimatedPressable
                                ref={(node) => assignButtonRef?.("save", node)}
                                style={styles.actionButton}
                                onPress={handlePressSaveButton}
                            >
                                <MaterialCommunityIcons
                                    name={isSaved ? "bookmark" : "bookmark-outline"}
                                    size={scaleSize(20)}
                                    color={theme.textPrimary}
                                />
                            </AnimatedPressable> */}
                        </View>
                    </View>
                </View>
            </View>
            <Animated.View
                pointerEvents="none"
                style={[styles.highlightOverlay, { opacity: highlightOpacity }]}
            />
        </View>
    );
};

export default React.memo(SimpleFeedPost);

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginTop: scaleSize(8),
        marginBottom: scaleSize(12),
        position: 'relative',
    },
    card: {
        backgroundColor: theme.surface,
    },
    sectionTop: {
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(14),
    },
    metricColumnLeft: {
        width: '32%'
    },
    sectionBottom: {
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(8),
    },
    sectionBottomDivider: {
        borderTopWidth: 1,
        borderTopColor: theme.hairline,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarWrap: {
        width: scaleSize(36),
        aspectRatio: 1,
        borderRadius: scaleSize(23),
        overflow: "hidden",
        marginRight: scaleSize(12),
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: scaleSize(23),
        backgroundColor: theme.field,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(15),
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    nameText: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(14),
    },
    timestampText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    moreButton: {
        paddingHorizontal: scaleSize(4),
        paddingVertical: scaleSize(4),
    },
    titleBlock: {
        marginTop: scaleSize(14),
        paddingBottom: scaleSize(5)
    },
    titleText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
    },
    workoutTitleText: {
        color: '#74abf7ff',
    },
    captionText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
    },
    metricsLeft: {
        flexDirection: "row",
        flex: 1
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: 'space-between',
        paddingVertical: scaleSize(6),
        marginHorizontal: scaleSize(20),
    },
    metricCenter: {
        paddingHorizontal: scaleSize(1),
    },
    metricRight: {
        alignItems: 'flex-end',
    },
    metricLabel: {
        color: 'rgba(255,255,255,0.58)',
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
        letterSpacing: 0.2,
        paddingBottom: scaleSize(1.5)
    },
    metricValue: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15.5),
    },
    workoutSummaryBlock: {
        marginTop: scaleSize(6),
        marginHorizontal: scaleSize(20),
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(4),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    workoutSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: scaleSize(2),
    },
    workoutSummaryHeaderText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    workoutSummaryHeaderExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
    },
    workoutSummaryHeaderBest: {
        minWidth: scaleSize(96),
        textAlign: 'right',
    },
    workoutSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scaleSize(4),
    },
    workoutSummaryRowBorder: {
        borderColor: 'rgba(255,255,255,0.08)',
    },
    workoutSummaryExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(14),
    },
    workoutSummaryBest: {
        minWidth: scaleSize(96),
        flexShrink: 0,
        textAlign: 'right',
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(14),
    },
    recordsValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordsValueText: {
        marginLeft: scaleSize(6),
    },
    mediaContainer: {
        width: "100%",
        marginTop: scaleSize(4),
        borderRadius: 0,
        overflow: "hidden",
        backgroundColor: theme.field,
        position: 'relative',
    },
    mediaList: {
        width: '100%',
        height: '100%',
    },
    mediaSlide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContent: {
        width: '100%',
        height: '100%',
    },
    mediaIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleSize(6),
    },
    mediaDot: {
        width: scaleSize(6),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginHorizontal: scaleSize(3),
    },
    mediaDash: {
        width: scaleSize(22),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: scaleSize(3),
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
    },
    likesContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingRight: scaleSize(12),
    },
    likesContainerPressed: {
        opacity: 0.8,
    },
    likesAvatarWrap: {
        marginRight: scaleSize(6),
    },
    likesAvatar: {
        width: scaleSize(25),
        aspectRatio: 1,
        borderRadius: scaleSize(32) / 2,
        borderWidth: scaleSize(2),
        borderColor: "#fff",
        backgroundColor: theme.field,
    },
    likesAvatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    likesAvatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(13),
    },
    likesText: {
        flex: 1,
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
    },
    buttonsContainer: {
        width: "32%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(6),
    },
    actionButtonMiddle: {
    },
    actionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        marginLeft: scaleSize(6),
    },
    highlightOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: scaleSize(14),
        bottom: scaleSize(12),
        backgroundColor: "#FFF4B3",
    },
});
