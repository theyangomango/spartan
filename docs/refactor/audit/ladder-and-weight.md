# Audit: partition "ladder-and-weight" (9 files, 3919 lines)

Read-only audit of the pre-refactor baseline (working tree == SPX/baseline for all 9 files, verified with diff).
All paths are relative to /Users/yangbai/Desktop/Projects/spartan. Line numbers are as the files are now.

Abbreviations used below:
- LUT  = frontend/components/2_Competition/LevelUpTransition.js (544)
- RBE  = frontend/components/2_Competition/RankBadgeEmblem.js (205)
- LC   = frontend/components/2_Competition/layoutConstants.js (48)
- MGIL = frontend/components/2_Competition/muscleGroupIconLayout.js (45)
- RBLH = frontend/components/2_Competition/rankBadgeLevelHelpers.js (91)
- ES   = frontend/components/2_Competition/sections/ExercisesSection.js (727)
- COMP = frontend/screens/2_Competition.js (429)
- MGE  = frontend/screens/MuscleGroupExercises.js (743)
- WMS  = frontend/screens/WeightMeasurementsScreen.js (1087)
- PS   = frontend/components/2_Competition/sections/ProgressSection.js (4763; other partition "progress-section")

Every file was read completely. Machine findings were re-run with SPX/tools/lint.sh (same 9 warnings as the findings file) and each knip/jscpd lead was verified by grep/diff as described per item.

---------------------------------------------------------------------------------------------------

## A. Module map

| File | Purpose | Exports | Imported by |
|---|---|---|---|
| LUT | Full-screen "Rank Up" modal: cross-fades two FeedSnapshotCards (old rank -> new rank) with RN Animated loops. | default `LevelUpTransition({visible, fromRank, toRank, overallRating, onClose})` | ES:19 (in partition); **frontend/screens/1_Feed.js:67** (rendered at 1_Feed.js:1571). Both callers pass all 5 props. |
| RBE | SVG rank emblem (hex medal + gem; level 1-5 adds ring/rays/outline/wings). | default `memo(RankBadgeEmblem)({rankTheme, stage, size})`; named `RANK_BADGE_ASPECT_RATIO` | **frontend/components/1_Feed/FeedSnapshotCard.js:14**, **frontend/components/5_Profile/ProfileTop/ProfileRankBadge.js:6** (default); **frontend/components/ViewProfile/ViewProfileHeader.js:10**, **frontend/components/5_Profile/ProfileTop/ProfileHeader.js:10** (`RANK_BADGE_ASPECT_RATIO`). Nothing inside the partition imports it. |
| LC | Competition-area layout constants and a *local* `scaleSize(value, axis)`; re-exports `ts`. | `scaleSize`, `SIZES`, `HEADER_GRADIENT_OVERLAP`, `PODIUM_PULLUP`, `DEVICE_WIDTH`, `DEVICE_HEIGHT`, `scaleFont`, `ts` | In partition: LUT:11, ES:9, COMP:19-23, MGE:14, WMS:28. Outside (LIVE): **PS:31**, **frontend/components/charts/chartStyles.js:4**, **frontend/components/2_Competition/UserStats/UserStatsProgressPreview.js:12**, **frontend/screens/ExerciseDetail.js:21**. PARKED: **TribeMenu.js:8** (`SIZES`), **sections/LeaderboardsSection.js:53-58** (`SIZES, PODIUM_PULLUP, DEVICE_WIDTH, DEVICE_HEIGHT`). DEAD: RankTierMiniBadge.js:6. |
| MGIL | Zoom/offset/colour tables for the muscle-group badge icons. | `MUSCLE_ICON_BASE_SIZE`, `MUSCLE_ICON_HIGHLIGHT`, `MUSCLE_ICON_HIGHLIGHT_DIM`, `OVERALL_MUSCLE_SEGMENTS`, `MUSCLE_ICON_SCALES`, `MUSCLE_ICON_OFFSETS`, `MUSCLE_ICON_STROKE_WIDTHS` | ES:21-28; **PS:39-46**; PARKED **LeaderboardsSection.js:62** (`MUSCLE_ICON_HIGHLIGHT`, `MUSCLE_ICON_HIGHLIGHT_DIM`). All 7 exports are used. |
| RBLH | Rank-level helpers: roman level -> stage 1-5, hex -> `rgba()` with alpha. | `resolveLevelStage`, `withAlpha`, `deriveBadgeDetailColors` | LUT:10 (`withAlpha`); **FeedSnapshotCard.js:13** (`resolveLevelStage`, `withAlpha`); **ProfileRankBadge.js:7** (`resolveLevelStage`); DEAD RankTierMiniBadge.js:7 (all three). |
| ES | "Ladder" tab: the 30 rank cards (LADDER_LEVELS, descending) each with a quest panel; auto-scrolls to the current rank; hosts a LevelUpTransition. | default `React.memo(ExercisesSection)({onScroll, scrollSignal})` | COMP:28 only. |
| COMP | "Competition" root screen (route name `Competition`): two-tab pager (Ladder / Progress), animated tab indicator, hidden UserStatsBottomSheet, Footer. Contains the commented-out Compete block (lines 26, 38-39, 231-239). | default `Competition({navigation, route})` | **frontend/screens/index.js:15** (`Competition`) -> **App.js:49, 1538-1539**. Route param `focusTab` is sent by 1_Feed.js:1504, 1525. |
| MGE | Route `MuscleGroupExercises`: list of the user's exercises for one muscle group with est. 1RM and a sparkline. | default `MuscleGroupExercises()` | **frontend/screens/index.js:26** -> **App.js:59, 1582-1583**. Only navigation caller: **PS:2224-2238** (`handleMusclePress`). |
| WMS | Route `WeightMeasurements`: list/add/edit/delete bodyweight entries (live `usersPrivate/{uid}` listener). | default `WeightMeasurementsScreen()` | **frontend/screens/index.js:35** -> **App.js:68, 1577-1578**. Only navigation caller: **PS:3982**. |

---------------------------------------------------------------------------------------------------

## B. Verified dead code

Evidence commands were `grep -rn` over the whole repo excluding node_modules/ios/.git (imports, re-exports, bracket access, destructuring, string uses).

### B1. Remove

