import { createNavigationContainerRef } from '@react-navigation/native';

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

