import { Dimensions } from 'react-native';

import getScrollTargetPosition from '../../helper/getScrollTargetPosition';

const { width, height } = Dimensions.get('window');

export const WINDOW_WIDTH = width;
export const WINDOW_HEIGHT = height;

export const TARGET_POSITION = getScrollTargetPosition(width, height);
export const FOCUS_ANIMATION_DURATION = 320;
export const INTERACTIVE_START_MS = 220;
export const INTERACTIVE_CANCEL_MS = 300;
export const INTERACTIVE_LOCKOUT_MS = 340;
export const COMMENTS_COLLAPSE_MIN_PX = 28;
export const COMMENTS_REOPEN_MAX_PX = 16;

export const FOCUS_SPRING_CONFIG = {
    damping: 24,
    stiffness: 240,
    mass: 0.9,
    restDisplacementThreshold: 0.15,
    restSpeedThreshold: 0.15,
    overshootClamping: true,
};
