const listeners = new Set();

export function onHexagonUpdate(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitHexagonUpdate() {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

export default { onHexagonUpdate, emitHexagonUpdate };

