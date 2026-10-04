import scaleSize from "./scaleSize";
// Function to determine the styles based on screen size
export const getFeedHeaderStyles = (width, height) => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            iconSize: 26,
            paddingHorizontal: scaleSize(33),
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            iconSize: 24,
            paddingHorizontal: scaleSize(31),
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            iconSize: 22,
            paddingHorizontal: scaleSize(23),
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            iconSize: 20,
            paddingHorizontal: scaleSize(18),
        };
    }
};