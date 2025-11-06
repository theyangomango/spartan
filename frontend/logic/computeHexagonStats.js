// logic/computeHexagonStats.js
// Client wrapper around the shared hexagon computation using catalog metadata.

import calculate1RM from "../helper/calculate1RM";
import computeHexagonFromStats from "../../shared/computeHexagon.js";

export default function computeHexagonStats(params = {}, options = {}) {
  return computeHexagonFromStats(params, {
    calculate1RM,
    includeDebug: true,
    clampLegacy: true,
    ...options,
  });
}
