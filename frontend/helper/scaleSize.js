/**
 * Scales size proportionally based on screen dimensions
 * @param orginial size - number
 * @return scaled size - number 
 */

import { Dimensions, PixelRatio } from "react-native";

// iPhone 13 baseline (390 x 844)
export const BASE_WIDTH = 390;
export const BASE_HEIGHT = 844;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Factors
const SCALE_W = SCREEN_WIDTH / BASE_WIDTH;
const SCALE_H = SCREEN_HEIGHT / BASE_HEIGHT;
const SCALE_MIN = Math.min(SCALE_W, SCALE_H);

// Legacy default: uniform rounded scale based on the smaller axis
export default function scaleSize(n) {
  return Math.round(n * SCALE_MIN);
}

// Named helpers for explicit intent
export const ss = (n) => Math.round(n * SCALE_MIN); // symmetric scale (min of width/height)
export const rs = ss; // alias used in some files
export const hs = (n) => Math.round(n * SCALE_W);  // horizontal scale
export const vs = (n) => Math.round(n * SCALE_H);  // vertical scale

// Moderate scale to avoid extremes on very tall/short devices
export const ms = (n, factor = 0.5) => {
  const scaled = n * SCALE_MIN;
  return Math.round(n + (scaled - n) * factor);
};

// Typography scale: bolder scaling by device class.
// - Uses the larger of width/height as a base, clamped to never shrink below 1.0
// - Adds a bump on larger devices for better readability
// - Still respects user accessibility font scaling (we don't divide by fontScale)
function computeTextScale() {
  // Less aggressive: use the smaller axis scale and smaller bumps
  const base = Math.max(1, SCALE_MIN);
  let bump = 0;
  if (SCREEN_WIDTH >= 430 || SCREEN_HEIGHT >= 930) bump = 0.06; // XL devices
  else if (SCREEN_WIDTH >= 414 || SCREEN_HEIGHT >= 896) bump = 0.04; // Large / Plus
  else if (SCREEN_WIDTH >= 390 || SCREEN_HEIGHT >= 844) bump = 0.02; // Standard modern
  else bump = 0.00; // Small/older — no bump
  return Math.min(1.15, base + bump);
}

const TEXT_SCALE = computeTextScale();
export const ts = (n, overrideScale) => {
  const s = typeof overrideScale === 'number' ? overrideScale : TEXT_SCALE;
  return Math.round(n * s);
};

// Expose raw factors if needed by charts/animations
export const scaleFactors = { width: SCALE_W, height: SCALE_H, min: SCALE_MIN };
