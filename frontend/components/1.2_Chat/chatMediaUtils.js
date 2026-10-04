// Normalises the media entries of a chat message into { uri, url, type } objects.
const pickString = (value) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed || "";
};

const resolveMediaUri = (entry = {}) => {
    return (
        pickString(entry.url) ||
        pickString(entry.uri) ||
        pickString(entry.image) ||
        pickString(entry.photoURL) ||
        pickString(entry.photoUrl) ||
        pickString(entry.photo) ||
        pickString(entry.path) ||
        pickString(entry.src) ||
        ""
    );
};

export const normalizeMediaEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === "string") {
        const uri = pickString(entry);
        return uri ? { uri, url: uri, type: "image" } : null;
    }
    if (typeof entry !== "object") return null;
    const uri = resolveMediaUri(entry);
    if (!uri) return null;
    const typeSource = `${entry.type || ""} ${entry.mediaType || ""} ${entry.kind || ""} ${entry.mimeType || ""}`.toLowerCase();
    const type = typeSource.includes("video") ? "video" : "image";
    return {
        ...entry,
        uri,
        url: entry.url || uri,
        type,
    };
};
