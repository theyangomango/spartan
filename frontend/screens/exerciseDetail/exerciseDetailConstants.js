// Tab list and chart colours of the ExerciseDetail screen.

export const TABS = [
    { key: 'about', label: 'About' },
    { key: 'progress', label: 'Progress' },
    { key: 'history', label: 'History' },
];

export const METRIC_COLORS = {
    volume: {
        line: '#80A6FF', // blue
        strip: 'rgba(128, 166, 255, 0.45)',
        accent: { r: 128, g: 166, b: 255 },
        toggleActiveBg: 'rgba(22, 121, 243, 0.3)',
        toggleBorder: 'rgba(128, 166, 255, 0.95)',
        toggleLabel: '#80A6FF',
    },
    reps: {
        line: '#FF7CB5', // pink
        strip: 'rgba(255, 124, 181, 0.45)',
        accent: { r: 255, g: 124, b: 181 },
        toggleActiveBg: 'rgba(221, 72, 137, 0.32)',
        toggleBorder: 'rgba(255, 124, 181, 0.95)',
        toggleLabel: '#FF7CB5',
    },
    prs: {
        line: '#FFC874', // yellow
        strip: 'rgba(255, 200, 116, 0.45)',
        accent: { r: 255, g: 200, b: 116 },
        toggleActiveBg: 'hsla(36, 85%, 54%, 0.26)',
        toggleBorder: 'rgba(255, 200, 116, 0.9)',
        toggleLabel: '#FFC874',
    },
};
export const CHART_ACCENTS = {
    standard: { r: 100, g: 160, b: 255 },
    volume: METRIC_COLORS.volume.accent,
    reps: METRIC_COLORS.reps.accent,
    prs: METRIC_COLORS.prs.accent,
};
