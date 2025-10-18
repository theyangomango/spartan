import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextInput, StyleSheet, Pressable, Platform } from "react-native";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import KeyboardDismissAccessory, { useKeyboardAccessoryId } from "../../../common/KeyboardDismissAccessory";
import workoutTypography from "../../shared/workoutTypography";
import { useStatKeyboard } from "./StatKeyboardContext";

const sanitizeValue = (raw) => {
    if (raw === null || typeof raw === "undefined") return "";
    let text = typeof raw === "number" ? raw.toString() : String(raw);
    if (!text) return "";
    let cleaned = text.replace(/[^0-9.]/g, "");
    if (!cleaned) return "";

    const numericCandidate = parseFloat(cleaned);
    if (Number.isFinite(numericCandidate) && numericCandidate > 999) {
        return "999";
    }

    const hadTrailingDot = cleaned.endsWith(".");
    const parts = cleaned.split(".");
    let whole = parts[0] || "";
    let decimal = parts.slice(1).join("") || "";

    whole = whole.replace(/^0+(?=\d)/, "");
    if (!whole.length) whole = cleaned.startsWith(".") || decimal.length ? "0" : "";

    if (whole.length > 3) {
        whole = whole.slice(0, 3);
    }
    if (decimal.length > 1) {
        decimal = decimal.slice(0, 1);
    }

    let result = whole;
    if (decimal.length > 0) {
        result = `${whole || "0"}.${decimal}`;
    } else if (hadTrailingDot) {
        result = `${whole || "0"}.`;
    }

    if (result === "") return "";
    const numeric = parseFloat(result);
    if (Number.isFinite(numeric) && numeric > 999) return "999";
    return result;
};

