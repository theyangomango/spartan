// shared/computeHexagon.js
// Cross-environment entry point for the hexagon computation.

import computeHexagonCore, {
  computeHexagonCore as computeHexagonAlgorithm,
  defaultResolveMeta,
  FAMILY_ANCHORS,
  familyAnchorFor,
  FULL_BODY_DIST,
  GROUP_KEYS,
  GROUP_WR,
  normalizeEquipment,
} from "./hexagon/computeHexagonCore.js";
import { resolveMetaUsingCatalog } from "./hexagon/exerciseCatalogMeta.js";

export {
  computeHexagonAlgorithm,
  defaultResolveMeta,
  FAMILY_ANCHORS,
  familyAnchorFor,
  FULL_BODY_DIST,
  GROUP_KEYS,
  GROUP_WR,
  normalizeEquipment,
};

export const resolveMetaWithCatalog = (name) => resolveMetaUsingCatalog(name, defaultResolveMeta);

export function computeHexagonFromStats(params = {}, options = {}) {
  const { resolveMeta = resolveMetaWithCatalog, includeDebug = false, ...rest } = options || {};
  return computeHexagonCore(params, {
    resolveMeta,
    includeDebug,
    ...rest,
  });
}

export default function computeHexagonDefault(params = {}, options = {}) {
  return computeHexagonFromStats(params, options);
}
