const GLOBAL_KEY = "__userDataSubscribers";

const getSet = () => {
    try {
        if (!global[GLOBAL_KEY]) {
            Object.defineProperty(global, GLOBAL_KEY, {
                value: new Set(),
                configurable: true,
                enumerable: false,
                writable: false,
            });
        }
        return global[GLOBAL_KEY];
    } catch {
        return null;
    }
};

export const emitUserDataUpdate = () => {
    const set = getSet();
    if (!set) return;
    const payload = (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    set.forEach((listener) => {
        try { listener(payload); } catch { }
    });
};

export const subscribeUserData = (listener) => {
    if (typeof listener !== "function") return () => {};
    const set = getSet();
    if (!set) return () => {};
    set.add(listener);
    try { listener(global?.userData || null); } catch { listener(null); }
    return () => {
        const collection = getSet();
        if (!collection) return;
        collection.delete(listener);
    };
};

export default {
    emitUserDataUpdate,
    subscribeUserData,
};

