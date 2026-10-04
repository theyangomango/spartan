// Pure helpers of the feed post card: timestamp parsing and formatting, media entry normalisation and signatures.

export const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value?.toMillis) {
        try {
            return value.toMillis();
        } catch {
            return 0;
        }
    }
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
};

export const formatTimestamp = (value) => {
    if (!value && value !== 0) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    let datePart = "";
    let timePart = "";
    try {
        datePart = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch { }
    try {
        timePart = date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        timePart = timePart.replace(/\s?(AM|PM)$/i, (_, meridiem) => meridiem.toUpperCase());
    } catch { }

    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || "";
};

export const normalizeMediaEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === "string") {
        const uri = entry.trim();
        return uri ? { uri, type: "image", cropRect: null } : null;
    }
    if (typeof entry === "object") {
        const uri = entry.uri || entry.url || entry.image || entry.photoURL || null;
        if (!uri) return null;
        const rawType = (entry.type || entry.mediaType || entry.kind || "image").toLowerCase();
        const type = rawType.includes("video") ? "video" : "image";
        return { ...entry, uri, type, cropRect: entry.cropRect || null };
    }
    return null;
};

export const mediaSignatureFor = (entry) => {
    if (!entry) return "null";
    const type = entry.type || "image";
    const uri = (() => {
        if (typeof entry.uri === "string") return entry.uri;
        if (entry.uri && typeof entry.uri === "object") {
            try {
                return JSON.stringify(entry.uri);
            } catch {
                return "";
            }
        }
        return "";
    })();
    const crop = entry?.cropRect;
    let cropKey = "";
    if (crop && typeof crop === "object") {
        const { x = 0, y = 0, width = 1, height = 1 } = crop;
        cropKey = `:${Number(x).toFixed(4)}-${Number(y).toFixed(4)}-${Number(width).toFixed(4)}-${Number(height).toFixed(4)}`;
    }
    return `${type}:${uri}${cropKey}`;
};

export const getMillis = (value) => {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "object") {
        if (typeof value.toMillis === "function") {
            try { return value.toMillis(); } catch { return null; }
        }
        const seconds = Number(value.seconds ?? value._seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
            const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
            return seconds * 1000 + extra;
        }
    }
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
};
