// utils/date.js
const pad2 = (n) => String(n).padStart(2, '0');
export const toDayKey = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
