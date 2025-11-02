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
        const userDoc = await readDoc("users", UID);
        // Sanitize to ensure required shapes exist during first paint
        const saneUser = {
            uid: UID,
            ...(userDoc || {}),
            messages: Array.isArray(userDoc?.messages) ? userDoc.messages : [],
            following: Array.isArray(userDoc?.following) ? userDoc.following : [],
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
        setFooterKeyFn(prev => prev + 1);
    }
}
