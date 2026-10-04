import { Dimensions } from "react-native";
import baseScaleSize, { ts } from "../../helper/scaleSize";

const { width, height } = Dimensions.get("window");

const BASE = {
    width: baseScaleSize(390),
    height: baseScaleSize(844),
};

const scaleSize = (value, axis = "min") => {
    const wRatio = width / BASE.width;
    const hRatio = height / BASE.height;
    const ratio =
        axis === "w" ? wRatio : axis === "h" ? hRatio : Math.min(wRatio, hRatio);
    return Math.round(value * ratio);
};

const SIZES = {
    headerIconSize: scaleSize(21),
    chevronDelta: scaleSize(6),
    headerPaddingHorizontal: scaleSize(14, "w"),
    headerPaddingTop: scaleSize(4),
    tribeHitSlop: scaleSize(8),
};

const PODIUM_PULLUP = scaleSize(44);

export {
    scaleSize,
    SIZES,
    PODIUM_PULLUP,
    width as DEVICE_WIDTH,
    height as DEVICE_HEIGHT,
    ts,
};
