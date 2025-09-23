import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
    useSharedValue,
    runOnJS,
    withTiming,
    withSpring,
    withDelay,
    Easing as ReEasing,
} from 'react-native-reanimated';

const PROGRESS_SLOW_K = 1.2;
const CLOSE_THRESHOLD = 0.1;
const REOPEN_THRESHOLD = 0.06;

/**
 * Creates the interactive pan gesture used to unfocus a post.
 * Returns the gesture along with the shared value tracking comment sheet visibility.
 */
export default function useFeedUnfocusGesture({
    height,
    isSomePostFocused,
    isTransitioningSV,
    panEnabledSV,
    suspendInteractiveAlignment,
    setUnfocusGestureActive,
    isUnfocusingRef,
    interactiveProgressSV,
    interTranslateSV,
    focusBaseSV,
    focusTranslateSV,
    focusOffsetRef,
    focusHide,
    storiesOpacitySV,
    headerH,
    signalCommentsCollapse,
    signalCommentsReopen,
    handleBackPress,
    clearUnfocusFlagsJS,
    FOCUS_SPRING_CONFIG,
    ANIMATION_DURATION,
    INTERACTIVE_CANCEL_MS,
    INTERACTIVE_CANCEL_FADE_MS,
    INTERACTIVE_LOCKOUT_MS,
    COMMENTS_COLLAPSE_MIN_PX,
    COMMENTS_REOPEN_MAX_PX,
}) {
    const commentsHiddenSV = useSharedValue(0);

    const panUnfocus = useMemo(() => {
        return Gesture.Pan()
            .minPointers(1)
            .maxPointers(1)
            .failOffsetX([-12, 12])
            .activeOffsetY([-4, 4])
            .hitSlop({ top: height, bottom: height, left: 0, right: 0 })
            .shouldCancelWhenOutside(false)
            .cancelsTouchesInView(false)
            .enabled(!!isSomePostFocused)
            .simultaneousWithExternalGesture(Gesture.Native())
            .onBegin(() => {
                if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) {
                    return;
                }
                runOnJS(suspendInteractiveAlignment)();
                isUnfocusingRef.current = true;
                runOnJS(setUnfocusGestureActive)(true);
                interactiveProgressSV.value = 0;
                interTranslateSV.value = 0;
                commentsHiddenSV.value = 1;
                runOnJS(signalCommentsCollapse)();
            })
            .onUpdate((event) => {
                if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) return;
                if (!isSomePostFocused) return;

                const translationY = Math.min(0, event.translationY);
                const dragUp = -translationY;
                const base = focusBaseSV.value || 0;
                const distanceToZero = Math.max(1, Math.abs(base));

                let progressNorm = dragUp / distanceToZero;
                if (progressNorm < 0) progressNorm = 0;
                if (progressNorm > 1) progressNorm = 1;

                const eased = Math.pow(progressNorm, PROGRESS_SLOW_K);
                interactiveProgressSV.value = eased;

                const collapseThresholdPx = Math.max(COMMENTS_COLLAPSE_MIN_PX, CLOSE_THRESHOLD * distanceToZero);
                const shouldCollapse = dragUp > collapseThresholdPx;
                const shouldReopenByDistance = dragUp < COMMENTS_REOPEN_MAX_PX;

                if (commentsHiddenSV.value === 0 && (progressNorm > CLOSE_THRESHOLD || shouldCollapse)) {
                    commentsHiddenSV.value = 1;
                    runOnJS(signalCommentsCollapse)();
                } else if (commentsHiddenSV.value === 1 && progressNorm < REOPEN_THRESHOLD && shouldReopenByDistance) {
                    commentsHiddenSV.value = 0;
                    runOnJS(signalCommentsReopen)();
                }

                const headerHeight = headerH.value || 0;
                focusHide.value = Math.max(0, headerHeight * (1 - eased));
                storiesOpacitySV.value = eased;

                const direction = base < 0 ? 1 : -1;
                const clampedDrag = Math.min(dragUp, Math.abs(base));
                interTranslateSV.value = direction * clampedDrag;
            })
            .onEnd((event) => {
                if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) return;
                if (!isSomePostFocused) return;

                const translationY = Math.min(0, event.translationY);
                const dragUp = -translationY;
                const base = focusBaseSV.value || 0;
                const distanceToZero = Math.max(1, Math.abs(base));

                let progressNorm = dragUp / distanceToZero;
                if (progressNorm < 0) progressNorm = 0;
                if (progressNorm > 1) progressNorm = 1;

                const shouldClose = progressNorm > CLOSE_THRESHOLD || (event.velocityY || 0) < -350;

                const interMag = Math.min(dragUp, Math.abs(base));
                const direction = base < 0 ? 1 : -1;
                const combined = base + direction * interMag;
                const startValue = Math.abs(combined) < 0.5 ? 0 : combined;

                focusTranslateSV.value = startValue;
                interTranslateSV.value = 0;

                panEnabledSV.value = 0;

                if (shouldClose) {
                    focusBaseSV.value = startValue;
                    focusOffsetRef.current = startValue;
                    runOnJS(signalCommentsCollapse)();

                    focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                    interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                    storiesOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                    focusTranslateSV.value = startValue;
                    focusTranslateSV.value = withSpring(0, FOCUS_SPRING_CONFIG);

                    runOnJS(handleBackPress)('gesture');
                } else {
                    focusHide.value = withTiming(headerH.value, { duration: INTERACTIVE_CANCEL_MS, easing: ReEasing.out(ReEasing.cubic) });
                    interactiveProgressSV.value = withTiming(0, { duration: INTERACTIVE_CANCEL_MS, easing: ReEasing.out(ReEasing.cubic) });
                    interTranslateSV.value = withTiming(0, { duration: INTERACTIVE_CANCEL_MS, easing: ReEasing.out(ReEasing.cubic) });
                    storiesOpacitySV.value = withTiming(0, { duration: INTERACTIVE_CANCEL_FADE_MS, easing: ReEasing.out(ReEasing.cubic) });
                    focusTranslateSV.value = withSpring(focusBaseSV.value, FOCUS_SPRING_CONFIG);

                    runOnJS(clearUnfocusFlagsJS)();
                    runOnJS(signalCommentsReopen)();
                    commentsHiddenSV.value = 0;
                    panEnabledSV.value = withDelay(INTERACTIVE_LOCKOUT_MS, withTiming(1, { duration: 0 }));
                }
            });
    }, [
        height,
        isSomePostFocused,
        isTransitioningSV,
        panEnabledSV,
        suspendInteractiveAlignment,
        setUnfocusGestureActive,
        isUnfocusingRef,
        interactiveProgressSV,
        interTranslateSV,
        focusBaseSV,
        focusTranslateSV,
        focusOffsetRef,
        focusHide,
        storiesOpacitySV,
        headerH,
        signalCommentsCollapse,
        signalCommentsReopen,
        handleBackPress,
        clearUnfocusFlagsJS,
        FOCUS_SPRING_CONFIG,
        ANIMATION_DURATION,
        INTERACTIVE_CANCEL_MS,
        INTERACTIVE_CANCEL_FADE_MS,
        INTERACTIVE_LOCKOUT_MS,
        COMMENTS_COLLAPSE_MIN_PX,
        COMMENTS_REOPEN_MAX_PX,
    ]);

    return { panUnfocus, commentsHiddenSV };
}
