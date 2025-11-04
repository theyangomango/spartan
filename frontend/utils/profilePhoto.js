const PHOTO_FIELDS = [
  "photoURL",
  "photoUrl",
  "image",
  "pfp",
  "pfpUrl",
  "avatar",
  "picture",
  "photo",
  "profileImage",
  "profilePhoto",
];

const trimString = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed || "";
};

export const resolvePhotoURL = (source, fallback = "") => {
  if (!source || typeof source !== "object") {
    return trimString(fallback);
  }

  for (const field of PHOTO_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      const candidate = trimString(source[field]);
      if (candidate) return candidate;
    }
  }

  return trimString(fallback);
};

export const withLegacyPhotoFields = (source, fallback = "") => {
  if (!source || typeof source !== "object") return source;
  const resolved = resolvePhotoURL(source, fallback);
  if (!resolved) return { ...source };

  const next = { ...source };
  if (!trimString(next.photoURL)) next.photoURL = resolved;
  if (!trimString(next.photoUrl)) next.photoUrl = resolved;
  if (!trimString(next.image)) next.image = resolved;
  if (!trimString(next.pfp)) next.pfp = resolved;
  if (!trimString(next.avatar)) next.avatar = resolved;
  if (!trimString(next.picture)) next.picture = resolved;
  if (!trimString(next.profileImage)) next.profileImage = resolved;
  if (!trimString(next.profilePhoto)) next.profilePhoto = resolved;
  return next;
};
