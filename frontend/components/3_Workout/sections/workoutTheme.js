import { Dimensions } from "react-native";
import { ss } from "../../../helper/scaleSize";
// Re-export ss for backwards compatibility with existing imports
export { ss } from "../../../helper/scaleSize";

const { width: W } = Dimensions.get("window");

const FOOTER_BASE = 86;
export const FOOTER_HEIGHT = ss(FOOTER_BASE);

/* START cluster proportions (Nike-like) */
// Slightly larger central action button
export const BTN_SIZE = Math.round(W * 0.38);
export const SMALL_SIZE = Math.round(W * 0.132);
export const BTN_GAP = ss(20);
export const ROW_WIDTH = BTN_SIZE + SMALL_SIZE * 2 + BTN_GAP * 2 + ss(20);

/* Templates rail sizing — compact */
export const TPL_HEIGHT = ss(118);
export const DOTS_H = ss(15);
export const TPL_CARD_H = TPL_HEIGHT - DOTS_H - ss(5);

/* Hub card sizing (shared so spacing can react when design tweaks height) */
export const HUB_CARD_HEIGHT = ss(170);
const HUB_CARD_BASE = ss(170);
const HUB_CARD_EXTRA = Math.max(0, HUB_CARD_HEIGHT - HUB_CARD_BASE);
const HUB_CARD_NEG = Math.max(0, HUB_CARD_BASE - HUB_CARD_HEIGHT);

// On larger screens the start button grows (BTN_SIZE), which increases bottom padding
// and can push the templates rail too far from the Start cluster. Pull it back by
// subtracting part of the growth so spacing feels like iPhone 13.
const BASE_BTN = Math.round(390 * 0.32); // baseline (iPhone 13)
const BTN_DELTA = Math.max(0, BTN_SIZE - BASE_BTN);
const BTN_DELTA_NEG = Math.max(0, BASE_BTN - BTN_SIZE);

const FOOTER_EXTRA = Math.max(0, FOOTER_HEIGHT - FOOTER_BASE);

// Start with ss(28) and let footer growth push the rail down slightly while larger
// buttons pull it back up. Smaller buttons loosen the gap a touch for breathing room.
const BASE_TPL_GAP = ss(16);
export const TPL_BOTTOM_GAP =
    BASE_TPL_GAP
    + Math.round(FOOTER_EXTRA * 0.4)
    - Math.round(BTN_DELTA * 0.55)
    + Math.round(BTN_DELTA_NEG * 0.2)
    ;

// Divider margin mirrors the same forces so the dotted line stays visually centered
// between HubRow and the templates, even as footer height/screen scale changes.
const BASE_DIVIDER_MARGIN = ss(12);
const BASE_DIVIDER = Math.max(
    ss(8),
    BASE_DIVIDER_MARGIN
    + Math.round(FOOTER_EXTRA * 0.3)
    - Math.round(BTN_DELTA * 0.25)
    + Math.round(BTN_DELTA_NEG * 0.1),
);
const MIN_DIVIDER_GAP = ss(6);
const HUB_SHADOW_RADIUS = ss(12); // mirrors HubRow shadowRadius
const HUB_SHADOW_OFFSET = ss(6); // mirrors HubRow shadowOffset.height

const dividerBottom = Math.max(
    MIN_DIVIDER_GAP,
    BASE_DIVIDER
    + Math.round(HUB_CARD_EXTRA * 0.2)
    - Math.round(HUB_CARD_NEG * 0.2),
);

// Extra vertical space eaten by the Hub card's drop shadow. We approximate its
// visual reach using the actual shadow radius/offset plus card height deltas so
// the dotted divider sits midway between the visible bottom of HubRow and the
// top of the templates rail on every device.
const dropShadowAllowance = Math.max(
    ss(10),
    HUB_SHADOW_OFFSET
    + Math.round(HUB_SHADOW_RADIUS * 0.75)
    + Math.round(HUB_CARD_EXTRA * 0.45)
    - Math.round(HUB_CARD_NEG * 0.35),
);

export const TPL_DIVIDER_MARGIN_BOTTOM = dividerBottom;

export const TPL_DIVIDER_MARGIN_TOP = dividerBottom + dropShadowAllowance;

export const TPL_DIVIDER_MARGIN = BASE_DIVIDER;

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
