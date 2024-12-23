/**
 * Calculates the styles of Comment Card based on screen dimensions
 * @param width - screen width
 * @param height - screen height
 * @return styles object
 */

export const getCommentCardStyles = (width, height) => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            pfpSize: 42,
            fontSize: 15,
            replyButtonWidth: 80,
            heartIconSize: 20,
            likeCountFontSize: 11,
            likeCountBottom: -3.5,
            replyFontSize: 13,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            pfpSize: 38,
            fontSize: 14,
            replyButtonWidth: 75,
            heartIconSize: 18.5,
            likeCountFontSize: 10,
            likeCountBottom: -3,
            replyFontSize: 12.5,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            pfpSize: 36,
            fontSize: 13.5,
            replyButtonWidth: 72,
            heartIconSize: 18,
            likeCountFontSize: 9.5,
            likeCountBottom: -2.5,
            replyFontSize: 12,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            pfpSize: 34,
            fontSize: 13,
            replyButtonWidth: 70,
            heartIconSize: 17.5,
            likeCountFontSize: 9,
            likeCountBottom: -2,
            replyFontSize: 11.5,
        };
    }
};