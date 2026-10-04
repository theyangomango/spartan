// Bookmark toggle that adds a food to, or removes it from, the user's favourite foods.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getCachedFavoriteStatus, isFavoriteFood, removeFavoriteFood, upsertFavoriteFood } from '../../utils/favoriteFoods';
import { strong as haptic } from '../../utils/haptics';
import styles, { COLORS } from './foodDetailStyles';

const FavoriteFoodButton = React.memo(function FavoriteFoodButton({ favoritePayload, favoriteKey }) {
    const uid = global?.userData?.uid || global?.userData?.id || '';
    const [isFavorited, setIsFavorited] = useState(() => {
        if (!uid || !favoriteKey) return false;
        const cached = getCachedFavoriteStatus(uid, favoriteKey);
        return typeof cached === 'boolean' ? cached : false;
    });
    const favoriteBusyRef = useRef(false);
    const favoriteTouchedRef = useRef(false);
    const favoriteLoadSeqRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        favoriteTouchedRef.current = false;
        if (!uid || !favoriteKey) {
            setIsFavorited(false);
            return () => { cancelled = true; };
        }

        const cachedStatus = getCachedFavoriteStatus(uid, favoriteKey);
        if (typeof cachedStatus === 'boolean') {
            setIsFavorited(cachedStatus);
        }

        const seq = ++favoriteLoadSeqRef.current;
        (async () => {
            const exists = await isFavoriteFood(uid, favoriteKey);
            if (cancelled) return;
            if (seq !== favoriteLoadSeqRef.current) return;
            if (favoriteTouchedRef.current) return;
            setIsFavorited(exists);
        })();

        return () => { cancelled = true; };
    }, [uid, favoriteKey]);

    const toggleFavorite = useCallback(() => {
        if (favoriteBusyRef.current || !uid || !favoriteKey) return;
        const next = !isFavorited;
        favoriteTouchedRef.current = true;
        setIsFavorited(next); // instant icon flip
        favoriteBusyRef.current = true;
        const schedule = typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, 0);
        schedule(() => {
            try { haptic(); } catch { }
        });

        (async () => {
            try {
                if (next) {
                    const saved = await upsertFavoriteFood(uid, favoritePayload);
                    if (!saved) throw new Error('favorite-save-failed');
                } else {
                    await removeFavoriteFood(uid, favoriteKey);
                }
            } catch {
                setIsFavorited(!next);
                favoriteTouchedRef.current = false;
            } finally {
                favoriteBusyRef.current = false;
            }
        })();
    }, [favoriteKey, favoritePayload, isFavorited, uid]);

    return (
        <Pressable
            onPress={toggleFavorite}
            disabled={!favoriteKey}
            hitSlop={8}
            style={[styles.favoriteBtn, !favoriteKey && styles.favoriteBtnDisabled]}
            accessibilityLabel={isFavorited ? 'Remove from favorite foods' : 'Add to favorite foods'}
        >
            <Ionicons
                name={isFavorited ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isFavorited ? COLORS.accent : COLORS.subtext}
            />
        </Pressable>
    );
});

export default FavoriteFoodButton;
