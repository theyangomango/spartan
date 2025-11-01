import { Asset } from 'expo-asset';
import authBackground from '../assets/AUTH_BACKGROUND.jpg';

let preloadPromise = null;

const AUTH_BACKGROUND_ASSET = Asset.fromModule(authBackground);

export const getAuthBackgroundSource = () => {
    if (AUTH_BACKGROUND_ASSET?.localUri) {
        return { uri: AUTH_BACKGROUND_ASSET.localUri };
    }
    return authBackground;
};

export const ensureAuthBackgroundAsync = () => {
    if (AUTH_BACKGROUND_ASSET?.localUri) {
        return Promise.resolve(AUTH_BACKGROUND_ASSET);
    }
    if (preloadPromise) {
        return preloadPromise;
    }
    preloadPromise = AUTH_BACKGROUND_ASSET.downloadAsync().catch((error) => {
        preloadPromise = null;
        throw error;
    });
    return preloadPromise;
};
