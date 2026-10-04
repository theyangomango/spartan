# Audit: partition "workout-rest" (18 files, 2989 lines)

All 18 files were read completely. All 18 are byte-identical to SPX/baseline, so every line number below is valid for both.
Path abbreviations used below:
- W3/ = frontend/components/3_Workout/
- NW/ = frontend/components/3_Workout/NewWorkout/
- SE/ = frontend/components/3_Workout/NewWorkout/SelectExercise/
- PARKED-SEM = frontend/components/2_Competition/SelectExercise/SelectExerciseModal.js (PARKED)

Lint on the partition: 0 errors, 7 warnings (all confirmed in section B). No `console.*` call exists in any of the 18 files.

---------------------------------------------------------------------------------------------------

## A. Module map

| File (lines) | Purpose | Exports | Imported by |
|---|---|---|---|
| W3/InviteBanner.js (120) | Presentational banner "X invited you to join their workout" with Accept / Dismiss | default `InviteBanner({ invite, pfpUri, onAccept, onDecline })` | OUTSIDE: frontend/components/WorkoutInviteOverlay.js:4 (passes all 4 props) |
| SE/AnimatedButton.js (59) | "Add (n)" footer button of the exercise picker, fades with selection count | default `AnimatedButton({ opacity, selectedExercisesLength, handleFinish })` | SE/SelectExerciseModal.js:24 only |
| SE/EXERCISES.js (263) | Static exercise catalogue: 260 entries `{ name, muscleGroup, equipment, weighted }`, no duplicate names, no `slug`/`muscle` field | named `exercises` | SE/SelectExerciseModal.js:21; OUTSIDE: frontend/utils/bodyweight.js:1, frontend/screens/MuscleGroupExercises.js:17, frontend/screens/PastWorkoutScreen.js:35, frontend/components/2_Competition/UserStats/userStatsUtils.js:1, frontend/helper/estimateWorkoutCalories.js:3, PARKED-SEM:8, **shared/hexagon/exerciseCatalogMeta.js:4** (explicit `.js` path; reached from shared/computeHexagon.js:14 and therefore from functions/) |
| SE/ExerciseCard.js (303) | One grid card in the picker (bookmark, last volume, usage count, image, name) | default memo `ExerciseCard` | SE/SelectExerciseModal.js:23, SE/ExercisesFlatlist.js:4 |
| SE/ExerciseImagePreview.js (69) | Resolves an exercise name to a bundled image and renders it in a sized box | default `ExerciseImagePreview` | SE/ExerciseCard.js:5; OUTSIDE: frontend/screens/ExerciseDetail.js:23 (props `exercise,size,style,imageStyle`) |
| SE/ExercisesFlatlist.js (142) | 3-column FlashList of ExerciseCard rows | default memo `ExercisesFlatlist` | SE/SelectExerciseModal.js:22; OUTSIDE: PARKED-SEM:7 (passes only `exercises, selectExercise, deselectExercise, animatedPress`) |
| SE/MuscleGroupIcon.js (91, 2-space indent) | Front/back body outline SVG with highlighted segments | default `MuscleGroupIcon` | SE/SelectExerciseModal.js:25; OUTSIDE: frontend/screens/MuscleGroupExercises.js:15, frontend/components/2_Competition/sections/ExercisesSection.js:20, .../sections/ProgressSection.js:38, PARKED .../sections/LeaderboardsSection.js:60 |
| SE/SelectExerciseModal.js (684) | Full-screen "Add Exercises" sheet: search, muscle filter, bookmarks, multi-select | default `SelectExerciseModal({ closeModal, appendExercises })` | OUTSIDE: NW/EditingWorkoutModal.js:24, NW/ActiveWorkoutModal.js:32, frontend/components/Footer.js:44 (string path in a prefetching dynamic `import()`: the path must not change) |
| SE/selectExerciseModalStyles.js (263) | StyleSheet + two colour constants for the sheet | default `styles`, named `ICON_COLOR`, `TEXT_SECONDARY` | SE/SelectExerciseModal.js:26-29 only |
| NW/TimerDisplay.js (35) | Polls `timerRef.current` once a second and renders it | default memo `TimerDisplay({ timerRef })` | OUTSIDE: NW/Group/GroupHeader.js:10 |
| NW/activeWorkoutColors.js (5) | Accent colour helper | named `ACTIVE_WORKOUT_HIGHLIGHT_RGB`, `activeWorkoutHighlight(alpha)` | OUTSIDE: NW/RestTimerModal.js:18, NW/Group/GroupHeader.js:12 (both import only `activeWorkoutHighlight`) |
| NW/hooks/useRestTimer.js (178, 2-space indent) | Rest countdown state, survives remount through `global.__restTimer*`, schedules a local notification, fires `global.triggerRestReminder` at zero | default `useRestTimer()` | OUTSIDE: NW/ActiveWorkoutModal.js:51 |
| NW/hooks/useWorkoutEditing.js (210) | Immutable edit actions on a workout (`appendExercises`, `updateSets`, `deleteExercise`, ...) plus `replaceIndex` state | default `useWorkoutEditing({ workout, updateWorkout, viewingSelf })` | OUTSIDE: NW/EditingWorkoutModal.js:23, NW/ActiveWorkoutModal.js:52 |
| W3/WorkoutExperiencePortal.js (269) | Root-level host for `useWorkoutManager`: registers sheet handlers in the zustand store and four `global.*` entry points, renders the invite sheet and the after-workout stats sheet | default `WorkoutExperiencePortal({ uid, enabled })` | OUTSIDE: App.js:78 (rendered at App.js:1709 with `enabled` literally true) |
| W3/shared/setTypeUtils.js (68, 2-space indent) | Set-type normalisation, label and display numbering | named `SET_TYPE_KEYS`, `ALLOWED_SET_TYPES`, `normalizeSetType`, `isUnilateralType`, `typeLetter`, `formatSetLabel`, `computeDisplayNumbers` | OUTSIDE: frontend/components/1_Feed/PastWorkoutExerciseLog.js:8, NW/Tracking/SetRow.js:12, NW/Tracking/ExerciseLog.js:14, frontend/helper/estimateWorkoutCalories.js:2 (only `normalizeSetType`, `formatSetLabel`, `computeDisplayNumbers` are imported anywhere) |
| W3/shared/workoutTypography.js (55) | Shared text styles for exercise logs | named `workoutTypography` and default (same binding) | OUTSIDE (all default imports): PastWorkoutExerciseLog.js:6, NW/Tracking/SetRow.js:11, NW/Tracking/ExerciseLog.js:12, NW/Tracking/EditableStat.js:7 |
| W3/ui/CopyTemplateToast.js (40, 2-space indent) | Animated "Template added" pill | default `CopyTemplateToast({ anim, text })` | OUTSIDE: frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:9 |
| frontend/workout/workoutActions.js (135) | Imperative entry points to the active-workout sheet (open, start, join) through the store and the `global.*` hooks set by the portal | named `openActiveWorkout`, `startFreshWorkout`, `joinWorkoutFromPayload`, `ensureWorkoutSheetVisible`; default object of the four | OUTSIDE (all named imports): App.js:85, frontend/screens/1.1_Messages.js:24, frontend/components/Footer.js:11, frontend/components/WorkoutInviteOverlay.js:6, frontend/components/1_Feed/Notifications/NotificationsModal.js:18 |

