# Audit: partition "progress-section"

File audited (read completely, lines 1-4763): `frontend/components/2_Competition/sections/ProgressSection.js`
Working tree is byte-identical to `SPX/baseline/...` for this file, so every line number below is valid in both.

Abbreviations used for other files:
- P = `frontend/components/2_Competition/sections/ProgressSection.js` (this partition)
- W = `frontend/screens/WeightMeasurementsScreen.js` (partition ladder-and-weight)
- E = `frontend/screens/ExerciseDetail.js` (partition screen-exercise-detail)
- U = `frontend/components/2_Competition/UserStats/UserStatsProgressPreview.js` (partition user-stats)
- M = `frontend/screens/MuscleGroupExercises.js` (partition ladder-and-weight)

Build fact that several findings depend on (verified in `node_modules/babel-preset-expo/node_modules/@react-native/babel-preset/src/configs/main.js:30`): `@babel/plugin-transform-block-scoping` is a default plugin with no `tdz` option, so `const`/`let` are compiled to `var` and reading a `const` before its declaration yields `undefined` instead of throwing.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `frontend/components/2_Competition/sections/ProgressSection.js` (4763 lines) | "Progress" tab of the Competition screen: body-map / hexagon pager, muscle-group list, a Volume / Reps / PRs cumulative line chart with a metric toggle, a Body Weight chart with "+ Add Measurement" modal, and a row linking to the WeightMeasurements screen. | `default` = `React.memo(ProgressSection)` (P:4763). No named exports. Props: `scrollSignal` (number, default 0), `onScroll` (function). | `frontend/screens/2_Competition.js:27` (LIVE, partition ladder-and-weight), rendered at `2_Competition.js:241-244` with both props. No PARKED, TOOLING, DEAD or functions/ file references it (`grep -rn ProgressSection` over the repo: only those two files). |

Internal layout of P (top-level declarations):

| Lines | Declaration | Kind |
|---|---|---|
| 1-51 | imports | |
| 53 | `WORKOUT_TIMESTAMP_FIELDS` | const |
| 55-86 | `METRIC_COLORS` | const |
| 88-94 | `CHART_ACCENTS` | const |
| 96-101 | `POINTER_PANEL_ACCENTS` | const |
| 102 | `BODYGRAPH_OUTLINE_COLOR` | const |
| 104-108 | `accentToRgba` | pure helper |
| 110-151 | `ChartBubble` | SVG component |
| 153-217 | `PointerBubbleCard` | component (uses `styles.pointerBubble*`) |
| 219-262 | `toMillisSafe` | pure helper |
| 264-276 | `resolvePreferredWeightUnit` | pure helper |
| 278-289 | `toDisplayWeightUnit` | pure helper |
| 291-304 | `buildMetricDeltaDisplay` | pure helper (default param references `formatVolumeValue`, P:489) |
| 306-311 | `formatWeightValue` | pure helper |
| 313-321 | `formatTimestamp` | pure helper |
| 323 | `normalizeToMinute` | pure helper (only used by AddMeasurementModal + clampDateToNow) |
| 325-330 | `clampDateToNow` | pure helper (only used by AddMeasurementModal) |
| 332-349 | `mergeDateByMode` | pure helper (only used by AddMeasurementModal) |
| 351-370 | `sanitizeEntries` | helper (calls `makeID`) |
| 372-379 | `normalizeEntryCollection` | pure helper |
| 381-403 | `selectWeightEntrySource` | pure helper |
| 405-412 | `resolveWorkoutTimestamp` | pure helper |
| 414-417 | `sanitizeCompletedWorkouts` | pure helper |
| 419-460 | `sanitizePersonalRecordEntries` | helper (calls `makeID`) |
| 462-487 | `sanitizeWorkoutForRoute` | pure helper |
| 489-498 | `formatVolumeValue` | pure helper |
| 500-533 | `sanitizeVolumeEntries` | helper (calls `makeID`) |
| 535-578 | `sanitizeRepsEntries` | helper (calls `makeID`) |
| 580 | `DEFAULT_X_AXIS_LABEL_COUNT` | const |
| 582-592 | `formatXAxisDateLabel` | pure helper |
| 594-620 | `buildXAxisLabels` | pure helper |
| 622-692 | `buildChartSeries` | pure helper |
| 694-711 | `niceNumber` | pure helper |
| 713-752 | `computeAxisMetrics` | pure helper |
| 754-778 | `formatAxisValue` | pure helper |
| 780-844 | `PointerLabelBubble` (React.memo) | component (weight tooltip) |
| 846-911 | `VolumePointerLabel` (React.memo) | component |
| 913-977 | `RepsPointerLabel` (React.memo) | component |
| 979-1056 | `PersonalRecordPointerLabel` (React.memo) | component |
| 1058-1329 | `AddMeasurementModal` | component (own state, date pickers) |
| 1331-1426 | `ManageMeasurementsModal` | component (DEAD, see B1) |
| 1428-4028 | `ProgressSection` | main component (2601 lines: hooks 1429-2683, JSX 2685-4027) |
| 4030-4761 | `styles` (146 keys) | StyleSheet |
| 4763 | default export | |

---

## B. Verified dead code

Machine findings: all 15 ESLint findings were re-run (`SPX/tools/lint.sh`) and verified by hand. knip reported no unused exports (correct: one default export, one importer).

### B1. Certain (remove)

| # | Identifier | Kind | Location | Evidence |
|---|---|---|---|---|
| 1 | `Image` | unused import | P:11 | No other occurrence of `Image` in the file. |
| 2 | `Weight` (iconsax-react-native) | unused import (whole import line) | P:22 | No other occurrence. Removing the line removes this file's only use of `iconsax-react-native`. |
| 3 | `METRIC_COLORS.*.areaFrom`, `.areaTo` | unused object properties (6 lines) | P:58-59, 68-69, 78-79 | `grep -n "areaFrom\|areaTo"` hits only the definitions. The gradients use `METRIC_COLORS.x.line` with stopOpacity instead (P:2975-2981 etc.). |
| 4 | `resolvedRankScore` | unused `useMemo` | P:1578-1590 | Assigned, never read (ESLint 1578:11). |
| 5 | `resolvedRankLabel` | unused `useMemo` | P:1563-1576 | Assigned, never read (ESLint 1563:11). |
| 6 | `resolvedRankTier` | `useMemo` only consumed by #5 | P:1548-1561 | Only other references are P:1575-1576 inside `resolvedRankLabel`. Dead once #5 goes. The whole block P:1548-1590 (43 lines + blank 1591) can go. No side effects (pure memos). |
| 7 | `ManageMeasurementsModal` | component that can never be visible | def P:1331-1426, render P:4009-4016 | Its `isVisible` is `isManageModalVisible` (P:1442). The setter is only ever called with `false` (P:2158, P:2176); nothing sets it to `true`. `git log -S"setIsManageModalVisible(true)"` + `git show` confirm the trigger (`onPress={() => setIsManageModalVisible(true)}`) was added in 0712b457 and removed in 820d63a6 (the unused `styles.manageButton`/`manageButtonLabel` are its remains; the "See Weight Measurements" row P:3980-4004 replaced it). RN 0.73 `Modal` returns `null` when `visible !== true` (`node_modules/react-native/Libraries/Modal/Modal.js:222`), so removing the element changes nothing on screen. |
| 8 | `isManageModalVisible` / `setIsManageModalVisible` | state never true | P:1442 (+ calls 2158, 2176) | See #7. |
| 9 | `handleCloseManageModal` | callback only passed to #7 | P:2174-2177 (used 4011) | |
| 10 | `handleEditEntry` | callback only passed to #7 | P:2157-2161 (used 4013) | |
| 11 | `handleRequestDelete` | callback only passed to #7 | P:2138-2155 (used 4014) | |
| 12 | `handleDeleteMeasurement` | callback only used by #11 | P:2128-2136 (used 2149, 2154) | |
| 13 | `styles.muscleBadgeText` | unused style | P:4197-4201 | ESLint + grep `styles.muscleBadgeText`: 0 uses; no `styles[...]` dynamic access anywhere in the file. |
| 14 | `styles.hexOverallValue`, `hexGrid`, `hexStatItem`, `hexStatLabel`, `hexStatValue` | unused styles | P:4255-4280 (contiguous) | Same check. |
| 15 | `styles.manageButton`, `manageButtonLabel` | unused styles | P:4326-4337 (contiguous) | Same check. |
| 16 | 20 `manage*` styles: `manageModalWrapper`, `manageModalCard`, `manageHeader`, `manageTitle`, `manageCloseButton`, `manageCloseButtonText`, `manageList`, `manageListContent`, `manageItem`, `manageItemInfo`, `manageItemWeight`, `manageItemTimestamp`, `manageActions`, `manageActionButton`, `manageEditButton`, `manageDeleteButton`, `manageEditLabel`, `manageDeleteLabel`, `manageEmptyState`, `manageEmptyText` | styles used only by #7 | P:4663-4760 (contiguous, 98 lines) | Per-component style-usage map computed for the whole file: these 20 keys are referenced only inside P:1331-1426. (`modalRoot`, `modalBackdrop`, `modalCardWrapper`, `modalButton` are shared with AddMeasurementModal and stay.) |

