import AsyncStorage from '@react-native-async-storage/async-storage';

const FEED_CACHE_PREFIX = 'feed-cache:v2:';

export async function invalidateFeedCacheForUser(uid) {
    if (!uid) return;
    const key = `${FEED_CACHE_PREFIX}${String(uid)}`;
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        // Swallow cache eviction errors; feed will fall back to live data.
        console.warn?.('feedCache: failed to invalidate cache', { key, error });
    }
}

export default {
    invalidateFeedCacheForUser,
};