---------------------------------------------------------------------------------------------------

## B. Verified dead code

### B.0 Machine findings, each verified

| # | Identifier | Kind | Location | Evidence / action |
|---|---|---|---|---|
| 1 | `OVERLAY_BG` | unused const | SE/selectExerciseModalStyles.js:5 | Only occurrence in the file. (PARKED frontend/components/SelectExerciseModal/styles.js has its own.) Delete. |
| 2 | `BUTTON_BG_ACTIVE` | unused const | SE/selectExerciseModalStyles.js:9 | Only occurrence repo-wide. Delete. |
| 3 | `screenHeight` | unused const | NW/TimerDisplay.js:6 | Never read. Delete line 6 and drop `Dimensions` from the import on line 2. |
| 4 | `scaledSize` | unused wrapper | NW/TimerDisplay.js:7 | Never called in this file (file uses `scaleSize` directly, line 28). Delete. |
| 5 | `useWorkoutStore` | unused import | NW/hooks/useWorkoutEditing.js:3 | Not referenced. The store module has no load-time side effect that this import provides (it is imported by many other modules). Delete. |
| 6 | `isNewWorkoutVisible` | unused destructure | W3/WorkoutExperiencePortal.js:43 | Never read; only `setIsNewWorkoutVisible` is used. Delete line 43. |
| 7 | `ACTIVE_WORKOUT_HIGHLIGHT_RGB` | unused export | NW/activeWorkoutColors.js:2 | Used only inside the file (line 4). Remove the `export` keyword, keep the const. |
| 8 | `SET_TYPE_KEYS` | unused export | W3/shared/setTypeUtils.js:1 | Used only on line 2. Remove `export`. (frontend/hooks/useTemplates.js has its own copy but is DEAD.) |
| 9 | `ALLOWED_SET_TYPES` | unused export | W3/shared/setTypeUtils.js:2 | Used only on line 6. Remove `export`. |
| 10 | `isUnilateralType` | dead function | W3/shared/setTypeUtils.js:9-12 | Zero references repo-wide (grep). Delete. |
| 11 | `typeLetter` | unused export | W3/shared/setTypeUtils.js:14 | Used only at lines 36 and 38. Remove `export`. |
| 12 | `workoutTypography` named export | duplicate export | W3/shared/workoutTypography.js:5 and :54 | All four importers use the default. Change line 5 to `const workoutTypography = ...` and keep line 54. |
| 13 | `ensureWorkoutSheetVisible` | dead export | frontend/workout/workoutActions.js:118-127 | No importer; the only other reference is the default object (line 133). Delete (see C.5 for the alternative). |
| 14 | default export object | dead export | frontend/workout/workoutActions.js:129-134 | All five importers use named imports. Delete. |
| 15 | jscpd clone PARKED-SEM:37-52 == SE/SelectExerciseModal.js:87-101 | clone | - | Real (tail of `EQUIPMENT_OPTIONS` + head of `normalizeEquipment`). The LIVE side is dead code (B.1); the PARKED side stays untouched. |

### B.1 Unreachable equipment filter in SE/SelectExerciseModal.js (the largest dead chain)

`filtersOpen` (line 146) starts `false` and `setFiltersOpen` is only ever called with `false` (line 227). Nothing can open the panel (git history shows a toggle `setFiltersOpen((...` was removed in an earlier commit). Therefore:

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `{filtersOpen && (...)}` equipment panel | unreachable JSX | 623-651 | condition is constant false |
| `filtersOpen` / `setFiltersOpen` | state never true | 146 | only setter call is `setFiltersOpen(false)` at 227 |
| `closeAllPanels` | no-op callback | 226-228; call at 285; dep at 304 | sets an already-false state to false (no re-render) |
| `equipmentValue` / `setEquipmentValue` | state never set | 148 | only setter call is at 636, inside the unreachable panel |
| `equipFilter`, `equipMatch` | always null / always true | 465, 471, used at 472; dep at 483 | follows from `equipmentValue === null` |
| `EQUIPMENT_OPTIONS` | const used only in dead JSX | 86-98 | only use is line 627 |
| `normalizeEquipment` | helper feeding only a dead field | 100-112 | only use is line 118 |
| `equipNorm` field of `EXERCISE_CATALOG` | field never read once `equipMatch` goes | 118 | only reader is line 471. Verified it cannot leak anywhere: catalogue entries reach `ExerciseCard` only as `name/muscleGroup/slug` props (418-420, ExercisesFlatlist 44-46), and `toggleSaved`/`selectExercise` are called with `{ name, muscle, slug }` / `{ name, muscle }` (ExerciseCard 141-155), so nothing persisted contains it. |
| styles `filterPanel`, `filterPanelTitle`, `filterChipWrap`, `equipmentChip`, `equipmentChipActive`, `equipmentChipText`, `equipmentChipTextActive` | StyleSheet keys used only by dead JSX | SE/selectExerciseModalStyles.js:153-192 | each key has exactly one use, all inside 623-651 |
| `CHIP_BG`, `PANEL_BG` | consts that become unused | SE/selectExerciseModalStyles.js:13, 16 | used only by `equipmentChip` (176) and `filterPanel` (154). `CHIP_BG_ACTIVE` and `CHIP_BORDER_ACTIVE` stay (used at 135-136). |

