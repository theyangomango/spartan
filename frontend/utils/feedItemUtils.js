// Pure helpers for reading feed items (numbers, handles, post ids) and building the edit-post payload.

export const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

export const ensureAtHandle = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    return str.startsWith("@") ? str : `@${str}`;
};

export const stringCandidates = (values) => {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (typeof value === "string" || typeof value === "number") {
            const str = String(value).trim();
            if (str) return str;
        }
    }
    return "";
};

export const extractPidFromWorkout = (workout) => stringCandidates([
    workout?.postPid,
    workout?.postPID,
    workout?.postId,
    workout?.pid,
]);

export const buildEditPostPayload = (latest, fallbackWorkout, pid) => {
    const resolvedCaption = (() => {
        if (typeof latest.caption === "string" && latest.caption.trim()) {
            return latest.caption;
        }
        const captionComment = Array.isArray(latest.comments)
            ? latest.comments.find((comment) => comment?.isCaption && typeof comment?.content === "string")
            : null;
        return captionComment?.content || "";
    })();

    const mediaEntries = [];
    const seen = new Set();

    if (Array.isArray(latest.media)) {
        latest.media.forEach((entry) => {
            const uri = typeof entry === "string" ? entry : entry?.uri;
            if (!uri || seen.has(uri)) return;
            seen.add(uri);
            const entryTypeRaw = typeof entry === "string" ? undefined : entry?.type;
            const type = entryTypeRaw === "clip" ? "video" : entryTypeRaw;
            const cropRect = typeof entry === "string" ? null : entry?.cropRect || null;
            const duration =
                typeof entry === "string"
                    ? 0
                    : Number(
                          entry?.duration ??
                          entry?.videoDuration ??
                          entry?.length ??
                          entry?.seconds ??
                          0
                      ) || 0;
            const width = typeof entry?.width === "number" ? entry.width : (typeof entry?.naturalWidth === "number" ? entry.naturalWidth : 0);
            const height = typeof entry?.height === "number" ? entry.height : (typeof entry?.naturalHeight === "number" ? entry.naturalHeight : 0);
            const aspectRatio = typeof entry?.aspectRatio === "number"
                ? entry.aspectRatio
                : (width && height ? width / height : null);

            mediaEntries.push({
                uri,
                type: type === "video" ? "video" : "image",
                duration,
                cropRect,
                width,
                height,
                aspectRatio,
                isClip: Boolean(entry?.isClip || entryTypeRaw === "clip" || latest?.type === "clip"),
            });
        });
    }
    if (Array.isArray(latest.images)) {
        latest.images.forEach((entry) => {
            const uri = typeof entry === "string" ? entry : entry?.uri;
            if (!uri || seen.has(uri)) return;
            seen.add(uri);
            mediaEntries.push({
                uri,
                type: "image",
                duration: 0,
                cropRect: typeof entry === "string" ? null : entry?.cropRect || null,
                width: typeof entry?.width === "number" ? entry.width : 0,
                height: typeof entry?.height === "number" ? entry.height : 0,
                aspectRatio: typeof entry?.aspectRatio === "number" ? entry.aspectRatio : null,
                isClip: false,
            });
        });
    }

    const workoutName = (() => {
        const source = latest.workout || fallbackWorkout || null;
        if (!source || typeof source !== "object") return "";
        const candidate = source.templateName || source.template?.name || source.name || source.workoutName || "";
        return candidate ? String(candidate).trim() : "";
    })();

    const editingPayload = {
        pid,
        caption: resolvedCaption,
        mediaEntries,
        workoutName,
    };

    return { resolvedCaption, mediaEntries, editingPayload };
};