### B2. Second-order dead (follows from B1 #7-#12; remove with care, in the same pass)

| # | Identifier | Location | Evidence / what to do |
|---|---|---|---|
| 17 | `entryToEdit` / `setEntryToEdit` state | P:1443; setter calls 2122, 2159, 2164, 2171; reads 4021, 4023, 4024 | The only call with a non-null argument is `handleEditEntry` (P:2159, dead #10). After B1 the state is constantly `null`. Then: P:4021 `unit={entryToEdit?.unit \|\| latestUnit}` is `unit={latestUnit}`; P:4023 `initialEntry={entryToEdit}` is `initialEntry={null}` (can be omitted: the modal treats `undefined` and `null` the same, P:1075 `mode === "edit" && initialEntry`, P:1118 `initialEntry?.id`, P:1183 `initialEntry?.unit \|\| unit`); P:4024 `mode={entryToEdit ? "edit" : "create"}` is the default `"create"`. Delete the state line and the three `setEntryToEdit(null)` calls. NOTE: the effect at P:1073-1092 has `initialEntry` in its deps; `null` -> `undefined` once at refactor time does not matter (new build). |
| 18 | edit branch of `handleSubmitMeasurement` | P:2090-2106 (`if (entryId) { ... } else {`) | `entryId` comes from `initialEntry?.id` (P:1118) which is always `undefined` once #17 holds. Only the `else` body (P:2107-2116) can run. If AddMeasurementModal becomes a shared component (C2) keep the modal's edit support (W uses it) and simplify only this handler in P. If the implementer prefers not to touch the handler body, leaving the branch is harmless. |
| 19 | `"Measurement not found"` alert | P:2091-2095 | Part of #18. |

### B3. Constant conditions / redundant code (safe simplifications, each behaviour-preserving)

| # | What | Location | Why it is redundant |
|---|---|---|---|
| 20 | `buildMetricDeltaDisplay(delta, unitLabel, formatter)`: parameter `unitLabel` never used in the body | def P:291; callers P:1514, 1529, 1542-1546, 1621 | Body P:292-303 never reads it. Callers compute an argument just to throw it away (P:1544 even has a ternary). Removing the parameter means editing the 4 call sites. E:1117 has the same unused parameter (see C). |
| 21 | `displayVolumeUnit` / `latestVolumeUnit` aliases of `displayPreferredUnit` | P:1511-1512 (uses 1514, 2878, 3114) | Pure aliases. Optional. |
| 22 | `completedWorkoutsCount` `Array.isArray(completedWorkouts) ? ... : 0` | P:1468-1471 | `sanitizeCompletedWorkouts` always returns an array (P:414-417). |
| 23 | `if (!axisMetrics) return [];` x4 | P:1647, 1662, 1677, 1695 | `computeAxisMetrics` always returns an object (P:713-752). |
| 24 | `useMemo(...) \|\| []` | P:1783-1786 | `buildXAxisLabels` always returns an array. |
| 25 | `Array.isArray(personalRecordSeries?.points) ? personalRecordSeries.points : []` | P:1803-1805 | `buildChartSeries` always returns `points` as an array (P:626, 664, 686). Replacing by `personalRecordSeries.points` (like the three siblings P:1800-1802) also removes the ESLint exhaustive-deps warning at 1803:11, because the "new `[]` every render" branch disappears. |
| 26 | `formatXAxisDateLabel`: `if (span <= oneWeek) return ...format("MMM D")` | P:586, 589 | The next line returns the same format for `span <= threeMonths`; the week branch is subsumed. (See I5: maybe a different week format was intended.) |
| 27 | `selectWeightEntrySource`: `normalized.length >= 0` | P:394 | Always true. Identical code in W:128; if the helper is shared (C1) fix once or leave verbatim. |
| 28 | `{overallHexDisplay ? (...) : null}` | P:2705-2710 | `overallHexDisplay` is `overall?.display \|\| "--"` (P:2427): always truthy. |
| 29 | `tab.icon ? ... : null`, `METRIC_COLORS[tab.key] \|\| {}`, `palette.x \|\| fallback` | P:2265-2268, 2290-2297 | All three tabs are literal objects with `icon` and a `METRIC_COLORS` entry (P:2254-2256, 55-86). Fallbacks never used. Optional: only touch if the toggle row is extracted. |
| 30 | Inline `{ backgroundColor: theme.bg, paddingBottom: 0 }` | P:2773 | Duplicates values already in `styles.topPagerDots` (P:4128-4137). Visual no-op. |
| 31 | Empty style keys `volumeCard`, `header`, `metricsRow`, `weightGroup` and their uses | defs P:4316-4317, 4318, 4349, 4350; uses P:2857 (`volumeCard`), 2863, 3143, 3423, 3714 (`header`), 2875, 3155, 3441, 3730 (`metricsRow`), 2876, 3156, 3442, 3731 (`weightGroup`) | `{}` in a style array is a no-op. Removing key + usages is a visual no-op; 13 one-line edits. Low value, zero risk; do it only if those JSX lines are being touched anyway (e.g. when the repeated chart blocks are extracted, D stage 4). |
| 32 | `styles.weightCard` `{ backgroundColor: theme.bg }` | P:4313-4315, use 3711 | Same value as `styles.card.backgroundColor` (P:4310) which precedes it in the same array. No-op override. Optional. |
| 33 | Non-navigable fallback `<Text>` branch in the three pointer labels (`canNavigate` false) | P:893-903, 959-969, 1027-1037 | In P `onWorkoutPress` is always `handleNavigateToPastWorkout` (P:3116, 3395, 3687), so `canNavigate` (P:854, 920, 988) is always true. KEEP if these labels are ever merged with U's versions (there `onWorkoutPress` is optional); otherwise removable. Recommend: keep (generic defensive code, 33 lines). |
| 34 | Default values `accent = CHART_ACCENTS.standard` | P:111, 155 | Every call site passes `accent` (ChartBubble: P:3065, 3345, 3637, 3915; PointerBubbleCard: P:829, 859, 925, 993). `CHART_ACCENTS.standard` (P:89) is referenced only by these two defaults. Keep if the components become shared (E relies on the same default value). |

### B4. KEEP (looks removable, is not)

| Identifier | Location | Why keep |
|---|---|---|
| `scrollSignal` prop + effect | P:1428, 2653-2665 | In the live app `progressScrollSignal` stays 0 (`2_Competition.js:64`; its only setter is in `handleRequestBodyWeightEntry`, `2_Competition.js:160-163`, which is passed only to the commented-out PARKED `LeaderboardsSection`, `2_Competition.js:232-240`). It is part of the Compete restore path, so KEEP exactly as is. |
| `onScroll` prop + `handleScrollEvent` + `scrollEventThrottle={16}` | P:1428, 2667-2674, 2692-2693 | The parent passes a no-op (`2_Competition.js:170-172`, "keep callback for compatibility with section props"). Removing it is a ladder-and-weight decision (see G7). |
| `try { return global?.userData \|\| null } catch` | P:1429-1435 | Defensive `global.*` access, explicitly out of scope. |
| Legacy weight sources (`weightEntries`, `bodyweightEntries`, `bodyweightLog`, `progress.bodyweightEntries`) | P:383-389, 2039-2041 | Data-shape compatibility with older user docs; Firestore field shapes must not change. |

No `console.*` calls, no commented-out code, no TODO markers in the file (grep verified). Comments at P:110, 238, 2417, 2661 explain intent: keep.

Estimated certain removal (B1 + B2): about 360 lines (2 imports, 6 colour lines, 44 rank memos, 97 manage modal, 41 handlers/state, 8 JSX, ~23 entryToEdit chain, 141 style lines).

---

## C. Duplication

Method: every helper name was grepped repo-wide (`frontend backend shared functions scripts App.js tests`), bodies extracted and compared after normalising indentation and quote style; the non-identical ones were then read side by side.

### C1. Helpers with other definitions in the repo

| Helper | Locations | Identical? | Notes / canonical home |
|---|---|---|---|
| `toMillisSafe` | P:219-262, U:63-106, E:199-243; different bodies: M:223-253 (inner function), `frontend/utils/livePostMeta.js:1-27`, `frontend/helper/feedRanking.js:1-16`, `functions/index.js:3553-3587`, DEAD `frontend/utils/workoutLinking.js:4` | P = U (only the comment text differs). P = E for every input: E:202 uses `Number.isNaN(getTime()) ? 0 : getTime()` (same result as P:222-225 since `getTime()` is NaN or finite) and E:239 `new Date(trimmed).getTime()` (spec-equal to `Date.parse(trimmed)`, P:258). The other four differ (livePostMeta/functions return `null`, feedRanking/M do not handle `_seconds`/nanoseconds the same way). | Canonical: one export `toMillisSafe` (the P body) in a utils module, e.g. `frontend/utils/date.js` (currently holds a different, looser `toMillis`; keep both). Replace P, U, E copies only. Do NOT merge with livePostMeta / feedRanking / M / functions. |
| `resolvePreferredWeightUnit` | P:264-276, W:33-45, M:86-98; different: U:244-255, E:1086-1102 | P = W = M (byte-identical modulo nothing). U returns `"lbs"` and lacks the `includes("kilo")` test. E reads only `settings.units ?? units`, falls back to `global.userData`, and requires exactly `"kg"`. | Canonical: `frontend/utils/weightEntries.js` (already the weight utils module, imported by P and W only) or a new `frontend/utils/weightUnits.js`. Replace P, W, M. Leave U and E. |
| `toDisplayWeightUnit` | P:278-289, W:47-58, M:100-111, E:1104-1115; different: U:494-500 | P = W = M = E (E differs only in quote style). U returns `fallback` for unknown units where P returns the trimmed input, and matches `startsWith("k")` instead of `"kg"`. | Same home as above. Replace P, W, M, E. Leave U. |
| `buildMetricDeltaDisplay` | P:291-304, E:1117-1130 | Body identical; default `formatter` differs (`formatVolumeValue` in P, `formatNumberCompact` in E). P always passes the formatter (P:1514, 1529, 1542, 1621); E relies on its default at E:2220, 2233. | Partly. Shareable only as `(delta, formatter)` with the formatter required and E passing `formatNumberCompact` explicitly. Low value; recommend leaving both, and only dropping the unused `unitLabel` parameter locally (B3 #20). |
| `formatWeightValue` | P:306-311, W:60-65, M:174-180, E:856-860, `sections/ExercisesSection.js:62-71` | All five differ: P returns `"00"`/trimmed decimal, W `"00.0"`/always one decimal, M `null` and integer above 100, E `"—"` + compact, ExercisesSection thousands-separated integer. | NOT dedupable. Leave all. |
| `formatTimestamp` | P:313-321, U:268-276, `PastWorkoutScreen.js:82`, `SimpleFeedPost.js:75` | P vs U differ only in the fallback string (`"No Logged Data"` vs `"No data yet"`). The other two are unrelated implementations. | NOT identical. Leave. |
| `normalizeToMinute`, `clampDateToNow`, `mergeDateByMode` | P:323, 325-330, 332-349; W:134, 136-141, 143-160 | Identical. Used only by `AddMeasurementModal` in both files. | Move with the shared modal (C2). |
| `sanitizeEntries` | P:351-370, W:67-86 | Identical. | `frontend/utils/weightEntries.js` (needs `makeID` import from `backend/helper/makeID`). |
| `normalizeEntryCollection` | P:372-379, W:106-113 | Identical. | Same. |
| `selectWeightEntrySource` | P:381-403, W:115-132 | Semantically identical (W writes the two `if`s on one line each). | Same. |
| `WORKOUT_TIMESTAMP_FIELDS` + `resolveWorkoutTimestamp` | P:53 + 405-412, E:159 + 1014-1021; different: U:108-116 (also `createdAt`, `timestamp`), M:255-263 (six fields), `MacroTracking.js:135-152` | P = E. Others differ in which fields count. | Share P/E only (with `toMillisSafe`). |
| `sanitizeCompletedWorkouts` | P:414-417, U:118-121, E:1065-1068 | Identical x3. | Trivial (`Array.isArray(raw) ? raw.filter(Boolean) : []`); share alongside `resolveWorkoutTimestamp`. |
| `sanitizePersonalRecordEntries` | P:419-460, U:208-242 | Different: U drops workouts with zero PRs (`increment <= 0`), builds `wid` from more fields and as `null` instead of `''`, uses `pr-${idx}` ids instead of `makeID()`. | Leave both. |
| `sanitizeWorkoutForRoute` | P:462-487, E:873-898 identical; a second, different variant is shared by `1_Feed.js:274-313`, `UserStats/UserStatsExerciseDetailScreen.js:101-140`, `UserStats/UserStatsModal.js:35-72` (those three identical to each other; they normalise sets) | Two families. | Share P/E as one export; the three others as another. Do not merge the two families. |
| `formatVolumeValue` | P:489-498, U:257-266 | Identical. | Share. |
| `sanitizeVolumeEntries`, `sanitizeRepsEntries` | P:500-533 / 535-578, U:123-163 / 165-206 | Different: U reads extra source fields (`metrics.volume`), different `wid` rule (`null` vs `''`, more fields), index-based ids. | Leave both. |
| `DEFAULT_X_AXIS_LABEL_COUNT` | P:580 (5), E:265 (5), U:17 (4) | P = E; U differs. | With `buildXAxisLabels`. |
| `formatXAxisDateLabel` | P:582-592, E:267-278 | Not identical: E adds `if (!Number.isFinite(timestamp) \|\| timestamp <= 0) return ''` (E:268). Differs only for timestamps <= 0 (in P reachable only with a corrupt negative `recordedAt` in a weight entry). | Partly. Leave both, or share P's and keep E's guard at E's call site. |
| `buildXAxisLabels` | P:594-620, E:280-303, U:427-453 | P = E semantically (brace style only) but each calls its own `formatXAxisDateLabel` (above). U always formats `"MMM D"` and defaults to 4 labels. | Shareable P/E only if `formatXAxisDateLabel` is passed in or unified; otherwise leave. |
| `buildChartSeries` | P:622-692, E:379-449, U:338-399 | P = E byte-identical (quotes). P = U for every input: U divides by `Math.max(yRange, 1)` where `yRange` is already `Math.max(.., 1)`, and omits the `if (!points.length)` early return, which is unreachable (P:625 already returned for an empty `chartData`). | Share x3: new `frontend/components/charts/chartUtils.js`. |
| `niceNumber` | P:694-711, U:278-295, E:305-322 | Identical x3. | Same module. |
| `computeAxisMetrics` | P:713-752, U:297-336, E:324-360 | P = U; E differs only in formatting (`min -= 1`, one-line `if`). Identical behaviour x3. | Same module. |
| `formatAxisValue` | P:754-778, U:401-425, E:362-377 | P = U; E formatting only. Identical behaviour x3. | Same module. |
| `accentToRgba(accent, alpha)` | P:104-108, E:193-197, U:488-492 | Identical x3. (U:31 is a different inner one-liner inside U's ChartBubble.) | Same module. |
| `ChartBubble` | P:110-151, E:451-492, U:25-61 | P = E (comment + quote only; both default to `{100,160,255}`). U: different default accent (`{45,158,255}`) and no alpha clamp (irrelevant for the constants passed). | Share P/E as `frontend/components/charts/ChartBubble.js`. Leave U, or let U pass its accent explicitly. |
| `PointerBubbleCard` | P:153-217, U:502-560 | JSX identical (jscpd U:505-562 == P:162-219) and its 6 styles are identical (P:4454-4487 == U same keys). Only the default accent differs (P: `CHART_ACCENTS.standard` via default param; U: `accent \|\| CHART_ACCENTS.volume`, and U does rely on it when `activeMeta.accent` is undefined). | Partly. Shareable as `frontend/components/charts/PointerBubbleCard.js` with `accent` required and U passing `accent \|\| CHART_ACCENTS.volume`. |
| `VolumePointerLabel`, `RepsPointerLabel`, `PersonalRecordPointerLabel` | P:846-911, 913-977, 979-1056; U:562-626, 628-691, 693-768 | Different: U takes `accent` as a prop, formats the timestamp through its own `formatTimestamp`, `canNavigate` also requires `workoutName`, not memoised, and `styles.pointerBubbleLineSpacing` differs between the files. | Leave both. |
| `METRIC_COLORS` | P:55-86, E:160-185 | Different shape: P key `personalRecords` + `areaFrom/areaTo`; E key `prs`, no area colours. Remaining per-metric values are equal. | Leave both (after B1 #3 the per-metric objects are equal but the key names are not). |
| `CHART_ACCENTS` | P:88-94, E:186-191, U:18-22 | All different key sets / values. | Leave. |
| `BODYGRAPH_OUTLINE_COLOR = "#40485c"` | P:102, `PastWorkoutScreen.js:39`, `SimpleFeedPost.js:45`, `FeedSnapshotCard.js:60`, U:16 (named `MUSCLE_OUTLINE_COLOR`) | Identical value x5. | One export, e.g. from `frontend/utils/muscleTierColors.js` (already imported by P and U for the muscle fills). |
| user-data subscription boilerplate (`useState(() => global.userData)` + `subscribeUserData` effect) | P:1429-1458, W:437-460 (identical incl. `userRef`), M:432-443 and `ExercisesSection.js:193-211` (same without `userRef`) | P = W. M / ExercisesSection are the same minus the ref. | Candidate hook `useLiveUserData()` returning `{ userData, userRef }` (23 files call `subscribeUserData`; no shared hook exists today). Cross-partition decision; not required for P. |

### C2. `AddMeasurementModal` (largest cross-file clone)

- P:1058-1329 vs W:162-433: `diff` shows 3 differing lines only:
  - P:1068 / P:1071 initialise state with `normalizeToMinute(new Date())`, W:172 / W:175 with `clampDateToNow(new Date())`. These are equivalent: `clampDateToNow(new Date())` normalises the value and returns it unless it is after "now" (it never is).
  - P:1198 `() => { }` vs W `() => {}`.
- The 31 style keys the modal uses are identical in both files and contiguous in both: P:4500-4662 == W:923-1085 (compared key by key: `modalRoot`, `modalBackdrop`, `modalCardWrapper`, `modalCard`, `modalTitle`, `modalSubtitle`, `modalField`, `modalLabel`, `modalInput`, `selectorButton`, `selectorButtonDisabled`, `selectorButtonText`, `datetimeRow`, `datetimeColumn`, `datetimeColumnLeft`, `nowButton`, `nowButtonText`, `modalActions`, `modalButton`, `cancelButton`, `cancelButtonText`, `saveButton`, `saveButtonDisabled`, `pickerOverlay`, `pickerBackdrop`, `pickerSheet`, `pickerToolbar`, `pickerToolbarButton`, `pickerToolbarButtonText`, `iosPicker`, `saveButtonText`).
- Canonical home: new `frontend/components/weight/AddMeasurementModal.js` (component P:1058-1329 + helpers P:323-349 + `toDisplayWeightUnit` import) and `frontend/components/weight/AddMeasurementModal.styles.js` (P:4500-4662). P and W import it. Same props (`isVisible, onDismiss, onSubmit, unit, isSaving, initialEntry, mode`).

### C3. Weight persistence handlers (P vs W)

P:2016-2161 vs W:515-660: `getCurrentSanitizedEntries` differs (W prefers its live Firestore snapshot, W:515-521), `handleEditEntry` differs by one line (P:2158), everything else (`persistEntries` P:2021-2058, `handleSubmitMeasurement` P:2060-2126, `handleDeleteMeasurement`, `handleRequestDelete`) is identical. These are stateful closures over `setIsSaving`, `setIsModalVisible`, `setEntryToEdit`, `userRef`, so do NOT extract a shared hook in this pass. Optional clean seam: the Firestore write itself (P:2036-2044 == W equivalent) as one async function `saveWeightEntries(uid, sanitizedEntries)` next to `derivePublicWeightFields` in `frontend/utils/weightEntries.js`. After B1/B2, P keeps only `persistEntries` + the create path, so the overlap shrinks by itself.

### C4. Duplication inside P

| Cluster | Locations | Identical? |
|---|---|---|
| `wid` resolution expression (4 lines) | P:435-439, 516-519, 561-564, 1485-1489 | Identical expression x4. A local `resolveWorkoutWid(workout)` would replace them. |
| `sanitizeVolumeEntries` / `sanitizeRepsEntries` | P:500-533 vs 535-578 | Same shape; only the value extraction (P:506 vs 541-551) and variable name differ. |
| Y tick computation | P:1646-1654, 1661-1669, 1676-1684, 1694-1702 | Identical x4 modulo variable name. A pure `buildYTickValues(axisMetrics)` replaces them. |
| Pointer activation callback | P:1788-1798, 1850-1860, 1905-1915, 1947-1957 | Identical x4 modulo names. |
| Chart touch -> nearest point | P:1807-1832, 1862-1887, 1917-1942, 1959-1984 | Identical x4 modulo names. |
| PanResponder | P:1834-1845, 1889-1900, 1986-1997, 1999-2014 | Identical x4 modulo names. |
| Pointer label `left` clamp | P:2320-2327, 2332-2339, 2346-2353, 2366-2379 | Identical x4 modulo names. |
| clear-timeout / show / schedule-hide | P:2439-2465 (x4), 2467-2505 (x4), 2507-2581 (x4) | Identical x4 modulo names. |
| "no data" reset effect | P:2583-2595, 2597-2609, 2611-2623, 2625-2641 | Identical x4 modulo names. |
| Chart card JSX: volume vs reps | P:2852-3132 vs 3133-3411 | After renaming `volume`->`reps` the only differences are: `styles.volumeCard` (empty style, P:2857), the `unit={displayVolumeUnit}` prop (P:3114) and the empty-state text (P:3124 vs 3403). |
| Chart card JSX: PR | P:3413-3703 | Same structure; differences: title/hint text (P:3427-3435), data test `personalRecordChartPoints.length` (P:3484) instead of `has*ChartData` (equivalent), gradient id `totalPersonalRecordsGradient`, grid key prefix, bubble key `personal-record-point-${index}` (P:3633; PR points have no `.entry`), accent key `prs`, tooltip shown on `personalRecordActivePoint` (P:3668) instead of `*ActiveEntry`. |
| Chart card JSX: weight | P:3707-4005 | Same skeleton; differences: header has the "+ Add Measurement" button (P:3717-3726), gradient uses two fixed colours with string opacities (P:3827-3832), line stroke `"#7FB7FF"` (P:3874), strip colour literal (P:3904), tooltip `pointerEvents="none"` (P:3948; the other three are `"box-none"` because they contain a Pressable), footer is the measurements row (P:3980-4004) instead of the metric toggle. |
| Identical sub-blocks x4 inside the cards | Y-axis labels P:2914-2955 / 3194-3235 / 3486-3525 / 3769-3809; grid lines P:2986-3010 / 3266-3290 / 3556-3582 / 3836-3860; axis lines P:3031-3046 / 3311-3326 / 3603-3618 / 3881-3896; X-axis labels P:3070-3094 / 3350-3374 / 3642-3666 / 3920-3944; value/unit/delta/summary row P:2875-2899 / 3155-3179 / 3441-3471 / 3730-3754; chart wrapper style P:2901-2911 / 3181-3191 / 3473-3483 / 3756-3766 | Identical modulo data variable and React key prefix (keys only need to be unique among siblings, so the prefix is not behaviour). |
| Pointer label components | P:846-911 vs 913-977 vs 979-1056 (jscpd: 897-913 == 963-979) | Same card, different label/unit/accent; PR adds the "No new PRs" line. |

U already contains a generic `ChartCard` component (U:770-1115) that solves the same problem for the preview; P never adopted it.

---

## D. Decomposition plan for ProgressSection.js (4763 lines)

Guiding constraints found while reading:
- Everything outside `ProgressSection` (P:53-1426) is closure-free and can be moved byte-for-byte.
- All sub-components reference the single module-level `styles`. `styles` therefore has to leave P first (otherwise the new files would import from P and P from them: an import cycle).
- `buildMetricDeltaDisplay` (P:291) has a default parameter referencing `formatVolumeValue` (P:489): keep both in the same module.
- Inside `ProgressSection`, the chart JSX closes over ~13 geometry values (P:1704-1746) that are render-invariant (functions of `scaleSize` and `DEVICE_WIDTH`, both fixed at module load, `layoutConstants.js:4-17`). They block extraction only until they are hoisted to module scope.
- Pointer state (`*ActiveIndex`, opacity values, timeouts) must stay in `ProgressSection` (or in hooks called by it): the metric cards unmount when the toggle changes (P:2852, 3133, 3413) while the pointer state survives; moving that state into a card component would change behaviour.

Use the read-only baseline as the source for every move so line numbers never shift:
`sed -n 'A,Bp' /tmp/claude-501/spx/baseline/frontend/components/2_Competition/sections/ProgressSection.js`.

New files under `frontend/components/2_Competition/sections/progress/` need one more `../` than P for every relative import (e.g. `../../../../theme/mfpDark`, `../../layoutConstants`, `../../../charts/chartStyles`).

### Stage 1: pure moves (low risk)

| New module | Moves (baseline lines) | Adds | Notes |
|---|---|---|---|
| `sections/progress/progressConstants.js` | P:53 (`WORKOUT_TIMESTAMP_FIELDS`), 55-86 (`METRIC_COLORS`, minus the 6 dead `areaFrom/areaTo` lines), 88-94 (`CHART_ACCENTS`), 96-101 (`POINTER_PANEL_ACCENTS`), 102 (`BODYGRAPH_OUTLINE_COLOR`, unless taken from a shared constant per C1) | `export` on each | No imports needed. |
| `frontend/components/charts/chartUtils.js` (shared; or `sections/progress/chartUtils.js` if cross-partition sharing is not adopted) | P:104-108 `accentToRgba`, 580 `DEFAULT_X_AXIS_LABEL_COUNT`, 582-592 `formatXAxisDateLabel`, 594-620 `buildXAxisLabels`, 622-692 `buildChartSeries`, 694-711 `niceNumber`, 713-752 `computeAxisMetrics`, 754-778 `formatAxisValue` | `import dayjs`; named exports | Pure. E and U can import the identical ones (C1). |
| `frontend/components/charts/ChartBubble.js` (shared with E; or local) | P:110-151 | imports `React`, `{ Circle, G }` from react-native-svg, `scaleSize`, `accentToRgba`; default accent: either import `CHART_ACCENTS` from progressConstants (local variant) or replace `CHART_ACCENTS.standard` by a local `const DEFAULT_ACCENT = { r: 100, g: 160, b: 255 }` (shared variant; same value in P:89 and E:187) | The one-token default change is the only non-verbatim edit. |
| `sections/progress/PointerBubbleCard.js` (+ styles) (or shared `frontend/components/charts/PointerBubbleCard.js`, see C1) | component P:153-217; styles P:4454-4487 (6 keys: `pointerBubbleGlow`, `pointerBubbleHeaderRow`, `pointerBubbleAccentDot`, `pointerBubbleHeaderLabel`, `pointerBubbleHeaderDivider`, `pointerBubbleBody`) | imports `React`, `View`, `Text`, `StyleSheet`, `chartPointerStyles`, `scaleSize`, `ts`, `accentToRgba`, `CHART_ACCENTS` | Keep the local name `styles` inside the new file so the JSX moves verbatim. |
| `sections/progress/progressMetrics.js` | P:291-304 `buildMetricDeltaDisplay`, 306-311 `formatWeightValue`, 313-321 `formatTimestamp`, 405-412 `resolveWorkoutTimestamp`, 414-417 `sanitizeCompletedWorkouts`, 419-460 `sanitizePersonalRecordEntries`, 462-487 `sanitizeWorkoutForRoute`, 489-498 `formatVolumeValue`, 500-533 `sanitizeVolumeEntries`, 535-578 `sanitizeRepsEntries` | imports `dayjs`, `makeID`, `toMillisSafe`, `WORKOUT_TIMESTAMP_FIELDS` | `toMillisSafe` (P:219-262) goes to the shared utils module (C1) or, without cross-partition sharing, into this file. |
| `frontend/utils/weightEntries.js` (existing, partition utils-logic; extend) or, without sharing, `sections/progress/weightEntryUtils.js` | P:264-276 `resolvePreferredWeightUnit`, 278-289 `toDisplayWeightUnit`, 351-370 `sanitizeEntries`, 372-379 `normalizeEntryCollection`, 381-403 `selectWeightEntrySource` | `import makeID from "../../backend/helper/makeID"`; named exports | Names are generic (`sanitizeEntries`): keep the names (rule 3) and let importers alias if they want. |
| `frontend/components/weight/AddMeasurementModal.js` + `AddMeasurementModal.styles.js` (shared with W; or `sections/progress/AddMeasurementModal.js`) | component P:1058-1329; helpers P:323 `normalizeToMinute`, 325-330 `clampDateToNow`, 332-349 `mergeDateByMode`; styles P:4500-4662 (31 keys, contiguous) | imports: `React, { useCallback, useEffect, useMemo, useState }`, `Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View`, `DateTimePicker, { DateTimePickerAndroid }`, `RNBounceable`, `dayjs`, `toDisplayWeightUnit`; styles file: `Platform, StyleSheet`, `theme`, `scaleSize, ts` | `pickerSheet` uses `Platform.OS` (P:4633), `modalBackdrop/pickerOverlay/pickerBackdrop` use `StyleSheet.absoluteFillObject`. |
| `sections/progress/PointerLabels.js` | P:780-844 `PointerLabelBubble`, 846-911 `VolumePointerLabel`, 913-977 `RepsPointerLabel`, 979-1056 `PersonalRecordPointerLabel`; styles P:4488-4499 (3 keys: `pointerBubbleDivider`, `pointerBubbleLineSpacing`, `pointerBubbleTimestampSpacing`) | imports `React`, `Pressable, StyleSheet, Text, View`, `dayjs`, `chartTypography`, `scaleSize`, `PointerBubbleCard`, `POINTER_PANEL_ACCENTS`, `formatWeightValue`, `formatVolumeValue`, `toDisplayWeightUnit` | Keep the `React.memo` wrappers. |
| `sections/progress/ProgressSection.styles.js` | P:4031-4196, 4202-4254, 4281-4325, 4338-4453 (the 78 keys used by the main component; the gaps are the dead keys of B1 #13-#15) | `import { StyleSheet }`, `theme`, `scaleSize, ts`; `export default styles` | P then does `import styles from "./progress/ProgressSection.styles"`. |
| (deleted, not moved) | P:1331-1426 ManageMeasurementsModal, styles P:4197-4201, 4255-4280, 4326-4337, 4663-4760 | | B1. |

What stays in P after stage 1: imports, the `ProgressSection` function (P:1428-4028 minus dead code) and the default export. About 2500 lines.

P's react-native import list after stage 1 + B: `Alert, Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View` (`StyleSheet.hairlineWidth` is still used in JSX at P:3006 etc.; `Keyboard, KeyboardAvoidingView, Modal, Platform, TextInput, Image` leave). `DateTimePicker`, `Weight` imports leave; `RNBounceable`, `Ionicons`, `dayjs`, `makeID`, `updateDoc`, `deleteField`, `derivePublicWeightFields`, svg imports (minus `Circle`, `G`) stay.

### Stage 2: fix declaration order inside the component (see E1; behaviour-preserving)

Move the block P:2430-2581 (pointer opacity `Animated.Value`s, hide-timeout refs, `clear*HideTimeout`, `show*Pointer`, `schedule*Hide`) to just above P:1788, and move the three state/ref pairs P:1847-1848, 1902-1903, 1944-1945 up next to P:1441-1444. No body changes.

### Stage 3: hoist render-invariant geometry (low risk, enables stage 4)

P:1640 (`sectionsCount`), P:1704-1711 and the body of the `chartGeometry` memo (P:1713-1735) depend only on module constants. Move them to module scope (e.g. `sections/progress/chartGeometry.js` exporting `CHART_HEIGHT`, `CHART_WIDTH`, ... and `CHART_GEOMETRY`), keep the same names in P via destructuring so the JSX does not change. `useMemo` deps that list them (P:1735, 1750, 1755, 1760, 1765, 1831, 1886, 1941, 1983, 2327, 2339, 2353, 2373-2379) keep working (constants). The same goes for `pointerLabelWidth` x4 (P:2319, 2331, 2345, 2365: all `scaleSize(184)`).

### Stage 4: component extractions from the main JSX (medium risk; props listed so the seam is explicit)

| New component (file under `sections/progress/`) | JSX moved | State/handlers moved with it | Props | Styles that move with it |
|---|---|---|---|---|
| `BodyOverviewPager.js` | P:2696-2784 | `topPagerIndex` state + ref (P:1445-1446), `handleTopPagerMomentum` (P:2676-2683) | `completedWorkoutsCount`, `completedWorkoutsCountLabel`, `overallHexDisplay`, `muscleFills`, `statsHexagon` | `topPagerContainer`, `bodyLabelOverlayContainer`, `bodyLabelOverlay`, `bodyLabelSubtitle`, `ovrPill`, `ovrPillLabel`, `ovrPillValue`, `topPagerPage`, `bodyCard`, `topPagerCard`, `bodyFiguresRow`, `bodyFigureSlot`, `bodyFigureSlotFront`, `bodyFigureSlotBack`, `bodyFigure`, `hexCard`, `hexGraphWrap`, `topPagerDots`, `topPagerDot`, `topPagerDotActive` (+ shared `card`) |
| `MuscleGroupList.js` | P:2785-2850 | none | `items` (= `muscleGroupScores`), `onPress` (= `handleMusclePress`) | `muscleListCard`, `muscleList`, `muscleRow`, `muscleLeft`, `muscleBadge`, `muscleIconContainer`, `muscleIconZoom`, `muscleLabelColumn`, `muscleLabel`, `muscleLabelOverall`, `muscleRight`, `muscleValue`, `muscleValueOverall` (+ `card`) |
| `MetricToggleRow.js` | body of `renderMetricToggleRow` P:2262-2311 | none (`activeMetricKey` stays in parent) | `tabs`, `activeKey`, `onSelect` | `metricToggleRow`, `metricToggleButton*`, `metricToggleIcon`, `metricToggleLabel*` |
| `ChartYAxisLabels`, `ChartGridLines`, `ChartAxisLines`, `ChartXAxisLabels`, `MetricSummaryRow` (one file `chartParts.js`) | the x4 identical sub-blocks listed in C4 | none | tick values + axis metrics, x labels, value/unit/delta/info | `yAxisLabelsContainer`, `yAxisLabel`, `xAxisLabelsOverlay`, `xAxisLabel`, `deltaGroup`, `deltaIcon`, `weightUnit`, `summaryText` |

`ChartGridLines` / `ChartAxisLines` render inside `<Svg>`; a function component returning a fragment of `<Line>`s is fine for react-native-svg.

### Stage 5 (optional, highest risk in this file): `useChartPointer` hook

One hook, called four times from `ProgressSection` in the order weight, volume, reps, PR, replaces the x4 clusters of C4 (activation, touch, PanResponder, clear/show/schedule, no-data effect, label-left). Signature that covers every closure the copies use: `useChartPointer({ points, hasData, leftMargin, innerWidth, plotWidth, rightMargin, labelWidth })` returning `{ activeIndex, activePoint, opacity, panHandlers, labelLeft }`. Write it by copying the weight version (P:1788-1845, 2316-2328, 2430-2444, 2467-2475, 2507-2524, 2583-2595) and renaming, not by re-deriving. Keep the single unmount cleanup semantics (P:2643-2651) by giving each hook instance its own cleanup. Only do this after stages 1-3 are verified; it is a rewrite, not a move.

### What blocks a clean extraction (summary)

- single shared `styles` object (solved by stage 1 ordering);
- use-before-define of `show*`/`schedule*` (solved by stage 2);
- geometry closures (solved by stage 3);
- pointer state must outlive the conditional cards (keep hooks in the parent);
- `activeMetricKey` initial state reads `has*ChartData` at first render (P:2246-2251): keep it in the parent after those values;
- keep three separate conditional card slots (P:2852, 3133, 3413) or give a unified card `key={activeMetricKey}`: today switching metric unmounts one card and mounts another; rendering one reused instance would keep native views (and gesture state) alive across the switch.

---

## E. Latent bugs

| # | Location | Problem | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | P:1795/1797 (`showWeightPointer`, declared 2467), P:1841-1842/1844 (`scheduleWeightHide`, 2507), P:1857/1859 (`showVolumePointer`, 2477), P:1896-1897/1899 (`scheduleVolumeHide`, 2526), P:1912/1914 (`showRepsPointer`, 2487), P:1954/1956 (`showPersonalRecordPointer`, 2497), P:1993-1994/1996 (`scheduleRepsHide`, 2545), P:2006-2007/2012 (`schedulePersonalRecordHide`, 2564) | Eight `const` callbacks are read in hook dependency arrays about 650 lines before they are declared. With real ES semantics this is a TDZ `ReferenceError` on first render. It works today only because Babel's block-scoping transform turns `const` into `var`: the deps arrays contain `undefined` forever, and the closures find the function later because it has been assigned by the time they run. It breaks the day the transform profile changes (e.g. `hermes-stable`). | Reorder only: move P:2430-2581 above P:1788 (D stage 2). Behaviour is preserved: the moved callbacks are referentially stable (deps are `useCallback(..., [])` results and `useRef(...).current`), so the dependency arrays go from "always `undefined`" to "always the same function", i.e. the memoised values are recomputed at exactly the same times as before. | High (analysis); fix is safe |
| E2 | P:2518-2521, 2537-2540, 2556-2559, 2575-2578 | The fade-out `.start(() => { ref.current = null; setActiveIndex(null); })` callback ignores `finished`. `Animated`'s `stopAnimation()` invokes that callback synchronously with `{ finished: false }`. If the user touches the chart again during the 200 ms fade-out, `handle*PointerActivate` first sets the new index (P:1793-1794) and then `show*Pointer()` calls `stopAnimation()` (P:2469), whose interrupted callback wipes the index again; the tooltip only reappears on the next move event, and a plain tap is lost (release then finds `ref.current == null`, P:2509, and schedules nothing). | `.start(({ finished }) => { if (!finished) return; ... })`. This changes behaviour (fixes an edge case), so by rule 2 do NOT apply silently: listed as open question I3. The same pattern probably exists in E and U. | Medium |
| E3 | P:2036-2045 | `persistEntries` returns `true` after `Promise.all` regardless of the resolved values. `backend/helper/firebase/updateDoc.js` resolves `false` (does not throw) for `not-found` / `permission-denied` on `usersPrivate` / `usersPublic`; in that case the modal closes as if saved. Same code in W. | Unclear (alert? return false?). Do not change; open question I4. | Low-medium |
| E4 | P:1803-1805 | Not a runtime bug: ESLint's exhaustive-deps warning (new `[]` each render) refers to a fallback branch that can never run. | B3 #25 (`const personalRecordChartPoints = personalRecordSeries.points;`). | High |

No references to undefined names (no-undef clean), no duplicate object keys (146 style keys checked with `uniq -d`; `METRIC_COLORS` checked by eye), no hooks called conditionally (pointer labels return early at P:781, 847, 914, 980 but call no hooks).

---

## F. Best-practice issues worth fixing

| # | Issue | Location | Suggested change | Risk |
|---|---|---|---|---|
| F1 | Import grouping: third-party imports sit among local ones | P:28 (`firebase/firestore`), P:33 (`react-native-svg`) | Group: react; react-native; third-party (datetimepicker, bounceable, navigation, vector-icons, dayjs, firebase/firestore, react-native-svg); local. None of these imports has side effects that depend on order. | None |
| F2 | Use-before-define of hook callbacks | see E1 | D stage 2 | Low |
| F3 | Render function memoised with `useCallback` and called as a function (`renderMetricToggleRow()`) | P:2260-2314, calls 3129, 3408, 3700 | Turn into a `MetricToggleRow` component (D stage 4). | Low |
| F4 | Render-invariant values recomputed every render and wrapped in `useMemo` with constant deps | P:1640, 1704-1735, 2319, 2331, 2345, 2365 | Hoist to module scope (D stage 3). | Low |
| F5 | Four copies of the same hook pipeline and of the same JSX | C4 | D stages 4-5. | Medium |
| F6 | `setState` called inside another state updater | P:1134-1139 (`setIosDraftDate` inside `setSelectedDate((prev) => ...)`) | Leave as is in this pass: identical in W:238-243, and rewriting it is not a move. If the modal is shared, the oddity then exists once. | n/a (leave) |
| F7 | Anonymous arrow components inside `React.memo` (no display name) | P:780, 846, 913, 979 | Cosmetic; leave. | n/a |
| F8 | Inline style objects for constant values | P:2719, 2752 (`{ width: DEVICE_WIDTH }`), 2773 (duplicate of the style), 2904-2909 and its three siblings, 2917, 2960 and siblings | After stage 3 these can become StyleSheet entries; optional. P:2773's inline object is removable now (B3 #30). | Low |
| F9 | Unused parameter | P:291 (`unitLabel`) | B3 #20. | Low |
| F10 | Mixed quote style inside one file: `''` in the `wid` expressions | P:437-439, 517-519, 562-564, 1487-1489 | Leave (rule 6), unless replaced by a `resolveWorkoutWid` helper. | n/a |
| F11 | Mis-indented JSX | P:2298-2307, 2785-2791 | Leave unless the lines are moved (rule 6); if the block is extracted, the new file can be indented correctly because every line is new there anyway. | n/a |

Effects and cleanup were checked: the user-data subscription returns its unsubscribe (P:1452-1458); all four hide timeouts are cleared on unmount (P:2643-2651) and before re-arming; the scroll timeout is cleared (P:2664). Nothing missing.

---

## G. Cross-partition requests

| # | Target file(s) (partition) | Request |
|---|---|---|
| G1 | `frontend/screens/WeightMeasurementsScreen.js` (ladder-and-weight) | Replace its private `AddMeasurementModal` (W:162-433), date helpers (W:134-160) and the 31 modal style keys (W:923-1085) by the shared `AddMeasurementModal` module (C2). Replace `resolvePreferredWeightUnit`, `toDisplayWeightUnit`, `sanitizeEntries`, `normalizeEntryCollection`, `selectWeightEntrySource` (W:33-58, 67-86, 106-132) by imports from the shared weight utils (C1). `formatWeightValue` and `areEntriesEqual` stay local (different / unique). |
| G2 | `frontend/utils/weightEntries.js` (utils-logic) | Host the five weight helpers named in G1 (plus optionally `saveWeightEntries`, C3). It is imported only by P and W today. |
| G3 | `frontend/components/charts/` (common-components; currently only `chartStyles.js`) | Host new `chartUtils.js` (`accentToRgba`, `niceNumber`, `computeAxisMetrics`, `formatAxisValue`, `buildChartSeries`, and P's `buildXAxisLabels`/`formatXAxisDateLabel`/`DEFAULT_X_AXIS_LABEL_COUNT`) and `ChartBubble.js` (and optionally `PointerBubbleCard.js` with its 6 styles). |
| G4 | `frontend/screens/ExerciseDetail.js` (screen-exercise-detail) | Import the helpers that are identical to P's instead of redefining: `accentToRgba` (E:193), `toMillisSafe` (E:199), `niceNumber` (E:305), `computeAxisMetrics` (E:324), `formatAxisValue` (E:362), `buildChartSeries` (E:379), `ChartBubble` (E:451-492), `sanitizeWorkoutForRoute` (E:873), `resolveWorkoutTimestamp` + `WORKOUT_TIMESTAMP_FIELDS` (E:1014, 159), `sanitizeCompletedWorkouts` (E:1065), `toDisplayWeightUnit` (E:1104). Keep E's own `formatXAxisDateLabel` (extra `<= 0` guard), `resolvePreferredWeightUnit`, `formatWeightValue`, `buildMetricDeltaDisplay` default. |
| G5 | `frontend/components/2_Competition/UserStats/UserStatsProgressPreview.js` (user-stats) | Import the identical ones: `toMillisSafe` (U:63), `sanitizeCompletedWorkouts` (U:118), `formatVolumeValue` (U:257), `niceNumber` (U:278), `computeAxisMetrics` (U:297), `buildChartSeries` (U:338), `formatAxisValue` (U:401), `accentToRgba` (U:488). Optionally `PointerBubbleCard` (U:502-560 + 6 styles) passing `accent \|\| CHART_ACCENTS.volume`. Everything else in U differs from P (C1) and stays. |
| G6 | `frontend/screens/MuscleGroupExercises.js` (ladder-and-weight) | Import `resolvePreferredWeightUnit` (M:86-98) and `toDisplayWeightUnit` (M:100-111) from the shared weight utils. |
| G7 | `frontend/screens/2_Competition.js` (ladder-and-weight) | Decide whether the no-op `handleSectionScroll` (2_Competition.js:170-172) and the `onScroll` prop stay. If that partition drops the prop for the live sections, P can drop `onScroll`, `handleScrollEvent` (P:2667-2674) and `onScroll`/`scrollEventThrottle` (P:2692-2693). `scrollSignal` must stay (Compete restore path). P's default export and props must otherwise remain unchanged. |
| G8 | `frontend/screens/PastWorkoutScreen.js:39`, `frontend/components/1_Feed/SimpleFeedPost.js:45`, `frontend/components/1_Feed/FeedSnapshotCard.js:60`, U:16 | Single shared constant for the body-graph outline colour `"#40485c"` (suggested home `frontend/utils/muscleTierColors.js`). Low priority. |
| G9 | whoever owns a shared timestamp util (`frontend/utils/date.js`, utils-logic) | Add the strict `toMillisSafe` (P:219-262) as a named export for P, U, E. Do not replace the differing `toMillisSafe`s in `livePostMeta.js`, `feedRanking.js`, M, functions/. |

If cross-partition sharing is declined, every module in D stage 1 can live under `frontend/components/2_Competition/sections/progress/` instead, with no change needed outside this partition.

---

## H. Fragile areas (leave alone or handle with care)

1. Pointer show/hide timing: 150 ms fade-in (P:2470-2474 etc.), 2000 ms hide delay then 200 ms fade-out (P:2512-2523 etc.), 100 ms reset when data disappears (P:2586-2590 etc.), all `useNativeDriver: true`, with `stopAnimation()` before each timing. Do not change durations, ordering of `clear -> stopAnimation -> timing`, or where the index refs are reset.
2. PanResponder configuration (P:1834-1845 and siblings): `onStartShouldSetPanResponder` returns true whenever there is data, which is what lets a horizontal scrub on the chart win over the parent vertical `ScrollView`; `onPanResponderTerminate` must keep scheduling the hide. The memo deps (`points.length`, touch handler, schedule fn) decide when handlers are recreated; keep them.
3. Declaration order / E1: do not "fix" the dependency arrays in any other way than reordering; do not add or remove dependencies (exhaustive-deps is informational).
4. Pointer state lives in the parent while the three metric cards mount/unmount with `activeMetricKey` (P:2852, 3133, 3413). Keep both facts (see D "what blocks").
5. `React.memo` on the default export (P:4763) and on the four pointer labels: the parent builds `sectionComponents` in a `useMemo` (`2_Competition.js:229-262`); keep the memo wrappers and the default-export shape.
6. `makeID()` inside the sanitizers (P:361, 430, 509, 554): ids for id-less records are generated at sanitize time, are used as React keys (P:3061, 3341, 3911) and are what gets written back by `persistEntries` (P:2030-2038). Do not cache, hoist or "stabilise" them.
7. Firestore write shape in `persistEntries` (P:2036-2044): `usersPrivate/{uid}` gets `"progress.weightEntries"` plus `deleteField()` for `weightEntries`, `bodyweightEntries`, `bodyweightLog`; `usersPublic/{uid}` gets `derivePublicWeightFields(...)`. Both in one `Promise.all`. Must stay byte-equivalent.
8. Navigation contracts: `navigateOneWay("PastWorkout", { animation: "slide-from-right", params })` with fallback `navigation.navigate` and the `params.workout` / `params.owner` shape (P:2187-2219); `"MuscleGroupExercises"` params `muscleKey, muscleLabel, muscleSegments, iconScale, iconOffset, iconStrokeWidth` (P:2227-2237; `iconOffset` is already `scaleSize`d at P:2419); `"WeightMeasurements"` (P:3982).
9. SVG gradient ids `volumeChartGradient`, `repsChartGradient`, `totalPersonalRecordsGradient`, `progressChartGradient` (P:2967, 3247, 3537, 3821) and their `url(#...)` uses: keep ids and keep each `<Defs>` inside its own `<Svg>`.
10. `AddMeasurementModal` date logic (P:1073-1172): minute truncation, clamping to "now", Android `DateTimePickerAndroid.open` vs iOS inline spinner sheet, `maximumDate`. Move verbatim only.
11. Layout numbers in the body/hex pager (negative margins and translateY, P:4093-4099, 4225-4230, 4281-4299; `"120%"`/`"118%"` SVG sizes P:2732-2733): visual tuning, do not touch.
12. `subscribeUserData` calls its listener synchronously on subscribe (`userDataEvents.js:194`), so `userRef.current`/`setUserData` run during the first effect; keep the effect order P:1448-1458 if the block is extracted into a hook.
13. Order of entries in style arrays that combine `chartCardLayout.card` with `styles.card` (e.g. P:2721-2726, 2854-2858, 3708-3712): later entries override earlier ones (`theme.bg` over `theme.surface`); keep array order when moving JSX.
14. `handleSubmitMeasurement` validation and rounding (P:2064-2086, 2099, 2110): comma-to-dot parsing, one-decimal rounding, future-date rejection and the exact alert texts are user-visible; if the dead edit branch is removed (B2 #18) touch nothing else in the handler.

---

## I. Open questions for the owner

1. Manage-measurements modal (P:1331-1426, 4009-4016 and its handlers/styles) can no longer be opened since commit 820d63a6; the WeightMeasurements screen replaced it. OK to delete it together with the edit/delete plumbing in this file (B1 #7-#16, B2)? The audit assumes yes.
2. `resolvedRankTier/Label/Score` (P:1548-1590) are computed and never shown (the tier even defaults to `"gold"`). Leftover from a removed rank header? The audit assumes delete.
3. E2: tapping a chart during the 200 ms tooltip fade-out drops the tap because the interrupted animation's completion callback clears the active index. Fix by checking `finished`, or leave?
4. E3: a `not-found` / `permission-denied` result from `updateDoc` is treated as a successful save (modal closes, nothing stored). Intended?
5. `formatXAxisDateLabel` (P:586-591) has a "one week" branch that returns the same format as the "three months" branch. Was a different short-range format intended, or can the branch go?
6. With no weight entries the card shows `"00"` + unit (P:308, 1498) and "No entries yet"; the other cards show `"--"`. Intentional placeholder?
7. `sanitizePersonalRecordEntries` (P:419-460) plots a point for every workout, including those with zero new PRs (flat segments, tooltip "No new PRs"), while the profile preview (U:208-242) only plots workouts with at least one PR. Which is intended? (Blocks merging the two.)
8. `onScroll` is wired through to a parent callback that does nothing (`2_Competition.js:170-172`). Keep the prop for the Compete tab's return, or remove it (G7)?
9. Legacy weight-entry locations on the user doc (`weightEntries`, `bodyweightEntries`, `bodyweightLog`, `progress.bodyweightEntries`, P:383-389) are still read and actively deleted on every save. Still needed for old accounts?