const genInputId = () => `stat-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export default function EditableStat({
    placeholder = "",
    isFinished,
    value,
    setValue,
    onFocus,
    previousValue = null,
}) {
    const keyboard = useStatKeyboard();
    const hasCustomKeyboard = !!keyboard;
    const inputId = useMemo(() => genInputId(), []);
    const inputRef = useRef(null);
    const accessoryId = useKeyboardAccessoryId();

    const [isSelected, setIsSelected] = useState(false);
    const forcingBlurRef = useRef(false);

    const displayValue = value == null ? "" : String(value);
    const valueRef = useRef(displayValue);

    const sanitizedPrevious = useMemo(() => sanitizeValue(previousValue), [previousValue]);

    const setValueRef = useRef(setValue);
    useEffect(() => { setValueRef.current = setValue; }, [setValue]);

    const commitValue = useCallback((nextValue) => {
        const sanitized = sanitizeValue(nextValue);
        valueRef.current = sanitized;
        try {
            setValueRef.current?.(sanitized);
        } catch { }
    }, []);

    useEffect(() => {
        valueRef.current = displayValue;
    }, [displayValue]);

    useEffect(() => {
        if (!keyboard || !hasCustomKeyboard) return;
        const unregister = keyboard.registerInput(inputId, {
            focus: () => { try { inputRef.current?.focus?.(); } catch { } },
            appendChar: (char) => {
                if (!char || typeof char !== "string") return;
                if (char === ".") {
                    if ((valueRef.current || "").includes(".")) return;
                    commitValue((valueRef.current || "") ? `${valueRef.current}.` : "0.");
                    return;
                }
                if (!/^[0-9]$/.test(char)) return;
                commitValue(`${valueRef.current || ""}${char}`);
            },
            addDecimal: () => {
                if ((valueRef.current || "").includes(".")) return;
                commitValue((valueRef.current || "") ? `${valueRef.current}.` : "0.");
            },
            backspace: () => {
                const current = valueRef.current || "";
                if (!current.length) return;
                commitValue(current.slice(0, -1));
            },
            increment: () => {
                const current = valueRef.current || "";
                const numeric = parseFloat(current || "0");
                const base = Number.isFinite(numeric) ? numeric : 0;
                const next = Math.min(999, base + 1);
                if (next <= 0) {
                    commitValue("");
                } else {
                    commitValue(next % 1 === 0 ? `${Math.round(next)}` : next.toFixed(1));
                }
            },
            decrement: () => {
                const current = valueRef.current || "";
                const numeric = parseFloat(current || "0");
                const base = Number.isFinite(numeric) ? numeric : 0;
                const next = Math.max(0, base - 1);
                if (next <= 0) {
                    commitValue("");
                } else {
                    commitValue(next % 1 === 0 ? `${Math.round(next)}` : next.toFixed(1));
                }
            },
            hasPrevious: () => sanitizedPrevious !== null && sanitizedPrevious !== undefined && sanitizedPrevious !== "",
            copyPrevious: () => {
                if (sanitizedPrevious === null || typeof sanitizedPrevious === "undefined" || sanitizedPrevious === "") {
                    return false;
                }
                commitValue(sanitizedPrevious);
                return true;
            },
            forceBlur: () => {
                forcingBlurRef.current = true;
                try { inputRef.current?.blur?.(); } catch { }
            },
            enableNativeKeyboard: () => {},
            enableCustomKeyboard: () => {},
        });
        return unregister;
    }, [keyboard, inputId, sanitizedPrevious, hasCustomKeyboard, commitValue]);

    const handleChangeText = useCallback((text) => {
        commitValue(text);
    }, [commitValue]);

    const handlePress = useCallback(() => {
        if (hasCustomKeyboard) {
            keyboard?.setActiveInput?.(inputId);
        }
        try { inputRef.current?.focus?.(); } catch { }
        setIsSelected(true);
    }, [hasCustomKeyboard, keyboard, inputId]);

    const handleFocus = useCallback(() => {
        console.log("[EditableStat] onFocus", inputId);
        setIsSelected(true);
        if (hasCustomKeyboard) {
            keyboard?.setActiveInput?.(inputId);
        }
        try { onFocus?.(); } catch { }
    }, [hasCustomKeyboard, keyboard, inputId, onFocus]);

    const handleBlur = useCallback(() => {
        console.log("[EditableStat] onBlur", inputId);
        setIsSelected(false);
        if (forcingBlurRef.current) {
            forcingBlurRef.current = false;
            return;
        }
        if (hasCustomKeyboard) {
            keyboard?.requestClearActiveInput?.(inputId);
        }
    }, [hasCustomKeyboard, keyboard, inputId]);

    const shouldShowAccessory = !hasCustomKeyboard;

    return (
        <>
            <Pressable
                onPress={handlePress}
                style={[
                    styles.editing,
                    isFinished && styles.finished,
                    isSelected && styles.selected,
                ]}
            >
                <TextInput
                    ref={inputRef}
                    editable
                    keyboardType="decimal-pad"
                    placeholder={placeholder}
                    placeholderTextColor="#888"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={[workoutTypography.statValue, styles.text]}
                    value={displayValue}
                    onChangeText={handleChangeText}
                    blurOnSubmit={false}
                    inputAccessoryViewID={shouldShowAccessory && Platform.OS === "ios" ? accessoryId : undefined}
                    returnKeyType={Platform.OS === "android" ? "done" : "default"}
                    onSubmitEditing={() => {}}
                    showSoftInputOnFocus={false}
                    caretHidden={hasCustomKeyboard}
                    selectTextOnFocus={!hasCustomKeyboard}
                />
            </Pressable>
            {shouldShowAccessory && (
                <KeyboardDismissAccessory accessoryID={accessoryId} />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    editing: {
        width: scaleSize(63),
        height: scaleSize(26),
        borderRadius: scaleSize(9),
        backgroundColor: theme.surface,
        borderWidth: 0,
    },
    selected: {
        backgroundColor: theme.primaryDeep,
    },
    finished: {
        backgroundColor: theme.successBg,
    },
    text: {
        flex: 1,
        textAlign: "center",
    },
});
