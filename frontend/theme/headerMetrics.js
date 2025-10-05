import { Dimensions } from 'react-native';

import scaleSize from '../helper/scaleSize';
import { getFeedHeaderStyles } from '../helper/getFeedHeaderStyles';

let cachedMetrics = null;

const buildMetrics = () => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
    const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
    const scale = SCREEN_WIDTH / 375;
    const s = (n) => Math.round(n * scale);

    const paddingH = dynamicStyles.paddingHorizontal;
    const paddingTop = scaleSize(4);
    const paddingBottom = s(0);
    const centerH = s(40);
    const marginTop = 0;
    const icon = dynamicStyles.iconSize;
    const iconTop = Math.round((centerH - icon) / 2);
    const iconBox = icon + 6;
    const logoPadTop = Math.max(0, s(0.5));

    const baseHeaderHeight = scaleSize(centerH + paddingTop + paddingBottom);
    const focusedHeaderOffset = scaleSize(6);
    const focusedHeaderHeight = Math.max(
        baseHeaderHeight - focusedHeaderOffset,
        scaleSize(centerH + paddingTop),
    );

    return {
        paddingH,
        paddingTop,
        paddingBottom,
        centerH,
        marginTop,
        iconTop,
        iconBox,
        logoPadTop,
        iconSize: icon,
        baseHeaderHeight,
        focusedHeaderOffset,
        focusedHeaderHeight,
        safeAreaOffset: marginTop + paddingTop,
    };
};

export const getUnifiedHeaderMetrics = () => {
    if (!cachedMetrics) {
        cachedMetrics = buildMetrics();
    }
    return cachedMetrics;
};

export const getUnifiedHeaderSafeAreaOffset = () => getUnifiedHeaderMetrics().safeAreaOffset;
