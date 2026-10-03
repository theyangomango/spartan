// How the full-body muscle figure is zoomed and shifted so each muscle group fills a round badge.
// Offsets are in points for a 48pt badge; scale them for other badge sizes.
export const MUSCLE_ICON_BASE_SIZE = 48;

// Highlight for the targeted muscle group, the same on every screen and rank tier.
export const MUSCLE_ICON_HIGHLIGHT = "#ff6f67ff";
export const MUSCLE_ICON_HIGHLIGHT_DIM = "rgba(255, 127, 120, 0.6)";

export const OVERALL_MUSCLE_SEGMENTS = [
    "calves",
    "quads",
    "abs",
    "obliques",
    "back",
    "forearms",
    "arms",
    "shoulders",
    "chest",
    "traps",
];

export const MUSCLE_ICON_SCALES = {
    shoulders: 2.45,
    chest: 2.65,
    arms: 1.7,
    back: 2.15,
    abs: 2.8,
    legs: 2.25,
    overall: 1.5,
};

export const MUSCLE_ICON_OFFSETS = {
    shoulders: 70,
    chest: 80,
    arms: 25,
    back: 50,
    abs: 40,
    legs: -20,
    overall: 10,
};

export const MUSCLE_ICON_STROKE_WIDTHS = {
    back: 14,
};
