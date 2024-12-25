// Function to determine the styles based on screen size
export const getFeedHeaderStyles = (width, height) => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            logoTextFontSize: 20,
            iconSize: 26,
            paddingHorizontal: 35,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            logoTextFontSize: 17,
            iconSize: 24,
            paddingHorizontal: 30,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            logoTextFontSize: 16,
            iconSize: 22,
            paddingHorizontal: 25,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            logoTextFontSize: 14,
            iconSize: 20,
            paddingHorizontal: 20,
        };
    }
};