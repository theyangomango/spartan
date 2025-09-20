import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import updateDoc from '../../../../../backend/helper/firebase/updateDoc';
import arrayAppend from '../../../../../backend/helper/firebase/arrayAppend';
import arrayErase from '../../../../../backend/helper/firebase/arrayErase';
import sendNotification from '../../../../../backend/sendNotification';
import scaleSize from '../../../../helper/scaleSize';

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

    // Initialise like/save state once user data is available.
    useEffect(() => {
        const user = resolveUser();
        const uid = user.uid;
        if (!uid) return;

        try {
            setIsLiked(Array.isArray(data?.likes) && data.likes.some((item) => item?.uid === uid));
            setIsSaved(Array.isArray(user?.savedPosts) && user.savedPosts.includes(data?.pid));
        } catch {
            setIsLiked(false);
            setIsSaved(false);
        }
    }, [data?.likes, data?.pid, global?.userData?.uid, global?.userData?.savedPosts]);

    const assignButtonRef = useCallback((key, node) => {
        if (!key) return;
        if (node) {
            buttonRefs.current[key] = node;
        } else {
            delete buttonRefs.current[key];
        }
    }, []);

    const handlePressLikeButton = useCallback(() => {
        const user = resolveUser();
        if (!user?.uid) {
            Alert?.alert?.('Oops', 'Please log in to like posts.');
            return;
        }

        const nextLiked = !isLiked;
        const likeCount = Number(data.likeCount) || 0;

        try {
            if (nextLiked) {
                const updatedLikes = [...(Array.isArray(data.likes) ? data.likes : []), {
                    uid: user.uid,
                    pfp: user.image,
                }];
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
            } else {
                const updatedLikes = (Array.isArray(data.likes) ? data.likes : []).filter((item) => item?.uid !== user.uid);
                data.likes = updatedLikes;
                data.likeCount = Math.max(0, likeCount - 1);
                updateDoc('posts', data.pid, { likeCount: data.likeCount, likes: updatedLikes });
            }
        } catch (error) {
            console.warn('Failed to update like state', error);
        }

        setIsLiked(nextLiked);
    }, [data, isLiked]);

    const ensureLike = useCallback(() => {
        if (!isLiked) handlePressLikeButton();
    }, [handlePressLikeButton, isLiked]);

    const handlePressSaveButton = useCallback(() => {
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

        setIsSaved((prev) => !prev);
    }, [data?.pid, isSaved]);

    const pressComment = useCallback(() => {
        if (typeof onPressCommentButton === 'function') {
            onPressCommentButton();
        }
    }, [onPressCommentButton]);

    const pressShare = useCallback(() => {
        if (typeof onPressShareButton === 'function') {
            onPressShareButton();
        }
    }, [onPressShareButton]);

    const handleTapAt = useCallback((absoluteX, absoluteY) => {
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
    }, [handlePressLikeButton, handlePressSaveButton, onPressShareButton, pressComment, pressShare]);

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
