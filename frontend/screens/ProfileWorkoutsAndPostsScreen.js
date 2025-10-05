import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Footer from "../components/Footer";
import SimpleFeedPost from "../components/1_Feed/SimpleFeedPost";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import readDoc from "../../backend/helper/firebase/readDoc";
import readDocsByIds from "../../backend/helper/firebase/readDocsByIds";
import { canViewerAccessProfile, filterViewableWorkouts } from "../utils/workoutPrivacy";
import { withStrongPress } from "../utils/haptics";
import { clearFooterSuppression } from "../state/footerSuppressionStore";

const sortPostsByCreated = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
        const left = Number(a?.created ?? a?.createdAt ?? a?.timestamp ?? 0) || 0;
        const right = Number(b?.created ?? b?.createdAt ?? b?.timestamp ?? 0) || 0;
        return right - left;
    });
};

const getWorkoutTimestamp = (workout = {}) => {
    const candidates = [
        workout.finishedAt,
        workout.completedAt,
        workout.createdAt,
        workout.created,
        workout.startedAt,
    ];
    for (const value of candidates) {
        if (value == null) continue;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value?.toMillis === 'function') {
            const millis = value.toMillis();
            if (Number.isFinite(millis)) return millis;
        }
        const parsed = new Date(value).getTime();
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

const sortWorkoutsByTimestamp = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => getWorkoutTimestamp(b) - getWorkoutTimestamp(a));
};

const LockedView = ({ subtitle }) => (
    <View style={styles.lockedContainer}>
        <View style={styles.lockedIconWrap}>
            <Ionicons name="lock-closed" size={scaleSize(42)} color="#A5B4FC" />
        </View>
        <Text style={styles.lockedTitle}>This account is private</Text>
        <Text style={styles.lockedSubtitle}>
            {subtitle || 'Follow to see their workouts and posts.'}
        </Text>
    </View>
);

