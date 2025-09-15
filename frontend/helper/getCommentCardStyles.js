/**
 * Calculates the styles of Comment Card based on screen dimensions
 * @param width - screen width
 * @param height - screen height
 * @return styles object
 */

import scaleSize, { BASE_HEIGHT, BASE_WIDTH } from './scaleSize';

export const getCommentCardStyles = (width, height) => {
    const s = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    const sc = (n) => Math.round(n * s);
    return {
        pfpSize: sc(38),
        fontSize: scaleSize(sc(14)),
        replyButtonWidth: sc(75),
        heartIconSize: sc(18.5),
        likeCountFontSize: sc(10),
        likeCountBottom: -sc(3),
        replyFontSize: sc(12.5),
    };
};
