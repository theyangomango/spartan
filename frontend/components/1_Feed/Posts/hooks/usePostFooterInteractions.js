import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { strong as haptic } from '../../../../utils/haptics';

import updateDoc from '../../../../../backend/helper/firebase/updateDoc';
import arrayAppend from '../../../../../backend/helper/firebase/arrayAppend';
import arrayErase from '../../../../../backend/helper/firebase/arrayErase';
import scaleSize from '../../../../helper/scaleSize';
import { getViewerUid } from '../../../../utils/userRefs';
import { subscribeUserData } from '../../../../utils/userDataEvents';
import { bumpAffinityForUser, logFeedSignal } from '../../../../helper/feedSignals';

const DOUBLE_TAP_GUARD_MS = 300;

/**
 * Encapsulates the business logic for the post footer: like/save mutations,
 * derived state, and cross-component hit testing for overlay taps.
 */
export default function usePostFooterInteractions({ data, onPressCommentButton, onPressShareButton }) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [viewer, setViewer] = useState(() => {
        try {
            const base = global?.userData && typeof global.userData === 'object'
                ? { ...global.userData }
                : {};
            const uid = getViewerUid();
            if (uid) base.uid = uid;
            return base || {};
        } catch {
            const fallbackUid = getViewerUid();
            return fallbackUid ? { uid: fallbackUid } : {};
        }
    });

    const buttonRefs = useRef({});
    const lastLikeToggleRef = useRef(0);

    const interactionsEnabled = !!data?.pid && !String(data.pid).startsWith('workout:');

    useEffect(() => {
        const capture = () => {
            try {
                const base = global?.userData && typeof global.userData === 'object'
                    ? { ...global.userData }
                    : {};
                const uid = getViewerUid();
                if (uid) base.uid = String(uid);
                setViewer((prev) => {
                    if (!uid && !prev?.uid) {
                        return { ...base };
                    }
                    if (uid && String(uid) === String(prev?.uid || '')) {
                        // Preserve reference if shallow equal to avoid needless rerenders
                        const same =
                            Object.keys(base).length === 0
                                ? Object.keys(prev || {}).length === 0
                                : Object.entries(base).every(([key, value]) => prev?.[key] === value);
                        return same ? prev : { ...base };
                    }
                    return { ...base };
                });
            } catch {
                const fallbackUid = getViewerUid();
                setViewer(fallbackUid ? { uid: fallbackUid } : {});
            }
        };

        capture();
        const unsubscribe = subscribeUserData(() => capture());
        return () => {
            try { unsubscribe?.(); } catch { }
        };
    }, []);

    const viewerUid = useMemo(() => {
        if (viewer?.uid) return String(viewer.uid);
        const uid = getViewerUid();
        return uid ? String(uid) : '';
    }, [viewer?.uid]);

    // Initialise like/save state once user data is available.
    useEffect(() => {
        const uid = viewerUid;
        if (!uid || !interactionsEnabled) {
            setIsLiked(false);
            setIsSaved(false);
            return;
        }

        try {
            setIsLiked(Array.isArray(data?.likes) && data.likes.some((item) => item?.uid === uid));
            const savedPosts = Array.isArray(viewer?.savedPosts) ? viewer.savedPosts : [];
            setIsSaved(savedPosts.includes(data?.pid));
        } catch {
            setIsLiked(false);
            setIsSaved(false);
        }
    }, [data?.likes, data?.pid, viewerUid, viewer?.savedPosts, interactionsEnabled]);

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

        const user = viewer && typeof viewer === 'object' ? viewer : {};
        const uid = user?.uid || viewerUid;
        if (!uid) {
            Alert?.alert?.('Oops', 'Please log in to like posts.');
            return;
        }

        try { haptic(); } catch {}

        const safePostOwnerUid = data?.uid ? String(data.uid) : data?.creatorUid ? String(data.creatorUid) : "";

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
                    const hasUser = likesArray.some((item) => item?.uid === uid);

                    if (!hasUser) {
                        const updatedLikes = [
                            ...likesArray,
                            {
                                uid,
                                handle: user.handle ?? '',
                                name: user.name ?? '',
                                pfp: user.image ?? user.pfp ?? user.pfpUrl ?? user.photoURL ?? '',
                                pfpVersion: user.pfpVersion ?? user.pfpVer ?? 0,
                            },
                        ];
                        data.likes = updatedLikes;
                        data.likeCount = likeCount + 1;
                        updateDoc('posts', data.pid, { likeCount: data.likeCount, likes: updatedLikes });
                    }
                } else {
                    const likesArray = Array.isArray(data.likes) ? data.likes : [];
                    const updatedLikes = likesArray.filter((item) => item?.uid !== uid);

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

            if (data?.pid) {
                logFeedSignal(nextLiked ? 'like_post' : 'unlike_post', {
                    pid: data.pid,
                    ownerUid: safePostOwnerUid || data?.uid,
                });
                if (safePostOwnerUid) {
                    bumpAffinityForUser(safePostOwnerUid, 'likesPast7dByUid', nextLiked ? 1 : -1);
                }
            }

            lastLikeToggleRef.current = now;
            return nextLiked;
        });
    }, [data, interactionsEnabled, viewer, viewerUid]);

    const ensureLike = useCallback(() => {
        if (!interactionsEnabled) return;
        if (!isLiked) handlePressLikeButton();
    }, [handlePressLikeButton, interactionsEnabled, isLiked]);

    const handlePressSaveButton = useCallback(() => {
        if (!interactionsEnabled) return;

        const user = viewer && typeof viewer === 'object' ? viewer : {};
        const uid = user?.uid || viewerUid;
        if (!uid) {
            Alert?.alert?.('Oops', 'Please log in to save posts.');
            return;
        }

        try {
            if (isSaved) {
                arrayErase('usersPrivate', uid, 'savedPosts', data.pid);
            } else {
                arrayAppend('usersPrivate', uid, 'savedPosts', data.pid);
            }
        } catch (error) {
            console.warn('Failed to toggle saved post', error);
        }

        const safePostOwnerUid = data?.uid ? String(data.uid) : data?.creatorUid ? String(data.creatorUid) : "";
        if (data?.pid) {
            logFeedSignal(isSaved ? 'unsave_post' : 'save_post', {
                pid: data.pid,
                ownerUid: safePostOwnerUid || data?.uid,
            });
            if (safePostOwnerUid) {
                bumpAffinityForUser(safePostOwnerUid, 'savedPostsByUid', isSaved ? -1 : 1);
            }
        }

        try { haptic(); } catch {}
        setIsSaved((prev) => !prev);
    }, [data?.pid, data?.uid, data?.creatorUid, interactionsEnabled, isSaved, viewer, viewerUid]);

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
