/**
 * Scales size proportionally based on screen dimensions
 * @param orginial size - number
 * @return scaled size - number 
 */

import { Dimensions } from "react-native";

// iPhone 13 baseline (390 x 844)
export const BASE_WIDTH = 390;
export const BASE_HEIGHT = 844;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Factors
const SCALE_W = SCREEN_WIDTH / BASE_WIDTH;
const SCALE_H = SCREEN_HEIGHT / BASE_HEIGHT;
const SCALE_MIN = Math.min(SCALE_W, SCALE_H);
const SCALE_W375 = SCREEN_WIDTH / 375;

// Legacy default: uniform rounded scale based on the smaller axis
export default function scaleSize(n) {
  return Math.round(n * SCALE_MIN);
}

export const scaleWidth375 = (n) => Math.round(n * SCALE_W375);

// Named helpers for explicit intent
export const ss = (n) => { 'worklet'; return Math.round(n * SCALE_MIN); }; // symmetric scale (min of width/height)
export const rs = ss; // alias used in some files

// Typography scale: bolder scaling by device class.
// - Adds a bump on larger devices for better readability
// - Still respects user accessibility font scaling (we don't divide by fontScale)
function computeTextScale() {
  // Less aggressive: use the smaller axis scale and smaller bumps
  const base = Math.max(1, SCALE_MIN);
  let bump = 0;
  if (SCREEN_WIDTH >= 430 || SCREEN_HEIGHT >= 930) bump = 0.07; // XL devices
  else if (SCREEN_WIDTH >= 414 || SCREEN_HEIGHT >= 896) bump = 0.05; // Large / Plus
  else if (SCREEN_WIDTH >= 390 || SCREEN_HEIGHT >= 844) bump = 0.03; // Standard modern
  else bump = 0.00; // Small/older — no bump
  return Math.min(1.15, base + bump);
}

const TEXT_SCALE = computeTextScale();
export const ts = (n, overrideScale) => {
  'worklet';
  const s = typeof overrideScale === 'number' ? overrideScale : TEXT_SCALE;
  return Math.round(n * s);
};
