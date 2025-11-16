const toMillisSafe = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value?.toMillis === "function") {
        try {
            return value.toMillis();
        } catch {
            return 0;
        }
    }
    if (typeof value?.seconds === "number") {
        return value.seconds * 1000;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeTopic = (value) => {
    if (!value && value !== 0) return "";
    const str = String(value).trim().toLowerCase();
    return str;
};

const extractPostTopics = (post = {}) => {
    const topics = new Set();
    const workout = post?.workout || {};
    const templateName = workout?.templateName || workout?.template?.name;
    if (templateName) topics.add(sanitizeTopic(templateName));
    if (workout?.focusMuscle) topics.add(sanitizeTopic(workout.focusMuscle));
    if (Array.isArray(workout?.exercises)) {
        workout.exercises.forEach((exercise) => {
            if (exercise?.muscle) topics.add(sanitizeTopic(exercise.muscle));
            if (exercise?.name) topics.add(sanitizeTopic(exercise.name));
        });
    }
    const tags = Array.isArray(post?.tags) ? post.tags : Array.isArray(post?.tagged) ? post.tagged : [];
    tags.forEach((tag) => {
        const normalized = sanitizeTopic(tag);
        if (normalized) topics.add(normalized);
    });
    if (typeof post?.caption === "string") {
        const caption = post.caption.toLowerCase();
        const keywordMatches = ["leg", "push", "pull", "macro", "diet", "cardio"];
        keywordMatches.forEach((keyword) => {
            if (caption.includes(keyword)) topics.add(keyword);
        });
    }
    if (post?.type) topics.add(sanitizeTopic(post.type));
    return Array.from(topics).filter(Boolean);
};

const buildViewerTopicVector = (userData = {}) => {
    const topics = new Set();
    const statsHexagon = userData?.statsHexagon || {};
    Object.entries(statsHexagon)
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
        .slice(0, 4)
        .forEach(([key]) => {
            const normalized = sanitizeTopic(key);
            if (normalized) topics.add(normalized);
        });
    const templates = Array.isArray(userData?.templates) ? userData.templates : [];
    templates.slice(0, 4).forEach((template) => {
        if (template?.name) topics.add(sanitizeTopic(template.name));
    });
    if (typeof userData?.preferredMuscles === "string") {
        userData.preferredMuscles.split(",").forEach((entry) => {
            const normalized = sanitizeTopic(entry);
            if (normalized) topics.add(normalized);
        });
    }
    return Array.from(topics);
};

const scoreFeedCandidate = (post, options = {}) => {
    if (!post) return -Infinity;
    const now = Date.now();
    const created = toMillisSafe(post?.created || post?.createdAt || post?.updatedAt) || now;
    const viewerTopics = Array.isArray(options.viewerTopics) ? options.viewerTopics : [];
    const postTopics = Array.isArray(options.postTopics) ? options.postTopics : extractPostTopics(post);
    const signals = options.signals || {};
    const authorUid = post?.uid ? String(post.uid) : "";

    const likesMap = signals?.likesPast7dByUid || {};
    const dmMap = signals?.dmCountByUid || {};
    const savesMap = signals?.savedPostsByUid || {};
    const hidesMap = signals?.hidesByUid || {};

    let affinityScore = 0;
    if (options.isFollowing) affinityScore += 4;
    if (authorUid && likesMap[authorUid]) {
        affinityScore += Math.min(4, Number(likesMap[authorUid]) / 2);
    }
    if (authorUid && dmMap[authorUid]) {
        affinityScore += Math.min(3, Number(dmMap[authorUid]));
    }
    if (authorUid && savesMap[authorUid]) {
        affinityScore += Math.min(2, Number(savesMap[authorUid]));
    }
    if (authorUid && hidesMap[authorUid]) {
        affinityScore -= Math.min(2, Number(hidesMap[authorUid]));
    }

    const engagementValue =
        Number(post?.likeCount || 0) +
        2 * Number(post?.commentCount || 0) +
        Number(post?.shareCount || 0);

    const engagementScore = Math.log10(1 + Math.max(0, engagementValue));
    const recencyHours = Math.max(0, (now - created) / 3600000);
    const recencyScore = Math.max(0, 1 - recencyHours / 72);

    const topicOverlap = (() => {
        if (!postTopics.length || !viewerTopics.length) {
            return postTopics.length ? 0.2 : 0.1;
        }
        const matches = postTopics.filter((topic) => viewerTopics.includes(topic));
        if (!matches.length) return 0.15;
        return Math.min(1, matches.length / postTopics.length);
    })();

    const noveltyPenalty = Number(options.noveltyPenalty || 0);

    let score =
        0.35 * affinityScore +
        0.25 * engagementScore +
        0.2 * recencyScore +
        0.15 * topicOverlap -
        0.1 * noveltyPenalty;

    if (options.isManualTrending) {
        score += 2 + Number(options.manualBoost || 0);
    }
    if (post?.isLive || post?.liveWorkout) {
        score += 1.5;
    }
    if (options.isRecentlyFollowed) {
        score += 0.8;
    }
    if (options.extraBoost) {
        score += Number(options.extraBoost);
    }
    if (options.isExploreCandidate) {
        score += 0.2;
    }

    return score;
};

const mixRankedFeeds = ({
    following = [],
    suggested = [],
    firstBlockLimit = 20,
    firstBlockRatio = { following: 4, suggested: 1 },
    restRatio = { following: 1, suggested: 4 },
} = {}) => {
    const output = [];
    const usedPids = new Set();
    const usedAuthors = new Set();
    const usedTopics = new Set();

    const cloneCandidate = (candidate) => {
        if (!candidate) return null;
        return { ...candidate };
    };

    const fetchCandidate = (queue) => {
        while (queue.length) {
            const candidate = cloneCandidate(queue.shift());
            if (!candidate?.post) continue;
            const pid = String(candidate.post?.pid || candidate.post?.id || "");
            if (!pid || usedPids.has(pid)) continue;
            candidate.pid = pid;
            candidate.authorUid = candidate.authorUid || (candidate.post?.uid ? String(candidate.post.uid) : "");
            const candidateTopics = Array.isArray(candidate.topics)
                ? candidate.topics
                : extractPostTopics(candidate.post);
            candidate.topics = candidateTopics;
            let penalty = 0;
            if (candidate.authorUid && usedAuthors.has(candidate.authorUid)) penalty += 0.3;
            if (candidateTopics.some((topic) => usedTopics.has(topic))) penalty += 0.2;
            candidate.adjustedScore = (candidate.adjustedScore ?? candidate.score ?? 0) - penalty;
            return candidate;
        }
        return null;
    };

    const pushCandidate = (candidate) => {
        if (!candidate || !candidate.post) return false;
        if (usedPids.has(candidate.pid)) return false;
        output.push(candidate.post);
        usedPids.add(candidate.pid);
        if (candidate.authorUid) usedAuthors.add(candidate.authorUid);
        candidate.topics.forEach((topic) => usedTopics.add(topic));
        return true;
    };

    const applyRatioBlock = (queue, ratioCount, targetLength = Infinity) => {
        for (let i = 0; i < ratioCount && output.length < targetLength; i += 1) {
            const candidate = fetchCandidate(queue);
            if (!candidate) break;
            pushCandidate(candidate);
        }
    };

    const followingQueue = [...following];
    const suggestedQueue = [...suggested];

    while (output.length < firstBlockLimit && (followingQueue.length || suggestedQueue.length)) {
        applyRatioBlock(followingQueue, firstBlockRatio.following || 0, firstBlockLimit);
        if (output.length >= firstBlockLimit) break;
        applyRatioBlock(suggestedQueue, firstBlockRatio.suggested || 0, firstBlockLimit);
        if (!followingQueue.length && !suggestedQueue.length) break;
    }

    while (followingQueue.length || suggestedQueue.length) {
        applyRatioBlock(suggestedQueue, restRatio.suggested || 0);
        applyRatioBlock(followingQueue, restRatio.following || 0);
        if (!followingQueue.length && !suggestedQueue.length) break;
    }

    return output;
};

module.exports = {
    toMillisSafe,
    extractPostTopics,
    buildViewerTopicVector,
    scoreFeedCandidate,
    mixRankedFeeds,
};