export default function ProfileWorkoutsAndPostsScreen({ navigation, route }) {
    const params = route?.params || {};
    const initialUser = params?.initialUser || null;
    const passedUid = params?.targetUid || initialUser?.uid || '';
    const targetUid = passedUid ? String(passedUid) : '';
    const isViewingSelf = !!params?.isViewingSelf;

    const [userData, setUserData] = useState(() => (initialUser && initialUser.uid ? initialUser : null));
    const [isUserLoading, setIsUserLoading] = useState(!initialUser);
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsError, setPostsError] = useState(null);

    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [workoutViewerToggle, setWorkoutViewerToggle] = useState(false);
    const [selectedTab, setSelectedTab] = useState(() => {
        const requested = typeof params?.initialTab === 'string' ? params.initialTab : '';
        return requested === 'All Posts' ? 'All Posts' : 'Workouts';
    });

    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            clearFooterSuppression();
            return undefined;
        }, [])
    );

    useEffect(() => {
        if (!targetUid) return;
        let cancelled = false;
        setIsUserLoading(true);
        readDoc('users', targetUid)
            .then((doc) => {
                if (cancelled) return;
                if (doc && doc.uid) setUserData(doc);
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setIsUserLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [targetUid]);

    useEffect(() => {
        if (!isViewingSelf) return undefined;
        try {
            const { subscribeUserData } = require('../utils/userDataEvents');
            const unsubscribe = subscribeUserData((nextUser) => {
                if (nextUser && nextUser.uid) setUserData(nextUser);
            });
            return unsubscribe;
        } catch {
            return undefined;
        }
    }, [isViewingSelf]);

    const viewerData = (() => { try { return global?.userData || null; } catch { return null; } })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const canViewContent = canViewerAccessProfile(userData, viewerUid, viewerData);

    useEffect(() => {
        if (!userData || !canViewContent) {
            setPosts([]);
            setPostsLoading(false);
            setPostsError(null);
            return;
        }
        const ids = Array.isArray(userData?.posts) ? userData.posts : [];
        if (!ids.length) {
            setPosts([]);
            setPostsLoading(false);
            setPostsError(null);
            return;
        }
        let cancelled = false;
        const buffer = new Array(ids.length);
        const updateFromBuffer = () => {
            if (cancelled) return;
            const next = sortPostsByCreated(buffer.filter(Boolean));
            setPosts(next);
        };
        setPostsLoading(true);
        setPosts([]);
        setPostsError(null);

        const fetchChunk = async (chunkIds, startIndex) => {
            if (!chunkIds.length) return;
            const docs = await readDocsByIds('posts', chunkIds);
            if (cancelled) return;
            docs.forEach((doc, idx) => {
                const id = chunkIds[idx];
                if (doc && !doc.pid) doc.pid = id;
                buffer[startIndex + idx] = doc;
            });
            updateFromBuffer();
        };

        (async () => {
            try {
                const firstChunk = ids.slice(0, 10);
                const tail = ids.slice(10);
                await fetchChunk(firstChunk, 0);
                const promises = [];
                for (let i = 0; i < tail.length; i += 10) {
                    const group = tail.slice(i, i + 10);
                    const startIndex = 10 + i;
                    promises.push(fetchChunk(group, startIndex));
                }
                await Promise.all(promises);
            } catch (error) {
                if (!cancelled) setPostsError('Unable to load posts right now.');
            } finally {
                if (!cancelled) setPostsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userData, canViewContent]);

    const visibleWorkouts = useMemo(() => {
        if (!userData || !canViewContent) return [];
        const base = filterViewableWorkouts(
            Array.isArray(userData?.completedWorkouts) ? userData.completedWorkouts : [],
            viewerUid,
            viewerData,
            userData
        );
        return sortWorkoutsByTimestamp(base);
    }, [userData, canViewContent, viewerUid, viewerData]);

    const workoutFeedItems = useMemo(() => {
        if (!visibleWorkouts.length) return [];
        const ownerUid = userData?.uid ? String(userData.uid) : (targetUid ? String(targetUid) : '');
        const ownerHandleRaw = userData?.handle || userData?.username || '';
        const ownerHandle = ownerHandleRaw ? ownerHandleRaw.replace(/^@+/, '') : '';
        const ownerName = userData?.name || userData?.displayName || '';
        const ownerImage = userData?.image || userData?.pfp || userData?.pfpUrl || userData?.photoURL || '';
        const ownerPfpVersion = Number(userData?.pfpVersion || 0);

        return visibleWorkouts.map((workout, idx) => {
            const timestamp = getWorkoutTimestamp(workout) || Date.now();
            const wid = workout?.wid || workout?.id || workout?.workoutId || workout?.postPid || timestamp || idx;
            const pid = `workout:${wid}`;
            const workoutHandleRaw = workout?.handle || workout?.username || ownerHandle;
            const workoutHandle = workoutHandleRaw ? workoutHandleRaw.replace(/^@+/, '') : '';
            const displayName = ownerName || workout?.athleteName || workoutHandle || 'Athlete';
            const avatar = workout?.pfp || workout?.pfpUrl || workout?.photoURL || workout?.photo || ownerImage;
            const likes = Array.isArray(workout?.likes) ? workout.likes : [];
            const comments = Array.isArray(workout?.comments) ? workout.comments : [];
            return {
                pid,
                id: pid,
                uid: String(workout?.creatorUID || workout?.creatorUid || workout?.uid || ownerUid || ''),
                handle: workoutHandle,
                name: displayName,
                image: avatar,
                pfp: avatar,
                pfpVersion: Number(workout?.pfpVersion || ownerPfpVersion),
                caption: workout?.notes || workout?.caption || workout?.templateName || workout?.template?.name || workout?.name || '',
                created: timestamp,
                workout: {
                    ...workout,
                    created: workout?.created ?? timestamp,
                },
                likes,
                likeCount: Number.isFinite(Number(workout?.likeCount)) ? Number(workout.likeCount) : likes.length,
                comments,
                commentCount: Number.isFinite(Number(workout?.commentCount)) ? Number(workout.commentCount) : comments.length,
                media: Array.isArray(workout?.media) ? workout.media : [],
                images: Array.isArray(workout?.images) ? workout.images : [],
            };
        });
    }, [visibleWorkouts, targetUid, userData]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleSelectTab = useCallback((tab) => {
        setSelectedTab(tab);
    }, []);

    const openWorkoutViewer = useCallback((workout) => {
        if (!workout) {
            setSelectedWorkout(null);
            return;
        }
        const ownerUid = userData?.uid || targetUid || '';
        const fallback = {
            wid: workout?.wid || workout?.id,
            creatorUID: workout?.creatorUID || workout?.creatorUid || ownerUid,
            created: workout?.created || workout?.createdAt || Date.now(),
            exercises: Array.isArray(workout?.exercises) ? workout.exercises : [],
            duration: workout?.duration,
            volume: workout?.volume,
            reps: workout?.reps,
            PBs: workout?.PBs ?? workout?.pbs ?? 0,
            templateName: workout?.templateName || workout?.template?.name,
            privacyMode: workout?.privacyMode ?? 'global',
        };
        const normalized = { ...fallback, ...workout };
        if (!normalized.privacyMode) normalized.privacyMode = 'global';
        setSelectedWorkout(normalized);
        setWorkoutViewerToggle((t) => !t);
    }, [userData?.uid, targetUid]);

    const handlePostWorkout = useCallback((post) => {
        if (!post?.workout) return;
        openWorkoutViewer(post.workout);
    }, [openWorkoutViewer]);

    const renderPost = useCallback(({ item, index }) => (
        <View style={styles.postWrapper}>
            <SimpleFeedPost
                data={item}
                index={index}
                highlightPid={null}
                highlightSignal={0}
                onPressProfile={() => { }}
                onPressWorkout={() => handlePostWorkout(item)}
                onPressComments={() => { }}
                onPressShare={() => { }}
                onPressLikes={() => { }}
            />
        </View>
    ), [handlePostWorkout]);

    const keyExtractor = useCallback((item, index) => {
        const pid = item?.pid ?? item?.id;
        return pid ? String(pid) : `post-${index}`;
    }, []);

    const postsEmptyComponent = useMemo(() => {
        if (postsLoading) {
            return (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color="#93C5FD" />
                </View>
            );
        }
        if (postsError) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Posts unavailable</Text>
                    <Text style={styles.emptySubtitle}>{postsError}</Text>
                </View>
            );
        }
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>
                    {isViewingSelf ? 'Share a post to see it here.' : 'This user has not shared any posts yet.'}
                </Text>
            </View>
        );
    }, [postsLoading, postsError, isViewingSelf]);

    const workoutsEmptyComponent = useMemo(() => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySubtitle}>
                {isViewingSelf ? 'Log a workout to see it here.' : 'This athlete has not shared any workouts yet.'}
            </Text>
        </View>
    ), [isViewingSelf]);

    const headerPaddingTop = useMemo(() => scaleSize(6), []);

    const headerContent = useMemo(() => {
        const tabs = ['Workouts', 'All Posts'];
        return (
            <View style={[styles.headerContainer, { paddingTop: headerPaddingTop }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={withStrongPress(handleBack)}
                        style={styles.headerBackButton}
                        hitSlop={10}
                    >
                        <FontAwesome6 name="chevron-left" size={scaleSize(13)} color={theme.primary} />
                    </TouchableOpacity>

                    <View style={styles.segmentWrap}>
                        <View style={styles.segmentBg}>
                            {tabs.map((tab) => {
                                const isActive = selectedTab === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        activeOpacity={0.82}
                                        onPress={withStrongPress(() => handleSelectTab(tab))}
                                        style={[styles.segmentChip, isActive && styles.segmentChipActive]}
                                    >
                                        <Text style={[styles.segmentChipText, isActive && styles.segmentChipTextActive]}>
                                            {tab}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>
        );
    }, [handleBack, handleSelectTab, headerPaddingTop, selectedTab]);
    const showingWorkouts = selectedTab === 'Workouts';

    let mainContent = null;
    if (!targetUid) {
        mainContent = (
            <View style={styles.errorContainer}>
                <Text style={styles.emptyTitle}>Profile unavailable</Text>
                <Text style={styles.emptySubtitle}>We could not determine which profile to load.</Text>
            </View>
        );
    } else if (!userData && isUserLoading) {
        mainContent = (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#93C5FD" />
            </View>
        );
    } else if (!canViewContent) {
        const lockedSubtitle = userData?.settings?.profilePrivate ? 'Only approved followers can view these workouts and posts.' : '';
        mainContent = <LockedView subtitle={lockedSubtitle} />;
    } else if (showingWorkouts) {
        mainContent = (
            <FlatList
                data={workoutFeedItems}
                renderItem={renderPost}
                keyExtractor={keyExtractor}
                ListEmptyComponent={workoutsEmptyComponent}
                contentContainerStyle={styles.workoutListContent}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
            />
        );
    } else {
        mainContent = (
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={keyExtractor}
                ListEmptyComponent={postsEmptyComponent}
                contentContainerStyle={styles.listContent}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                initialNumToRender={4}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.contentWrap}>
                {headerContent}
                <View style={styles.bodyContent}>
                    {mainContent}
                </View>
            </View>

            <Footer currentScreenName={'Profile'} navigation={navigation} />

            <FeedWorkoutViewerSheet
                expandToggle={workoutViewerToggle}
                workout={selectedWorkout}
                friendUid={userData?.uid || targetUid}
                friendPfp={userData?.image || userData?.pfp || null}
                onClose={() => { }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    contentWrap: {
        flex: 1,
    },
    bodyContent: {
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: scaleSize(4),
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: scaleSize(120),
        paddingHorizontal: 0,
    },
    workoutListContent: {
        paddingBottom: scaleSize(120),
        paddingTop: scaleSize(6),
    },
    headerContainer: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(6),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
        paddingHorizontal: scaleSize(20),
        paddingBottom: scaleSize(6),
    },
    headerBackButton: {
        position: 'absolute',
        left: scaleSize(20),
        top: '50%',
        transform: [{ translateY: -scaleSize(14) }],
        width: scaleSize(28),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(7),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    segmentWrap: {
        borderRadius: scaleSize(999),
    },
    segmentBg: {
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderRadius: scaleSize(999),
        padding: scaleSize(4),
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 1,
    },
    segmentChip: {
        borderRadius: scaleSize(999),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surface,
        width: scaleSize(105),
        height: scaleSize(34),
        marginHorizontal: scaleSize(2),
    },
    segmentChipActive: {
        backgroundColor: theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    segmentChipText: {
        fontSize: scaleSize(12.5),
        fontFamily: 'Outfit_600SemiBold',
        color: theme.textSecondary,
    },
    segmentChipTextActive: {
        color: theme.textPrimary,
    },
    postWrapper: {
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(16),
    },
    emptyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        color: '#E3E9FF',
        marginBottom: scaleSize(4),
    },
    emptySubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: '#9CA3AF',
        textAlign: 'center',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    lockedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    lockedIconWrap: {
        width: scaleSize(78),
        height: scaleSize(78),
        borderRadius: scaleSize(39),
        backgroundColor: 'rgba(99, 102, 241, 0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleSize(14),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(16.5),
        color: '#E5E9FF',
        marginBottom: scaleSize(6),
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        lineHeight: scaleSize(19),
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