| # | Identifier | Kind | Location | Evidence |
|---|---|---|---|---|
| 1 | `HEADER_GRADIENT_OVERLAP` | const + export | LC:35, LC:41 | Only two hits repo-wide, both in LC itself. No LIVE/PARKED/TOOLING/DEAD user. |
| 2 | `scaleFont` | export alias (`baseScaleSize as scaleFont`) | LC:45 | `grep -w scaleFont` -> only LC:45. Remove the alias line only; `baseScaleSize` import (LC:2) is still needed for `BASE` (LC:6-9). |
| 3 | `SIZES.tribeLabelFont`, `.tribeLabelMaxWidth`, `.tribeLabelMarginRight`, `.iconMR`, `.iconMT`, `.chevronML`, `.chevronMT`, `.selectorOffset` | 8 object keys | LC:25-32 | Each name appears only at its definition line. No `SIZES[`, `...SIZES` or destructuring of `SIZES` anywhere (TribeMenu.js:45 and LeaderboardsSection.js use only dotted access). |
| 4 | `deriveBadgeDetailColors` | function + export | RBLH:66-88, RBLH:90 | Only importer is DEAD `RankTierMiniBadge.js:7,25`. Change RBLH:90 to `export { resolveLevelStage, withAlpha };`. (`normalizeHex`, `hexToRgb`, `clampStage`, `LEVEL_STAGE_MAP` stay: used by the two surviving exports.) |
| 5 | `currentRankEntry` | unused local | ES:236 | ESLint no-unused-vars; no other reference in ES. |
| 6 | `forceKeep: true` | option that nothing reads | ES:331 | `attemptCenterCurrentCard` (ES:269-316) reads only `options.animated` and `options.preserveTarget`. `grep forceKeep` -> 1 hit. |
| 7 | `formatScoreValue` | local helper identical to an existing util | ES:45-49 (uses at ES:81, ES:113) | Body is identical to `formatHexStat(value)` with its default fallback `"0.0"` (frontend/utils/formatHexStat.js:2-8), which ES already imports (ES:32). Replace the 3 call sites with `formatHexStat` and delete the local. Identical for every input (same `Number()`, same `isFinite` test, same `toFixed(1)`, same `"0.0"`). |
| 8 | `// marginBottom: scaleSize(20),` | commented-out code | ES:598 | Leaves `cardWrapper: {}` (ES:597-599), an empty style used once at ES:429. Remove the key and the `styles.cardWrapper` element of the style array at ES:428-431 (keep `index === 0 && styles.firstCard`). No visual effect: an empty style contributes nothing. |
| 9 | `insets` + `useStableSafeAreaInsets` import | unused local / then-unused import | COMP:53, COMP:15 | ESLint no-unused-vars. The hook (frontend/hooks/useStableSafeAreaInsets.js) has no side effect outside its own ref; removing the call only removes a re-render on inset change. It is an unconditional top-level hook, so removing it keeps hook order stable. |
| 10 | `// screens/Competition.jsx` | stale path note | COMP:1 | File is `frontend/screens/2_Competition.js`. This line is NOT part of the Compete block. |
| 11 | `MUSCLE_ICON_HIGHLIGHT`, `MUSCLE_ICON_HIGHLIGHT_DIM` | local duplicate constants | MGE:23-24 | Same literal values as MGIL:6-7. Replace with `import { MUSCLE_ICON_HIGHLIGHT, MUSCLE_ICON_HIGHLIGHT_DIM } from "../components/2_Competition/muscleGroupIconLayout";`. |
| 12 | `if (key === "shoulders") return "shoulders";` | unreachable statement | MGE:74 | MGE:73 `key.startsWith("shoulder")` already returned for that input. |
| 13 | duplicate import line | duplicate import of one module | LUT:7-8 | Merge to `import FeedSnapshotCard, { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";`. |

### B2. Unreachable with today's callers (safe to remove, lower value; implementer's call)

| # | Identifier | Location | Evidence / note |
|---|---|---|---|
| 14 | `DEFAULT_SEGMENTS`, `DEFAULT_ICON_SCALES`, `DEFAULT_ICON_OFFSETS` and their `|| DEFAULT_X[muscleKey]` terms | MGE:25-51, used at MGE:448, 449, 451 | The route has exactly one navigation caller (PS:2224-2238; no deep-link config, `grep linking App.js` is empty). It always passes `muscleSegments` (array), `iconScale` (`MUSCLE_ICON_SCALES[key] || 1`, never 0) and `iconOffset` (`scaleSize(MUSCLE_ICON_OFFSETS[key] || 0)`; all 7 table values are non-zero, PS:2398-2421), so the fallbacks never run. NOTE the tables are stale copies whose values differ from MGIL (2.6 vs 2.45, 2.8 vs 2.65, ...): if kept, do NOT "dedupe" them against MGIL. If removed, leave `params?.muscleSegments || []`, `params?.iconScale || 2`, `params?.iconOffset || 0`. |
| 15 | `params?.key`, `params?.label` aliases | MGE:446, MGE:447 | The single caller sends `muscleKey` / `muscleLabel` only. Keep the literal defaults `"overall"` / `"Overall"`. |
| 16 | `fallback` parameter of `normalizeRankEntry` | LUT:37, 38, 46 | Both calls (LUT:76, 77) pass one argument, so `fallback` is always `DEFAULT_RANK`. Simplifying is a logic edit, not a move; leave unless trivial. |
| 17 | `|| DEFAULT_THEME.gradientColors` | LUT:221, LUT:230 | `normalizeRankEntry` always sets `gradient` (LUT:50). Harmless. |
| 18 | `rankProgress.promotionStatuses || new Map()` | ES:237 | `computeRankProgress` (shared/rankProgress.js:181-236) always returns a Map. Dropping `|| new Map()` also removes the exhaustive-deps warning at ES:237 without touching a dependency array. |
| 19 | inner `if (scrollSignal > 0)` | ES:330 | `scrollSignal` is 0 or `Date.now()` (COMP:69-71); the outer `if (!scrollSignal) return;` already covers it. |
| 20 | `theme.x ?? "#..."` / `theme.bg || "#05070d"` fallbacks | LUT:402; MGE:658, 707, 732; WMS:826, 840, 872, 914, 948, 975, 999, 1018, 1049, 1081 | `theme.bg`, `textPrimary`, `primary` are all defined in frontend/theme/mfpDark.js. Constant conditions; cosmetic. If WMS's modal styles are moved verbatim into a shared module (section D), leave these untouched so the move stays byte-for-byte. |
| 21 | `{ paddingTop: 0 }` inline style | COMP:268-271 | 0 is the default; `style={styles.tabsContent}` is equivalent. |

