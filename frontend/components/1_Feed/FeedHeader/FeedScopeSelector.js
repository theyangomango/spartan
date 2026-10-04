// Feed scope dropdown ("Feed" / "Following" / "Personal") shown in the centre of the feed header.
import React, { memo, useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";
import { withStrongPress, strong as hapticStrong } from "../../../utils/haptics";
import styles from "../FeedHeader.styles";

const FEED_SCOPE_OPTIONS = [
    { key: "forYou", label: "Feed" },
    { key: "following", label: "Following" },
    { key: "personal", label: "Personal" },
];

/* ------------------------- Feed Scope Dropdown ------------------------- */
const FeedScopeSelector = memo(({ value = "following", onSelect, onScrollToTop }) => {
    const [visible, setVisible] = useState(false);
    const selectedOption = useMemo(
        () => FEED_SCOPE_OPTIONS.find((opt) => opt.key === value) || FEED_SCOPE_OPTIONS[0],
        [value]
    );

    const longPressHandler = useMemo(
        () => (onScrollToTop ? withStrongPress(onScrollToTop) : undefined),
        [onScrollToTop]
    );

    const toggleVisible = useCallback(() => {
        try { hapticStrong(); } catch { }
        setVisible((prev) => !prev);
    }, []);

    const closeVisible = useCallback(() => setVisible(false), []);

    const handleSelect = useCallback((key) => {
        closeVisible();
        if (key === value) {
            if (onScrollToTop) onScrollToTop();
            return;
        }
        try { hapticStrong(); } catch { }
        if (onSelect) onSelect(key);
        if (onScrollToTop) onScrollToTop();
    }, [value, onSelect, onScrollToTop, closeVisible]);

    return (
        <>
            <RNBounceable
                onPress={toggleVisible}
                onLongPress={longPressHandler}
                style={styles.scopeSelector}
                accessibilityRole="button"
                accessibilityLabel="Select feed scope"
            >
                <Ionicons
                    name={visible ? "chevron-up" : "chevron-down"}
                    size={scaleSize(22)}
                    color={theme.textPrimary}
                    style={styles.scopeSelectorIcon}
                />
                <Text style={styles.scopeSelectorLabel}>{selectedOption?.label || "Feed"}</Text>
            </RNBounceable>
            <Modal
                transparent
                animationType="fade"
                visible={visible}
                onRequestClose={closeVisible}
            >
                <TouchableWithoutFeedback onPress={closeVisible}>
                    <View style={styles.scopeModalBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={styles.scopeModalCard}>
                                {FEED_SCOPE_OPTIONS.map((option, idx) => {
                                    const active = option.key === value;
                                    return (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[
                                                styles.scopeOption,
                                                active ? styles.scopeOptionActive : null,
                                                idx === FEED_SCOPE_OPTIONS.length - 1 ? styles.scopeOptionLast : null,
                                            ]}
                                            onPress={() => handleSelect(option.key)}
                                        >
                                            <Text style={[styles.scopeOptionLabel, active ? styles.scopeOptionLabelActive : null]}>
                                                {option.label}
                                            </Text>
                                            {active && <Ionicons name="checkmark" size={scaleSize(14)} color={theme.primary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
});

export default FeedScopeSelector;
