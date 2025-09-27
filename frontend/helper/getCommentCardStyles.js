/**
 * Calculates commonly reused CommentCard measurements using scaleSize.
 */

import scaleSize from './scaleSize';

export const getCommentCardStyles = () => ({
    pfpSize: scaleSize(38),
    fontSize: scaleSize(14),
    timeFontSize: scaleSize(13),
    replyButtonWidth: scaleSize(75),
    heartIconSize: scaleSize(18.5),
    likeCountFontSize: scaleSize(10),
    likeCountBottom: scaleSize(-3),
    replyFontSize: scaleSize(12.5),
});
