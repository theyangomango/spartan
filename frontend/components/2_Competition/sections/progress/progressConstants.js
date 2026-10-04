// Colours of the Progress tab charts: per-metric palette, data-point accents and tooltip accents.

export const METRIC_COLORS = {
    volume: {
        line: "#80A6FF", // blue
        strip: "rgba(128, 166, 255, 0.45)",
        accent: { r: 128, g: 166, b: 255 },
        toggleActiveBg: "rgba(22, 121, 243, 0.3)",
        toggleBorder: "rgba(128, 166, 255, 0.95)",
        toggleLabel: "#80A6FF",
    },
    reps: {
        line: "#FF7CB5", // pink
        strip: "rgba(255, 124, 181, 0.45)",
        accent: { r: 255, g: 124, b: 181 },
        toggleActiveBg: "rgba(221, 72, 137, 0.32)",
        toggleBorder: "rgba(255, 124, 181, 0.95)",
        toggleLabel: "#FF7CB5",
    },
    personalRecords: {
        line: "#FFC874", // yellow
        strip: "rgba(255, 200, 116, 0.45)",
        accent: { r: 255, g: 200, b: 116 },
        toggleActiveBg: "hsla(36, 85%, 54%, 0.26)",
        toggleBorder: "rgba(255, 200, 116, 0.9)",
        toggleLabel: "#FFC874",
    },
};

export const CHART_ACCENTS = {
    weight: { r: 45, g: 158, b: 255 },
    volume: METRIC_COLORS.volume.accent,
    reps: METRIC_COLORS.reps.accent,
    prs: METRIC_COLORS.personalRecords.accent,
};

export const POINTER_PANEL_ACCENTS = {
    volume: METRIC_COLORS.volume.accent,
    reps: METRIC_COLORS.reps.accent,
    prs: METRIC_COLORS.personalRecords.accent,
    weight: { r: 214, g: 220, b: 230 },
};
