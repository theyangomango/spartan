// Portion input shared by the portion picker and quick-add modals: the quick choices and the text-to-multiplier parser.

export const parsePortion = (s) => {
    const t = String(s || '').trim();
    if (!t) return 1;
    if (t.includes('/')) {
        const [a, b] = t.split('/').map((x) => parseFloat(x));
        const v = (a && b) ? (a / b) : NaN;
        return Number.isFinite(v) && v > 0 ? v : 1;
    }
    const v = parseFloat(t);
    return Number.isFinite(v) && v > 0 ? v : 1;
};

export const PORTION_QUICK_CHOICES = ['1/4', '1/3', '1/2', '2/3', '3/4', '1'];
