/**
 * Scales size proportionally based on screen dimensions
 * @param orginial size - number
 * @return scaled size - number 
 */

import { Dimensions } from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export default function scaleSize(size) {
  const scaleWidth = SCREEN_WIDTH / BASE_WIDTH;
  const scaleHeight = SCREEN_HEIGHT / BASE_HEIGHT;
  const scale = Math.min(scaleWidth, scaleHeight);
  return Math.round(size * scale);
}