### B3. KEEP (looks unused, is not)

| Identifier | Location | Why it stays |
|---|---|---|
| `PODIUM_PULLUP` | LC:36, 42 | Used only by PARKED LeaderboardsSection.js:55. |
| `SIZES.headerIconSize`, `.chevronDelta`, `.headerPaddingTop`, `.tribeHitSlop` | LC:20-24 | Used only by PARKED LeaderboardsSection.js (1612-1864, 2122). `SIZES.headerPaddingHorizontal` is LIVE (COMP:276) and PARKED (TribeMenu.js:45). |
| `DEVICE_HEIGHT` | LC:44 | LIVE (LUT) and PARKED (LeaderboardsSection.js:57, 430). |
| `handleRequestBodyWeightEntry`, `handleShowUserStats`, `userStatsVisible`/`userStatsUser` state, `progressScrollSignal` setter, the mounted `<UserStatsBottomSheet>` | COMP:64, 66-68, 160-168, 346-355 | Only the commented-out Compete block (COMP:231-239) calls them, and that block must stay restorable "exactly as it is". Without these the restore note at COMP:38 would no longer be sufficient. |
| Extra entries in the `sectionComponents` dependency array (`navigation`, `handleRequestBodyWeightEntry`, `handleShowUserStats`, `userStatsSheetProgress`) | COMP:253-261 | Needed by the commented block; also "never change a dependency array to silence a warning". |
| `handleSectionScroll` (no-op) and ES `handleScroll` forwarder | COMP:170-172; ES:253-260, 374 | Referenced by the commented block (`onScroll={handleSectionScroll}`) and passed to PS (other partition). Leave the chain. |
| `withAlpha`'s 3rd parameter `fallback` | RBLH:60 | Never passed by a caller, but it is the default that produces white for unparsable colours; not dead. |
| `MUSCLE_ICON_HIGHLIGHT_DIM` | MGIL:7 | PS:41 and PARKED LeaderboardsSection.js:62. |
| `console.warn("weight measurements listener error", ...)` | WMS:482 | Real failure path. The partition contains no `console.log`. |

---------------------------------------------------------------------------------------------------

## C. Duplication

Verified with `diff <(sed -n 'A,Bp' fileA) <(sed -n 'C,Dp' fileB)`.

### C1. Weight-unit helpers
- `resolvePreferredWeightUnit`: WMS:33-45 == MGE:86-98 == PS:264-276 (byte-identical).
  - NOT identical: ExerciseDetail.js:1086-1102 (falls back to `global.userData`, reads only `settings.units ?? units`, exact `=== 'kg'`); UserStatsProgressPreview.js:244-255 (returns `"lbs"`, no `includes("kilo")`). Leave those two.
- `toDisplayWeightUnit`: WMS:47-58 == MGE:100-111 == PS:278-289 (byte-identical); ExerciseDetail.js:1104-1115 is the same logic in single quotes (identical behaviour).
  - NOT identical: UserStatsProgressPreview.js:494-500 (unknown unit -> fallback instead of the trimmed input; `startsWith("k")`).
- Canonical home: new `frontend/utils/weightUnits.js` exporting both, moved verbatim from WMS:33-58. Importers: WMS, MGE (this partition), PS, ExerciseDetail (`toDisplayWeightUnit` only) via cross-partition request.

### C2. Weight-entry collection helpers
- `sanitizeEntries`: WMS:67-86 == PS:351-370 (byte-identical).
- `normalizeEntryCollection`: WMS:106-113 == PS:372-379 (byte-identical).
- `selectWeightEntrySource`: WMS:115-132 vs PS:381-403: same statements, PS only adds braces/newlines (semantically identical).
- `areEntriesEqual`: WMS:88-104 only.
- Canonical home: existing `frontend/utils/weightEntries.js` (already owns `derivePublicWeightFields` / `selectLatestWeightEntry`; imported only by WMS:27 and PS:30) as additional named exports, moved verbatim from WMS:67-132; it needs `import makeID from "../../backend/helper/makeID";`.

### C3. AddMeasurementModal and its date helpers
- `normalizeToMinute`, `clampDateToNow`, `mergeDateByMode`: WMS:134-160 == PS:323-349 (byte-identical). In both files they are used only by AddMeasurementModal.
- `AddMeasurementModal`: WMS:162-433 vs PS:1058-1329. Three textual differences only:
  1. WMS:172 / WMS:175 initialise state with `clampDateToNow(new Date())`, PS:1068 / PS:1071 with `normalizeToMinute(new Date())`. These evaluate to the same value: `clampDateToNow(x)` returns `normalizeToMinute(x)` unless it is after "now", and a `new Date()` taken a moment earlier never is. (Both are overwritten by the open-effect at WMS:177-196 anyway.)
  2. `() => {}` vs `() => { }` (WMS:302 / PS:1198).
  So the two components behave identically.
- Their 31 style keys (`modalRoot` ... `iosPicker`, WMS:923-1085) were compared key by key against PS:4500-4660 with a script: all identical except `datetimeRow`, which has the same three properties in a different order (same result). Both files resolve `theme`, `scaleSize`, `ts` from the same modules.
- Canonical home: new `frontend/components/2_Competition/AddMeasurementModal.js` (see D4). Use the WMS text as the source.
- Caveat for PS: `ManageMeasurementsModal` (PS:1331-1427) also uses `styles.modalRoot`, `modalBackdrop`, `modalCardWrapper`, `modalButton`, so PS must keep those four keys.

### C4. Weight-entry mutation handlers (inside components)
- `persistEntries`, `handleSubmitMeasurement`, `handleDeleteMeasurement`, `handleRequestDelete`: WMS:520-655 == PS:2021-2156 (136 lines, byte-identical, `diff` empty).
- They close over the same names in both files: `userRef`, `isSaving`/`setIsSaving`, `getCurrentSanitizedEntries`, `preferredUnit`, `setIsModalVisible`, `setEntryToEdit`.
- `getCurrentSanitizedEntries` differs on purpose (WMS:512-518 prefers `liveEntries`; PS:2016-2019 does not) and stays local.
- Canonical home (optional, medium risk): a hook `frontend/hooks/useWeightEntryMutations.js` (see D4 step 4).

