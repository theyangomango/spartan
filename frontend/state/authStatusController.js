let controller = null;
let pendingCache = null;

export function registerAuthStatusController(methods = {}) {
  controller = methods || null;
  if (controller && pendingCache) {
    controller.markPendingHandle?.(pendingCache);
  }
  return () => {
    if (controller === methods) {
      controller = null;
    }
  };
}

export function markPendingHandle(payload = {}) {
  pendingCache = payload ? { ...payload } : null;
  if (controller?.markPendingHandle) {
    controller.markPendingHandle(payload);
  }
}

export function clearPendingHandle() {
  pendingCache = null;
  if (controller?.clearPendingHandle) {
    controller.clearPendingHandle();
  }
}

export function refreshAuthStatus() {
  if (controller?.refreshAuthStatus) {
    return controller.refreshAuthStatus();
  }
  return Promise.resolve();
}

export function getPendingHandle() {
  if (controller?.getPendingHandle) {
    return controller.getPendingHandle();
  }
  return pendingCache;
}
