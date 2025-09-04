import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

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
    const rootState = navigationRef.getRootState?.() || navigationRef.getState?.();
    if (!rootState) return false;

    // Find existing Tabs route in the root stack
    const tabsIndex = (rootState.routes || []).findIndex(r => r.name === 'Tabs');
    const tabsRoute = rootState.routes?.[tabsIndex];
    if (!tabsRoute) {
      // fallback: just navigate which will mount Tabs once
      navigationRef.navigate('Tabs', { screen: tabName, params });
      return true;
    }

    // Derive next tab state focusing requested tab; preserve route keys to prevent remounts
    const tabsState = tabsRoute.state;
    if (!tabsState || !Array.isArray(tabsState.routes)) {
      // Tabs not initialized yet; simple navigate
      navigationRef.navigate('Tabs', { screen: tabName, params });
      return true;
    }

    const targetIdx = tabsState.routes.findIndex(r => r.name === tabName);
    if (targetIdx < 0) {
      navigationRef.navigate('Tabs', { screen: tabName, params });
      return true;
    }

    // Merge params into target tab without changing keys
    const nextTabRoutes = tabsState.routes.map((r, i) => (
      i === targetIdx ? { ...r, params: { ...(r.params || {}), ...(params || {}) } } : r
    ));

    const nextTabsState = { ...tabsState, index: targetIdx, routes: nextTabRoutes };

    // Build a new root state that keeps the same Tabs route key but drops overlays above it
    const nextRoutes = [{ ...tabsRoute, params: { ...(tabsRoute.params || {}), transition: 'none' }, state: nextTabsState }];
    const nextState = { index: 0, routes: nextRoutes }; // minimal reset payload

    navigationRef.dispatch(CommonActions.reset(nextState));
    return true;
  } catch {
    return false;
  }
};