### C5. `formatWeightValue`: five different functions, do NOT merge
- WMS:60-65: `"00.0"` when invalid, always one decimal.
- PS:306-311: `"00"` when invalid, drops `.0` on integers.
- MGE:174-180: `null` when invalid, integer when >= 100, else up to one decimal.
- ES:62-71: `"0"` when invalid, rounded integer with en-US thousands separators.
- ExerciseDetail.js:856-860: `'—'` when invalid, `formatNumberCompact`.

### C6. `withAlpha`: different outputs, do NOT merge
- RBLH:60-64: hex (3/6/8 digits, `#` optional) -> `rgba(r, g, b, a)`, white on parse failure.
- ES:90-95: keeps the first 7 chars and appends a 2-digit hex alpha -> `#rrggbbaa` (alpha quantised to 1/255, no validation).
- Also NotificationCard.js:108-114 (`rgba(r,g,b,a)` without spaces, returns the input on failure) and MacroStreakBadge.js:22-27 (appends a ready-made hex pair).
- If the same-name clash in the Competition folder bothers the implementer, the safe option is a rename of the ES-local one, nothing more.

### C7. `scaleSize`: NOT the same function (see H1)
- LC:11-17 vs frontend/helper/scaleSize.js:21-23. LC's version divides the window size by an already-scaled base, so its ratio is ~1.000 on every device (it is effectively `Math.round(value)`), whereas the helper scales by `min(W/390, H/844)`. Never substitute one for the other.

### C8. Small text/number helpers
- `capitalizeWord` LUT:16-19 == `capitalizeLabel` ES:102-105 (identical bodies). NoInternet.js:7-10 `capitalize` differs (no `typeof` guard). Two 4-line copies; consolidating needs a new module, low value. Recommended: leave unless the integrator creates an app-wide text util.
- `clampRatio` ES:97-100 == shared/rankProgress.js:117-120 (identical, but the shared one is not exported). ES re-clamps a ratio that `evaluateRequirementProgress` already clamped. Optional: export it from shared/rankProgress.js and import in ES (adding an export is safe for functions/).
- `formatScoreValue` ES:45-49 == `formatHexStat` (utils/formatHexStat.js) -> item B7.
- `formatCountValue` ES:51-60 vs `formatWeightValue` ES:62-71: differ only in `Math.floor` vs `Math.round`; leave both.
- `extractLevelToken` LUT:21-28 vs `extractLevelFromLabel` FeedSnapshotCard.js:258-267: differ for blank strings (`""` vs `null`); equivalent at LUT's call sites because every use is inside an `||` chain (LUT:43-45). FeedSnapshotCard's is not exported. Related one-liners: ProfileRankBadge.js:14, shared/rankProgress.js:45-55 (`buildLevelKey`). Leave.
- Stage clamp RBE:68 vs `clampStage` RBLH:39-42: differ for `Infinity` and numeric strings; callers always pass 1-5. Leave.

### C9. Muscle-group constants
- MGE:23-24 == MGIL:6-7 -> item B11.
- MGE `DEFAULT_SEGMENTS` (25-33) equals `DEFAULT_MUSCLE_SEGMENTS` (frontend/utils/muscleTierColors.js:20-27) plus `overall: OVERALL_MUSCLE_SEGMENTS` (MGIL:9-20). MGE `DEFAULT_ICON_SCALES` / `DEFAULT_ICON_OFFSETS` (34-51) do NOT equal MGIL:22-40 (stale values; offsets are also pre-scaled). See B14.

### C10. Timestamp helpers: NOT identical
- `toMillisSafe` nested in MGE:223-253 vs PS:219-262 / ExerciseDetail.js:199-241 / UserStatsProgressPreview.js:63-106: MGE ignores `nanoseconds`, does not trim strings and tries `Date.parse` before `Number` (e.g. `"2024"` -> a 2024-01-01 epoch in MGE, `2024` in the others). Leave.
- `resolveWorkoutTimestamp` nested in MGE:255-263 reads six fields; PS:405-412 reads only `created`. Leave.

### C11. "own user data" state pattern
- `useState(() => { try { return global?.userData || null } catch { return null } })` + `subscribeUserData(setUserData)`: ES:193-211, MGE:432-443 (identical); WMS:437-460 and PS:1429-1458 (identical to each other; they additionally mirror into `userRef`). Other screens use different variants (5_Profile.js:87, UserStatsScreen.js:26, ...). A `useGlobalUserData()` hook would be new code rather than a move; candidate only, not required.

### C12. Internal repetition (leave)
- LUT:320-330 / 347-357 (two FeedSnapshotCards differing in from/to and `enableRankAnimations`), RBE:133-135 / 138-140 (mirrored wings), COMP:86-87 / 196-197 (indicator geometry), WMS:719-721 / 744-746 (haptic try/catch). All too small to justify an abstraction.

---------------------------------------------------------------------------------------------------

## D. Decomposition plans (files over ~500 lines)

General: move with `sed -n 'A,Bp'`, add only imports/exports. New files sit next to the original; original paths keep their default export.

### D1. LUT (544 lines) -> extract styles only
- New `frontend/components/2_Competition/LevelUpTransition.styles.js`: LUT:390-543 (`const styles = StyleSheet.create({...})`), exported as default.
  Needs: `StyleSheet` (react-native), `theme` (../../theme/mfpDark), `DEVICE_HEIGHT, DEVICE_WIDTH, scaleSize, ts` (./layoutConstants).
- LUT afterwards (~390 lines): drops `StyleSheet` from the RN import, drops `theme` (only LUT:402 uses it) and `ts` (only styles use it); keeps `DEVICE_HEIGHT`, `DEVICE_WIDTH`, `scaleSize` (LUT:64-66, 164, 176, 184, 200, 382).
- Helpers LUT:13-67 are small and only used here; they stay.
- Blockers: none. Styles are evaluated at module load in both layouts.

