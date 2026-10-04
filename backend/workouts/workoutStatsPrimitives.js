// Pure helpers shared by the completed-workout update and delete stats rebuilds.
const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const calculate1RM = (weight, reps) => {
    const w = Number(weight) || 0;
    const r = Number(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    // Brzycki formula (matches client-side helper)
    return w / (1.0278 - 0.0278 * r);
};

const parseDayKey = (key) => {
    if (!key) return 0;
    try {
        const [y, m, d] = String(key).split("-").map((x) => Number(x));
        const dt = new Date(y, (m || 1) - 1, d || 1);
        dt.setHours(0, 0, 0, 0);
        const ts = dt.getTime();
        return Number.isFinite(ts) ? ts : 0;
    } catch {
        return 0;
    }
};

const inferGroup = (name) => {
    const n = String(name || "").toLowerCase();
    if (!n) return null;
    if (/shoulder|overhead|press|raise|shrug|upright row/.test(n)) return "shoulders";
    if (/bench|chest|fly|push-up|push up/.test(n)) return "chest";
    if (/curl|tricep|skullcrusher|preacher|extension/.test(n)) return "arms";
    if (/squat|deadlift|lunge|leg\s|calf|hip thrust|glute/.test(n)) return "legs";
    if (/row|pull[- ]?up|chin[- ]?up|lat|trap/.test(n)) return "back";
    if (/ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up/.test(n)) return "abs";
    if (/full body|total body|circuit/.test(n)) return "full";
    return null;
};

const distributeFullBody = (tsMap, ts) => {
    const dist = { legs: 0.35, back: 0.3, shoulders: 0.2, arms: 0.1, abs: 0.05, chest: 0 };
    Object.entries(dist).forEach(([group, factor]) => {
        const prev = tsMap[group] || 0;
        const candidate = Number(ts) || 0;
        if (candidate > prev && factor > 0) {
            tsMap[group] = candidate;
        }
    });
};

export { toNumber, calculate1RM, parseDayKey, inferGroup, distributeFullBody };
