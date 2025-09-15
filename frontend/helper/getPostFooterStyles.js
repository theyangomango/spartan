/**
 * Calculates the styles of Post Footer based on screen dimensions
 * @param width - screen width
 * @param height - screen height
 * @return styles object
 */

import scaleSize, { BASE_HEIGHT, BASE_WIDTH } from './scaleSize';

export const getPostFooterStyles = (width, height) => {
    const scaleW = width / BASE_WIDTH;
    const scaleH = height / BASE_HEIGHT;
    const s = Math.min(scaleW, scaleH);
    const sc = (n) => Math.round(n * s);
    // Use a balanced baseline and scale uniformly
    return {
        buttonPaddingHorizontal: sc(12),
        buttonPaddingVertical: sc(12),
        fontSize: scaleSize(sc(12)),
        iconSize: sc(24),
    };
};
