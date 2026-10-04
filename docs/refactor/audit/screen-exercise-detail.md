# Audit: partition `screen-exercise-detail`

Scope: `frontend/screens/ExerciseDetail.js` (4688 lines, identical to `SPX/baseline`). Read completely, top to bottom.
All line numbers are the file as it is now (= baseline). Tip for the implementer: take every `sed -n 'A,Bp'` range from
`SPX/baseline/frontend/screens/ExerciseDetail.js`, which never changes, so the ranges below stay valid whatever the edit order.

Abbreviations used below:
- ED  = `frontend/screens/ExerciseDetail.js`
- PS  = `frontend/components/2_Competition/sections/ProgressSection.js` (LIVE, partition `progress-section`)
- UP  = `frontend/components/2_Competition/UserStats/UserStatsProgressPreview.js` (LIVE, partition `user-stats`)
- MGE = `frontend/screens/MuscleGroupExercises.js` (LIVE, partition `ladder-and-weight`)
- WMS = `frontend/screens/WeightMeasurementsScreen.js` (LIVE, partition `ladder-and-weight`)

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `frontend/screens/ExerciseDetail.js` | Root-stack screen "ExerciseDetail": three tabs (About / Progress / History) for one exercise of the signed-in user. About = image, muscle/equipment, favourite toggle, how-to steps. Progress = Estimated-1RM chart + one switchable chart (Volume / Reps / PRs) with scrub pointer. History = last 15 sessions with set table. Reads `global.userData` (savedExercises, statsExercises, completedWorkouts, settings.units) through `subscribeUserData`; writes `global.userData.savedExercises` and persists it through `useSyncSavedExercises`. | `default function ExerciseDetail()` only (no props; reads `route.params.exercise`). | `frontend/screens/index.js:21` (re-export) -> `App.js:50` import, `App.js:1568-1569` `<RootStack.Screen name="ExerciseDetail" component={ExerciseDetail}>`. Navigated to by route name from `frontend/screens/MuscleGroupExercises.js:494`, `frontend/screens/PastWorkoutScreen.js:753`, `frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js:983` (all pass `{ exercise: payload }`). No PARKED, TOOLING or functions/ user. |

Outgoing dependencies (all LIVE): `../hooks/useStableSafeAreaInsets`, `../theme/mfpDark`, `../components/2_Competition/layoutConstants` (`DEVICE_WIDTH, scaleSize, ts`), `../components/charts/chartStyles` (4 StyleSheets; every key ED uses exists there, checked), `../components/3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview`, `../components/common/exerciseImageMap` (`toExerciseSlug`), `../utils/haptics` (`withStrongPress`), `../../navigationRef` (`navigateOneWay`), `../hooks/useSyncSavedExercises`, `../utils/userDataEvents` (`subscribeUserData`, `emitUserDataUpdate`), `../helper/calculate1RM`, `../utils/profilePhoto` (`resolvePhotoURL`). Outgoing navigation: `PastWorkout` with `{ workout, owner }` (ED:2376-2393).

Top-level declarations (name: lines):
imports 1-30; `TABS` 32-36; `STEP_SOURCE_KEYS` 38; `normalizeSavedExercises` 40-73; `savedExercisesSignature` 75-89; `getInitialSavedExercises` 91-97; `normalizeHowToSteps` 99-113; `resolveProvidedHowToSteps` 115-128; `buildFallbackHowToSteps` 130-155; `HISTORY_SESSION_LIMIT` 157; `WEEKDAY_LABELS` 158; `WORKOUT_TIMESTAMP_FIELDS` 159; `METRIC_COLORS` 160-185; `CHART_ACCENTS` 186-191; `accentToRgba` 193-197; `toMillisSafe` 199-243; `parseDayKeyToDate` 245-255; `formatNumberCompact` 257-263; `DEFAULT_X_AXIS_LABEL_COUNT` 265; `formatXAxisDateLabel` 267-278; `buildXAxisLabels` 280-303; `niceNumber` 305-322; `computeAxisMetrics` 324-360; `formatAxisValue` 362-377; `buildChartSeries` 379-449; `ChartBubble` 451-492; `ExerciseVolumePointerLabel` 494-572; `ExerciseOneRmPointerLabel` 574-675; `ExerciseRepsPointerLabel` 677-754; `ExercisePersonalRecordPointerLabel` 756-854; `formatWeightValue` 856-860; `firstAvailableString` 862-871; `sanitizeWorkoutForRoute` 873-898; `deriveSessionTitle` 900-918; `buildSessionMeta` 920-955; `setKeyForStatSet` 957-963; `normalizeStatSet` 965-991; `normalizeStatsExercises` 993-1001; `extractWid` 1003-1012; `resolveWorkoutTimestamp` 1014-1021; `resolveSetTimestamp` 1023-1032; `statsExercisesSignature` 1034-1053; `completedWorkoutsSignature` 1055-1063; `sanitizeCompletedWorkouts` 1065-1068; `getInitialStatsExercises` 1070-1076; `getInitialCompletedWorkouts` 1078-1084; `resolvePreferredWeightUnit` 1086-1102; `toDisplayWeightUnit` 1104-1115; `buildMetricDeltaDisplay` 1117-1130; `findStatsEntry` 1132-1139; `ExerciseDetail` component 1141-4199; `styles` 4201-4688.

Inside the component (1141-4199): state 1142-1154; route-param derivations 1156-1194; `exerciseStatsEntry` 1196-1203; `historySessions` 1205-1312; `workoutsByWid` 1314-1321; chart-entry builder memo 1323-1463; alias guards 1465-1470; per-metric memos 1472-1546; geometry 1548-1586; series + x labels 1588-1631; geometry destructure + points 1633-1647; pointer refs/state 1649-1666; pointer callbacks 1668-1963; pan responders 1965-2019; hasData 2021-2024; metric fallback effect 2026-2045; pointer position memos 2047-2132; reset effects 2134-2192; unmount cleanup 2194-2207; "latest" summaries 2209-2264; `weightColumnLabel` 2267-2273; userData subscription 2275-2302; global mirror effect 2304-2317; `useSyncSavedExercises` 2319; handlers 2321-2400; `renderAbout` 2402-2483; `renderHistory` 2485-2565; `renderProgress` 2567-4139; tab switch + JSX return 4141-4198.

