// utils/scale.js
import { Dimensions } from "react-native";
const { height: H } = Dimensions.get("window");
const BASE_H = 844;
const scale = H / BASE_H;

export const ss = (n) => Math.round(n * scale);
