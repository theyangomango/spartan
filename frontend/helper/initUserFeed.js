import { getUserMessages } from '../../backend/getUserFeed';
import retrieveUserExploreFeed from '../../backend/retrieveUserExploreFeed';
import readDoc from '../../backend/helper/firebase/readDoc';
import FastImage from 'react-native-fast-image';
import { getMessagesCache, getMessagesPreloadState, hydrateMessagesCache } from '../state/messagesCache';

let userDataRef = { current: null };

let setMessagesFn, setFooterKeyFn;

export function registerFeedSetters({ setMessages, setFooterKey }) {
    setMessagesFn = setMessages;
    setFooterKeyFn = setFooterKey;
    if (typeof setMessagesFn === 'function') {
        setMessagesFn(getMessagesCache());
    }
}


// Main feed initializer
export async function initUserFeed(UID) {
    try {
        const [publicDoc, privateDoc, legacyDoc] = await Promise.all([
            readDoc('usersPublic', UID).catch(() => null),
            readDoc('usersPrivate', UID).catch(() => null),
            readDoc('users', UID).catch(() => null),
        ]);

        if (!publicDoc && !privateDoc && !legacyDoc) {
            console.log('[initUserFeed] profile docs missing; waiting for username completion');
            return;
        }

        const publicData = publicDoc || {};
        const privateData = privateDoc || {};
        const legacyData = legacyDoc || {};

        const displayName = publicData.displayName
            || legacyData.displayName
            || legacyData.name
            || '';
        const photoURL = publicData.photoURL
            || legacyData.photoURL
            || legacyData.pfp
            || legacyData.image
            || '';
        const handle = publicData.handle || legacyData.handle || '';

        // Sanitize to ensure required shapes exist during first paint
        const saneUser = {
            uid: UID,
            ...legacyData,
            ...publicData,
            ...privateData,
            displayName,
            name: displayName || legacyData.name || '',
            photoURL,
            image: photoURL || legacyData.image || '',
            pfp: photoURL || legacyData.pfp || '',
            handle,
            messages: Array.isArray(privateData.messages)
                ? privateData.messages
                : Array.isArray(legacyData.messages)
                    ? legacyData.messages
                    : [],
            following: Array.isArray(publicData.following)
                ? publicData.following
                : Array.isArray(legacyData.following)
                    ? legacyData.following
                    : [],
            followers: Array.isArray(publicData.followers)
                ? publicData.followers
                : Array.isArray(legacyData.followers)
                    ? legacyData.followers
                    : [],
            blockedUidList: Array.isArray(privateData.blockedUidList)
                ? privateData.blockedUidList
                : Array.isArray(legacyData.blockedUidList)
                    ? legacyData.blockedUidList
                    : [],
            blockedByUidList: Array.isArray(privateData.blockedByUidList)
                ? privateData.blockedByUidList
                : Array.isArray(legacyData.blockedByUidList)
                    ? legacyData.blockedByUidList
                    : [],
        };
        userDataRef.current = saneUser;
        try { global.userData = { ...(global.userData || {}), ...saneUser }; } catch {}

        // ✅ Load the rest in parallel (no posts here!)
        await Promise.all([
            initUserMessages(saneUser),
            initExploreFeedImages(saneUser)
        ]);

        initWorkoutState(saneUser);

        console.log("✅ Feed data and images initialized (excluding posts).");
    } catch (error) {
        console.error("❌ Error initializing feed:", error);
    }
}

// 1️⃣ Messages
async function initUserMessages(userData) {
    const cached = getMessagesCache();
    if (cached.length > 0) {
        if (typeof setMessagesFn === 'function') {
            setMessagesFn(cached);
        }
        return cached;
    }

    const { promise, uid } = getMessagesPreloadState();
    if (promise && userData?.uid && uid === userData.uid) {
        try {
            const preloaded = await promise;
            if (typeof setMessagesFn === 'function') {
                setMessagesFn(preloaded);
            }
            return preloaded;
        } catch {
            // Fall back to manual fetch below
        }
    }

    const messages = await getUserMessages(userData);
    const hydrated = hydrateMessagesCache(messages);
    if (typeof setMessagesFn === 'function') {
        setMessagesFn(hydrated);
    }
    return hydrated;
}

// 2️⃣ Explore Feed (global.exploreFeedPosts + preload)
async function initExploreFeedImages(userData) {
    const explorePosts = await retrieveUserExploreFeed(userData);
    global.exploreFeedPosts = explorePosts;

    const preloadImages = explorePosts.map(post => ({
        uri: (post.media && post.media[0] && (post.media[0].uri || post.media[0].url)) || '',
        priority: FastImage.priority.normal,
    }));

    FastImage.preload(preloadImages);
}

// 3️⃣ Workout UI state
function initWorkoutState(userData) {
    if (userData.currentWorkout) {
        global.isCurrentlyWorkingOut = true;
        if (typeof setFooterKeyFn === 'function') {
            setFooterKeyFn(prev => prev + 1);
        }
    }
}