Edits after removal: line 472 becomes `return nameMatch && groupMatch;`, dep array 483 becomes `[searchQuery, bodyPartValue, statsExercises]`, dep array 304 becomes `[closeModal, translateY]`. Rendered UI is unchanged because the panel can never be shown. See open question I.1.

### B.2 Other dead code the tools cannot see

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `dragHandle` | unused StyleSheet key | SE/selectExerciseModalStyles.js:37-44 | `styles.dragHandle` has 0 uses (the stylesheet has a single importer) |
| `headerActionButton` | unused StyleSheet key | SE/selectExerciseModalStyles.js:63-65 | 0 uses |
| `muscleLabel` | unused StyleSheet key | W3/shared/workoutTypography.js:12-16 | `workoutTypography.muscleLabel` has 0 uses repo-wide; no bracket access to `workoutTypography` exists |
| `toggleIsDone` | hook action nobody consumes | NW/hooks/useWorkoutEditing.js:158-184, returned at 203 | Neither consumer destructures it (ActiveWorkoutModal.js:560-568, EditingWorkoutModal.js:116-124); the only other grep hit is the unrelated `toggleIsDoneById` in Tracking/ExerciseLog.js. Delete the callback and the return entry. `refEqualArray` stays (still used at 90, 153). |
| `setCountdown` in the hook return | return member nobody uses | NW/hooks/useRestTimer.js:175 | ActiveWorkoutModal.js:366 destructures it and never uses it (only grep hit in that file). Remove from the return after G.1 (the internal `setCountdown` state setter of course stays). |
| `persistWorkout` sheet handler | store key written, never read | W3/WorkoutExperiencePortal.js:22 and 101 (+ destructure 52, dep 118) | `grep persistWorkout\b` hits only these two lines. Readers of `sheetHandlers` are ActiveWorkoutBottomSheet.js:111-119, Footer.js:143, workoutActions.js:15/61 and none reads it. Removing it also removes `persistCurrentWorkout` from the effect deps at 118; that callback's own deps are `[uid]` (useWorkoutManager.js:557-673), so effect cadence is unaffected in practice. Low risk; keep if in doubt. |
| `enabled` prop | constant prop | W3/WorkoutExperiencePortal.js:38, guards at 83, 122, 140, 168, 186, 208, 248-250, deps at 108, 137, 165, 183, 201, 246 | The only caller passes a literal true (App.js:1709) and the component is only mounted when authenticated. Every `if (!enabled)` branch is unreachable. Removal is optional and needs App.js changed in the same step (G.4). See I.3. |
| `slug` prop | prop no caller passes | SE/ExerciseImagePreview.js:25, 33 | Callers: ExerciseCard.js:200 (`exercise,size`), ExerciseDetail.js:2406-2411 (`exercise,size,style,imageStyle`) |
| `onResolveImage` prop and its effect | prop no caller passes | SE/ExerciseImagePreview.js:29, 40-42 | grep finds only these lines. Removing makes `useEffect` import (line 1) unused. |
| string branch of `resolveSize` | unreachable branch | SE/ExerciseImagePreview.js:14-19 | Both callers pass numbers (`scaledSize(110)`, `scaleSize(260)`); the default is a number. |
| `scrollEnabled` prop | prop no caller passes | SE/ExercisesFlatlist.js:22, 89, 104 | Neither caller (SE modal 654-663, PARKED-SEM 317-322) passes it, so `containerStyle` is always `styles.flex`. |
| `onScroll` prop | prop no caller passes | SE/ExercisesFlatlist.js:24, 98 | Same two callers; always undefined. `scrollEventThrottle={16}` (99) is then inert but harmless; leave it or remove with the prop. |
| `offsetX` prop | prop no caller passes | SE/MuscleGroupIcon.js:21, 52, dep 55 | All five callers checked (including PARKED LeaderboardsSection.js:1770-1778): only `offsetY` is passed. Optional removal. |
| commented-out style | commented-out code | SE/ExerciseCard.js:256 | `// backgroundColor: "rgba(87, 185, 255, 0.16)",` Delete. |
| `lastVolumeIcon: {}` | empty style | SE/ExerciseCard.js:273-274, used at 184 | No visual effect; remove key and the `style=` prop together (optional). |
| `muscleFilterChipActive: {}` | empty style | SE/selectExerciseModalStyles.js:124, used at SE/SelectExerciseModal.js:566 | No visual effect; optional removal of both. |
| string-entry branch in `bookmarkedExercises` | unreachable branch | SE/SelectExerciseModal.js:336-349 | Values of `savedExercisesMap` are always objects with a `name`: the initializer (150-189) converts every string to an object and `toggleSavedExercise` (257-279) only inserts objects. Defensive; optional removal, I recommend leaving it (cheap, and it guards a persisted field). |
| stale header comment | stale note | W3/InviteBanner.js:1 | Says `components/3_Workout/ui/InviteBanner.js`; the file is `components/3_Workout/InviteBanner.js`. Delete or correct. |
| stale comment | stale note | W3/InviteBanner.js:50 | `// EXACT copy from the 900-line screen`. Delete. |
| `enableAccessory` prop pass | redundant prop | SE/SelectExerciseModal.js:535 | `DismissableTextInput` defaults `enableAccessory = true` (DismissableTextInput.js:7). Optional. |
| extra blank line | whitespace | SE/SelectExerciseModal.js:137 | double blank line |

### B.3 KEEP (looks removable, is not)

