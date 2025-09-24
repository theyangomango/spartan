import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  runOnJS,
  withTiming,
  withDelay,
  Easing as ReEasing,
} from 'react-native-reanimated';

const PROGRESS_POWER = 1.15;
const CLOSE_THRESHOLD = 0.28;
const REOPEN_THRESHOLD = 0.12;
const MIN_DISTANCE_PX = 80;
const VELOCITY_THRESHOLD = -350;

export default function useFeedUnfocusGesture({
  height,
  isSomePostFocused,
  isTransitioningSV,
  panEnabledSV,
  setUnfocusGestureActive,
  isUnfocusingRef,
  interactiveProgressSV,
  focusBaseSV,
  interTranslateSV,
  focusTranslateSV,
  syncFocusOffsetJS,
  suspendInteractiveAlignment,
  resumeInteractiveAlignment,
  focusHide,
  headerH,
  signalCommentsCollapse,
  signalCommentsReopen,
  handleBackPress,
  clearUnfocusFlagsJS,
  focusAnimationDuration,
  INTERACTIVE_CANCEL_MS,
  INTERACTIVE_LOCKOUT_MS,
  COMMENTS_COLLAPSE_MIN_PX,
  COMMENTS_REOPEN_MAX_PX,
}) {
  const commentsHiddenSV = useSharedValue(0);
  const peakDragUpSV = useSharedValue(0);

  const panUnfocus = useMemo(() => {
    const commitInteractiveOffset = () => {
      'worklet';
      const base = focusBaseSV.value || 0;
      const overlay = interTranslateSV.value || 0;
      const combined = base + overlay;
      focusBaseSV.value = combined;
      focusTranslateSV.value = combined;
      interTranslateSV.value = 0;
      if (syncFocusOffsetJS) runOnJS(syncFocusOffsetJS)(combined);
      return combined;
    };

    return Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .failOffsetX([-12, 12])
      .activeOffsetY([-4, 4])
      .shouldCancelWhenOutside(false)
      .cancelsTouchesInView(false)
      .hitSlop({ top: height, bottom: height, left: 0, right: 0 })
      .enabled(!!isSomePostFocused)
      .onBegin(() => {
        if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) return;
        isUnfocusingRef.current = true;
        runOnJS(setUnfocusGestureActive)(true);
        if (suspendInteractiveAlignment) runOnJS(suspendInteractiveAlignment)();
        interactiveProgressSV.value = 0;
        commentsHiddenSV.value = 1;
        peakDragUpSV.value = 0;
        interTranslateSV.value = 0;
        runOnJS(signalCommentsCollapse)();
      })
      .onUpdate((event) => {
        if (isTransitioningSV.value === 1 || panEnabledSV.value === 0 || !isSomePostFocused) return;
        const translationY = Math.min(0, event.translationY);
        const dragUp = -translationY;
        if (dragUp > peakDragUpSV.value) {
          peakDragUpSV.value = dragUp;
        }
        const baseDistance = Math.max(MIN_DISTANCE_PX, Math.abs(focusBaseSV.value || 0));
        let progress = dragUp / baseDistance;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        const eased = Math.pow(progress, PROGRESS_POWER);
        interactiveProgressSV.value = eased;

        const base = focusBaseSV.value || 0;
        interTranslateSV.value = -base * eased;

        const headerHeight = headerH.value || 0;
        if (headerHeight > 0) {
          focusHide.value = Math.max(0, headerHeight * (1 - eased));
        }

        const collapseThresholdPx = Math.max(COMMENTS_COLLAPSE_MIN_PX, CLOSE_THRESHOLD * baseDistance);
        const shouldCollapse = dragUp > collapseThresholdPx;
        const reopenByDistance = dragUp < COMMENTS_REOPEN_MAX_PX;
        if (commentsHiddenSV.value === 0 && (progress > CLOSE_THRESHOLD || shouldCollapse)) {
          commentsHiddenSV.value = 1;
          runOnJS(signalCommentsCollapse)();
        } else if (commentsHiddenSV.value === 1 && progress < REOPEN_THRESHOLD && reopenByDistance) {
          commentsHiddenSV.value = 0;
          runOnJS(signalCommentsReopen)();
        }
      })
      .onEnd((event) => {
        if (!isSomePostFocused) return;
        const base = focusBaseSV.value || 0;
        const baseMagnitude = Math.abs(base);
        const baseDistance = Math.max(MIN_DISTANCE_PX, baseMagnitude);

        const measuredDrag = Math.max(0, -event.translationY);
        const peakDrag = peakDragUpSV.value || 0;
        const velocityClose = (event.velocityY || 0) < VELOCITY_THRESHOLD;
        const dragUp = velocityClose && peakDrag > measuredDrag ? peakDrag : measuredDrag;

        let progress = baseDistance === 0 ? 0 : dragUp / baseDistance;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        const eased = Math.max(interactiveProgressSV.value, Math.pow(progress, PROGRESS_POWER));
        if (baseMagnitude > 0) {
          const overlay = Math.sign(-base) * Math.min(baseMagnitude, baseMagnitude * eased);
          interTranslateSV.value = overlay;
        }

        const shouldClose = eased > CLOSE_THRESHOLD || velocityClose;

        if (shouldClose) {
          focusHide.value = withTiming(0, {
            duration: focusAnimationDuration,
            easing: ReEasing.out(ReEasing.cubic),
          });
          interactiveProgressSV.value = withTiming(1, {
            duration: focusAnimationDuration,
            easing: ReEasing.out(ReEasing.cubic),
          });
          commentsHiddenSV.value = 1;
          runOnJS(setUnfocusGestureActive)(false);
          commitInteractiveOffset();
          runOnJS(handleBackPress)('gesture');
          if (resumeInteractiveAlignment) runOnJS(resumeInteractiveAlignment)();
          peakDragUpSV.value = 0;
          return;
        }

        const headerHeight = headerH.value || 0;
        if (headerHeight > 0) {
          focusHide.value = withTiming(headerHeight, {
            duration: INTERACTIVE_CANCEL_MS,
            easing: ReEasing.out(ReEasing.cubic),
          });
        }
        interTranslateSV.value = withTiming(0, {
          duration: INTERACTIVE_CANCEL_MS,
          easing: ReEasing.out(ReEasing.cubic),
        });
        interactiveProgressSV.value = withTiming(0, {
          duration: INTERACTIVE_CANCEL_MS,
          easing: ReEasing.out(ReEasing.cubic),
        }, () => {
          runOnJS(clearUnfocusFlagsJS)();
          runOnJS(setUnfocusGestureActive)(false);
        });
        commentsHiddenSV.value = 0;
        runOnJS(signalCommentsReopen)();
        panEnabledSV.value = withDelay(
          INTERACTIVE_LOCKOUT_MS,
          withTiming(1, { duration: 0 })
        );
        peakDragUpSV.value = 0;
      })
      .onFinalize(() => {
        peakDragUpSV.value = 0;
        if (resumeInteractiveAlignment) runOnJS(resumeInteractiveAlignment)();
      });
  }, [
    height,
    isSomePostFocused,
    isTransitioningSV,
    panEnabledSV,
    setUnfocusGestureActive,
    isUnfocusingRef,
    interactiveProgressSV,
    focusBaseSV,
    focusHide,
    headerH,
    signalCommentsCollapse,
    signalCommentsReopen,
    handleBackPress,
    interTranslateSV,
    focusTranslateSV,
    syncFocusOffsetJS,
    suspendInteractiveAlignment,
    resumeInteractiveAlignment,
    clearUnfocusFlagsJS,
    focusAnimationDuration,
    INTERACTIVE_CANCEL_MS,
    INTERACTIVE_LOCKOUT_MS,
    COMMENTS_COLLAPSE_MIN_PX,
    COMMENTS_REOPEN_MAX_PX,
  ]);

  return { panUnfocus };
}
