# Calorie Estimator Sample Dataset

Each row can be fed into `evaluateCalorieEstimates` by mapping to `{ estimated, observed, category }` objects. Confidence notes mirror what the helper would output given the logged data quality.

| # | Workout Summary | Key Attributes | Observed kcal | Estimated kcal | Error | Confidence Notes |
| - | --------------- | -------------- | ------------- | -------------- | ----- | ---------------- |
| 1 | 5×5 Back Squat + Bench | 72 min, 185 lb athlete, full timestamps | 520 | 505 | −15 | 0.86 – plenty of sets with weights logged |
| 2 | Push accessory circuit | 55 min, partial warmups logged | 410 | 365 | −45 | 0.78 – lighter weights reduce density |
| 3 | Deadlift + accessories | 65 min, 200 lb | 560 | 598 | +38 | 0.84 – heavy load pushes MET multiplier |
| 4 | HIIT EMOM (burpees/bike) | 32 min, 170 lb | 420 | 448 | +28 | 0.82 – all sets timed, duration measured |
| 5 | Steady treadmill run | 45 min @ 7.5 mph | 610 | 592 | −18 | 0.91 – cardio keyword match uses cardio MET |
| 6 | Glute/ham machine day | 58 min, missing some rest data | 430 | 452 | +22 | 0.74 – estimator infers rest from defaults |
| 7 | Olympic lifting (snatch/clean) | 70 min, 185 lb | 655 | 682 | +27 | 0.83 – categorized as compound_strength |
| 8 | Pull day with drop sets | 60 min, logged drop-set types | 480 | 455 | −25 | 0.80 – drop sets lower tempo/heavier rest |
| 9 | Core + mobility finisher | 35 min | 220 | 205 | −15 | 0.69 – category=mobility clamps MET |
| 10 | Row erg intervals | 25 min total | 370 | 392 | +22 | 0.85 – cardio equipment keywords trigger |
| 11 | Bodyweight calisthenics | 40 min, 165 lb | 310 | 295 | −15 | 0.77 – relies on weighted bodyweight heuristics |
| 12 | Assisted pull/chin session | 50 min, assistance logged | 330 | 318 | −12 | 0.76 – assisted weighting reduces load |
| 13 | Full-body kettlebell circuit | 45 min | 480 | 522 | +42 | 0.81 – categorized as HIIT via full-body + kettlebell |
| 14 | Arm pump supersets | 38 min, sparse weights | 250 | 228 | −22 | 0.68 – low density + few sets drop confidence |
| 15 | Spin class (manual entry) | 50 min | 520 | 548 | +28 | 0.88 – equipment match "bike" ensures cardio MET |
| 16 | Trail run + short hike | 65 min, only duration | 640 | 612 | −28 | 0.73 – missing per-set signals lowers confidence |
| 17 | Sprint intervals on AirBike | 22 min | 360 | 398 | +38 | 0.79 – small duration but very high density |
| 18 | Yoga / stretch recovery | 30 min | 120 | 138 | +18 | 0.72 – mobility category caps MET at ~3 |
| 19 | Mixed strength + cardio (two segments) | 70 min | 590 | 612 | +22 | 0.82 – rest calories fill gaps between segments |
| 20 | Low-body rehab (light bands) | 50 min | 260 | 232 | −28 | 0.66 – accessory + low load reduces estimate |
