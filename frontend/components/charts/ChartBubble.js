// Data-point marker shared by the line charts.
import React from "react";
import { Circle, G } from "react-native-svg";

import { scaleSize } from "../2_Competition/layoutConstants";
import { accentToRgba } from "./chartMath";

const DEFAULT_ACCENT = { r: 100, g: 160, b: 255 };

// Renders the multi-layer bubble with halo and highlight for a chart data point.
const ChartBubble = ({ cx, cy, isActive, accent = DEFAULT_ACCENT }) => {
    const coreRadius = isActive ? scaleSize(6.4) : scaleSize(4.8);
    const ringRadius = coreRadius + scaleSize(isActive ? 2.2 : 1.5);
    const haloRadius = coreRadius + scaleSize(isActive ? 6.2 : 4.6);
    const highlightRadius = coreRadius * (isActive ? 0.42 : 0.36);
    const innerStrokeWidth = isActive ? scaleSize(1) : scaleSize(0.8);

    return (
        <G>
            <Circle
                cx={cx}
                cy={cy}
                r={haloRadius}
                fill={accentToRgba(accent, isActive ? 0.32 : 0.18)}
            />
            <Circle
                cx={cx}
                cy={cy}
                r={ringRadius}
                stroke={accentToRgba(accent, isActive ? 0.78 : 0.5)}
                strokeWidth={isActive ? scaleSize(2) : scaleSize(1.2)}
                fill="rgba(255, 255, 255, 0.08)"
            />
            <Circle
                cx={cx}
                cy={cy}
                r={coreRadius}
                fill={isActive ? "#F8FBFF" : "#E3EBFF"}
                stroke="rgba(14, 24, 35, 0.35)"
                strokeWidth={innerStrokeWidth}
            />
            <Circle
                cx={cx}
                cy={cy - scaleSize(isActive ? 1.2 : 0.9)}
                r={highlightRadius}
                fill="rgba(255, 255, 255, 0.95)"
                opacity={isActive ? 0.95 : 0.55}
            />
        </G>
    );
};

export default ChartBubble;
