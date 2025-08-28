import { Dimensions } from "react-native";

const { width: W, height: H } = Dimensions.get("window");
const scale = H / 844;
export const ss = (n) => Math.round(n * scale);

export const FOOTER_HEIGHT = 87;

/* START cluster proportions (Nike-like) */
export const BTN_SIZE = Math.round(W * 0.34);
export const SMALL_SIZE = Math.round(W * 0.132);
export const BTN_GAP = ss(20);
export const ROW_WIDTH = BTN_SIZE + SMALL_SIZE * 2 + BTN_GAP * 2;

/* Templates rail sizing — compact */
export const TPL_HEIGHT = ss(100);
export const DOTS_H = ss(10);
export const TPL_CARD_H = TPL_HEIGHT - DOTS_H - ss(8);
export const TPL_BOTTOM_GAP = ss(26);

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