| Identifier | Location | Why it stays |
|---|---|---|
| `animatedPress` prop | SE/ExercisesFlatlist.js:20, 52, 69 | PARKED-SEM:321 passes it. KEEP. |
| `touchable` prop and the `TouchableOpacity` path | SE/ExerciseCard.js:103, 131-132 | Reached only through `animatedPress`, i.e. only from PARKED. KEEP. |
| defaults `selectedLookup = {}`, `savedLookup = {}`, `bottomPadding = 120`, `listHeaderComponent = null`, undefined `toggleSavedExercise` | SE/ExercisesFlatlist.js:17-23; ExerciseCard.js:149, 170 (`disabled={!toggleSaved}`) | PARKED-SEM relies on every one of these defaults. KEEP. |
| `dimmed`, `dimHighlightColor`, `strokeWidth`, `scale`, `offsetY` | SE/MuscleGroupIcon.js:16-22 | Used by LIVE callers and by PARKED LeaderboardsSection. KEEP. `strokeWidth || STROKE_WIDTH` (67) is needed in addition to the default parameter because ExercisesSection.js:148 passes `null`. |
| guards `refEqualArray(filtered, exs)` / `refEqualArray(nextSets, sets)` | NW/hooks/useWorkoutEditing.js:153 (and 176 if `toggleIsDone` were kept) | Reachable when the index is NaN or a numeric string (the range check passes, the `!==`/`===` comparison never matches). Not dead. |
| guard `refEqualArray(nextExercises, w.exercises || [])` | NW/hooks/useWorkoutEditing.js:90 | Provably never true (the input is non-empty, so lengths differ). Harmless; leave it rather than touch the commit path. |
| `global.__restTimerEndAt`, `__restTimerTotal`, `__restCycleId` | NW/hooks/useRestTimer.js:29-31, 41, 56, 104, 123, 135, 146 | Only this file reads/writes them, but they are what makes the timer survive a remount. KEEP as globals. |
| lazy `require('expo-notifications')` in try/catch | NW/hooks/useRestTimer.js:5-6 | Defensive guard around a native module (App.js:570 also requires it lazily). KEEP. |
| `getStore` try/catch and the other best-effort try/catch blocks | frontend/workout/workoutActions.js:3-9 etc.; W3/WorkoutExperiencePortal.js throughout | Defensive around the `global.*` contract. KEEP. |

---------------------------------------------------------------------------------------------------

## C. Duplication

C.1 `scaledSize = (size) => scaleSize(size)` forwarding wrapper. 18 definitions repo-wide; in this partition: SE/AnimatedButton.js:6 (3 calls), SE/ExerciseCard.js:10 (15 calls), SE/SelectExerciseModal.js:33 (10 calls), SE/selectExerciseModalStyles.js:18 (52 calls), NW/TimerDisplay.js:7 (0 calls, dead). Elsewhere: NW/RestTimerModal.js:21, NW/Group/GroupModal.js:14, GroupMenu.js:13, GroupHeader.js:14, 5_Profile/ProfileTop/ProfileInfo.js:11, ProfileRowButtons.js:9, WorkoutStats.js:6, 5_Profile/MakePost/SelectPhotosScreen.js:15, 4_Explore/SearchBarComponent.js:24, UserCard.js:9, 2_Competition/UserStats/HexagonalStats.js:10, and PARKED PARKED-SEM:11, SelectExerciseModal/styles.js:17. Behaviour: identical to the default export of frontend/helper/scaleSize.js (one argument, `Math.round(n * SCALE_MIN)`), for every input. Every one of these files already imports `scaleSize` and most also call it directly. Canonical home: `helper/scaleSize` itself; replace `scaledSize(` with `scaleSize(` and delete the wrapper line. This is a repo-wide policy call (other audits raise the same point); if adopted, do it mechanically per file. The TimerDisplay one is simply dead.

C.2 `genId`. NW/hooks/useWorkoutEditing.js:6 and NW/EditingWorkoutModal.js:27 are byte-identical. Canonical home: export it from useWorkoutEditing.js (EditingWorkoutModal already imports that module) or a small `W3/shared/` module. Identical: yes.

C.3 `normalizePrev` family.
- NW/hooks/useWorkoutEditing.js:8-14 `normalizePrev` and NW/EditingWorkoutModal.js:29-35 `sanitizePrev`: identical for every input (non-object -> null, object -> `{ weight: Number(..)||0, reps: Number(..)||0 }`).
- NW/Tracking/SetRow.js:14-20 and 1_Feed/PastWorkoutExerciseLog.js:11-17 `normalizePrev`: identical to each other, but NOT to the two above: they return `null` when weight and reps are both 0, the hook version returns `{ weight: 0, reps: 0 }`. Do not merge the two groups.

C.4 `normalizeSetType`. Canonical: W3/shared/setTypeUtils.js:4-7. An inline copy lives in 1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:167-170 (IIFE: lower-case a string, membership test against the same five keys, else null): identical for every input. (frontend/hooks/useTemplates.js:6-11 is a third copy but the file is DEAD.) Request G.5.