### D2. ES (727 lines)
1. New `sections/ladderQuestFormat.js` (pure helpers + palette): ES:33-40 (`CARD_THEME_COLORS`), ES:51-133 (`formatCountValue`, `formatWeightValue`, `formatRequirementProgressText`, `withAlpha`, `clampRatio`, `capitalizeLabel`, `describeRequirement`). `formatScoreValue` (ES:45-49) is replaced by `formatHexStat` (B7).
   Needs: `CalendarCheck, Dumbbell, Target` (lucide-react-native), `MUSCLE_ICON_SCALES` (../muscleGroupIconLayout), `formatHexStat`.
   Exports actually needed by ES: `CARD_THEME_COLORS`, `formatRequirementProgressText`, `withAlpha`, `clampRatio`, `describeRequirement`.
2. New `sections/QuestRing.js`: ES:135-137 (`RING_SIZE`, `RING_STROKE`, `RING_ICON_SIZE`), ES:139-155 (`QuestMuscleIcon`), ES:157-188 (`QuestRing`) plus a local StyleSheet with the three keys they use: `questRing` (ES:677-682), `questMuscleIcon` (ES:683-690), `questMuscleIconZoom` (ES:691-696).
   Needs: React, `StyleSheet, View`, `Svg, { Circle }`, `scaleSize`, `MuscleGroupIcon`, all six MGIL constants ES imports today (`MUSCLE_ICON_BASE_SIZE, MUSCLE_ICON_HIGHLIGHT, MUSCLE_ICON_OFFSETS, MUSCLE_ICON_SCALES, MUSCLE_ICON_STROKE_WIDTHS, OVERALL_MUSCLE_SEGMENTS`; `QuestMuscleIcon` uses every one of them), `DEFAULT_MUSCLE_SEGMENTS`.
   Exports: `QuestRing`, `QuestMuscleIcon`.
3. New `sections/ExercisesSection.styles.js`: the remaining keys of ES:580-724 (everything except the three in step 2 and the removed `cardWrapper`). Needs `StyleSheet`, `theme`, `scaleSize`.
4. Optional (low risk, a wrap rather than a pure move): turn the quest-panel IIFE ES:448-571 into a component `LadderQuestPanel({ entry, promotionThemeKey, tasksToRender, requirementsCompleted, shouldDimRequirementsBlock })` whose body is ES:449-570 verbatim. It closes over nothing else from the component (only module-level helpers and `styles`). Renders the same native views.
- Stays in ES: imports, `FOOTER_SAFE_OFFSET`/`TABBAR_HEIGHT`/`TOP_SPACER_EPSILON` (ES:41-43), the component (ES:190-578), `export default React.memo(ExercisesSection)`. Result ~400 lines (~280 with step 4).
- After the move ES imports only `Check` from lucide-react-native and no longer needs `Svg`/`Circle`, `MuscleGroupIcon`, MGIL or `DEFAULT_MUSCLE_SEGMENTS`.
- Blockers: `styles` is shared by `QuestMuscleIcon`/`QuestRing` and the main component, hence the dedicated StyleSheet in step 2; `RING_*` constants are used by both the components and those three style keys, so they must live in QuestRing.js.
- Do not touch the scroll-centering logic ES:269-351 while moving (H4).

### D3. MGE (743 lines)
1. New `frontend/screens/muscleGroupExercisesUtils.js`: MGE:53-67 (`EXERCISE_META_MAP`), 69-82 (`normalizeGroupKey`), 113-139 (`resolveExerciseGroup`), 141-172 (`buildExerciseList`), 174-180 (`formatWeightValue`), 182-194 (`computeBestOneRmFromSets`), 196-214 (`resolveEstimatedOneRm`).
   Needs: `exercises as EXERCISE_DEFS`, `buildMetaFromDefs, inferMetaByName`, `toExerciseSlug` (from ../components/common/ExerciseAvatar, as today), `calculate1RM`.
   Exports needed by the screen: `EXERCISE_META_MAP` (MGE:475), `buildExerciseList` (464), `formatWeightValue` (502), `resolveEstimatedOneRm` (501).
2. New `frontend/screens/muscleGroupSparkline.js`: MGE:216-220 (`SPARK_WIDTH`, `SPARK_HEIGHT`, `SPARK_PAD_X`, `SPARK_PAD_Y`, `ONE_RM_EQUAL_EPSILON`), MGE:222-427 (`buildSparklinePath`).
   Needs `calculate1RM` and `formatWeightValue` (used at MGE:388) from step 1. Exports `SPARK_WIDTH`, `SPARK_HEIGHT`, `buildSparklinePath` (screen uses them at MGE:504, 538-540).
3. New `frontend/screens/MuscleGroupExercises.styles.js`: MGE:609-742. Needs `StyleSheet`, `theme`, `scaleSize`, `ts`.
- Stays: imports, `clamp` (MGE:84), the route-param defaults, the component (MGE:429-607). Result ~200 lines.
- `resolvePreferredWeightUnit` / `toDisplayWeightUnit` (MGE:86-111) leave for `frontend/utils/weightUnits.js` (C1).
- Blockers: none; everything above the component is module-level and pure. `EXERCISE_META_MAP` is built once at module load in both layouts (same cost, same moment: first import of the screen graph).
- If a sub-folder is preferred, `frontend/screens/feed/` is the precedent; sibling files match the naming rule in the briefing.

