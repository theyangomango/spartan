// shared/computeHexagon.js
// Cross-environment entry point for the hexagon computation.

import computeHexagonCore, { defaultResolveMeta } from "./hexagon/computeHexagonCore.js";
import { resolveMetaUsingCatalog } from "./hexagon/exerciseCatalogMeta.js";

const resolveMetaWithCatalog = (name) => resolveMetaUsingCatalog(name, defaultResolveMeta);

export default function computeHexagonFromStats(params = {}, options = {}) {
  const { resolveMeta = resolveMetaWithCatalog, includeDebug = false, ...rest } = options || {};
  return computeHexagonCore(params, {
    resolveMeta,
    includeDebug,
    ...rest,
  });
}
