// User-facing copy for failures while uploading or sending a chat message.
const UPLOAD_ERROR_COPY = {
    UNRESOLVED_ASSET_URI: "We couldn't access that item. Download it to your device first, then try again.",
    ASSET_READ_FAILED: "We couldn't read the selected file. Please choose a different one.",
    ASSET_EMPTY: "The selected file appears to be empty. Please pick a different one.",
    VIDEO_NOT_ALLOWED: "Videos can't be shared in chat yet. Please pick images instead.",
};

export const resolveUploadErrorMessage = (error) => {
    const code = typeof error?.code === "string" ? error.code : "";
    if (code && UPLOAD_ERROR_COPY[code]) return UPLOAD_ERROR_COPY[code];
    if (typeof error?.message === "string") {
        const directMessage = Object.entries(UPLOAD_ERROR_COPY).find(([, msg]) => msg === error.message);
        if (directMessage) return directMessage[1];
    }
    if (code && code.startsWith("storage/unauthorized")) {
        return "You don't have permission to upload to this chat right now.";
    }
    if (code && code.startsWith("storage/quota-exceeded")) {
        return "You've hit the upload limit for now. Please wait a bit and retry.";
    }
    return "Something went wrong while sending your message. Please try again.";
};
