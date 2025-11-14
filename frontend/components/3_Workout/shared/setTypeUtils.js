export const SET_TYPE_KEYS = ["warmup", "dropset", "failure", "left", "right"];
export const ALLOWED_SET_TYPES = new Set(SET_TYPE_KEYS);

export const normalizeSetType = (value) => {
  const raw = typeof value === "string" ? value.toLowerCase() : "";
  return ALLOWED_SET_TYPES.has(raw) ? raw : null;
};

export const isUnilateralType = (type) => {
  const normalized = normalizeSetType(type);
  return normalized === "left" || normalized === "right";
};

export const typeLetter = (type) => {
  switch (normalizeSetType(type)) {
    case "warmup":
      return "W";
    case "dropset":
      return "D";
    case "failure":
      return "F";
    case "left":
      return "L";
    case "right":
      return "R";
    default:
      return "";
  }
};

export const formatSetLabel = (displayNumber, type) => {
  const normalized = normalizeSetType(type);
  const safeNumber = displayNumber == null ? "" : String(displayNumber);
  if (!normalized) return safeNumber;
  if (normalized === "left" || normalized === "right") {
    return `${safeNumber}${typeLetter(normalized)}`;
  }
  return typeLetter(normalized);
};

export const computeDisplayNumbers = (sets = []) => {
  if (!Array.isArray(sets)) return [];
  let counter = 0;
  const pending = { left: [], right: [] }; // queues so either side can initiate a pair

  return sets.map((set) => {
    const type = normalizeSetType(set?.type);

    if (type === "left" || type === "right") {
      const queue = pending[type];
      const oppositeQueue = pending[type === "left" ? "right" : "left"];

      if (oppositeQueue.length) {
        return oppositeQueue.shift();
      }

      counter += 1;
      queue.push(counter);
      return counter;
    }

    pending.left.length = 0;
    pending.right.length = 0;
    counter += 1;
    return counter;
  });
};
