// utils/macroRecommendations.js
// Evidence-informed recommendation model for calorie and macro targets.
// Inputs come from Personal Info (sex, weight, height, age, activity, goal).
//
// Design goals:
// - Keep behavior deterministic and stable for UI placeholder updates.
// - Use standard RMR + activity methods with safer calorie guardrails.
// - Keep protein/fat floors and allocate remaining calories to carbs.

const KG_PER_LB = 0.45359237;
const KCAL_PER_LB = 3500;
const CM_PER_IN = 2.54;

const ACTIVITY_MULTIPLIER = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
};

const CARB_FLOOR_PER_KG = {
    sedentary: 1.5,
    light: 2.0,
    moderate: 2.5,
    active: 3.0,
    athlete: 3.5,
};

const PROTEIN_PER_KG = {
    lose: 2.2,
    maintain: 1.8,
    gain: 1.9,
};

const FAT_PER_KG = {
    lose: 0.7,
    maintain: 0.8,
    gain: 0.9,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const roundTo10 = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value / 10) * 10;
};

const macroCalories = (protein, carbs, fat) => (
    (Math.max(0, Math.round(protein)) * 4)
    + (Math.max(0, Math.round(carbs)) * 4)
    + (Math.max(0, Math.round(fat)) * 9)
);

const getWeeklyRateByGoal = ({ goal, bmi, activity }) => {
    if (goal === 'lose') {
        let pct = 0.006; // 0.6% bodyweight/week default cut pace
        if (bmi >= 35) pct = 0.008;
        else if (bmi <= 22) pct = 0.0045;
        if (activity === 'active' || activity === 'athlete') pct -= 0.001;
        return clamp(pct, 0.003, 0.009);
    }
    if (goal === 'gain') {
        let pct = 0.0035; // 0.35% bodyweight/week
        if (bmi >= 28) pct = 0.0025;
        if (activity === 'athlete') pct = Math.max(pct, 0.004);
        return clamp(pct, 0.002, 0.005);
    }
    return 0;
};

const getGoalCalories = ({ tdee, weightLb, goal, gender, bmi, activity, bmr }) => {
    const weeklyRate = getWeeklyRateByGoal({ goal, bmi, activity });
    const deltaFromRate = (weightLb * weeklyRate * KCAL_PER_LB) / 7;

    let target = tdee;

    if (goal === 'lose') {
        let maxDeficit = bmi >= 30 ? 900 : 750;
        if (bmi < 22) maxDeficit = 500;
        if (bmi < 19) maxDeficit = 350;
        if ((activity === 'active' || activity === 'athlete') && maxDeficit > 700) maxDeficit = 700;
        const deficit = clamp(deltaFromRate, 250, maxDeficit);
        target = tdee - deficit;
    } else if (goal === 'gain') {
        const maxSurplus = activity === 'athlete' ? 450 : 350;
        const surplus = clamp(deltaFromRate, 120, maxSurplus);
        target = tdee + surplus;
    }

    // Guardrails for low-calorie prescriptions.
    const sexFloor = gender === 'male' ? 1500 : 1200;
    if (goal === 'lose') {
        target = Math.max(target, sexFloor, bmr * 0.95);
    } else {
        target = Math.max(target, bmr * 1.1);
    }

    return clamp(roundTo10(target), 1000, 6000);
};

const getProteinWeightKg = (weightKg, heightM, bmi) => {
    if (!Number.isFinite(weightKg) || !Number.isFinite(heightM) || heightM <= 0) return weightKg;
    if (bmi <= 30) return weightKg;
    const referenceWeightAtBmi25 = 25 * heightM * heightM;
    return referenceWeightAtBmi25 + (weightKg - referenceWeightAtBmi25) * 0.35;
};

