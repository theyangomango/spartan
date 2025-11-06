import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Verify } from "iconsax-react-native";
import theme from "../../theme/mfpDark";

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_MARGIN_RATIO = 0.28;

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

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
    iconTranslateY,
    numberOfLines = 1,
    ellipsizeMode = "tail",
    textProps = {},
    preserveTextAlignment = false,
}) {
    const { resolvedFontSize, resolvedMargin } = useMemo(() => {
        const flattened = StyleSheet.flatten(textStyle) || {};
        const fontSize = isFiniteNumber(flattened.fontSize) ? flattened.fontSize : DEFAULT_FONT_SIZE;
        const margin = Math.max(fontSize * DEFAULT_MARGIN_RATIO * 0.65, 3);
        return {
            resolvedFontSize: fontSize,
            resolvedMargin: margin,
        };
    }, [textStyle]);

    const iconFinalSize = useMemo(() => {
        if (isFiniteNumber(iconSize)) return iconSize;
        // Slightly scale the icon so weight is visually balanced relative to type ascenders/descent.
        return Math.max(10, resolvedFontSize * 1.02);
    }, [iconSize, resolvedFontSize]);

    const iconVerticalOffset = useMemo(() => {
        if (isFiniteNumber(iconTranslateY)) return iconTranslateY;
        const lift = resolvedFontSize * 0.15;
        return -Math.min(Math.max(lift, 2), 3);
    }, [iconTranslateY, resolvedFontSize]);

    const iconMergedStyle = useMemo(() => {
        const flattened = StyleSheet.flatten(iconStyle) || {};
        const propTransforms = Array.isArray(flattened.transform) ? flattened.transform : [];
        return [
            styles.icon,
            iconStyle,
            {
                marginRight: resolvedMargin,
                transform: [...propTransforms, { translateY: iconVerticalOffset }],
            },
        ];
    }, [iconStyle, resolvedMargin, iconVerticalOffset]);

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
            {isVerified ? (
                <Verify
                    size={iconFinalSize}
                    color={iconColor}
                    variant="Bold"
                    style={iconMergedStyle}
                    />
            ) : preserveTextAlignment ? (
                <></>
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
    icon: {
        // alignSelf: "flex-start",
        alignSelf: 'flex-end',
    },
    iconPlaceholder: {
        height: 1,
    },
    text: {
        includeFontPadding: false,
    },
    fallbackText: {
        includeFontPadding: false,
    },
});
