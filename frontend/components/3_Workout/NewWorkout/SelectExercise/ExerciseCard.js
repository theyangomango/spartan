import React, { memo, useMemo } from "react";
import { Pressable, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import scaleSize from "../../../../helper/scaleSize";
import ExerciseImagePreview from "./ExerciseImagePreview";
import { strong as haptic } from "../../../../utils/haptics";
import countCompletedWorkoutsWithExercise, { getLastExerciseVolume } from "../../../../helper/countCompletedWorkoutsWithExercise";
import theme from "../../../../theme/mfpDark";

const scaledSize = (size) => scaleSize(size);

const formatNumericWithMaxChars = (value, maxChars = 3) => {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return null;
    const abs = Math.abs(normalized);
    if (abs === 0) return "0";

    const decimalOrder = [2, 1, 0];

    for (const decimals of decimalOrder) {
        const factor = 10 ** decimals;
        const rounded = Math.round(normalized * factor) / factor;
        let str;
        if (decimals === 0) {
            str = Math.round(rounded).toString();
        } else {
            str = rounded.toFixed(decimals);
        }

        str = str.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "").replace(/\.$/, "");
        if (str === "-0") str = "0";
        if (str.length <= maxChars) return str;
    }

    return null;
};

const SUFFIX_OPTIONS = [
    { divisor: 1e9, suffix: "b" },
    { divisor: 1e6, suffix: "m" },
    { divisor: 1e3, suffix: "k" },
    { divisor: 1, suffix: "" },
];

const formatVolumeLabel = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "0";

    const candidates = [];

    SUFFIX_OPTIONS.forEach(({ divisor, suffix }, index) => {
        const scaled = num / divisor;
        const numericPart = formatNumericWithMaxChars(scaled, 3);
        if (numericPart === null) return;
        if (numericPart === "0" && num !== 0) return;

        const approx = Number(numericPart) * divisor;
        if (!Number.isFinite(approx)) return;

        const error = Math.abs(approx - num);
        candidates.push({
            label: `${numericPart}${suffix}`,
            error,
            divisor,
            order: index,
        });
    });

    if (!candidates.length) return "0";

    candidates.sort((a, b) => {
        if (a.error !== b.error) return a.error - b.error;
        if (a.divisor !== b.divisor) return a.divisor - b.divisor;
        return a.order - b.order;
    });

    return candidates[0].label;
};

const COLORS = {
    cardBg: theme.surface,
    border: "rgba(255, 255, 255, 0.04)",
    borderActive: "#57B9FF",
    text: "#F7F9FF",
    subtext: "#9BA8BF",
    accent: "#FF6B7A",
    success: theme.success,
};

const CARD_WIDTH = "100%";
const CARD_HEIGHT = scaledSize(220);

const ExerciseCard = memo(
    ({
        name,
        muscleGroup,
        slug,
        selectExercise,
        deselectExercise,
        isSelected = false,
        isSaved = false,
        toggleSaved,
        touchable = false,
        style = null,
    }) => {
        const completedWorkouts = (() => {
            try {
                return global?.userData?.completedWorkouts;
            } catch {
                return undefined;
            }
        })();

        const usageCount = useMemo(
            () => Math.max(0, countCompletedWorkoutsWithExercise(name, completedWorkouts)),
            [name, completedWorkouts]
        );

        const lastVolume = useMemo(
            () => Math.max(0, getLastExerciseVolume(name, completedWorkouts)),
            [name, completedWorkouts]
        );

        const lastVolumeLabel = useMemo(() => formatVolumeLabel(lastVolume), [lastVolume]);
        const lastVolumeDisplay = useMemo(
            () => `${lastVolumeLabel} lbs`,
            [lastVolumeLabel]
        );
        const showVolumeStat = usageCount > 0;

        const Wrapper = touchable ? TouchableOpacity : Pressable;
        const wrapperProps = touchable ? { activeOpacity: 0.78 } : {};

        const handlePress = () => {
            try {
                haptic();
            } catch {
                // no-op haptic failure
            }
            if (isSelected) {
                deselectExercise({ name, muscle: muscleGroup });
            } else {
                selectExercise({ name, muscle: muscleGroup });
            }
        };

        const handleToggleSaved = (event) => {
            event?.stopPropagation?.();
            if (!toggleSaved) return;
            try {
                haptic();
            } catch {
                // no-op haptic failure
            }
            toggleSaved({ name, muscle: muscleGroup, slug });
        };

        return (
            <Wrapper
                {...wrapperProps}
                onPress={handlePress}
                style={[styles.card, style, isSelected && styles.cardActive]}
            >
                <View style={styles.iconRow}>
                    <View style={styles.leftControls}>
                        <Pressable
                            onPress={handleToggleSaved}
                            style={styles.bookmarkButton}
                            hitSlop={8}
                            disabled={!toggleSaved}
                        >
                            <Ionicons
                                name={isSaved ? "bookmark" : "bookmark-outline"}
                                size={scaledSize(16)}
                                color={isSaved ? COLORS.accent : COLORS.subtext}
                            />
                        </Pressable>
                        {showVolumeStat ? (
                            <View style={styles.lastVolumeContainer}>
                                <Ionicons
                                    name="arrow-up"
                                    size={scaledSize(13)}
                                    color={COLORS.success}
                                    style={styles.lastVolumeIcon}
                                />
                                <Text style={styles.lastVolumeText}>{lastVolumeDisplay}</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={styles.rightControls}>
                        {usageCount > 0 ? (
                            <View style={styles.usageBadge}>
                                <Text style={styles.usageBadgeText}>{usageCount}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.previewWrapper}>
                    <ExerciseImagePreview exercise={name} size={scaledSize(110)} />
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                        {name}
                    </Text>
                    <Text style={styles.muscleGroupText}>{muscleGroup}</Text>
                </View>
            </Wrapper>
        );
    }
);

export default ExerciseCard;

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        maxWidth: CARD_WIDTH,
        height: CARD_HEIGHT,
        minHeight: CARD_HEIGHT,
        flexGrow: 0,
        flexShrink: 0,
        backgroundColor: COLORS.cardBg,
        borderRadius: scaledSize(14),
        paddingTop: scaledSize(6),
        paddingBottom: scaleSize(10),
        paddingHorizontal: scaledSize(12),
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: "hidden",
        flexDirection: "column",
    },
    cardActive: {
        borderColor: COLORS.borderActive,
        shadowColor: "#57B9FF",
    },
    iconRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    leftControls: {
        flexDirection: "row",
        alignItems: "center",
    },
    rightControls: {
        flexDirection: "row",
        alignItems: "center",
    },
    usageBadge: {
        minWidth: scaledSize(20),
        paddingHorizontal: scaledSize(6),
        paddingVertical: scaledSize(2),
        borderRadius: scaledSize(10),
        // backgroundColor: "rgba(87, 185, 255, 0.16)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 0,
    },
    usageBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: COLORS.text,
    },
    bookmarkButton: {
        paddingVertical: scaledSize(4),
    },
    lastVolumeContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    lastVolumeIcon: {
    },
    lastVolumeText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
        color: COLORS.success,
    },
    previewWrapper: {
        flexGrow: 1,
        width: "100%",
        marginTop: scaledSize(6),
        marginBottom: scaledSize(4),
        alignItems: "center",
        justifyContent: "center",
    },
    infoSection: {
        marginTop: scaledSize(4),
    },
    exerciseName: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: COLORS.text,
        marginBottom: scaledSize(4),
    },
    muscleGroupText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: COLORS.subtext,
    },
});
