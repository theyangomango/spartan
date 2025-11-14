const LISTENERS_KEY = "__competitionTabListeners";
const PENDING_KEY = "__competitionPendingTab";

const getListenerSet = () => {
    try {
        if (!global[LISTENERS_KEY]) {
            Object.defineProperty(global, LISTENERS_KEY, {
                value: new Set(),
                configurable: true,
                enumerable: false,
                writable: false,
            });
        }
        return global[LISTENERS_KEY];
    } catch {
        return null;
    }
};

const setPendingTab = (value) => {
    try {
        global[PENDING_KEY] = value || null;
    } catch {
        // ignore assignment issues
    }
};

const getPendingTab = () => {
    try {
        return global[PENDING_KEY] || null;
    } catch {
        return null;
    }
};

const normalizeTabKey = (tabKey) => {
    if (typeof tabKey !== "string") return null;
    const trimmed = tabKey.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase();
};

export const requestCompetitionTabFocus = (tabKey) => {
    const normalized = normalizeTabKey(tabKey);
    if (!normalized) return;
    setPendingTab(normalized);
    const listeners = getListenerSet();
    if (!listeners) return;
    listeners.forEach((listener) => {
        try { listener(normalized); } catch { }
    });
};

export const consumePendingCompetitionTab = () => {
    const pending = getPendingTab();
    if (pending) {
        setPendingTab(null);
    }
    return pending;
};

export const clearPendingCompetitionTab = () => {
    setPendingTab(null);
};

export const subscribeCompetitionTabRequests = (listener) => {
    if (typeof listener !== "function") return () => {};
    const listeners = getListenerSet();
    if (!listeners) return () => {};
    listeners.add(listener);
    return () => {
        const current = getListenerSet();
        if (!current) return;
        current.delete(listener);
    };
};

export default {
    requestCompetitionTabFocus,
    consumePendingCompetitionTab,
    clearPendingCompetitionTab,
    subscribeCompetitionTabRequests,
};
