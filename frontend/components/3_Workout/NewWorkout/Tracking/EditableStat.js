import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextInput, StyleSheet, Pressable, Platform } from "react-native";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import KeyboardDismissAccessory, { useKeyboardAccessoryId } from "../../../common/KeyboardDismissAccessory";
import workoutTypography from "../../shared/workoutTypography";
import { useStatKeyboard } from "./StatKeyboardContext";

const MAX_DIGITS = 3;
const MAX_DECIMAL_PLACES = 1;
const MAX_WHOLE_VALUE = (10 ** MAX_DIGITS) - 1;

const sanitizeValue = (raw) => {
    if (raw === null || typeof raw === "undefined") return "";
    let text = typeof raw === "number" ? raw.toString() : String(raw);
    if (!text) return "";
    let cleaned = text.replace(/[^0-9.]/g, "");
    if (!cleaned) return "";
    const hadTrailingDot = cleaned.endsWith(".");
    const parts = cleaned.split(".");
    let whole = parts[0] || "";
    let decimal = parts.slice(1).join("") || "";

    whole = whole.replace(/^0+(?=\d)/, "");
    if (!whole.length) whole = cleaned.startsWith(".") || decimal.length ? "0" : "";

    if (whole.length > MAX_DIGITS) {
        whole = whole.slice(0, MAX_DIGITS);
    }
    const digitsRemaining = Math.max(0, MAX_DIGITS - whole.length);
    const decimalLimit = Math.min(MAX_DECIMAL_PLACES, digitsRemaining);
    decimal = decimal.slice(0, decimalLimit);

    let result = whole;
    if (decimal.length > 0) {
        result = `${whole || "0"}.${decimal}`;
    } else if (hadTrailingDot) {
        result = `${whole || "0"}.`;
    }

    if (result === "") return "";
    return result;
};

