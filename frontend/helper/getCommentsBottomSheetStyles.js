/**
 * Calculates the styles of Comments Bottom Sheet based on screen dimensions
 * @param width - screen width
 * @param height - screen height
 * @return styles object
 */

export const getCommentsBottomSheetStyles = (width, height) => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            inputFontSize: 15,
            inputPaddingVertical: 8,
            inputHeight: 55,
            pfpSize: 40,
            sendButtonSize: 19,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            inputFontSize: 14,
            inputPaddingVertical: 7,
            inputHeight: 52,
            pfpSize: 37,
            sendButtonSize: 18,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            inputFontSize: 13.5,
            inputPaddingVertical: 7,
            inputHeight: 50,
            pfpSize: 35,
            sendButtonSize: 17.5,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            inputFontSize: 13,
            inputPaddingVertical: 6,
            inputHeight: 48,
            pfpSize: 33,
            sendButtonSize: 17,
        };
    }
};