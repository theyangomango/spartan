import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { strong as haptic } from '../../../../utils/haptics';

import updateDoc from '../../../../../backend/helper/firebase/updateDoc';
import arrayAppend from '../../../../../backend/helper/firebase/arrayAppend';
import arrayErase from '../../../../../backend/helper/firebase/arrayErase';
import sendNotification from '../../../../../backend/sendNotification';
import scaleSize from '../../../../helper/scaleSize';

const DOUBLE_TAP_GUARD_MS = 300;

function resolveUser() {
    return global?.userData || {};
}

/**
 * Encapsulates the business logic for the post footer: like/save mutations,
 * derived state, and cross-component hit testing for overlay taps.
 */
export default function usePostFooterInteractions({ data, onPressCommentButton, onPressShareButton }) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const buttonRefs = useRef({});
    const lastLikeToggleRef = useRef(0);

    const interactionsEnabled = !!data?.pid && !String(data.pid).startsWith('workout:');

    // Initialise like/save state once user data is available.
    useEffect(() => {
        const user = resolveUser();
        const uid = user.uid;
        if (!uid || !interactionsEnabled) {
            setIsLiked(false);
            setIsSaved(false);
            return;
        }

        try {
            setIsLiked(Array.isArray(data?.likes) && data.likes.some((item) => item?.uid === uid));
            setIsSaved(Array.isArray(user?.savedPosts) && user.savedPosts.includes(data?.pid));
        } catch {
            setIsLiked(false);
            setIsSaved(false);
        }
    }, [data?.likes, data?.pid, global?.userData?.uid, global?.userData?.savedPosts, interactionsEnabled]);

    const assignButtonRef = useCallback((key, node) => {
        if (!key) return;
        if (node) {
            buttonRefs.current[key] = node;
        } else {
            delete buttonRefs.current[key];
        }
    }, []);

    const handlePressLikeButton = useCallback(() => {
        if (!interactionsEnabled) return;

        const user = resolveUser();
        if (!user?.uid) {
            Alert?.alert?.('Oops', 'Please log in to like posts.');
            return;
        }

        try { haptic(); } catch {}

        setIsLiked((prev) => {
            const now = Date.now();
            const nextLiked = !prev;

            // Prevent accidental double toggles caused by overlapping gesture handlers.
            if (now - lastLikeToggleRef.current < DOUBLE_TAP_GUARD_MS) {
                return prev;
            }

            const likeCount = Number(data.likeCount) || 0;

            try {
                if (nextLiked) {
                    const likesArray = Array.isArray(data.likes) ? data.likes : [];
                    const hasUser = likesArray.some((item) => item?.uid === user.uid);

                    if (!hasUser) {
                        const updatedLikes = [
                            ...likesArray,
                            {
                                uid: user.uid,
                                handle: user.handle ?? '',
                                name: user.name ?? '',
                                pfp: user.image ?? user.pfp ?? user.pfpUrl ?? user.photoURL ?? '',
                            },
                        ];

                        data.likes = updatedLikes;
                        data.likeCount = likeCount + 1;
                        updateDoc('posts', data.pid, { likeCount: data.likeCount, likes: updatedLikes });

                        sendNotification(data.uid, {
                            uid: user.uid,
                            pfp: user.image,
                            handle: user.handle,
                            name: user.name,
                            type: 'liked-post',
                            pid: data.pid,
                            timestamp: Date.now(),
                        });
                    }
                } else {
                    const likesArray = Array.isArray(data.likes) ? data.likes : [];
                    const updatedLikes = likesArray.filter((item) => item?.uid !== user.uid);

                    if (updatedLikes.length !== likesArray.length) {
                        const nextCount = Math.max(0, likeCount - 1);
                        data.likes = updatedLikes;
                        data.likeCount = nextCount;
                        updateDoc('posts', data.pid, { likeCount: nextCount, likes: updatedLikes });
                    }
                }
            } catch (error) {
                console.warn('Failed to update like state', error);
            }

            lastLikeToggleRef.current = now;
            return nextLiked;
        });
    }, [data, interactionsEnabled]);

    const ensureLike = useCallback(() => {
        if (!interactionsEnabled) return;
        if (!isLiked) handlePressLikeButton();
    }, [handlePressLikeButton, interactionsEnabled, isLiked]);

    const handlePressSaveButton = useCallback(() => {
        if (!interactionsEnabled) return;

        const user = resolveUser();
        if (!user?.uid) {
            Alert?.alert?.('Oops', 'Please log in to save posts.');
            return;
        }

        try {
            if (isSaved) {
                arrayErase('users', user.uid, 'savedPosts', data.pid);
            } else {
                arrayAppend('users', user.uid, 'savedPosts', data.pid);
            }
        } catch (error) {
            console.warn('Failed to toggle saved post', error);
        }

        try { haptic(); } catch {}
        setIsSaved((prev) => !prev);
    }, [data?.pid, interactionsEnabled, isSaved]);

    const pressComment = useCallback(() => {
        if (typeof onPressCommentButton !== 'function') return;
        if (!interactionsEnabled) {
            onPressCommentButton();
            return;
        }
        onPressCommentButton();
    }, [interactionsEnabled, onPressCommentButton]);

    const pressShare = useCallback(() => {
        if (typeof onPressShareButton !== 'function') return;
        if (!interactionsEnabled) {
            onPressShareButton();
            return;
        }
        onPressShareButton();
    }, [interactionsEnabled, onPressShareButton]);

    const handleTapAt = useCallback((absoluteX, absoluteY) => {
        if (!interactionsEnabled) return false;
        const tolerance = scaleSize(8);

        const buttons = [
            { key: 'like', handler: handlePressLikeButton },
            { key: 'comment', handler: pressComment },
            { key: 'share', handler: pressShare },
            { key: 'save', handler: handlePressSaveButton },
        ];

        let handled = false;

        buttons.forEach(({ key, handler }) => {
            if (handled || typeof handler !== 'function') return;
            if (key === 'share' && typeof onPressShareButton !== 'function') return;

            const node = buttonRefs.current[key];
            if (!node) return;

            const measure = node.measureInWindow
                ? node.measureInWindow.bind(node)
                : node.measure?.bind(node);

            if (!measure) return;

            measure((x, y, width, height) => {
                if (handled) return;
                if (!Number.isFinite(x) || !Number.isFinite(y)) return;

                const withinX = absoluteX >= x - tolerance && absoluteX <= x + (width || 0) + tolerance;
                const withinY = absoluteY >= y - tolerance && absoluteY <= y + (height || 0) + tolerance;
                if (!withinX || !withinY) return;

                handled = true;
                handler();
            });
        });
        return handled;
    }, [handlePressLikeButton, handlePressSaveButton, interactionsEnabled, onPressShareButton, pressComment, pressShare]);

    return {
        isLiked,
        isSaved,
        ensureLike,
        assignButtonRef,
        handlePressLikeButton,
        handlePressSaveButton,
        pressComment,
        pressShare,
        handleTapAt,
    };
}
