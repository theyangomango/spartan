// logic/computeHexagonStats.js
// Client wrapper around the shared hexagon computation.

import calculate1RM from "../helper/calculate1RM";
import computeHexagonCore from "../../shared/hexagon/computeHexagonCore.js";

export default function computeHexagonStats(options = {}) {
  return computeHexagonCore(options, {
    calculate1RM,
    includeDebug: true,
    clampLegacy: true,
  });
}