C.5 "Expand the workout sheet and mark it visible". W3/WorkoutExperiencePortal.js:25-36 `ensureSheetExpanded` versus frontend/workout/workoutActions.js:118-127 `ensureWorkoutSheetVisible` (dead export) versus the first half of `openActiveWorkout` (workoutActions.js:25-32, byte-for-byte the body of `ensureWorkoutSheetVisible`). Same effect on the non-throwing path (set `sheetState` to EXPANDED, call `sheetHandlers.setIsVisible(true)` if it is a function). They differ only if `setSheetState` throws: the portal version then skips `setIsVisible` (single try), the workoutActions version still calls it (separate try blocks). Also `openActiveWorkout` returns before scheduling its rAF trigger when the store is missing, so it cannot simply call `ensureWorkoutSheetVisible()`. Recommendation: delete the dead `ensureWorkoutSheetVisible` (B.0 #13) and leave the other two exactly as they are. Do not make the portal import from workoutActions: `global.__openActiveWorkout === ensureSheetExpanded` identity checks (188-195) and the error-path difference make the gain not worth it.

C.6 Default sheet handlers. W3/WorkoutExperiencePortal.js:10-23 (`noop`, `resetHandlers`) mirrors the initial `sheetHandlers` in frontend/state/workoutStore.js:9, 17-27. Same keys and same kinds of values except `persistWorkout: noop` exists only in the portal (dead, B.2) and the portal object is frozen. Function identities differ but nothing compares them. Optional: once `persistWorkout` is removed the store could export its initial object and the portal reuse it; that touches app-shell (G.6). Not required.

C.7 Muscle icon constants. SE/SelectExerciseModal.js:35-36 `MUSCLE_HIGHLIGHT` / `MUSCLE_HIGHLIGHT_DIM` have exactly the values of `MUSCLE_ICON_HIGHLIGHT` / `MUSCLE_ICON_HIGHLIGHT_DIM` in frontend/components/2_Competition/muscleGroupIconLayout.js:6-7 (also re-declared in frontend/screens/MuscleGroupExercises.js:23-24). SE/SelectExerciseModal.js:56-58 `MUSCLE_ICON_STROKES` equals `MUSCLE_ICON_STROKE_WIDTHS` (layout file 42-44). The "Full Body" segment list at SE/SelectExerciseModal.js:65-76 equals `OVERALL_MUSCLE_SEGMENTS` (layout file 9-20), same order. These three can be imported from muscleGroupIconLayout.js. NOT identical and must stay local: `MUSCLE_ICON_SCALES` (modal 38-46: 2.6/2.8/1.8/2.2/3/2.4/1.6 versus layout 2.45/2.65/1.7/2.15/2.8/2.25/1.5) and `MUSCLE_ICON_OFFSETS` (modal 47-55 are `scaleSize`d and applied as `marginTop`; layout values are raw points). PARKED LeaderboardsSection.js:93-110 has a third variant; untouchable. frontend/screens/PastWorkoutScreen.js:40 and 1_Feed/SimpleFeedPost.js:46 use "#ff6f67" without the alpha suffix: a different literal, leave.

C.8 `normalizeEquipment` (label bucketing). SE/SelectExerciseModal.js:100-112 and PARKED-SEM:51-63 are identical apart from quote style; `EQUIPMENT_OPTIONS` (86-98 versus PARKED 36-48) differ in the first label ("Any Equipment" versus "All Equipment"). The LIVE copies are dead (B.1). Note the name collision with unrelated functions `normalizeEquipment(name, equipment, weight)` in frontend/logic/exerciseCatalog.js:46 and shared/hexagon/computeHexagonCore.js:81: different purpose, never merge.

C.9 Indexed catalogue. SE/SelectExerciseModal.js:114-119 `EXERCISE_CATALOG` is the same mapping PARKED-SEM:153-160 builds in a `useMemo`. PARKED cannot be edited; leave. Other files build their own lookups from `exercises` (bodyweight.js:5-41, MuscleGroupExercises.js:53-, PastWorkoutScreen.js:182-, userStatsUtils.js:117-, estimateWorkoutCalories.js:57-, shared/hexagon/exerciseCatalogMeta.js:44-): all keyed differently (lower-cased, trimmed, parenthesis-stripped, loose keys). None is identical to `EXERCISE_LOOKUP_BY_NAME` (121-125, exact name). Leave all.

C.10 Grid row markup inside the partition. SE/SelectExerciseModal.js:413-438 (bookmark rows) repeats SE/ExercisesFlatlist.js:37-61 (rows of three cards plus spacers), and SE/selectExerciseModalStyles.js:211-233 (`bookmarkedRow`, `bookmarkedCardWrapper`, `bookmarkedCard`, `bookmarkedSpacer`) have the same values as SE/ExercisesFlatlist.js:115-137 (`row`, `cardWrapper`, `card`, `cardSpacer`). The chunking loop 395-402 repeats ExercisesFlatlist 26-33. Differences: keys, `isSaved` (always true versus lookup), `touchable` (absent versus `!!animatedPress`). Merging needs a new shared row component, which is a rewrite rather than a move: I recommend leaving it. Similarly `CARD_HEIGHT = scaledSize(220)` (ExerciseCard.js:91) and `ESTIMATED_CARD_HEIGHT = scaleSize(220)` (ExercisesFlatlist.js:8) are the same number; optional to export one.

C.11 Saved-exercise normalisation. The `useState` initializer at SE/SelectExerciseModal.js:150-189 resembles `normalizeSavedExercisesMap` in frontend/hooks/useSyncSavedExercises.js:7-58, but the outputs differ (the modal keeps every stored field via spread and does not trim or stringify; the hook emits exactly `{ name, muscleGroup, muscle, slug }` with string coercion). NOT identical; leave both.

C.12 `typePillText` (NW/Tracking/SetRow.js:384-395 and 1_Feed/PastWorkoutExerciseLog.js:379-390) are identical; `typePillBg` (SetRow 367-382, PastWorkoutExerciseLog 363-378) differ in the default branch (the feed version adds a border). Both live outside this partition; if their owners want one home for `typePillText`, a new `W3/shared/` module next to setTypeUtils.js is the natural place (setTypeUtils.js itself must stay free of react-native imports because estimateWorkoutCalories.js imports it).

C.13 Compact number formatting. SE/ExerciseCard.js:12-78 (`formatNumericWithMaxChars`, `SUFFIX_OPTIONS`, `formatVolumeLabel`) is unique: `fmtK` (userStatsUtils.js:5), `formatVolumeValue` (UserStatsProgressPreview.js:257, ProgressSection.js:489) use different rounding rules. Leave.

C.14 Colour constants. SE/selectExerciseModalStyles.js:10-12 `TEXT_PRIMARY`, `TEXT_SECONDARY`, `ICON_COLOR` equal the ones in PARKED frontend/components/SelectExerciseModal/styles.js:10-12. PARKED cannot be edited; leave.

---------------------------------------------------------------------------------------------------

## D. Decomposition plan: SE/SelectExerciseModal.js (684 lines; the only file over 500)

Current top-level layout:
- 1-31 imports; 33 `scaledSize`; 34 `SCREEN_HEIGHT`
- 35-36 `MUSCLE_HIGHLIGHT`, `MUSCLE_HIGHLIGHT_DIM`; 37-46 `MUSCLE_ICON_SCALES` (37 is its comment); 47-55 `MUSCLE_ICON_OFFSETS`; 56-58 `MUSCLE_ICON_STROKES`; 59 `MUSCLE_FILTER_ORDER`; 61-84 `MUSCLE_FILTERS`
- 86-98 `EQUIPMENT_OPTIONS` (dead); 100-112 `normalizeEquipment` (dead)
- 114-119 `EXERCISE_CATALOG`; 121-125 `EXERCISE_LOOKUP_BY_NAME`; 127-135 `getSetCount`
- 138-683 component: 139-142 inputs; 144-189 state (150-189 is the saved-map initializer); 191-196 refs; 198-224 effects; 226-328 callbacks; 330-382 `bookmarkedExercises`; 384-393 `filteredBookmarkedExercises`; 395-402 `bookmarkedRows`; 407-460 `listHeaderComponent`; 462-483 `filteredExercises`; 485-488 `listBottomPadding`; 490-682 JSX (539-621 muscle filter bar, 623-651 dead equipment panel)

Order of work:

Step 0. Remove the dead equipment chain (B.1): about 70 lines here, about 44 in the stylesheet.

Step 1. New `SE/MuscleFilterBar.js` (about 140 lines). Move verbatim:
- constants 35-84 (`MUSCLE_HIGHLIGHT`, `MUSCLE_HIGHLIGHT_DIM`, `MUSCLE_ICON_SCALES`, `MUSCLE_ICON_OFFSETS`, `MUSCLE_ICON_STROKES`, `MUSCLE_FILTER_ORDER`, `MUSCLE_FILTERS`); they are used only by the filter bar JSX. `MUSCLE_ICON_OFFSETS` calls `scaledSize`, so the new file needs `import scaleSize` plus either a copy of line 33 or direct `scaleSize(` calls (C.1).
- JSX 539-621, wrapped as `export default function MuscleFilterBar({ bodyPartValue, setBodyPartValue }) { return ( ... ); }`. Using those two prop names means the moved JSX needs no identifier change: its only closure dependencies are `bodyPartValue` (560) and `setBodyPartValue` (571).
- Imports needed there: `React`, `View`, `ScrollView`, `Pressable`, `MuscleGroupIcon`, `styles` (default from ./selectExerciseModalStyles).
- Parent renders `<MuscleFilterBar bodyPartValue={bodyPartValue} setBodyPartValue={setBodyPartValue} />` and drops its `ScrollView` and `MuscleGroupIcon` imports.
- Do not add `React.memo` and do not hoist the `.slice().sort()` while moving (that would be a rewrite; see F.3 for the optional follow-up).
- Blockers: none.

Step 2. New `SE/exerciseCatalogIndex.js` (about 30 lines). Move verbatim 114-135 (`EXERCISE_CATALOG`, `EXERCISE_LOOKUP_BY_NAME`, `getSetCount`) with `import { exercises } from "./EXERCISES";` and add `export`. Parent imports the three names. Blockers: none (pure module-level code, evaluated once either way).

Step 3 (optional). New `SE/savedExercisesUtils.js`:
- 151-188 (the body of the `useState` initializer) as `export const readInitialSavedExercisesMap = () => { ... }`; parent becomes `useState(readInitialSavedExercisesMap)`. It reads `global?.userData?.savedExercises` at call time, exactly as now.
- 331-381 (body of the `bookmarkedExercises` memo) as `export const buildBookmarkedExercises = (savedExercisesMap) => { ... }` (imports `EXERCISE_LOOKUP_BY_NAME` from step 2); parent keeps `useMemo(() => buildBookmarkedExercises(savedExercisesMap), [savedExercisesMap])`.
- Only cost: the moved lines lose 4 to 8 columns of indentation.

What stays in SelectExerciseModal.js (about 400 lines after steps 0-3): all state and refs, the two animations, `handleSearch`, selection/saved callbacks, `dismiss`/`handleClose`/`handleFinish`, the three bookmark memos, `listHeaderComponent`, `filteredExercises`, and the layout JSX.

Do NOT extract:
- `listHeaderComponent` (407-460): it is a memoised element handed to FlashList as `ListHeaderComponent`, closing over seven values; turning it into a component changes element identity and re-render behaviour of the list header.
- `dismiss` / `handleFinish` / `handleClose` (281-328): they share `closingRef`, `finishingRef`, `selectedExercisesRef`, `translateY` and the ordering is load-bearing (H.4).
- The stylesheet is already its own file (263 lines, about 205 after B).

No other file in the partition needs splitting. SE/ExerciseCard.js (303) could shed its pure formatter block (12-78) into `exerciseCardUtils.js`, optional.

---------------------------------------------------------------------------------------------------

## E. Latent bugs

No reference to an undefined name, no duplicate object key and no conditional hook exists in this partition (lint: 0 errors).

E.1 NW/hooks/useRestTimer.js:110-127, late notification after "+15s". `addCountdown` schedules the local push for `lastScheduledRemainingRef.current` seconds from now (124), but that ref holds the cumulative total (start value plus every added delta; lines 105, 114), not the remaining time. Example: start 60 s, press +15 s after 30 s: the timer ends at 75 s but the push is scheduled 75 s from the press, i.e. at 105 s. In the foreground the push is cancelled when the countdown reaches zero (144), so the error is only visible when the app is backgrounded. The evident intent is `Math.ceil((endAtRef.current - Date.now()) / 1000)`. Confidence that it is a bug: medium-high. It changes notification timing, so do not fix silently: open question I.2.

E.2 NW/hooks/useRestTimer.js:27-44, remount loses the notification id. The mount effect re-hydrates `endAtRef`, `restCycleRef`, `restTotal`, `countdown` from globals, but not `scheduledNotifIdRef` nor `lastScheduledRemainingRef`. After a remount, `resetCountdown` cannot cancel the push scheduled before the unmount (`cancelLocalPush` sees a null id, 90), and `addCountdown` reschedules from 0 + delta (114, 124). Confidence: medium (depends on whether ActiveWorkoutModal actually remounts mid-rest). No minimal fix without a new global; open question I.2.

E.3 SE/SelectExerciseModal.js:312-328, `finishingRef` can stick. If the dismiss animation ends with `finished === false` (291-301), `afterClose` never runs, so `finishingRef.current` stays true and later taps on "Add" return at 313. Nothing else animates `translateY`, so this needs an interrupted animation on a still-mounted sheet. Confidence it can happen: low. Leave.

E.4 NW/ActiveWorkoutModal.js:1635 (outside the partition) passes `userWorkoutStats={activeStats}` to SelectExerciseModal, which declares only `{ closeModal, appendExercises }` (138) and reads `global?.userData?.statsExercises` (139). The prop is silently ignored. Minimal fix: drop the prop at the call site (G.2). Confidence: high that it is dead; intent question I.6.

E.5 SE/AnimatedButton.js:9-15 and SE/SelectExerciseModal.js:209-215 both drive the same `Animated.Value` (`opacity`) to the same target on every selection-count change, with durations 220 ms and 200 ms. Child effects run before parent effects, and starting a timing on a value stops the previous one, so the child's animation is always cancelled immediately and the parent's 200 ms one is the only one that plays. Not a visible bug; see F.4.

---------------------------------------------------------------------------------------------------

## F. Best-practice issues

| # | Issue | Location | Suggested change | Risk |
|---|---|---|---|---|
| F.1 | `import` after executable statements | NW/hooks/useRestTimer.js:7 (after the `let`/`try` at 5-6) | Move line 7 up next to the other imports (2-3). Imports are hoisted, so evaluation order does not change. | None |
| F.2 | Debounce timer never cleared on unmount | SE/SelectExerciseModal.js:196, 230-234 | Add an unmount-only effect that clears `debounceRef.current`. Today the worst case is a `setSearchQuery` on an unmounted component 160 ms after closing (a silent no-op in React 18). | Low; it is a new line of behaviour, so optional |
| F.3 | Constant work in render | SE/SelectExerciseModal.js:549-558 sorts a copy of `MUSCLE_FILTERS` on every render; 586-612 recompute `(option.value || "overall").toString().toLowerCase()` four times per chip | Hoist the sorted array to a module constant (inputs are module constants, result is identical). Only as a follow-up after the verbatim move in D step 1. | Low |
| F.4 | Two owners of one animation | SE/AnimatedButton.js:9-15 and SE/SelectExerciseModal.js:209-215 | Strictly behaviour-preserving option: delete the effect in AnimatedButton (and its `useEffect` import); the parent's 200 ms timing is the one that plays today. The reverse (keep the child's) changes 200 ms to 220 ms. Or leave both. | Low; see I.4 |
| F.5 | Pointless try/catch and memo | SE/ExerciseCard.js:106-112 (IIFE with try/catch around an optional chain that cannot throw), 125-128 (`useMemo` around a template string) | Could become `const completedWorkouts = global?.userData?.completedWorkouts;` and a plain const. Identical output. | None; optional |
| F.6 | Import grouping | SE/AnimatedButton.js:3-4 (third-party `RNBounceable` after a local import); SE/ExerciseCard.js:3-8 and SE/SelectExerciseModal.js:18-31 mix local and third-party | Reorder only in files that are being edited anyway. | None |
| F.7 | Hook returns module-level helpers | NW/hooks/useWorkoutEditing.js:188-191 (`makeBlankSetsLike` is a pure function wrapped in `useCallback(..., [])`), 206 (`normalizeSet` returned through the hook) | Could be named exports. Both consumers destructure them from the hook result and list them in dependency arrays (EditingWorkoutModal.js:178), so this is a cross-partition API change: leave unless workout-active wants it. | Low |
| F.8 | Value read from a ref during render and used as an effect dependency | W3/WorkoutExperiencePortal.js:39 (`navigationRef.current`), dep at 246 | Leave: changing it alters when the summary effect re-runs (H.2). | - |
| F.9 | `Animated.View` / `Animated.Text` without animated props | SE/SelectExerciseModal.js:500-507; W3/ui/CopyTemplateToast.js:18 | Leave (render output identical either way; not worth the churn). | - |
| F.10 | Anonymous memo components | SE/ExerciseCard.js:93, SE/ExercisesFlatlist.js:12 | No `displayName`; DevTools only. Leave. | - |
| F.11 | 2-space indentation | SE/MuscleGroupIcon.js, NW/hooks/useRestTimer.js, W3/shared/setTypeUtils.js, W3/ui/CopyTemplateToast.js | Do NOT reformat (hard rule 6). | - |
| F.12 | Stale wording in comments | NW/hooks/useWorkoutEditing.js:169 "(your original rule)" (goes away with `toggleIsDone`); NW/hooks/useRestTimer.js:161 (explains why there is no per-second reschedule: keep) | - | - |

