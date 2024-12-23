/**
 * Calculates the styles of Post Footer based on screen dimensions
 * @param width - screen width
 * @param height - screen height
 * @return styles object
 */

export const getPostFooterStyles = (width, height) => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            buttonPaddingHorizontal: 14,
            buttonPaddingVertical: 14,
            fontSize: 13,
            iconSize: 26,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            buttonPaddingHorizontal: 12,
            buttonPaddingVertical: 12,
            fontSize: 12,
            iconSize: 24,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            buttonPaddingHorizontal: 11,
            buttonPaddingVertical: 11,
            fontSize: 11.5,
            iconSize: 22,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            buttonPaddingHorizontal: 10,
            buttonPaddingVertical: 10,
            fontSize: 11,
            iconSize: 21,
        };
    }
};