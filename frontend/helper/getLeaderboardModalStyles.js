export const getLeaderboardModalStyles = (width, height) => {
    if (width >= 430 && height >= 932) { // e.g., iPhone 14 Pro Max
        return {
            buttonTextFontSize: 15,
            buttonPaddingHorizontal: 15,
            buttonPaddingVertical: 11,
            buttonMarginHorizontal: 4.5,
        };
    } else if (width >= 390 && height >= 844) { // e.g., iPhone 13/14
        return {
            buttonTextFontSize: 13,
            buttonPaddingHorizontal: 12.5,
            buttonPaddingVertical: 9.5,
            buttonMarginHorizontal: 3.5,
        };
    } else if (width >= 375 && height >= 812) { // e.g., iPhone X/11 Pro
        return {
            buttonTextFontSize: 13.5,
            buttonPaddingHorizontal: 12,
            buttonPaddingVertical: 9.5,
            buttonMarginHorizontal: 3.5,
        };
    } else { // Smaller devices (e.g., iPhone SE)
        return {
            buttonTextFontSize: 12,
            buttonPaddingHorizontal: 11,
            buttonPaddingVertical: 8.5,
            buttonMarginHorizontal: 3,
        };
    }
};