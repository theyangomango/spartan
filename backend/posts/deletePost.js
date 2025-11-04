import eraseDoc from "../helper/firebase/eraseDoc";
import arrayErase from "../helper/firebase/arrayErase";
import incrementDocValue from "../helper/firebase/incrementDocValue";

const normalizeId = (value) => {
    if (!value && value !== 0) return "";
    const str = String(value).trim();
    return str;
};

export default async function deletePost(pid, uid) {
    const safePid = normalizeId(pid);
    if (!safePid) return;

    const safeUid = normalizeId(uid);

    try {
        await eraseDoc("posts", safePid);
    } catch (error) {
        console.error("deletePost: failed to erase post doc", error);
        // Continue attempting cleanup for consistency
    }

    if (safeUid) {
        await Promise.allSettled([
            (async () => {
                try { await arrayErase("usersPublic", safeUid, "posts", safePid); } catch (error) {
                    console.error("deletePost: failed to remove pid from usersPublic posts array", error);
                }
            })(),
            (async () => {
                try { await incrementDocValue("usersPublic", safeUid, "postCount", -1); } catch (error) {
                    console.error("deletePost: failed to decrement usersPublic postCount", error);
                }
            })(),
            (async () => {
                try { await arrayErase("users", safeUid, "posts", safePid); } catch (error) {
                    console.error("deletePost: failed to remove pid from legacy users posts array", error);
                }
            })(),
            (async () => {
                try { await incrementDocValue("users", safeUid, "postCount", -1); } catch (error) {
                    console.error("deletePost: failed to decrement legacy users postCount", error);
                }
            })(),
        ]);
    }

    try {
        await arrayErase("global", "posts", "PIDs", safePid);
    } catch (error) {
        console.error("deletePost: failed to remove pid from global posts", error);
    }
}
