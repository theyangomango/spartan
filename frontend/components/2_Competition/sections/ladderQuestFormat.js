// Palette and text/number formatting helpers for the ladder quest panels.
import { CalendarCheck, Dumbbell, Target } from "lucide-react-native";

import formatHexStat from "../../../utils/formatHexStat";
import { MUSCLE_ICON_SCALES } from "../muscleGroupIconLayout";

const CARD_THEME_COLORS = {
    bronze: { gradient: ["#6f3600ff", "#e19c73ff"], accent: "#f9cba1ff" },
    silver: { gradient: ["#2e3542ff", "#a8c2e6ff"], accent: "#c5e0ffff" },
    gold: { gradient: ["#d8a700ff", "#ffd95cff"], accent: "#ffeab0ff" },
    ruby: { gradient: ["#511222ff", "#e54b73"], accent: "#ffacc9ff" },
    emerald: { gradient: ["#0f5c3fff", "#8ef3c5ff"], accent: "#c8ffe3ff" },
    diamond: { gradient: ["#0d4156ff", "#86e7ffff"], accent: "#bff9ffff" },
};

const formatCountValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    const safeValue = Math.max(0, Math.floor(numeric));
    try {
        return new Intl.NumberFormat("en-US").format(safeValue);
    } catch {
        return String(safeValue);
    }
};

const formatWeightValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    const safeValue = Math.max(0, Math.round(numeric));
    try {
        return new Intl.NumberFormat("en-US").format(safeValue);
    } catch {
        return String(safeValue);
    }
};

const formatRequirementProgressText = (descriptor, currentValue, targetValue, fallback) => {
    if (!descriptor || !descriptor.type) {
        return fallback;
    }
    if (descriptor.type === "workouts" && Number.isFinite(targetValue)) {
        return `${formatCountValue(currentValue)} / ${formatCountValue(targetValue)}`;
    }
    if (descriptor.type === "score" && Number.isFinite(targetValue)) {
        return `${formatHexStat(currentValue)} / ${formatHexStat(targetValue)}`;
    }
    if (descriptor.type === "volume" && Number.isFinite(targetValue)) {
        return `${formatWeightValue(currentValue)} / ${formatWeightValue(targetValue)}`;
    }
    return fallback;
};

const clampRatio = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
};

const capitalizeLabel = (value) => {
    if (!value || typeof value !== "string") return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
};

// Describes a quest: what is measured (title), the unit of its target, and an icon for its kind.
const describeRequirement = (taskLabel, descriptor) => {
    if (descriptor?.type === "score") {
        const isOverall = descriptor.key === "overall";
        return {
            title: isOverall ? "Overall score" : `${capitalizeLabel(descriptor.key)} score`,
            Icon: Target,
            muscleKey: MUSCLE_ICON_SCALES[descriptor.key] ? descriptor.key : null,
        };
    }
    if (descriptor?.type === "volume") {
        return {
            title: "Total volume",
            unit: " lbs",
            Icon: Dumbbell,
        };
    }
    if (descriptor?.type === "workouts") {
        return {
            title: "Workouts",
            Icon: CalendarCheck,
        };
    }
    return { title: taskLabel, Icon: Target };
};

export { CARD_THEME_COLORS, formatRequirementProgressText, clampRatio, describeRequirement };
