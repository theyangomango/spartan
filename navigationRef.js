import { createNavigationContainerRef, CommonActions, TabActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const navigateRoot = (name, params) => {
  try {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
      return true;
    }
  } catch {}
  return false;
};

// Navigate to the universal one-way overlay with a target screen
// Usage:
//   navigateOneWay('MacroTracking', 'slide-from-left', { some: 'param' })
//   navigateOneWay('Competition', { animation: 'fade', params: {...} })
export const navigateOneWay = (target, animationOrOptions, maybeParams) => {
  const options = typeof animationOrOptions === 'string'
    ? { animation: animationOrOptions, params: maybeParams }
    : (animationOrOptions || {});

  const payload = {
    target,
    params: options.params,
    // normalize animation token; we pass via route params as `transition`
    transition: options.animation || options.transition || 'slide-from-right',
  };

  try {
    if (navigationRef.isReady()) {
      // Navigate directly to the target screen on the root stack
      navigationRef.navigate(target, { ...(payload.params || {}), transition: payload.transition });
      return true;
    }
  } catch {}
  return false;
};

// Jump to an existing Tabs route without remounting it and focus a tab.
// Avoids reverse animations and keeps tab screens alive.
export const jumpToTab = (tabName, params) => {
  try {
    if (!navigationRef.isReady()) return false;
    navigationRef.navigate('Tabs', { screen: tabName, params });
    return true;
  } catch {
    return false;
  }
};
