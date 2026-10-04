// Volume / Reps / PRs selector shown under the metric chart of the Progress tab.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import theme from "../../../../theme/mfpDark";
import { scaleSize } from "../../layoutConstants";
import { METRIC_COLORS } from "./progressConstants";
import styles from "./ProgressSection.styles";

const MetricToggleRow = ({ tabs, activeKey, onSelect }) => (
    <View style={styles.metricToggleRow}>
        {tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            const palette = METRIC_COLORS[tab.key] || {};
            const activeLabelColor = palette.toggleLabel || theme.textPrimary || "#F6F8FF";
            const activeBackground = palette.toggleActiveBg || "rgba(45, 158, 255, 0.22)";
            const activeBorderColor = palette.toggleBorder || theme.primary || "#2D9EFF";
            const iconColor = isActive
                ? activeLabelColor
                : "rgba(216,226,255,0.75)";
            return (
                <Pressable
                    key={tab.key}
                    onPress={() => onSelect(tab.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${tab.label} progress`}
                    style={[
                        styles.metricToggleButton,
                        isActive && styles.metricToggleButtonActive,
                        isActive
                            ? {
                                backgroundColor: activeBackground,
                                borderColor: activeBorderColor,
                            }
                            : null,
                        !tab.hasData && !isActive && styles.metricToggleButtonMuted,
                    ]}
                >
                    {tab.icon ? (
                        <Ionicons
                            name={tab.icon}
                            size={scaleSize(16)}
                            color={iconColor}
                            style={styles.metricToggleIcon}
                        />
                    ) : null}
                        <Text
                            style={[
                                styles.metricToggleLabel,
                                isActive && styles.metricToggleLabelActive,
                                isActive ? { color: activeLabelColor } : null,
                                !tab.hasData && !isActive && styles.metricToggleLabelMuted,
                            ]}
                        >
                            {tab.label}
                        </Text>
                </Pressable>
            );
        })}
    </View>
);

export default MetricToggleRow;