No component is defined inside another component's render in this partition. Every interval, subscription and global hook registered in an effect has a cleanup (TimerDisplay 17, useRestTimer 59, portal 104-106, 128-136, 156-164, 174-182, 192-200, 243-245), except the debounce timer in F.2.

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

G.1 workout-active, NW/ActiveWorkoutModal.js:366: remove the unused `setCountdown` from the `useRestTimer()` destructure. Then NW/hooks/useRestTimer.js:175 (the return entry) can go.

G.2 workout-active, NW/ActiveWorkoutModal.js:1635: remove `userWorkoutStats={activeStats}`; SelectExerciseModal does not accept that prop. (`activeStats` is still used at 930/965 there.)

G.3 workout-active, NW/EditingWorkoutModal.js:27 and 29-35: `genId` is byte-identical to NW/hooks/useWorkoutEditing.js:6, and `sanitizePrev` is behaviourally identical to `normalizePrev` at useWorkoutEditing.js:8-14. If deduplicated, export `genId` (and `normalizePrev`) from useWorkoutEditing.js and import them: `import useWorkoutEditing, { genId } from "./hooks/useWorkoutEditing";`.

G.4 app-shell, App.js:1709: only if the constant `enabled` prop is removed from WorkoutExperiencePortal (B.2), change to `<WorkoutExperiencePortal uid={uidRef.current} />` in the same step. Otherwise leave App.js alone.

