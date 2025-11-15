import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Verify } from "iconsax-react-native";
import theme from "../../theme/mfpDark";

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_MARGIN_RATIO = 0.28;

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const getPaddingEdgeValue = (style, edge) => {
    if (!style) return 0;
    const specificKey = `padding${edge}`;
    if (isFiniteNumber(style[specificKey])) return style[specificKey];
    if (isFiniteNumber(style.paddingVertical)) return style.paddingVertical;
    if (isFiniteNumber(style.padding)) return style.padding;
    return 0;
};

/**
 * Render a user's handle with a leading verified badge when applicable.
 * Icon size automatically follows the detected font size from the supplied text style.
 */
export default function VerifiedHandle({
    handle,
    isVerified = false,
    textStyle,
    containerStyle,
    iconColor = theme.primary,
    iconSize,
    iconStyle,
    numberOfLines = 1,
    ellipsizeMode = "tail",
    textProps = {},
    preserveTextAlignment = false,
}) {
    const {
        resolvedFontSize,
        resolvedMargin,
        resolvedPaddingTop,
        resolvedPaddingBottom,
    } = useMemo(() => {
        const flattened = StyleSheet.flatten(textStyle) || {};
        const fontSize = isFiniteNumber(flattened.fontSize) ? flattened.fontSize : DEFAULT_FONT_SIZE;
        const margin = Math.max(fontSize * DEFAULT_MARGIN_RATIO * 0.65, 3);
        const paddingTop = getPaddingEdgeValue(flattened, "Top");
        const paddingBottom = getPaddingEdgeValue(flattened, "Bottom");
        return {
            resolvedFontSize: fontSize,
            resolvedMargin: margin,
            resolvedPaddingTop: paddingTop,
            resolvedPaddingBottom: paddingBottom,
        };
    }, [textStyle]);

    const iconFinalSize = useMemo(() => {
        if (isFiniteNumber(iconSize)) return iconSize;
        // Slightly scale the icon so weight is visually balanced relative to type ascenders/descent.
        return Math.max(10, resolvedFontSize * 1.02);
    }, [iconSize, resolvedFontSize]);

    const shouldRenderIconSlot = isVerified || preserveTextAlignment;

    const iconSlotStyle = useMemo(() => {
        if (!shouldRenderIconSlot) return null;
        return [
            styles.iconSlot,
            {
                marginRight: resolvedMargin,
                width: iconFinalSize,
                minHeight: Math.max(resolvedFontSize, iconFinalSize),
                paddingTop: resolvedPaddingTop,
                paddingBottom: resolvedPaddingBottom,
            },
        ];
    }, [
        shouldRenderIconSlot,
        resolvedMargin,
        iconFinalSize,
        resolvedFontSize,
        resolvedPaddingTop,
        resolvedPaddingBottom,
    ]);

    const iconMergedStyle = useMemo(() => {
        return [styles.icon, iconStyle];
    }, [iconStyle]);

    if (!handle?.length) {
        return (
            <Text
                style={[styles.fallbackText, textStyle]}
                numberOfLines={numberOfLines}
                ellipsizeMode={ellipsizeMode}
                {...textProps}
            >
                {handle ?? ""}
            </Text>
        );
    }

    return (
        <View style={[styles.container, containerStyle]}>
            {shouldRenderIconSlot ? (
                <View style={iconSlotStyle}>
                    {isVerified ? (
                        <Verify
                            size={iconFinalSize}
                            color={iconColor}
                            variant="Bold"
                            style={iconMergedStyle}
                        />
                    ) : null}
                </View>
            ) : null}
            <Text
                style={[styles.text, textStyle]}
                numberOfLines={numberOfLines}
                ellipsizeMode={ellipsizeMode}
                {...textProps}
            >
                {handle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconSlot: {
        justifyContent: "flex-end",
        alignItems: "center",
        alignSelf: "stretch",
        flexShrink: 0,
    },
    icon: {
        alignSelf: "center",
    },
    text: {
        includeFontPadding: false,
    },
    fallbackText: {
        includeFontPadding: false,
    },
});
