import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import StatKeyboardOverlay from "./StatKeyboardOverlay";

const StatKeyboardContext = createContext(null);

let externalCollapseKeyboard = null;
let externalIsKeyboardActive = () => false;

export const dismissStatKeyboard = () => {
    if (typeof externalCollapseKeyboard === "function") {
        try { externalCollapseKeyboard(); } catch { }
    }
};

export const isStatKeyboardActive = () => {
    try {
        return !!externalIsKeyboardActive();
    } catch {
        return false;
    }
};

export const useStatKeyboard = () => useContext(StatKeyboardContext);

const MAX_REGISTERED = 400;

export function StatKeyboardProvider({ children }) {
    const inputsRef = useRef(new Map());
    const orderRef = useRef([]);
    const activeIdRef = useRef(null);
    const [activeId, setActiveId] = useState(null);

    const pendingClearIdRef = useRef(null);
    const pendingClearTimeoutRef = useRef(null);

    const cancelPendingClear = useCallback(() => {
        if (pendingClearTimeoutRef.current) {
            clearTimeout(pendingClearTimeoutRef.current);
            pendingClearTimeoutRef.current = null;
            pendingClearIdRef.current = null;
        }
    }, []);

    const callActive = useCallback((method, ...args) => {
        const id = activeIdRef.current;
        if (!id) return null;
        const handlers = inputsRef.current.get(id);
        if (!handlers || typeof handlers[method] !== "function") return null;
        return handlers[method](...args);
    }, []);

    const setActiveInput = useCallback((id) => {
        if (pendingClearIdRef.current && pendingClearTimeoutRef.current) {
            cancelPendingClear();
        }
        if (activeIdRef.current !== id) {
            activeIdRef.current = id;
            setActiveId(id);
        }
    }, [callActive, cancelPendingClear]);

    const clearActiveInput = useCallback((id) => {
        if (id && activeIdRef.current !== id) {
            return;
        }
        const prev = activeIdRef.current;
        const handlers = prev ? inputsRef.current.get(prev) : null;
        if (handlers && typeof handlers.forceBlur === "function") {
            try { handlers.forceBlur(); } catch {}
        }
        activeIdRef.current = null;
        setActiveId(null);
    }, []);

    const requestClearActiveInput = useCallback((id) => {
        cancelPendingClear();
        pendingClearIdRef.current = id;
        pendingClearTimeoutRef.current = setTimeout(() => {
            pendingClearTimeoutRef.current = null;
            const active = activeIdRef.current;
            if (!active) {
                clearActiveInput(undefined);
                return;
            }
            if (id && active === id) {
                return;
            }
            if (!id || active !== id) {
                clearActiveInput(id);
            }
        }, 40);
    }, [cancelPendingClear, clearActiveInput]);

    const focusNext = useCallback(() => {
        const order = orderRef.current;
        if (!order.length) return;
        const id = activeIdRef.current;
        if (!id) return;
        const idx = order.indexOf(id);
        if (idx < 0) return;

        if (order.length === 1 || idx === order.length - 1) {
            clearActiveInput(id);
            return;
        }

        const nextId = order[idx + 1];
        const handler = inputsRef.current.get(nextId);
        if (handler && typeof handler.focus === "function") {
            handler.focus();
        }
    }, [clearActiveInput]);

    const registerInput = useCallback((id, handlers) => {
        if (!id || typeof id !== "string") return () => {};
        if (inputsRef.current.size > MAX_REGISTERED) {
            inputsRef.current.clear();
            orderRef.current = [];
        }
        inputsRef.current.set(id, handlers);
        orderRef.current = [...orderRef.current.filter((x) => x !== id), id];
        return () => {
            inputsRef.current.delete(id);
            orderRef.current = orderRef.current.filter((x) => x !== id);
            if (activeIdRef.current === id) {
                requestClearActiveInput(id);
            }
        };
    }, [requestClearActiveInput]);

    const collapseKeyboard = useCallback(() => {
        cancelPendingClear();
        const current = activeIdRef.current;
        if (current) {
            clearActiveInput(current);
        } else {
            clearActiveInput(undefined);
        }
    }, [cancelPendingClear, clearActiveInput]);

    const contextValue = useMemo(() => ({
        registerInput,
        setActiveInput,
        clearActiveInput,
        requestClearActiveInput,
        getHandlers: (id) => (id ? inputsRef.current.get(id) || null : null),
        focusNext,
        activeId,
        collapseKeyboard,
    }), [
        registerInput,
        setActiveInput,
        clearActiveInput,
        requestClearActiveInput,
        focusNext,
        activeId,
        collapseKeyboard,
    ]);

    useEffect(() => {
        const collapse = () => collapseKeyboard();
        const isActive = () => !!activeIdRef.current;
        externalCollapseKeyboard = collapse;
        externalIsKeyboardActive = isActive;
        return () => {
            if (externalCollapseKeyboard === collapse) {
                externalCollapseKeyboard = null;
            }
            if (externalIsKeyboardActive === isActive) {
                externalIsKeyboardActive = () => false;
            }
        };
    }, [collapseKeyboard]);

    const visible = !!activeId;

    return (
        <StatKeyboardContext.Provider value={contextValue}>
            <View style={{ flex: 1 }}>
                {children}
                <StatKeyboardOverlay
                    visible={visible}
                    onPressDigit={(digit) => callActive("appendChar", digit)}
                    onPressDecimal={() => callActive("addDecimal")}
                    onBackspace={() => callActive("backspace")}
                    onIncrement={() => callActive("increment")}
                    onDecrement={() => callActive("decrement")}
                    onNext={focusNext}
                    onCollapse={collapseKeyboard}
                />
            </View>
        </StatKeyboardContext.Provider>
    );
}