G.5 feed-post, frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:167-170: the inline IIFE equals `normalizeSetType(s?.type)` from W3/shared/setTypeUtils.js; import it instead.

G.6 app-shell, frontend/state/workoutStore.js:17-27 (optional): export the initial `sheetHandlers` object so WorkoutExperiencePortal.js:10-23 does not have to mirror it (C.6). Only worthwhile if `persistWorkout` is removed first.

G.7 workout-active, frontend/logic/useWorkoutManager.js:1481-1488: its only consumer is WorkoutExperiencePortal, which does not use the returned `isNewWorkoutVisible`, `completedWorkout` or `postWorkout`. Those return members (and whatever only feeds them) are candidates for removal in that partition.

G.8 ladder-and-weight, frontend/components/2_Competition/muscleGroupIconLayout.js: keep exporting `MUSCLE_ICON_HIGHLIGHT`, `MUSCLE_ICON_HIGHLIGHT_DIM`, `OVERALL_MUSCLE_SEGMENTS`, `MUSCLE_ICON_STROKE_WIDTHS` under those names; SE/SelectExerciseModal.js (or the new MuscleFilterBar.js) can import them in place of its identical local copies (C.7).

G.9 Everyone importing from this partition: the following must keep path, name and behaviour: `exercises` from SE/EXERCISES(.js) (also used by shared/ and so by functions/), `ExercisesFlatlist` and `MuscleGroupIcon` (used by PARKED files), the SelectExerciseModal path (string in Footer.js:44), and the named exports `openActiveWorkout`, `startFreshWorkout`, `joinWorkoutFromPayload`.

G.10 workout-tracking / feed-post (informational): `typePillText` in NW/Tracking/SetRow.js:384-395 and 1_Feed/PastWorkoutExerciseLog.js:379-390 are identical, and `normalizePrev` in SetRow.js:14-20 and PastWorkoutExerciseLog.js:11-17 are identical; a shared module under W3/shared/ would be the home. `typePillBg` differs and must stay separate.

