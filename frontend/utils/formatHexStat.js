// Utility to standardize display of hexagon stats at a single decimal place
export function formatHexStat(value, fallback = "0.0") {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return num.toFixed(1);
}

export default formatHexStat;
