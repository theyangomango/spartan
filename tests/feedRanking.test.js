const assert = require("assert");
const {
    scoreFeedCandidate,
    mixRankedFeeds,
    extractPostTopics,
    buildViewerTopicVector,
} = require("../frontend/helper/feedRanking");

const makePost = (overrides = {}) => ({
    pid: overrides.pid || `pid-${Math.random()}`,
    uid: overrides.uid || "user-followed",
    created: overrides.created || Date.now(),
    likeCount: overrides.likeCount ?? 10,
    commentCount: overrides.commentCount ?? 2,
    shareCount: overrides.shareCount ?? 1,
    workout: overrides.workout || {
        templateName: "Push Day",
        exercises: [{ muscle: "chest" }, { muscle: "arms" }],
    },
    ...overrides,
});

const viewer = {
    statsHexagon: { chest: 50, legs: 20, back: 30 },
    templates: [{ name: "Push Day" }, { name: "Leg Day" }],
};

const viewerTopics = buildViewerTopicVector(viewer);

const postFollowing = makePost({ pid: "follow-1", uid: "friend-1" });
const postSuggested = makePost({ pid: "suggested-1", uid: "creator-1", likeCount: 200 });

const scoreFollowing = scoreFeedCandidate(postFollowing, {
    isFollowing: true,
    viewerTopics,
    signals: { likesPast7dByUid: { "friend-1": 3 } },
});

const scoreSuggested = scoreFeedCandidate(postSuggested, {
    viewerTopics,
    isManualTrending: true,
    manualBoost: 1,
});

assert(scoreFollowing > 0, "Following score should be positive");
assert(scoreSuggested > scoreFollowing - 2, "Manual trending post should be highly ranked");

const mixedFeed = mixRankedFeeds({
    following: [{ post: postFollowing, score: scoreFollowing, topics: extractPostTopics(postFollowing) }],
    suggested: [{ post: postSuggested, score: scoreSuggested, topics: extractPostTopics(postSuggested) }],
    firstBlockLimit: 5,
});

assert(Array.isArray(mixedFeed), "Mixed feed should be array");
assert(mixedFeed.length === 2, "Mixed feed should contain both posts");
assert(mixedFeed[0].pid === "follow-1", "Following post should lead the feed");

console.log("feedRanking tests passed");