---

## B. Verified dead code

Machine findings: all 18 ESLint items re-run and confirmed with `SPX/tools/lint.sh` (0 errors, 18 warnings). knip: no unused exports (only the default export exists and it is used). No PARKED file uses anything from this partition, so nothing here is KEEP-for-PARKED.

Certain (remove):

| # | Identifier | Kind | Where | Evidence |
|---|---|---|---|---|
| B1 | `{false && hasProgressVolumeData ? (...) : null}` | unreachable JSX (legacy stand-alone Volume card) | ED:3308-3576 | Constant `false &&` (ESLint no-constant-condition 3308:18). Superseded by the switchable card ED:2972-3306. |
| B2 | `{false && hasProgressPersonalRecordData ? (...) : null}` | unreachable JSX (legacy PR card) | ED:3578-3861 | Same (3578:18). |
| B3 | `{false && hasProgressRepsData ? (...) : null}` | unreachable JSX (legacy Reps card) | ED:3863-4136 | Same (3863:18). Together with the blank separators 3307, 3577, 3862 this is ~830 lines. Script check: after deleting 3308-4136 no identifier loses its last use (the pan responders, pointer labels, `latest*` values, `Circle` etc. are all still used by the 1RM card 2693-2970 and the config objects 2592-2677). |
| B4 | Commented-out "Share Exercise" button | commented-out JSX | ED:2450-2463 | Comment block; only reference to `handleShare` and to `styles.favoriteButton/favoriteIcon/favoriteText`. |
| B5 | `handleShare` | unused callback | ED:2325-2332 | ESLint no-unused-vars; only use is inside the comment B4. |
| B6 | `Alert`, `Share` | unused imports (after B5) | ED:3, ED:6 | Only uses are ED:2328 and ED:2330 inside `handleShare`. |
| B7 | `styles.favoriteButton`, `styles.favoriteIcon`, `styles.favoriteText` | unused StyleSheet keys | ED:4355-4360, 4372-4374, 4385-4391 | Only referenced inside comment B4 (ESLint no-unused-styles). NOTE: `styles.favoriteIconActive` (4375-4377) is LIVE (ED:2437). |
| B8 | `styles.historyDayBadge`, `styles.historyDayBadgeText` | unused StyleSheet keys | ED:4562-4570, 4571-4575 | 0 references in the file. |
| B9 | `WEEKDAY_LABELS`, local `dateObj`, local `dayLabel`, session field `dayLabel` | constant + computed-but-never-read value | ED:158, 1272, 1273, 1300 | `dayLabel` is written into each history session (1300) and never read (`grep dayLabel` = lines 1273 and 1300 only; `renderHistory` 2485-2565 reads `session.key/title/meta/sets`). `dateObj` (1272) exists only to compute it; `WEEKDAY_LABELS` only used at 1273. Keep `dayDate`/`fallbackTs` (1269-1270): still used at 1271, 1275, 1276. This is the data side of the removed weekday badge (B8). |
| B10 | history-session output field `wid` and grouped field `wid` | fields never read | ED:1298 (output), ED:1227 (grouped, read only by 1298) | `renderHistory` never reads `session.wid`. Remove 1298, then 1227. (`sessions.sort` uses `timestamp`, which stays.) |
| B11 | `label` and `icon` fields of `progressMetricConfigs` | object fields never read | ED:2595, 2597, 2623, 2625, 2651, 2653 | `activeProgressMetricConfig.*` reads (grep): accent, activeIndex, activePoint, axisMetrics, deltaMeta, entries, gradientFrom, gradientId, gradientTo, key, latestText, latestUnit, lineColor, panHandlers, pointerComponent, pointerLeft, pointerOpacity, pointerRightAligned, pointerUnit, pointerWidth, points, series, stripColor, summaryText, ticks, title, xAxisLabels, plus `cfg.hasData` (2688). `label`/`icon` are read only from `progressMetricTabs` (2679-2683). |
| B12 | `unitLabel` parameter of `buildMetricDeltaDisplay` | parameter never read | ED:1117 (callers 2220, 2233, 2246, 2259-2263) | Body 1118-1129 never uses it. The third parameter `formatter` is only ever `formatNumberCompact` (default, or passed explicitly at 2246/2262). If this helper stays private to ED, reduce to `buildMetricDeltaDisplay(delta)` and drop the unit arguments at the 4 call sites. If it is shared with PS (see C6), keep the 3-arg signature. |

No tracing `console.log` in the file (0 `console.` hits). No other commented-out code (the remaining comments at 162/170/178, 215, 451, 979, 1340, 1342, 2315 explain intent: keep).

Unreachable / always-true but defensive (recommend LEAVE unless stated; listed so nobody rediscovers them):
- ED:420-427 `if (!points.length)` in `buildChartSeries`: cannot run (chartData is non-empty at that point). Identical text exists in PS:663-670; keep verbatim if the function is moved to a shared module.
- ED:272/275 `oneWeek` branch in `formatXAxisDateLabel` returns the same format as the next branch (same in PS:586/589). Leave.
- ED:1465-1467 `Array.isArray(raw…) ? raw… : []` and ED:1468-1470 `.filter(entry => entry && Number.isFinite(entry.value))`: the memo at 1328-1463 always returns arrays of well-formed entries (PR `value` is an integer counter). These guards are the source of 8 exhaustive-deps warnings; see F1/F2 (simplify there).
- ED:1483, 1501, 1519, 1537 `if (!progressXAxisMetrics) return [];`: `computeAxisMetrics` always returns an object.
- ED:1308 `HISTORY_SESSION_LIMIT &&`: constant 15.
- ED:2335 `if (!name) return;`: `name` is never empty (falls back to `'Exercise'`, ED:1161).
- ED:548-558, 651-661, 730-740, 818-828: the `canNavigate === false` branch of the four pointer labels. `onWorkoutPress` is always passed (ED:2961, 3243 and the dead cards). Unreachable in practice; remove only if the labels are restructured (D, phase 3).
- ED:188-190 `CHART_ACCENTS.volume/reps/prs`: never read (only `.standard` is, at 452 and 3188, and both of those are fallbacks that never fire because `accent` always comes from `METRIC_COLORS`). Leave or trim to `{ standard }`.
- ED:3256-3259 `palette.x || theme… || '#…'` fallbacks, ED:4524 `theme.primary ?? '#2D9EFF'`, ED:4538 `theme.textPrimary ?? '#F6F8FF'`: theme and palette always define these. Leave (style values must not change).
- ED:2267-2273 `weightColumnLabel` branches 2271-2272 and ED:1259 third arm: `weightUnit` is always `'kg'` or `'lb'` (ED:1086-1102). Leave.
- ED:3238-3241 passes `unit` to `ExerciseRepsPointerLabel`, which does not accept it (ED:677). Harmless.
- ED:4148-4149 `edges={[...]}` on react-native's `SafeAreaView`: ignored prop. See I1 (do not "fix" the import).
- Route-param keys `howToSteps / instructions / steps / howTo` (ED:38, 115-128): no in-repo caller sets them explicitly, but two callers spread whole exercise objects into the param (`ActiveWorkoutModal.js:971 ...ex`, `PastWorkoutScreen.js:694 {...libraryExercise}` / `{...exercise}`), so data-borne values cannot be excluded. KEEP; see I7.

