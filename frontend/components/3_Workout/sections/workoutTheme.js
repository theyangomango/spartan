import { Dimensions } from "react-native";
import { ss } from "../../../helper/scaleSize";
// Re-export ss for backwards compatibility with existing imports
export { ss } from "../../../helper/scaleSize";

const { width: W } = Dimensions.get("window");

export const FOOTER_HEIGHT = 87;

/* START cluster proportions (Nike-like) */
// Slightly larger central action button
export const BTN_SIZE = Math.round(W * 0.38);
export const SMALL_SIZE = Math.round(W * 0.132);
export const BTN_GAP = ss(20);
export const ROW_WIDTH = BTN_SIZE + SMALL_SIZE * 2 + BTN_GAP * 2 + ss(15);

/* Templates rail sizing — compact */
export const TPL_HEIGHT = ss(100);
export const DOTS_H = ss(10);
export const TPL_CARD_H = TPL_HEIGHT - DOTS_H - ss(8);

// On larger screens the start button grows (BTN_SIZE), which increases bottom padding
// and can push the templates rail too far from the Start cluster. Pull it back by
// subtracting part of the growth so spacing feels like iPhone 13.
const BASE_BTN = Math.round(390 * 0.32); // baseline (iPhone 13)
const BTN_DELTA = Math.max(0, BTN_SIZE - BASE_BTN);
// Start with ss(32) and subtract ~60% of extra button growth. Keep a sensible floor.
export const TPL_BOTTOM_GAP = Math.max(ss(10));

/* Blue palette (refined) */
export const BLUE = {
    ACCENT: "#2D9EFF",
    ACCENT_BG: "rgba(45,158,255,0.16)",
    CARD_BG: "#E7F0FF",
    BORDER: "#B7D7FF",
    TITLE: "#0F172A",
};

/* Saved template tint/border */
export const SAVED_TPL_TINT = BLUE.CARD_BG;
export const SAVED_TPL_BORDER = BLUE.ACCENT;
