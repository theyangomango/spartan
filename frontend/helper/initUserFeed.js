import { getUserStories, getUserMessages } from '../../backend/getUserFeed';
import retrieveUserExploreFeed from '../../backend/retrieveUserExploreFeed';
import readDoc from '../../backend/helper/firebase/readDoc';
import FastImage from 'react-native-fast-image';

let userDataRef = { current: null };

// Internal setter references to update React state from outside
let setStoriesFn, setMessagesFn, setFooterKeyFn;

// Register React state setters from the component
export function registerFeedSetters({ setStories, setMessages, setFooterKey }) {
    setStoriesFn = setStories;
    setMessagesFn = setMessages;
    setFooterKeyFn = setFooterKey;
}

// Main feed initializer
export async function initUserFeed(UID) {
    try {
        const userDoc = await readDoc("users", UID);
        userDataRef.current = userDoc;
        global.userData = userDoc;

        // ✅ 1. Prioritize stories (blocking)
        await initUserStories(userDoc);

        // ✅ 2. Load the rest in parallel (no posts here!)
        await Promise.all([
            initUserMessages(userDoc),
            initExploreFeedImages(userDoc)
        ]);

        initWorkoutState(userDoc);

        console.log("✅ Feed data and images initialized (excluding posts).");
    } catch (error) {
        console.error("❌ Error initializing feed:", error);
    }
}

// 1️⃣ Stories
async function initUserStories(userData) {
    const stories = await getUserStories(userData);
    setStoriesFn(stories);

    const preloadImages = stories.storiesData.map(story => ({
        uri: story.image,
        priority: FastImage.priority.high,
        cache: FastImage.cacheControl.immutable,
    }));

    FastImage.preload(preloadImages);
}

// 2️⃣ Messages
async function initUserMessages(userData) {
    const messages = await getUserMessages(userData);
    setMessagesFn(messages);
}

// 3️⃣ Explore Feed (global.exploreFeedPosts + preload)
async function initExploreFeedImages(userData) {
    const explorePosts = await retrieveUserExploreFeed(userData);
    global.exploreFeedPosts = explorePosts;

    const preloadImages = explorePosts.map(post => ({
        uri: post.images[0],
        priority: FastImage.priority.normal,
    }));

    FastImage.preload(preloadImages);
}

// 4️⃣ Workout UI state
function initWorkoutState(userData) {
    if (userData.currentWorkout) {
        global.isCurrentlyWorkingOut = true;
        setFooterKeyFn(prev => prev + 1);
    }
}