---

## C. Duplication

Bodies were diffed after normalising quotes/whitespace/comments; "identical" below means identical behaviour for every input, and I say so only where I checked the differing lines by hand.

### C1. Chart maths (ED, PS, UP)
| Helper | Locations | Identical? |
|---|---|---|
| `niceNumber` | ED:305-322, PS:694-711, UP:278-295 | Identical (textually). |
| `computeAxisMetrics` | ED:324-360, PS:713-752, UP:297-336 | Identical behaviour. Cosmetic only: `min -= 1` vs `min = min - 1`; braces around `niceMax += step`. |
| `formatAxisValue` | ED:362-377, PS:754-778, UP:401-425 | Identical behaviour (ED inlines `num / 1_000_000`; PS/UP use a temp `scaled`). |
| `buildChartSeries` | ED:379-449, PS:622-692, UP:338-399 | ED == PS textually. UP omits the unreachable `!points.length` branch (ED:420-427) and writes `/ Math.max(yRange, 1)` where `yRange` is already `Math.max(..., 1)` (no-op, also for NaN). Identical behaviour in all three. |
| `accentToRgba(accent, alpha)` | ED:193-197, PS:104-108, UP:488-492 | Identical. (UP:31 is a different, unclamped inline closure inside UP's ChartBubble.) |
| `ChartBubble` | ED:451-492, PS:111-151, UP:25-61 | ED == PS textually. UP differs: default accent is `CHART_ACCENTS.volume` = `{45,158,255}` (ED/PS default `{100,160,255}`) and alpha is not clamped (no effect for the alphas used). Same output whenever `accent` is passed. |
| `buildXAxisLabels` | ED:280-303, PS:594-620, UP:427-453 | ED == PS except that it calls its own `formatXAxisDateLabel` (next row). UP differs: always `dayjs(ts).format('MMM D')`, and default count 4. |
| `formatXAxisDateLabel` | ED:267-278, PS:582-592 | NOT identical: ED has the extra guard `if (!Number.isFinite(timestamp) || timestamp <= 0) return ''` (ED:268). PS would print a 1969/1970 label for `timestamp <= 0`. Same for every positive finite timestamp. |
| `DEFAULT_X_AXIS_LABEL_COUNT` | ED:265 (5), PS:580 (5), UP:17 (4) | ED == PS; UP differs. |

Recommended canonical home: new `frontend/components/charts/chartMath.js` (next to `chartStyles.js`, which is already imported by exactly these three files) exporting `accentToRgba, niceNumber, computeAxisMetrics, formatAxisValue, buildChartSeries, DEFAULT_X_AXIS_LABEL_COUNT, formatXAxisDateLabel, buildXAxisLabels`, moved verbatim from ED:193-197 and ED:265-449; and `frontend/components/charts/ChartBubble.js` from ED:451-492 with the default accent inlined as `{ r: 100, g: 160, b: 255 }` (= `CHART_ACCENTS.standard` in ED and PS). ED and PS can import all of it (PS's `formatXAxisDateLabel`/`buildXAxisLabels` only if the PS owner accepts the `<= 0` guard, which cannot trigger for real workout timestamps); UP can import `accentToRgba, niceNumber, computeAxisMetrics, formatAxisValue, buildChartSeries` but must keep its own `buildXAxisLabels`, label count and `ChartBubble` default.

### C2. Timestamp coercion
- `toMillisSafe`: ED:199-243, PS:219-262, UP:63-106: identical behaviour (differences: `Number.isNaN(getTime()) ? 0 : getTime()` vs `Number.isFinite(ms) ? ms : 0`, equivalent for `Date#getTime`; `new Date(trimmed).getTime()` vs `Date.parse(trimmed)`, equivalent by spec; variable names).
- NOT the same: MGE:223-253 (nested in a component; ignores nanoseconds; tries `Date.parse` before `Number` on strings; no trim), `frontend/utils/livePostMeta.js:1` and `functions/index.js:3553` (return `null`, different string order), `frontend/helper/feedRanking.js:1`, `frontend/utils/date.js:6-18` `toMillis` (no finite checks, no `_seconds`, no numeric strings), `frontend/components/2_Competition/UserStats/userStatsUtils.js:53-66` `toMillis`. (`frontend/utils/workoutLinking.js:4` is DEAD.)
- Canonical home: export `toMillisSafe` from `frontend/utils/date.js` (new named export, body from ED:199-243), used by ED, PS, UP. Leave the others.

### C3. Weight unit helpers
- `toDisplayWeightUnit`: ED:1104-1115 == PS:278-289 == MGE:100-111 == WMS:47-58 (identical). UP:494-500 differs (`startsWith('k')`, no pass-through of unknown units). Canonical home: new `frontend/utils/weightUnits.js`; ED/PS/MGE/WMS import it; UP keeps its own.
- `resolvePreferredWeightUnit`: ED:1086-1102 differs from every other copy (PS:264-276, MGE:86-98, WMS:33-45, UP:244-255): ED falls back to `global.userData` when called without argument, reads only `settings.units ?? units`, matches exactly `'kg'`, and returns `'lb'` (others also read `personalInfo.weightUnit`/`stats.weightUnit`, match `startsWith('k')`/`includes('kilo')`, and return `'lbs'`). Do NOT merge. See I9.
- `formatWeightValue`: ED:856-860 (`'—'` for invalid, compact number), PS:306 (`'00'`), MGE:174 (`null`, integer above 100), WMS:60 (`'00.0'`, always 1 decimal), `ExercisesSection.js:62` (Intl integer). All five differ. Do NOT merge.

### C4. Workout helpers
- `sanitizeWorkoutForRoute`: ED:873-898 == PS:462-487 (identical). `frontend/screens/1_Feed.js:274-313`, `UserStatsExerciseDetailScreen.js:101-140`, `UserStatsModal.js:35-72` differ in the `catch` fallback (they also normalise sets/prev). The JSON round trip (the normal path) is the same in all five. Canonical home for the ED/PS variant: a shared util (suggest `frontend/utils/workoutRoute.js`); the other three stay unless their owners prove the fallback cannot matter.
- `sanitizeCompletedWorkouts`: ED:1065-1068 == PS:414-417 == UP:118-121 (identical, `Array.isArray(raw) ? raw.filter(Boolean) : []`).
- `resolveWorkoutTimestamp` + `WORKOUT_TIMESTAMP_FIELDS`: ED:1014-1021 + ED:159 == PS:405-412 + PS:53 (identical). UP:108-116 (`created, createdAt, timestamp`), `MacroTracking.js:135`, MGE:255 differ.
- `extractWid`: ED:1003-1012 (`wid, id, workoutId, pid`) vs `userStatsUtils.js:41-51` (`wid, workoutWid, workoutId, workoutID, id`; skips falsy differently). Differ. Do NOT merge.
- `firstAvailableString` ED:862-871 vs `pickFirstString` `PastWorkoutScreen.js:166-173`: differ (ED also accepts numbers). Do NOT merge.
- `buildSessionMeta` ED:920-955 vs `formatWorkoutTimestamp` `frontend/utils/date.js:20-39`: same "<long date> at <time>" format when a timestamp exists, but ED falls back to the day key (date only) and returns `''` instead of an ISO string on locale errors. Do NOT merge.
- `parseDayKeyToDate` ED:245-255: unique (the `parseDayKey` helpers in `backend/workouts/*.js` and `shared/hexagon/computeHexagonCore.js:158` return milliseconds, are lenient, and belong to other runtimes).

### C5. Saved exercises
- `normalizeSavedExercises`: ED:40-73 vs `frontend/hooks/useUserDoc.js:28-60` (defined inside the hook body). NOT identical: ED skips falsy non-zero values in the object branch (ED:59 `if (!value && value !== 0) return acc;`), useUserDoc turns `{ Bench: null }` into an entry. `frontend/hooks/useSyncSavedExercises.js:7-58` `normalizeSavedExercisesMap` is a third variant (String()-coerces fields, accepts a bare string).
- `savedExercisesSignature`: ED:75-89 vs `useSyncSavedExercises.js:66-76`: differ (ED signs the map as-is; the hook normalises and coerces first).
- Recommendation: leave all three; they are compared against each other at runtime (ED:2304-2317 vs the hook), so changing any of them can change when `emitUserDataUpdate` fires.

### C6. `buildMetricDeltaDisplay`
ED:1117-1130 vs PS:291-304: same body; only the default `formatter` differs (`formatNumberCompact` vs `formatVolumeValue`, which are different functions: ED keeps one decimal, PS rounds and groups thousands). Shareable only with an explicit formatter argument. Low value; leave unless PS's owner wants it.

### C7. Colour constants
`METRIC_COLORS` ED:160-185 vs PS:55-86: same values for the shared fields; PS adds `areaFrom/areaTo` and names the third key `personalRecords` (ED: `prs`). `CHART_ACCENTS` ED:186-191 vs PS:88-94 (extra `weight`) vs UP:18-22 (different colours). Not identical; leave.

### C8. `WEEKDAY_LABELS`
ED:158 == `frontend/components/common/HistoryCalendarModal.js:10`. Moot: dead in ED (B9).

### C9. Duplication inside ED (all verified by normalised text comparison)
1. Four per-metric hook clusters (Volume / OneRm / Reps / PersonalRecord) are textually identical after renaming:
   values+axis+ticks 1474-1490 / 1492-1508 / 1510-1526 / 1528-1546; series 1588-1591 / 1593-1596 / 1598-1601 / 1603-1611; x labels 1613-1616 / 1618-1621 / 1623-1626 / 1628-1631; clear timeout 1668-1673 / 1675-1680 / 1682-1687 / 1689-1694; show 1696-1704 / 1706-1714 / 1716-1724 / 1726-1734; schedule hide 1736-1751 / 1753-1768 / 1770-1785 / 1787-1802; activate 1804-1814 / 1816-1826 / 1828-1838 / 1840-1850; touch 1852-1877 / 1879-1904 / 1906-1931 / 1933-1963; pan responder 1965-1976 / 1978-1989 / 1991-2002 / 2004-2019; pointer left + right-aligned 2047-2066 / 2068-2087 / 2089-2108 / 2110-2132; reset effect 2134-2146 / 2148-2160 / 2162-2174 / 2176-2192. (~650 lines that one custom hook called 4 times would replace; PS:1788-2010 and PS:2434-2582 contain the same pattern.)
2. Four pointer-label components 494-572, 574-675, 677-754, 756-854 share identical sub-blocks: wrapper open 504-517 = 596-609 = 686-699 = 774-787; workout link 530-559 = 633-662 = 712-741 = 800-829; timestamp 560-567 = 663-670 = 742-749 = 841-848; wrapper close; increment line 519-529 = 701-711 = 789-799.
3. 1RM card 2693-2970 vs switchable card 2972-3306: identical sub-blocks after substituting the data source: header hint 2705-2709 = 2984-2988; chart wrapper + y-label maths 2739-2779 = 3022-3062; grid-line maths 2816-2829 = 3107-3120; axis lines 2863-2878 = 3154-3169; x-axis overlay 2915-2939 ~ 3193-3217; pointer overlay 2941-2964 ~ 3219-3246. Real differences: title; gradient stops (`#C19CFF` 0.32 / `#7B5DD6` 0.08 vs line colour 0.3 / 0.08); line stroke `#B589FF`; strip `rgba(181, 137, 255, 0.6)`; points drawn as plain `<Circle>` (2891-2912) vs `<ChartBubble>` (3182-3190); pointer component; toggle row only in the second card; React keys.
4. Tick ratio maths repeated twice per card (y labels and grid lines): 2759-2768 = 2817-2827, 3042-3051 = 3108-3118.
5. `workoutsByWid` Map built twice: inside `historySessions` 1210-1215 and as its own memo 1314-1321.
6. "latest" summary blocks 2209-2221 / 2223-2234 / 2236-2247 / 2249-2264: same shape, different delta arguments.

---

## D. Decomposition plan for `frontend/screens/ExerciseDetail.js` (4688 lines)

Target folder for new modules: `frontend/screens/exerciseDetail/` (precedent: `frontend/screens/feed/hooks/`). `frontend/screens/ExerciseDetail.js` stays, keeps `export default function ExerciseDetail()` with no props, so `frontend/screens/index.js` and `App.js` do not change. (The folder name differs from the file only by case + extension; Metro and the ESLint resolver try the `.js` file first, so there is no clash, but if the orchestrator prefers zero ambiguity use `frontend/screens/exerciseDetailParts/` or flat siblings in `frontend/screens/`.)

Dependency direction after the split (no cycles): constants <- utils <- (pointer labels, hook, tabs) <- screen; styles <- (pointer labels, tabs, screen).

### Phase 1: delete dead code (section B, certain list)
B1-B3 (3308-4136 plus one of the surrounding blank lines each), B4 (2450-2463 and the blank 2464), B5 (2325-2332 and the blank 2333), B6 (`Alert,` line 3 and `Share,` line 6), B7, B8, B9, B10, B11, B12 (optional). Result: about 900 lines removed, no behaviour change.

### Phase 2: pure moves (verbatim, then add imports/exports)

1. `frontend/screens/exerciseDetail/ExerciseDetail.styles.js`
   - Moves: `styles` 4201-4688 (minus the keys deleted in B7/B8).
   - Needs: `StyleSheet` (react-native), `theme` (`../../theme/mfpDark`), `{ scaleSize, ts }` (`../../components/2_Competition/layoutConstants`).
   - `export default styles`. Do this first: the pointer labels (module-level components) and the tab render code both reference `styles`.
   - Trap: `styles.shareButton / shareIcon / shareText` style the LIVE Favorites button (ED:2427-2446). They are not part of the dead share feature. Do not remove or rename.

2. `frontend/screens/exerciseDetail/exerciseDetailConstants.js`
   - Moves: `TABS` 32-36, `METRIC_COLORS` 160-185, `CHART_ACCENTS` 186-191 (must stay after `METRIC_COLORS`: it reads it at module evaluation).

3. `frontend/screens/exerciseDetail/exerciseDetailUtils.js` (pure, no React, about 190 lines)
   - Moves: `STEP_SOURCE_KEYS` 38; `normalizeSavedExercises` 40-73; `savedExercisesSignature` 75-89; `getInitialSavedExercises` 91-97; `normalizeHowToSteps` 99-113; `resolveProvidedHowToSteps` 115-128; `buildFallbackHowToSteps` 130-155; `formatNumberCompact` 257-263; `formatWeightValue` 856-860; `resolvePreferredWeightUnit` 1086-1102; `toDisplayWeightUnit` 1104-1115 (or import from the shared module of C3); `buildMetricDeltaDisplay` 1117-1130.

4. `frontend/screens/exerciseDetail/exerciseStatsUtils.js` (pure, about 290 lines)
   - Moves: `HISTORY_SESSION_LIMIT` 157; `WORKOUT_TIMESTAMP_FIELDS` 159; `toMillisSafe` 199-243 (or shared, C2); `parseDayKeyToDate` 245-255; `firstAvailableString` 862-871; `sanitizeWorkoutForRoute` 873-898 (or shared, C4); `deriveSessionTitle` 900-918; `buildSessionMeta` 920-955; `setKeyForStatSet` 957-963; `normalizeStatSet` 965-991; `normalizeStatsExercises` 993-1001; `extractWid` 1003-1012; `resolveWorkoutTimestamp` 1014-1021; `resolveSetTimestamp` 1023-1032; `statsExercisesSignature` 1034-1053; `completedWorkoutsSignature` 1055-1063; `sanitizeCompletedWorkouts` 1065-1068; `getInitialStatsExercises` 1070-1076; `getInitialCompletedWorkouts` 1078-1084; `findStatsEntry` 1132-1139.
   - Side benefit: the local `ts` at 983 and 1059 stops shadowing the `ts` import of line 21 (this module does not import it). Do not rename.

5. Chart maths: `frontend/components/charts/chartMath.js` (shared, see C1) from ED:193-197 + ED:265-449 (needs `dayjs`), and `frontend/components/charts/ChartBubble.js` from ED:451-492 (needs `React`, `{ Circle, G }` from react-native-svg, `scaleSize`, `accentToRgba`; default accent literal `{ r: 100, g: 160, b: 255 }`). If the shared location is not agreed, put both in `frontend/screens/exerciseDetail/exerciseChartUtils.js` / `ChartBubble.js` unchanged.

6. `frontend/screens/exerciseDetail/ExercisePointerLabels.js`
   - Moves: `ExerciseVolumePointerLabel` 494-572, `ExerciseOneRmPointerLabel` 574-675, `ExerciseRepsPointerLabel` 677-754, `ExercisePersonalRecordPointerLabel` 756-854 (named exports).
   - Needs: `React`, `{ View, Text, Pressable }`, `dayjs`, `{ chartPointerStyles, chartTypography }`, `styles` (keys `progressPointerLineSpacing`, `progressPointerTimestampSpacing`), `toDisplayWeightUnit`, `formatNumberCompact`, `formatWeightValue`.

After phases 1-2 the screen file is about 2200 lines: component hooks 1142-2400 (about 1250) and render code (about 950).

### Phase 3: optional, each step separately reviewable (these are restructurings, not pure moves)

7. Pure builders (move the memo bodies verbatim into functions in `exerciseStatsUtils.js`; the `useMemo` calls and dependency arrays stay in the screen):
   - `buildHistorySessions(exerciseStatsEntry, completedWorkouts, weightUnit)` = body 1206-1311 (needs `calculate1RM`, `formatWeightValue`). Memo stays `useMemo(() => buildHistorySessions(...), [exerciseStatsEntry, completedWorkouts, weightUnit])`.
   - `buildExerciseProgressEntries(exerciseStatsEntry, workoutsByWid)` = body 1329-1462 (needs `calculate1RM`). Returns the same 4-array object.
   Risk: low (no closures other than the three/two inputs; checked).

8. Custom hook for one chart metric, replacing the four identical clusters of C9.1: `useProgressMetricChart(entries, geometry, sectionsCount)` built from the Volume cluster (1474-1490, 1588-1591, 1613-1616, 1644, 1649-1650, 1658, 1663, 1668-1673, 1696-1704, 1736-1751, 1804-1814, 1852-1877, 1965-1976, 2021, 2047-2066, 2134-2146, and this metric's share of 2194-2207), returning `{ entries, hasData, ticks, axisMetrics, series, xAxisLabels, points, panHandlers, activePoint, activeIndex, pointerOpacity, pointerLeft, pointerWidth, pointerRightAligned }` (exactly the fields the config objects 2592-2677 and the 1RM card consume). Called 4 times from the screen in the order volume, oneRm, reps, personalRecord. Keep the dependency arrays on the same primitives by destructuring `geometry` at the top of the hook (`leftMargin, rightMargin, innerWidth, plotWidth`).
   - What stays in the screen: `activeProgressMetric` state (1150), the fallback effect 2026-2045, geometry constants and memo 1548-1586, `latest*` summaries 2209-2264.
   - What blocks a "pure move": the code is interleaved by step, not by metric, so this is a regrouping. Hook call order changes (grouped per metric) and the four reset effects + cleanup will run before the fallback effect instead of after; I checked that these effects do not read each other's state, so order is irrelevant. The single unmount effect 2194-2207 becomes one cleanup per hook instance.
   - The hook MUST be called from the screen component (not from a tab component that unmounts), see H3.
   - Risk: medium. If done, PS has the same clusters (PS:1788-2010, 2434-2582) and could share the pointer part; coordinate (G5).

9. Presentational tab components (props only, no state): `ExerciseAboutTab` from 2402-2483, `ExerciseHistoryTab` from 2485-2565, `ExerciseProgressTab` from 2567-3306. About and History have small prop lists (About: `name, muscleGroup, equipment, isFavorite, favoriteButtonLabel, favoriteAccessibilityLabel, onToggleFavorite, howToSteps, displayTitle`; History: `historySessions, displayTitle, weightColumnLabel`). Progress closes over about 75 values unless step 8 is done first (then: 4 chart bundles, geometry, `latest*`, `volumeUnitLabel`, `displayTitle`, `activeProgressMetric`, `onSelectMetric`, `onWorkoutPress`). Risk: low for About/History, medium for Progress. Without step 8, leave `renderProgress` in the screen.

10. Further in-file dedupe (only with step 8/9): shared `PointerBubble` wrapper + `PointerWorkoutLink` for the 4 labels (C9.2); one parametrised chart card for the 1RM card and the switchable card (C9.3, needs a `renderPoint` variation and explicit gradient stops; the visual differences listed in C9.3 must be preserved exactly); `buildMetricColors` (2584-2590) hoisted to module scope.

Verification after each phase: `SPX/tools/lint.sh frontend/screens/ExerciseDetail.js frontend/screens/exerciseDetail frontend/components/charts` and `node SPX/tools/changes.cjs frontend/screens/ExerciseDetail.js frontend/screens/exerciseDetail frontend/components/charts` (phase 2 must show only import/export lines as new).

---

## E. Latent bugs

| # | Where | What | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | ED:1468-1470 | `exercisePersonalRecordEntries` is rebuilt with `.filter()` on every render, so it is a new array each time. Every memo that depends on it recomputes on every render (1528-1546, 1603-1611, 1628-1631), `progressPersonalRecordPoints` is new each render, so `handleProgressPersonalRecordChartTouch` (1933) and the PR `PanResponder` (2004-2019) are recreated on every render, including on every scrub move of any chart. Performance defect only; output is equal by value. | Stabilise the value: `const exercisePersonalRecordEntries = useMemo(() => (Array.isArray(rawExercisePersonalRecordEntries) ? rawExercisePersonalRecordEntries.filter((entry) => entry && Number.isFinite(entry.value)) : []), [rawExercisePersonalRecordEntries]);` (same expression, wrapped). No dependency array elsewhere changes. | High (defect is certain; fix is value-preserving). |
| E2 | ED:4148-4149 | `edges={["top","left","right"]}` is passed to `SafeAreaView` imported from `react-native` (line 4), which has no `edges` prop: it is ignored, so the bottom inset IS applied on iOS. The author evidently had `react-native-safe-area-context` in mind. | None. Do not switch the import (that would remove the bottom padding = visual change). Removing the ignored prop is behaviour-neutral but the intent is unclear: open question I1. | High that the prop is a no-op; fix not obvious. |
| E3 | ED:1055-1063 | `completedWorkoutsSignature` samples `list.slice(0, 40)`. `completedWorkouts` is appended with `arrayUnion` (`frontend/logic/useWorkoutManager.js:679`), i.e. oldest first, so for a user with 40+ workouts the signature ignores the newest ones: adding, deleting or editing a workout past index 39, or renaming any workout, does not refresh the `completedWorkouts` state while this screen stays mounted (e.g. after returning from PastWorkout). Effect: stale workout names / missing chart points until the screen is reopened. | Not unambiguous (sampling was a deliberate cost limit; "last 40" vs "all" is the owner's call). Record as open question I4; do not change. | Low-medium. |

No reference to an undefined name, no duplicate object key, no conditional hook, no effect missing a required cleanup was found (subscription 2275-2302 returns its unsubscribe; timers are cleared at 2194-2207).

---

## F. Best-practice issues worth fixing

| # | Where | Issue | Suggested change | Risk |
|---|---|---|---|---|
| F1 | 1468-1470 | Memo-defeating derived array (see E1). | Wrap in `useMemo`. | Low. |
| F2 | 1323-1328 + 1465-1467 | The memo result is destructured into `raw*` names and re-guarded with `Array.isArray`, which is always true; this produces 6 of the exhaustive-deps warnings. | Destructure straight into `exerciseVolumeEntries, exerciseRepsEntries, exerciseOneRmEntries` and delete 1465-1467. Do not touch the dependency arrays. | Low (memo always returns arrays, 1330-1336 and 1457-1462). |
| F3 | 1156 | `route?.params?.exercise || {}` creates a new object per render when params are missing, re-running the `howToSteps` memo (warning 1156:11). All three callers pass `exercise`, so this never happens in practice. | Optional: module-level `const EMPTY_EXERCISE = {};` as the fallback. | Low; optional. |
| F4 | 1472, 1548-1555, 2049, 2070, 2091, 2114 | Render-time constants (`progressSectionsCount`, card padding, chart height/width, paddings, label width, strip width, four identical `scaleSize(184)` pointer widths). `scaleSize`/`DEVICE_WIDTH` are fixed at module load (`layoutConstants.js:4-17`). | Hoist to module constants (in `exerciseDetailConstants.js`); `progressChartGeometry` (1557-1586) then has constant inputs and can be a module constant too. | Low; optional. Values must stay numerically identical. |
| F5 | 2584-2590 | `buildMetricColors` is a pure helper re-created inside `renderProgress` on every render. | Hoist to module scope. | None. |
| F6 | 2398-2400, 4172 | `handleTabChange` only forwards to `setActiveTab`. | Use `setActiveTab(tab.key)` directly at 4172 and delete the wrapper. | None. |
| F7 | 1210-1215 vs 1314-1321 | Same Map built twice. | Move the `workoutsByWid` memo above `historySessions` and use it there (add it to that memo's deps in place of nothing else: deps become `[exerciseStatsEntry, workoutsByWid, weightUnit]`; `completedWorkouts` is then only reached through `workoutsByWid`). | Low; optional, and it does change a dependency array, so only do it deliberately (not to silence lint). |
| F8 | 983, 1059 | Local `ts` shadows the `ts` import (line 21). | Nothing: disappears once the helpers move to `exerciseStatsUtils.js` (D.4). | None. |
| F9 | 494-854, 452 | Module-level components use `styles`, `toDisplayWeightUnit`, `formatWeightValue`, `CHART_ACCENTS` before their definitions (works only because they are read at render time). | Resolved by the module split (they become imports). | None. |
| F10 | 2194-2207 | Unmount cleanup clears the hide timers but does not stop a running fade animation, whose completion callback (1745-1748 etc.) may call `setState` after unmount. Harmless in React 18. | Leave. (Optional: `stopAnimation()` on the four opacities in the cleanup.) | Leave. |
| F11 | 2-13 | react-native import list: `Pressable, Animated, PanResponder` appended out of order; after B6 drop `Alert` and `Share`. No duplicate imports; import groups are already react / react-native / third-party / local. | Only remove the two names; no reordering churn. | None. |
| F12 | 1117 | Unused parameter `unitLabel` (B12). | See B12. | Low. |

Not issues (checked): all hooks are top-level and unconditional; `renderAbout/renderHistory/renderProgress` are plain functions called during render, not components, so nothing remounts; `ActivePointerComponent` (2689) is a module-level memo component, so its identity is stable.

---

## G. Cross-partition requests

1. `progress-section` (PS) and `user-stats` (UP): replace the local copies listed in C1 with imports from the shared `frontend/components/charts/chartMath.js` (and PS also `ChartBubble.js`). PS: 104-108, 111-151, 580-592 (only if the `timestamp <= 0` guard is accepted), 594-620, 622-692, 694-711, 713-752, 754-778. UP: 278-295, 297-336, 338-399, 401-425, 488-492 (UP keeps its own `buildXAxisLabels`, label count and `ChartBubble`). Someone must own creating the shared file; this partition can create it from ED's text.
2. Owner of `frontend/utils/date.js`: add a named export `toMillisSafe` (body = ED:199-243) so ED, PS:219-262 and UP:63-106 can drop their identical copies. Do not replace the existing, weaker `toMillis` there.
3. `progress-section` + `ladder-and-weight`: `toDisplayWeightUnit` is identical in ED:1104-1115, PS:278-289, MGE:100-111, WMS:47-58: one shared export (suggest new `frontend/utils/weightUnits.js`). UP:494-500 differs and stays.
4. `progress-section` (+ `user-stats` for the second item): `sanitizeWorkoutForRoute` (ED:873-898 == PS:462-487), `sanitizeCompletedWorkouts` (ED:1065-1068 == PS:414-417 == UP:118-121), `resolveWorkoutTimestamp` + `WORKOUT_TIMESTAMP_FIELDS` (ED:1014-1021/159 == PS:405-412/53) can come from one shared util. The Feed/UserStats `sanitizeWorkoutForRoute` variants differ in the catch fallback and are not part of this.
5. Optional, only if D.8 is executed: PS has the same pointer/scrub clusters (PS:1788-2010, 2434-2582); a shared `frontend/components/charts/useChartPointer.js` would serve both. Needs one owner.
6. Owner of `frontend/hooks/useUserDoc.js`: `normalizeSavedExercises` (28-60) is re-created inside the hook on every render and is NOT identical to ED:40-73 (C5). Hoisting it to module scope there is fine; merging it with ED's is not.
7. No change is needed in `App.js`, `frontend/screens/index.js`, or the three navigating callers, provided `frontend/screens/ExerciseDetail.js` keeps its default export and the route name / param shape (`{ exercise }`).

---

## H. Fragile areas (leave alone or handle with care)

1. Effect order 2275 -> 2304 -> 2319. The global-mirror effect (2304-2317) must stay declared BEFORE `useSyncSavedExercises(savedExercisesMap)` (2319). Both compare the local map with `global.userData.savedExercises`; ED's effect writes the global AND calls `emitUserDataUpdate()`, the hook's first effect (`useSyncSavedExercises.js:84-98`) writes it silently. If the hook's effect ran first, ED's effect would see equal signatures and never emit, so other subscribers (e.g. the saved list in `SelectExerciseModal`) would not hear about a favourite toggle. Keep the subscription effect (2275-2302) before both.
2. Signature bail-outs in the subscription (2278-2299) and in 2304-2313 (`savedExercisesSignature`, `statsExercisesSignature`, `completedWorkoutsSignature`). The emit at 2312 synchronously re-enters this screen's own listener; the signature checks are what stop a set-state/emit loop. Do not replace them with deep-equal helpers or other normalisers (C5 explains why the three saved-exercise normalisers are not interchangeable). `global.userData.savedExercises` is written as a MAP here (2311) while Firestore gets an ARRAY from the hook; both shapes are expected by the normalisers.
3. Lifetime of progress state. `activeProgressMetric` (1150) and the pointer state (1649-1666) live in the screen, so they survive tab switches (the selected metric is remembered when leaving and re-entering Progress; a pending 2 s hide timer keeps running). Any extraction must keep these hooks in the screen component (or in a hook called by it). Do not move them into a tab component that unmounts.
4. Scrub gesture and pointer animation (1696-2019, 2134-2192): `Animated.timing` 150 ms in / 200 ms out, 2000 ms hide delay, 100 ms reset, `useNativeDriver: true`, `stopAnimation()` before each start, index mirrored in a ref and in state, `PanResponder` with `onStartShouldSet`/`onMoveShouldSet` = "has points" inside a vertical `ScrollView` (the ScrollView can take the responder back, which lands in `onPanResponderTerminate` -> schedule hide). Move verbatim; do not change callbacks, durations or dependency arrays.
5. Two `SafeAreaView`s from `react-native` (4148-4149): the empty first one paints the status-bar area, the second holds the content and (because `edges` is ignored) also applies the bottom inset. Do not swap to `react-native-safe-area-context` and do not merge the two views. `headerTopPadding` (1151-1154) depends on `useStableSafeAreaInsets`.
6. Style names are misleading: `styles.shareButton / shareIcon / shareText` (4346-4354, 4369-4371, 4378-4384) are used by the LIVE Favorites button (2427, 2436, 2446); `styles.favoriteButton / favoriteIcon / favoriteText` are the dead ones (B7); `styles.favoriteIconActive` is live. Delete by the line numbers in B7, not by name pattern.
7. SVG gradient ids (`exerciseOneRmGradient` 2805/2847 and the per-metric ids 2618, 2646, 2674 used at 3088/3138) must stay unique per `<Svg>` and match between `<LinearGradient id>` and `fill="url(#...)"`.
8. Navigation contracts: incoming route name `ExerciseDetail` with `route.params.exercise` (keys read: `name, title, muscleGroup, muscle, equipment, slug`, plus the how-to keys of line 38); outgoing `navigateOneWay('PastWorkout', { animation: 'slide-from-right', params })` with fallback `navigation.navigate('PastWorkout', params)` and the exact `owner` object of 2376-2389 (including the long `rankTier` fallback chain at 2385).
9. History and chart data rules (1205-1463): grouping key `wid:` vs `day:`, best-set highlight (1244-1264, 1278-1285), PR rule "heavier than every earlier workout's top set" (1435-1455), one 1RM point per workout (1355-1370), cumulative volume/reps (1406-1422), and the fact that charts only use sets whose `wid` resolves to a completed workout (1023-1032, 1346-1347). Move verbatim; see I5/I6 before "fixing" anything.
10. `calculate1RM` (Brzycki) returns negative/Infinity for reps >= 37; the guards at 1255 and 1357 handle it. Keep them.
11. `METRIC_COLORS` key is `prs` here but `personalRecords` in PS; `activeProgressMetric` values `'volume' | 'reps' | 'prs'` are used as keys in three places (2028-2040, 2592-2677, 3256). Do not unify key names with PS.

---

## I. Open questions for the owner

1. ED:4148-4149: `edges` on react-native's `SafeAreaView` is ignored. Was `react-native-safe-area-context`'s `SafeAreaView` intended (which would drop the bottom inset)? Default for the refactor: leave both lines exactly as they are.
2. ED:2450-2463 + 2325-2332: the "Share Exercise" button is commented out. The refactor rules say delete commented-out code, which also removes `handleShare`, the `Share`/`Alert` imports and three styles. OK to delete, or is the share feature coming back?
3. ED:3308-4136: three stand-alone chart cards disabled with `false &&` (about 830 lines), replaced by the switchable card. Assumed dead and scheduled for deletion; confirm they are not a parked alternative layout.
4. ED:1055-1063: the completed-workouts signature only looks at the first 40 entries, which are the OLDEST 40 (the array is appended to). Intended "most recent 40"? Should a workout rename also refresh the screen? Not changed by the refactor.
5. ED:1278-1285: the "1RM (x)" badge is granted once per session (the `highlightConsumed` flag is reset for every session), so it shows in every session that contains a set with the best set's weight and reps. Intended, or should it mark only one set overall?
6. ED:1023-1032 / 1346-1347: Progress charts drop every set that cannot be linked to a completed workout by `wid`, even when the set carries its own `timestamp` (History does use it, 1235). Intended?
7. ED:38, 115-128: no code in the repo writes `howToSteps / instructions / steps / howTo`; the About tab therefore always shows the generic three-step fallback (130-155) unless such fields exist in stored exercise data. Keep the lookup (default) or remove it?
8. ED:764-766: the PR tooltip prints weight and unit without a space ("5 x 225lbs") while the 1RM tooltip prints "5 x 225 lbs" (589). Cosmetic inconsistency; untouched.
9. ED:1086-1102: this screen resolves the unit differently from the Progress section, Muscle-group and Weight screens (exact `'kg'` only; ignores `personalInfo.weightUnit` / `stats.weightUnit`). A user whose unit is stored as e.g. `"kilograms"` or only under `personalInfo` sees lb here and kg elsewhere. Unify? (Would be a behaviour change, so not done.)
10. ED:158, 1272-1273, 1300, 4562-4575: leftovers of a weekday badge in the History cards (computed label + two styles, never rendered). Scheduled for deletion; confirm the badge is not meant to return.