### D4. WMS (1087 lines)
1. `frontend/utils/weightUnits.js` (new): WMS:33-58 (C1). WMS then imports `resolvePreferredWeightUnit` (used at WMS:491); the modal module imports `toDisplayWeightUnit` (used at WMS:287).
2. `frontend/utils/weightEntries.js` (existing, add named exports): WMS:67-132 (`sanitizeEntries`, `areEntriesEqual`, `normalizeEntryCollection`, `selectWeightEntrySource`) + `makeID` import. WMS still needs `makeID` itself (WMS:608).
3. `frontend/components/2_Competition/AddMeasurementModal.js` (new, default export): WMS:134-160 (three date helpers), WMS:162-433 (component), and a StyleSheet holding WMS:923-1085 (31 keys: `modalRoot`, `modalBackdrop`, `modalCardWrapper`, `modalCard`, `modalTitle`, `modalSubtitle`, `modalField`, `modalLabel`, `modalInput`, `datetimeRow`, `datetimeColumn`, `datetimeColumnLeft`, `nowButton`, `nowButtonText`, `modalActions`, `modalButton`, `cancelButton`, `saveButton`, `saveButtonDisabled`, `cancelButtonText`, `saveButtonText`, `selectorButton`, `selectorButtonDisabled`, `selectorButtonText`, `pickerOverlay`, `pickerBackdrop`, `pickerSheet`, `pickerToolbar`, `pickerToolbarButton`, `pickerToolbarButtonText`, `iosPicker`).
   Verified: the screen component (WMS:435-787) uses none of these 31 keys, and the modal uses none of the other 21 (52 keys total, 0 unused).
   Needs: `useCallback, useEffect, useMemo, useState`; `Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View`; `DateTimePicker, { DateTimePickerAndroid }`; `RNBounceable`; `dayjs`; `theme`; `scaleSize, ts`; `toDisplayWeightUnit`.
   WMS then drops `Keyboard`, `KeyboardAvoidingView`, `Modal`, `Platform`, `TextInput`, and the datetimepicker import.
4. Optional, coordinate with the PS owner (medium risk): `frontend/hooks/useWeightEntryMutations.js` containing WMS:520-654 verbatim inside
   `export default function useWeightEntryMutations({ userRef, getCurrentSanitizedEntries, preferredUnit, setIsModalVisible, setEntryToEdit })`, owning `const [isSaving, setIsSaving] = useState(false);` (today WMS:445 / PS:1440) and returning `{ isSaving, handleSubmitMeasurement, handleRequestDelete }` (`persistEntries` and `handleDeleteMeasurement` are only used inside the block).
   The hook must be called after `preferredUnit` (WMS:491) and `getCurrentSanitizedEntries` (WMS:512) and before the first use of `isSaving` (WMS:666). That moves one `useState` later in hook order, which is fine (still unconditional). In PS, `isSaving` is not read between PS:1440 and PS:2021, so the same placement works there.
5. `frontend/screens/WeightMeasurementsScreen.styles.js` (new): WMS:790-922 (the 21 screen keys).
- Stays: the screen component and the live-listener logic. Result ~390 lines (~260 with step 4).
- Blockers: none for steps 1-3 and 5 (module-level code). Step 4 shares five closures; the seam is clean only because both files use identical names.

Files at or under 500 lines (RBE, LC, MGIL, RBLH, COMP) need no split.

---------------------------------------------------------------------------------------------------

## E. Latent bugs

No undefined names, duplicate object keys or conditionally-called hooks in the partition (SPX/tools/lint.sh reports 0 errors; its rule set has `no-undef`, `no-dupe-keys` and `react-hooks/rules-of-hooks` as errors). All StyleSheet keys in the five files that have one are used (checked by script: LUT 24, ES 25, COMP 13, MGE 22, WMS 52 keys, 0 unused).

| # | Location | Problem | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | MGE:499-555 (`renderItem`), deps at MGE:554 | Stale closure: `renderItem` passes `completedWorkouts` to `buildSparklinePath` (MGE:512) but the dependency array is `[displayPreferredUnit, handlePressExercise]`. When `userData` updates while the screen is open, `exerciseList` (FlatList `data`) refreshes but rows are rendered with the old workouts, so set timestamps resolved through `workoutsByWid` (MGE:265-272, 317-326) come from the previous snapshot. | Add `completedWorkouts` to the dependency array. This is a correctness fix, not a lint silencing; it only changes output in the window where user data changes with the screen open. | medium-high (bug is certain; record it as a behaviour fix) |
| E2 | ES:355-358 (same code in 1_Feed.js:427-430, other partition) | Double removal: `dequeueRankPromotion()` synchronously notifies subscribers (userDataEvents.js:164-175, 55-62), whose listener already does `setLevelUpQueue(rest)` (ES:263-265); the following `setLevelUpQueue(prev => prev.slice(1))` then drops a second item from local state. With a multi-step promotion queue `[A, B, C]`, dismissing A shows C (B is skipped) while the global queue still holds `[B, C]`. Single-step promotions are unaffected. | Delete the local `setLevelUpQueue(...slice(1))` line (the subscription already syncs state). Apply the same change in 1_Feed.js or neither. | medium (evident, but it changes visible behaviour for multi-level jumps; needs owner sign-off, see I3) |
| E3 | ES:275-283 | Every call passes `preserveTarget: true` (ES:319, 325, 331, 344), so the branch that clears `global[LADDER_SCROLL_TARGET_KEY]` never runs. Once 1_Feed.js:1519 sets a target, the ladder keeps centring on that key for the rest of the session, even after the user's rank changes. | Not obvious which call was meant to consume the target (probably the `scrollSignal` one at ES:331). Do not guess. | low (see I2) |
| E4 | WMS:535-544 (same in PS:2036-2045) | `backend/helper/firebase/updateDoc.js` returns `false` instead of throwing for `not-found` / `permission-denied` on `usersPrivate` / `usersPublic`; `persistEntries` ignores the booleans and returns `true`, so the modal closes as if saved. | Would need a new error path (alert). Not a mechanical fix. | low (see I5) |
| E5 | WMS:77 (same in PS:361) | `sanitizeEntries` invents a new `makeID()` for an entry without `id`/`key` on every call. For such legacy entries the list rows (`fallbackEntries`, WMS:493-496) and `getCurrentSanitizedEntries()` (WMS:512-518, re-sanitises when `liveEntries` is null) get different ids, so edit ends in "Measurement not found" (WMS:590-594) and delete removes nothing (WMS:631 filters by an id that no longer exists, then rewrites the unchanged list, which at least stores the new ids). Entries written by this code always have ids. | None proposed. | low (edge case, note only) |

