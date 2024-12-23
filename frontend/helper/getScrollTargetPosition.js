/**
 * Calculates the target y-position applied to a post's scroll when it is focused.
 * @param width - screen width
 * @param height - screen height
 * @return y-value of scroll position
 */

export default getScrollTargetPosition = (width, height) => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return 105; 
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return 95; 
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return 90; 
    } else { // Smaller iPhone models (like iPhone SE)
        return 85;
    }
};