const genInputId = () => `stat-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const getDecimalPlaces = (value) => {
    if (!Number.isFinite(value)) return 0;
    const string = `${value}`;
    if (!string.includes(".")) return 0;
    return string.split(".")[1]?.length || 0;
};

const computeStepMeta = (rawStep) => {
    const fallbackStep = 1;
    const fallbackFactor = 10 ** MAX_DECIMAL_PLACES;
    const fallback = {
        step: fallbackStep,
        factor: fallbackFactor,
        stepInt: Math.max(1, Math.round(fallbackStep * fallbackFactor)),
        displayDecimals: 0,
        maxInt: Math.round(MAX_WHOLE_VALUE * fallbackFactor),
    };
    const numeric = Number(rawStep);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;

    const sanitizedPrecision = MAX_DECIMAL_PLACES; // inputs only allow a single decimal place
    const stepDecimals = getDecimalPlaces(numeric);
    const factorDecimals = Math.max(stepDecimals, sanitizedPrecision);
    const factor = 10 ** factorDecimals;
    const stepInt = Math.max(1, Math.round(numeric * factor));
    const maxInt = Math.round(MAX_WHOLE_VALUE * factor);
    const displayDecimals = Math.min(stepDecimals, sanitizedPrecision);

    return {
        step: numeric,
        factor,
        stepInt,
        displayDecimals,
        maxInt,
    };
};

const formatValueFromInt = (intValue, factor, displayDecimals) => {
    const numeric = intValue / factor;
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    if (displayDecimals <= 0 || intValue % factor === 0) {
        return `${Math.round(numeric)}`;
    }
    return numeric.toFixed(displayDecimals);
};

export default function EditableStat({
    placeholder = "",
    isFinished,
    value,
    setValue,
    onFocus,
    previousValue = null,
    step = 1,
}) {
    const keyboard = useStatKeyboard();
    const hasCustomKeyboard = !!keyboard;
    const inputId = useMemo(() => genInputId(), []);
    const inputRef = useRef(null);
    const accessoryId = useKeyboardAccessoryId();

    const [isSelected, setIsSelected] = useState(false);
    const forcingBlurRef = useRef(false);
    const replaceOnNextInputRef = useRef(false);

    const displayValue = value == null ? "" : String(value);
    const valueRef = useRef(displayValue);

    const sanitizedPrevious = useMemo(() => sanitizeValue(previousValue), [previousValue]);

    const setValueRef = useRef(setValue);
    useEffect(() => { setValueRef.current = setValue; }, [setValue]);

    const stepMeta = useMemo(() => computeStepMeta(step), [step]);

    const commitValue = useCallback((nextValue) => {
        const sanitized = sanitizeValue(nextValue);
        valueRef.current = sanitized;
        replaceOnNextInputRef.current = false;
        try {
            setValueRef.current?.(sanitized);
        } catch { }
    }, []);

    const adjustByStep = useCallback((direction) => {
        const { stepInt, factor, displayDecimals, maxInt } = stepMeta;
        if (!stepInt || stepInt <= 0) return;

        const current = valueRef.current || "";
        const numeric = parseFloat(current || "0");
        const safeBase = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
        const baseInt = Math.round(safeBase * factor);
        const hasValue = baseInt > 0;
        const isExactMultiple = hasValue && stepInt > 0 && baseInt % stepInt === 0;

        let targetInt;
        if (direction === "increment") {
            if (!hasValue) {
                targetInt = stepInt;
            } else if (isExactMultiple) {
                targetInt = baseInt + stepInt;
            } else {
                targetInt = Math.ceil(baseInt / stepInt) * stepInt;
            }
        } else {
            if (!hasValue) {
                commitValue("");
                return;
            }
            if (isExactMultiple) {
                targetInt = baseInt - stepInt;
            } else {
                targetInt = Math.floor(baseInt / stepInt) * stepInt;
            }
        }

        if (!targetInt || targetInt <= 0) {
            commitValue("");
            return;
        }

        if (targetInt > maxInt) {
            targetInt = maxInt;
        }

        const formatted = formatValueFromInt(targetInt, factor, displayDecimals);
        if (!formatted) {
            commitValue("");
        } else {
            commitValue(formatted);
        }
    }, [commitValue, stepMeta]);

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
                    const base = replaceOnNextInputRef.current ? "" : (valueRef.current || "");
                    if (base.includes(".")) return;
                    const next = base ? `${base}.` : "0.";
                    commitValue(next);
                    return;
                }
                if (!/^[0-9]$/.test(char)) return;
                const base = replaceOnNextInputRef.current ? "" : (valueRef.current || "");
                commitValue(`${base}${char}`);
            },
            addDecimal: () => {
                const base = replaceOnNextInputRef.current ? "" : (valueRef.current || "");
                if (base.includes(".")) return;
                commitValue(base ? `${base}.` : "0.");
            },
            backspace: () => {
                if (replaceOnNextInputRef.current) {
                    commitValue("");
                    return;
                }
                const current = valueRef.current || "";
                if (!current.length) return;
                commitValue(current.slice(0, -1));
            },
            increment: () => adjustByStep("increment"),
            decrement: () => adjustByStep("decrement"),
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
    }, [keyboard, inputId, sanitizedPrevious, hasCustomKeyboard, commitValue, adjustByStep]);

    const handleChangeText = useCallback((text) => {
        commitValue(text);
    }, [commitValue]);

    const handlePress = useCallback(() => {
        replaceOnNextInputRef.current = !!(valueRef.current && valueRef.current.length);
        if (hasCustomKeyboard) {
            keyboard?.setActiveInput?.(inputId);
        }
        try { inputRef.current?.focus?.(); } catch { }
        setIsSelected(true);
    }, [hasCustomKeyboard, keyboard, inputId]);

    const handleFocus = useCallback(() => {
        console.log("[EditableStat] onFocus", inputId);
        setIsSelected(true);
        replaceOnNextInputRef.current = !!(valueRef.current && valueRef.current.length);
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
