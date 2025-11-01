import React, { memo, useMemo } from "react";
import { Pressable, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import scaleSize from "../../../../helper/scaleSize";
import ExerciseImagePreview from "./ExerciseImagePreview";
import { strong as haptic } from "../../../../utils/haptics";
import countCompletedWorkoutsWithExercise, { getLastExerciseVolume } from "../../../../helper/countCompletedWorkoutsWithExercise";
import theme from "../../../../theme/mfpDark";

const scaledSize = (size) => scaleSize(size);

let compactNumberFormatter;

const formatVolumeLabel = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "0";

    if (
        compactNumberFormatter === undefined &&
        typeof Intl !== "undefined" &&
        typeof Intl.NumberFormat === "function"
    ) {
        try {
            compactNumberFormatter = new Intl.NumberFormat(undefined, {
                notation: "compact",
                maximumFractionDigits: 1,
            });
        } catch {
            compactNumberFormatter = null;
        }
    }

    if (compactNumberFormatter) {
        try {
            return compactNumberFormatter.format(num);
        } catch {
            // fall through to manual formatting
        }
    }

    const abs = Math.abs(num);
    const withSuffix = (divisor, suffix) => {
        const scaled = num / divisor;
        const precision = Math.abs(scaled) >= 10 ? 0 : 1;
        return `${scaled.toFixed(precision).replace(/\.0$/, "")}${suffix}`;
    };

    if (abs >= 1e9) return withSuffix(1e9, "b");
    if (abs >= 1e6) return withSuffix(1e6, "m");
    if (abs >= 1e3) return withSuffix(1e3, "k");
    if (abs >= 100) return String(Math.round(num));
    if (abs >= 10) return (Math.round(num * 10) / 10).toString().replace(/\.0$/, "");
    return (Math.round(num * 100) / 100).toString().replace(/\.0+$/, "") || "0";
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