export const computeRecommendedMacrosFromPersonalInfo = (form) => {
    const gender = String(form?.gender || 'male').toLowerCase();
    const activity = String(form?.activity || 'moderate').toLowerCase();
    const goal = String(form?.goal || 'maintain').toLowerCase();

    const weightLb = toNumber(form?.weight);
    const heightFt = toNumber(form?.heightFt);
    const heightIn = toNumber(form?.heightIn);
    const rawAge = toNumber(form?.age);

    if (!Number.isFinite(weightLb) || weightLb <= 0) return null;
    if (!Number.isFinite(heightFt) || !Number.isFinite(heightIn)) return null;
    if (!Number.isFinite(heightFt) || heightFt < 0) return null;
    if (!Number.isFinite(heightIn) || heightIn < 0) return null;

    const totalInches = (heightFt * 12) + heightIn;
    if (!Number.isFinite(totalInches) || totalInches <= 0) return null;

    const weightKg = weightLb * KG_PER_LB;
    const heightCm = totalInches * CM_PER_IN;
    const heightM = heightCm / 100;
    const age = Number.isFinite(rawAge) && rawAge > 0 ? clamp(rawAge, 13, 100) : 30;

    const isMale = gender === 'male';
    const sexOffset = isMale ? 5 : -161;
    const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexOffset;

    const activityMultiplier = ACTIVITY_MULTIPLIER[activity] ?? ACTIVITY_MULTIPLIER.moderate;
    const tdee = bmr * activityMultiplier;
    const bmi = weightKg / Math.max(heightM * heightM, 0.0001);

    const calories = getGoalCalories({
        tdee,
        weightLb,
        goal,
        gender: isMale ? 'male' : 'female',
        bmi,
        activity,
        bmr,
    });

    const proteinWeightKg = getProteinWeightKg(weightKg, heightM, bmi);
    const activityProteinBoost = activity === 'active' || activity === 'athlete' ? 0.1 : 0;
    const ageProteinBoost = age >= 55 ? 0.1 : 0;
    const proteinTargetPerKg = (PROTEIN_PER_KG[goal] ?? PROTEIN_PER_KG.maintain) + activityProteinBoost + ageProteinBoost;

    const proteinMinByKg = (goal === 'lose' ? 1.8 : 1.6) * proteinWeightKg;
    const proteinMinByPct = (0.15 * calories) / 4;
    const proteinMaxByPct = (0.35 * calories) / 4;
    let protein = clamp(proteinTargetPerKg * proteinWeightKg, Math.max(proteinMinByKg, proteinMinByPct), proteinMaxByPct);

    const fatTargetPerKg = FAT_PER_KG[goal] ?? FAT_PER_KG.maintain;
    const fatMinByKg = (goal === 'lose' ? 0.55 : 0.6) * weightKg;
    const fatMinByPct = (0.20 * calories) / 9;
    const fatMaxByPct = (0.35 * calories) / 9;
    let fat = clamp(fatTargetPerKg * weightKg, Math.max(fatMinByKg, fatMinByPct), fatMaxByPct);

    const carbFloorMultiplier = CARB_FLOOR_PER_KG[activity] ?? CARB_FLOOR_PER_KG.moderate;
    const carbFloor = (goal === 'lose' ? 0.85 : 1) * carbFloorMultiplier * weightKg;
    const carbMaxByPct = (0.65 * calories) / 4;

    let carbs = (calories - (protein * 4) - (fat * 9)) / 4;

    // If carbs are too low, free calories from fat first, then protein.
    if (carbs < carbFloor) {
        let neededKcal = (carbFloor - carbs) * 4;
        const reducibleFatKcal = Math.max(0, (fat - Math.max(fatMinByKg, fatMinByPct)) * 9);
        const reduceFatKcal = Math.min(neededKcal, reducibleFatKcal);
        fat -= reduceFatKcal / 9;
        neededKcal -= reduceFatKcal;
        carbs = (calories - (protein * 4) - (fat * 9)) / 4;

        if (neededKcal > 0 && carbs < carbFloor) {
            const proteinSafetyFloor = (goal === 'lose' ? 1.8 : 1.6) * proteinWeightKg;
            const reducibleProteinKcal = Math.max(0, (protein - Math.max(proteinSafetyFloor, proteinMinByPct)) * 4);
            const reduceProteinKcal = Math.min(neededKcal, reducibleProteinKcal);
            protein -= reduceProteinKcal / 4;
            carbs = (calories - (protein * 4) - (fat * 9)) / 4;
        }
    }

    // If carbs are too high, shift calories into fat (up to fat max) for balance.
    if (carbs > carbMaxByPct) {
        const excessKcal = (carbs - carbMaxByPct) * 4;
        const addableFatKcal = Math.max(0, (fatMaxByPct - fat) * 9);
        const fatShiftKcal = Math.min(excessKcal, addableFatKcal);
        fat += fatShiftKcal / 9;
        carbs -= fatShiftKcal / 4;
    }

    let roundedProtein = Math.max(0, Math.round(protein));
    let roundedFat = Math.max(0, Math.round(fat));
    let roundedCarbs = Math.max(0, Math.round(carbs));

    // Keep carbs near the computed floor after rounding.
    const roundedCarbFloor = Math.max(0, Math.round(carbFloor));
    if (roundedCarbs < roundedCarbFloor) {
        roundedCarbs = roundedCarbFloor;
    }

    // Align macros with calorie target by adjusting carbs first.
    let totalFromMacros = macroCalories(roundedProtein, roundedCarbs, roundedFat);
    let kcalDiff = calories - totalFromMacros;
    if (Math.abs(kcalDiff) >= 4) {
        const carbAdjustment = Math.round(kcalDiff / 4);
        roundedCarbs = Math.max(0, roundedCarbs + carbAdjustment);
        totalFromMacros = macroCalories(roundedProtein, roundedCarbs, roundedFat);
        kcalDiff = calories - totalFromMacros;
    }

    // Fine-tune with fat if needed.
    if (Math.abs(kcalDiff) >= 9) {
        const fatAdjustment = Math.round(kcalDiff / 9);
        roundedFat = Math.max(0, roundedFat + fatAdjustment);
        totalFromMacros = macroCalories(roundedProtein, roundedCarbs, roundedFat);
    }

    return {
        calories: String(totalFromMacros),
        protein: String(roundedProtein),
        carbs: String(roundedCarbs),
        fat: String(roundedFat),
    };
};

export default computeRecommendedMacrosFromPersonalInfo;