---------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Location | Issue | Suggested change | Risk |
|---|---|---|---|---|
| F1 | LUT:7-8 | Two imports of the same module. | Merge (B13). | none |
| F2 | MGE:594 | Component defined during render (`ItemSeparatorComponent={() => <View .../>}`), so separators are a new component type on every render. | Hoist `const ItemSeparator = () => <View style={styles.separator} />;` to module scope (or into the screen file after D3) and pass the reference. | low |
| F3 | MGE:21; WMS:30-31; COMP:25; ES:32-33 | Import grouping: `react-native-svg` after local imports (MGE), `firebase/firestore` + `firebase.config` after local imports (WMS), `react-native-reanimated` between local imports (COMP), no blank line between the last import and the first constant (ES). | Regroup react / react-native / third-party / local when the import block is being edited anyway. No side-effect imports are involved in these four blocks. | none |
| F4 | ES:448-571 | 120-line IIFE inside JSX. | Extract `LadderQuestPanel` (D2 step 4). | low |
| F5 | ES:237 | `|| new Map()` creates a new Map per render if ever taken (exhaustive-deps warning). | Drop the unreachable fallback (B18). | none |
| F6 | MGE:472-488 | `buildExercisePayload` is a `useCallback` with `[]` that uses nothing from the component and shadows `muscleLabel` (MGE:477 vs 447). | Could become a module-level function; optional. If left, nothing is wrong. | low |
| F7 | MGE:223-326 | `buildSparklinePath` re-creates five closure-free helpers (`toMillisSafe`, `resolveWorkoutTimestamp`, `normalizeTs`, `parseNumeric`, `normalizeOneRmValue`) on every call, once per visible row per render. | Could be hoisted to module scope verbatim (dedent only). Optional; performance only. | low |
| F8 | ES:318-320 and ES:323-326 | Two effects with overlapping triggers both call `attemptCenterCurrentCard` (the second effect's deps are a superset, and its `scrollContainerHeight <= 0` guard is repeated inside the callback at ES:271). | Leave (H4). Merging is probably equivalent but this is layout-timing code with no tests. | medium if touched |
| F9 | COMP:229-262 | `useMemo` dependency array lists values the live body does not use. | Leave (B3). | n/a |
| F10 | WMS:227 | `openPicker`'s parameter `mode` shadows the `mode` prop. | Cosmetic; leave, especially if the modal is moved verbatim. | n/a |
| F11 | WMS:720, 745 | `hapticStrong?.()` on a static named import (always defined). | Cosmetic; the surrounding try/catch is a legitimate guard around a native call. Leave. | n/a |
| F12 | WMS:675-698, MGE:524-529 | Mis-indented JSX. | Leave (no formatting churn). | n/a |
| F13 | LUT:153 | `useMemo(buildShimmerLines, [])` computes a device-constant list per mount. | Could be a module constant; optional. | low |

Effects and subscriptions were all checked for cleanup: LUT:146-150 (stops the three animations), ES:206-211, 262-267 (unsubscribe), COMP:114-119 (unsubscribe), MGE:440-443, WMS:454-460, 462-489 (unsubscribe / `onSnapshot` unsubscribe). No timers are created in the partition. COMP:185-190 and 207-220 start short one-shot animations without stopping them on unmount, which is harmless.

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

1. **PS (partition progress-section)**: after the shared modules exist, delete its copies and import instead:
   - `resolvePreferredWeightUnit`, `toDisplayWeightUnit` (PS:264-289) -> `frontend/utils/weightUnits.js`.
   - `sanitizeEntries`, `normalizeEntryCollection`, `selectWeightEntrySource` (PS:351-403) -> `frontend/utils/weightEntries.js`.
   - `normalizeToMinute`, `clampDateToNow`, `mergeDateByMode` (PS:323-349) and `AddMeasurementModal` (PS:1058-1329) -> `frontend/components/2_Competition/AddMeasurementModal.js`; then drop the 27 style keys only that modal used, keeping `modalRoot`, `modalBackdrop`, `modalCardWrapper`, `modalButton` (still used by `ManageMeasurementsModal`, PS:1331-1427).
   - Optional: PS:2021-2156 -> `useWeightEntryMutations` (D4 step 4).
   - PS keeps its own `formatWeightValue` (PS:306-311; differs, C5).
   The orchestrator should decide which partition creates the shared files; this audit proposes taking WMS's text as the canonical copy.
2. **frontend/screens/ExerciseDetail.js:1104-1115**: `toDisplayWeightUnit` is behaviourally identical to the shared one; import it. Its `resolvePreferredWeightUnit` (1086-1102) differs and must stay local.
3. **frontend/screens/1_Feed.js:427-430**: same double-dequeue as E2; fix both or neither. Also 1_Feed.js:54-55 imports `../utils/competitionTabEvents` twice.
4. **frontend/components/2_Competition/RankTierMiniBadge.js (DEAD)**: after B4 its import of `deriveBadgeDetailColors` no longer resolves. Expected; add the file to "can now be deleted" and ignore lint inside it.
5. **PARKED constraint (no change requested)**: `SIZES` (keys `headerIconSize`, `chevronDelta`, `headerPaddingHorizontal`, `headerPaddingTop`, `tribeHitSlop`), `PODIUM_PULLUP`, `DEVICE_WIDTH`, `DEVICE_HEIGHT` in LC and `MUSCLE_ICON_HIGHLIGHT`, `MUSCLE_ICON_HIGHLIGHT_DIM` in MGIL must keep their names, paths and values for TribeMenu.js and LeaderboardsSection.js.
6. **Everyone importing `scaleSize`**: LC's `scaleSize` and `frontend/helper/scaleSize` are different functions (H1). Files importing LC's version outside this partition: PS:31, charts/chartStyles.js:4, UserStats/UserStatsProgressPreview.js:12, ExerciseDetail.js:21. None of them may be switched to the helper.
7. **shared/rankProgress.js:117** (optional, low value): export `clampRatio` so ES can drop its copy (C8).
8. **frontend/utils/resolveRankTierKey.js:18-25** `RANK_TITLE_MAP` has the same content as `DISPLAY_TITLES` (shared/rankProgress.js:3-10), which LUT:9 already imports. Out of scope here; noted for whoever owns that file.

---------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

1. **LC:4-17, `scaleSize` double scaling.** `BASE.width = baseScaleSize(390)` is already multiplied by the device factor, so `width / BASE.width` is ~1.0. Simulated: ratio(min) = 1.000 on 375x667, 390x844, 393x852, 430x932, 440x956, 820x1180 and 1.001 on 411x914, where `helper/scaleSize` gives 0.79-1.40. Only the `"w"` axis deviates (1.22 on 375x667, 1.50 on iPad); an axis argument is passed only at LC:22, WMS:935, PS:4512 (`"w"`) and PS:4697 (`"h"`). Every size in ES, LUT, MGE, WMS, COMP, PS, chartStyles, UserStatsProgressPreview and ExerciseDetail depends on this. Do not "simplify" LC, do not swap imports, do not change the `Math.round`.
2. **COMP commented Compete block** (COMP:26, 38-39, 231-239) and everything that keeps it restorable (B3).
3. **COMP tab animation state** (COMP:72-94, 174-221): `skipTabAnimationRef`, `isFirstRender`, `indicatorReady`, `prevWidthRef` are read and cleared across two effects whose order matters (the slide effect at 174-191 clears the skip flag before the indicator effect at 193-221 runs) and by `applyTabRequest` -> `syncTabVisuals`. `isFirstRender` looks redundant with the initial `skipTabAnimationRef = true`; leave it. `slideAnim` uses the native driver, the indicator does not (it animates `width`).
4. **ES scroll-to-rank loop** (ES:269-351): `attemptCenterCurrentCard` sets `topSpacerHeight`, which changes content height, which re-triggers the callback through three effects plus `onLayout` / `onContentSizeChange`. The `Math.abs(prev - height) > 1` guards (ES:337, 350) and the `requiredHeadroom > topSpacerHeight` test (ES:300) are what stop it oscillating. It also reads and writes `global[LADDER_SCROLL_TARGET_KEY]`. Do not merge the effects, reorder them or change dependency arrays.
5. **LUT animation effect** (LUT:86-151): native-driver sequence + two loops restarted on `visible`/`signature`; `spin` is intentionally or accidentally not reset (LUT:88-91). Interpolations (LUT:154-205) and the module-level `DEVICE_HEIGHT`-based styles must stay as they are. The outer `Pressable` (LUT:209) and the CTA `Pressable` (LUT:362) both call `onClose`; keep the nesting.
6. **FeedSnapshotCard props from ES/LUT** (ES:435-446, LUT:320-357): `showRankTabs={false}` + `forceTabKey="rank"` keep the card from subscribing to stats (FeedSnapshotCard.js:354); `enableRankAnimations` only for the current rank limits running loops to one card out of 30.
7. **RBE geometry**: precomputed hex strings, gradient ids (`emblemGlow`, `emblemRim`, `emblemRimMatte`, `emblemFace`), draw order and the per-level tables (RBE:42-44). Pure, memoised, no cleanup needed; nothing to refactor.
8. **WMS live listener** (WMS:444-489): `userRef.current = payload` inside the subscriber (WMS:456) is synchronous on purpose (`persistEntries` reads the ref); the `onSnapshot` effect depends on `userData?.uid` only and uses `userRef.current?.uid` as fallback; `setLiveEntries` is guarded by `areEntriesEqual` to avoid re-render loops. Firestore paths/fields: `usersPrivate/{uid}` field `progress.weightEntries` plus `deleteField()` on `weightEntries`, `bodyweightEntries`, `bodyweightLog`; `usersPublic/{uid}` gets `derivePublicWeightFields(...)`. Must not change.
9. **AddMeasurementModal** (WMS:162-433): the reset effect keyed on `[isVisible, initialEntry, mode]`, the Android imperative `DateTimePickerAndroid.open` path vs the iOS draft/confirm sheet, and the functional `setSelectedDate` that also calls `setIosDraftDate` (WMS:238-243). Move verbatim only.
10. **MGE `buildSparklinePath`** (MGE:222-427): numerically delicate (1e9/1e12 timestamp heuristics, 0.75 dedupe epsilon combined with a formatted-string comparison, 12-point window, map keyed by timestamp). Move verbatim only; do not replace its nested `toMillisSafe` with another module's (C10).
11. **Same-name helpers that differ**: `formatWeightValue` x5 (C5), `withAlpha` x4 (C6), `scaleSize` x2 (C7), `toMillisSafe` variants (C10), MGE's `DEFAULT_ICON_*` vs MGIL (C9).
12. **`global.*` contract**: ES/MGE/WMS read `global.userData` in state initialisers; ES reads/writes `global.__ladderScrollTarget`. Keep as is.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

1. **LC `scaleSize` does not scale** (H1). Is the double division intended? Fixing it would resize the whole Competition area, charts and ExerciseDetail, so it is out of scope for a behaviour-preserving refactor; it is recorded here only.
2. **Ladder scroll target is never cleared** (E3). Should one of the `attemptCenterCurrentCard` calls consume `global.__ladderScrollTarget` (i.e. omit `preserveTarget`)? Today the first value set by the Feed pins the ladder's scroll target for the session.
3. **Rank-up queue skips a step** (E2) in both ES and 1_Feed.js. OK to remove the redundant local `slice(1)` in both places?
4. **LevelUpTransition is mounted twice** (1_Feed.js:1571 and ES:362), both driven by the same global queue. If Feed and Competition are mounted together, two modals become visible for one promotion. Intended?
5. **Silent save failure** (E4): should a `false` from `updateDoc` (missing or forbidden `usersPrivate` / `usersPublic` doc) be reported to the user instead of closing the modal as saved?
6. **Hidden UserStatsBottomSheet in COMP** (COMP:346-355) is always mounted but can never open while Compete is parked. Kept for restorability; confirm that is preferred over removing it together with its handlers.
7. **Quest panel colour**: `promotionThemeKey` (ES:392-393) falls back to `nextLevelEntry.rankTier`, i.e. the tier *below* the card (the panel "Reach Silver I" is coloured bronze), and `promotionRequirements?.theme` is never defined in shared/rankLevelTasks.js. Likewise the `promotionStatusForNext` branch at ES:412-413 can never match. Intended, or leftovers of an earlier ladder orientation?
8. **MGE stale default tables** (B14): delete them (unreachable) or keep them as a safety net? If kept, should they be synced with MGIL (that would change nothing visible today)?
9. **WMS unit label**: list rows print the raw stored unit (`"150.0 lb"`, WMS:706) while the modal and the Progress tab use `toDisplayWeightUnit` (`"lbs"`). Intended?
10. **Legacy weight entries without ids** (E5): do any exist in production data? If so edit/delete on them fails until the live snapshot has loaded.
