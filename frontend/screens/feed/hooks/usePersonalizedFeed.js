import { useCallback, useEffect, useMemo, useState } from "react";

import useFilteredFeed from "../../../helper/useFilteredFeed";
import retrieveTrendingPosts from "../../../../backend/retrieveTrendingPosts";
import { useFeedSignalStats } from "../../../helper/feedSignals";
import {
    buildViewerTopicVector,
    extractPostTopics,
    mixRankedFeeds,
    scoreFeedCandidate,
} from "../../../helper/feedRanking";
import { subscribeUserData } from "../../../utils/userDataEvents";

const TRENDING_REFRESH_MS = 5 * 60 * 1000;

const getExplorePosts = () => {
    try {
        const list = global?.exploreFeedPosts;
        return Array.isArray(list) ? [...list] : [];
    } catch {
        return [];
    }
};

export default function usePersonalizedFeed(followingUsers) {
    const filteredFeed = useFilteredFeed(followingUsers);
    const followingPosts = Array.isArray(filteredFeed?.posts) ? filteredFeed.posts : [];
    const [manualTrendingEntries, setManualTrendingEntries] = useState([]);
    const [explorePosts, setExplorePosts] = useState(() => getExplorePosts());
    const [trendingLoading, setTrendingLoading] = useState(false);
    const [viewerTopics, setViewerTopics] = useState(() => buildViewerTopicVector(global?.userData || {}));

    const signalStats = useFeedSignalStats();

    useEffect(() => {
        const unsubscribe = subscribeUserData((user) => {
            setViewerTopics(buildViewerTopicVector(user || {}));
        });
        return () => {
            try { unsubscribe?.(); } catch { }
        };
    }, []);

    const refreshExplore = useCallback(() => {
        const latest = getExplorePosts();
        const latestSignature = latest.map((post) => post?.pid || post?.id).join(",");
        const currentSignature = explorePosts.map((post) => post?.pid || post?.id).join(",");
        if (latestSignature !== currentSignature) {
            setExplorePosts(latest);
        }
    }, [explorePosts]);

    useEffect(() => {
        const interval = setInterval(refreshExplore, 15 * 1000);
        refreshExplore();
        return () => clearInterval(interval);
    }, [refreshExplore]);

    const fetchTrending = useCallback(async () => {
        setTrendingLoading(true);
        try {
            const entries = await retrieveTrendingPosts(60);
            setManualTrendingEntries(entries);
        } catch (error) {
            console.warn?.("usePersonalizedFeed: trending fetch failed", error?.message || error);
        } finally {
            setTrendingLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (cancelled) return;
            await fetchTrending();
        };
        run();
        const interval = setInterval(run, TRENDING_REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [fetchTrending]);

    const suggestedCandidates = useMemo(() => {
        const followingIds = new Set(
            followingPosts.map((post) => String(post?.pid || post?.id || "")).filter(Boolean)
        );
        const candidates = new Map();

        manualTrendingEntries.forEach((entry) => {
            if (!entry?.post) return;
            const pid = String(entry.post?.pid || entry.post?.id || "");
            if (!pid || followingIds.has(pid) || candidates.has(pid)) return;
            candidates.set(pid, {
                post: entry.post,
                meta: {
                    isManualTrending: true,
                    manualBoost: entry?.meta?.boost || 0,
                    topics: Array.isArray(entry?.meta?.taggedTopics) ? entry.meta.taggedTopics : [],
                },
            });
        });

        explorePosts.forEach((post, index) => {
            if (!post) return;
            const pid = String(post?.pid || post?.id || "");
            if (!pid || followingIds.has(pid) || candidates.has(pid)) return;
            candidates.set(pid, {
                post,
                meta: {
                    isExploreCandidate: true,
                    exploreWeight: Math.max(0, 1 - index / 20),
                },
            });
        });

        const candidateArray = [];
        candidates.forEach((value) => {
            const topics = value.meta?.topics?.length
                ? value.meta.topics.map((topic) => String(topic).toLowerCase())
                : extractPostTopics(value.post);
            const score = scoreFeedCandidate(value.post, {
                signals: signalStats,
                viewerTopics,
                postTopics: topics,
                isManualTrending: value.meta?.isManualTrending,
                manualBoost: value.meta?.manualBoost,
                isExploreCandidate: value.meta?.isExploreCandidate,
                extraBoost: value.meta?.exploreWeight,
            });
            candidateArray.push({
                post: value.post,
                score,
                topics,
                authorUid: value.post?.uid ? String(value.post.uid) : "",
            });
        });

        candidateArray.sort((a, b) => (b.score || 0) - (a.score || 0));
        return candidateArray;
    }, [manualTrendingEntries, explorePosts, followingPosts, signalStats, viewerTopics]);

    const rankedFollowing = useMemo(() => (
        followingPosts.map((post) => {
            const topics = extractPostTopics(post);
            const score = scoreFeedCandidate(post, {
                signals: signalStats,
                viewerTopics,
                postTopics: topics,
                isFollowing: true,
            });
            return {
                post,
                score,
                topics,
                authorUid: post?.uid ? String(post.uid) : "",
            };
        })
    ), [followingPosts, signalStats, viewerTopics]);

    const personalizedPosts = useMemo(() => mixRankedFeeds({
        following: rankedFollowing,
        suggested: suggestedCandidates,
        firstBlockLimit: 20,
        firstBlockRatio: { following: 4, suggested: 1 },
        restRatio: { following: 1, suggested: 4 },
    }), [rankedFollowing, suggestedCandidates]);

    const personalPosts = useMemo(() => {
        const myUid = global?.userData?.uid ? String(global.userData.uid) : "";
        if (!myUid) return followingPosts.filter((post) => Boolean(post));
        return followingPosts.filter((post) => String(post?.uid || "") === myUid);
    }, [followingPosts]);

    return {
        ...filteredFeed,
        posts: personalizedPosts,
        followingPosts,
        personalPosts,
        suggestedPosts: suggestedCandidates.map((entry) => entry.post),
        trendingLoading,
        refreshTrending: fetchTrending,
    };
}