---------------------------------------------------------------------------------------------------

## H. Fragile areas

H.1 SE/EXERCISES.js. Pure data consumed by Cloud Functions through shared/hexagon/exerciseCatalogMeta.js:4 (ES module, explicit `.js` extension). It must stay a dependency-free ES module at this exact path with the named export `exercises`. Exercise names are persisted keys (statsExercises, savedExercises, templates, completed workouts): never rename, de-duplicate, re-case or "normalise" an entry (e.g. "Front Raise" and "Front Raise (Dumbbell)" are deliberately separate; "Bicep Curl" versus "Biceps Curl (Cable)" is as stored). Do not touch this file at all.

H.2 W3/WorkoutExperiencePortal.js.
- 121-201: four `global.*` registrations (`__startEmptyWorkout`, `openWorkoutModal`, `__joinExternalWorkoutDirect`, `__openActiveWorkout`) with identity-checked cleanups. workoutActions.js reads all four. Keep names, identities and the per-effect structure.
- 82-119: `setSheetHandlers` effect; cleanup resets to `resetHandlers`. ActiveWorkoutBottomSheet subscribes to the whole `sheetHandlers` object, so anything that changes how often this effect re-runs changes render cadence of the sheet.
- 207-246: on summary open it captures the hexagon snapshot, jumps to the Feed tab (`jumpToTab("Feed", params)` then two navigate fallbacks with route names "Tabs"/"Feed"), calls `global.scrollFeedToTop`, and subscribes to hexagon updates. Order and route names/params are behaviour.
- 39: `navigationRef.current` is read during render and passed into `useWorkoutManager` and the effect deps. Leave.

H.3 frontend/workout/workoutActions.js:24-56 `openActiveWorkout`. It expands the sheet synchronously and then again on the next animation frame through both globals (three overlapping calls). The redundancy is what makes opening reliable across mount timing; do not "simplify". `startFreshWorkout` returns false but still calls `openActiveWorkout()` when no starter exists (73-76): keep.

H.4 SE/SelectExerciseModal.js close/finish sequence (281-328). `resetSelections()` runs before `dismiss`, selections are read from `selectedExercisesRef` (synced by the effect at 198-200, and reset synchronously at 237), `appendExercises` runs inside `InteractionManager.runAfterInteractions` after `closeModal`, and `closingRef`/`finishingRef` guard re-entry. The slide animations use the native driver with specific durations/easings (217-224, 286-291). Move nothing out of this block and keep the hook order.

H.5 SE/ExercisesFlatlist.js. The row root has `key={`row-${rowIndex}`}` (37) inside a FlashList `renderItem`; with cell recycling this forces a remount when a cell is reused for another index. Removing it "because keyExtractor exists" would change mount/recycle behaviour (image flashes, memo hits). Leave it, along with `extraData={{ selectedLookup, savedLookup }}` (103, a new object each render on purpose) and `estimatedItemSize` (97).

H.6 NW/hooks/useRestTimer.js. Everything is timing: the 1 s interval derives the countdown from `endAtRef` (47-60); the transition effect (141-159) depends on `prevCountdownRef` and the `wasResetRef` flag to decide whether to vibrate and call `global.triggerRestReminder(cycleId)` (consumed by App.js:1095, which de-duplicates per cycle id); zero-crossing clears `__restTimerEndAt/Total` but deliberately not `__restCycleId` (56, 146). Limit edits to F.1 and the `setCountdown` return entry.

H.7 NW/hooks/useWorkoutEditing.js. `commit` (65-72) updates `workoutRef.current` synchronously before calling `updateWorkout`, so several edits in one tick compose; `updateSets` (95-144) preserves row object identity for unchanged sets (118-126) and bails out when nothing changed (131-135), which memoised rows upstream rely on. Remove only the unused import and `toggleIsDone`.

H.8 SE/ExerciseCard.js reads `global.userData.completedWorkouts` during render (106-112) inside a `memo` component: it refreshes only when props change. Leave the data flow as it is.

H.9 SE/MuscleGroupIcon.js and SE/ExercisesFlatlist.js are used by PARKED files (B.3): keep their props, defaults and file paths.

H.10 NW/TimerDisplay.js polls a ref once a second on purpose (the ref is written by useWorkoutManager without re-rendering). Do not replace with a store subscription.

H.11 `slug` on saved exercises. The catalogue has no `slug` field, so `slug` is always `null`/undefined through SE/ExerciseCard.js:155, SE/SelectExerciseModal.js:275, 347, 373. It is nevertheless part of the persisted `savedExercises` shape (useSyncSavedExercises writes `{ name, muscleGroup, muscle, slug }` to `users` and `usersPublic`). Do not remove the `slug` plumbing.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

I.1 Equipment filter in the exercise picker (SE/SelectExerciseModal.js:86-112, 146-148, 623-651 and seven styles). The button that opened it was removed in an earlier commit, leaving the panel unreachable. Default per the brief: delete it (B.1). Keep instead if it is meant to come back.

I.2 Rest-timer notification timing (E.1, E.2). After "+15s" the local push is scheduled for the cumulative total from now, not for the remaining time, and after a remount the previously scheduled push can no longer be cancelled. Should these be fixed (it changes when a notification fires)?

I.3 `enabled` on WorkoutExperiencePortal is always true (App.js:1709). Remove the prop and its eight guards, or keep it for symmetry with WorkoutInviteOverlay's real `enabled`?

I.4 "Add" button fade: AnimatedButton (220 ms) and SelectExerciseModal (200 ms) both animate the same value; today the parent's 200 ms wins. Which one is intended to own it?

I.5 `persistWorkout` is registered in the workout store's `sheetHandlers` (WorkoutExperiencePortal.js:101) but nothing reads it. Remnant, or a hook for something planned?

I.6 The picker orders exercises by the signed-in user's `global.userData.statsExercises` and ignores the `userWorkoutStats` that ActiveWorkoutModal passes (which is the viewed user's stats when watching a friend's workout). Intended?

I.7 W3/InviteBanner.js sits in `3_Workout/` while its header comment and its sibling `ui/CopyTemplateToast.js` suggest `3_Workout/ui/`. Files may not be moved in this refactor; only the comment will be corrected.

I.8 Bookmark filtering by muscle uses substring matching (SE/SelectExerciseModal.js:391) while the main list uses equality (470). With today's seven muscle-group values the results coincide; confirm no change is wanted.
