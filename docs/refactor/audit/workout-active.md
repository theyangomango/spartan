# Audit: partition "workout-active" (6 files, 5368 lines)

All six files are byte-identical to SPX/baseline (checked with cmp). Line numbers below are current.
Abbreviations: ABS = ActiveWorkoutBottomSheet.js, AWM = ActiveWorkoutModal.js, EWM = EditingWorkoutModal.js,
RTM = RestTimerModal.js, SWM = SpectatingWorkoutModal.js (all in frontend/components/3_Workout/NewWorkout/),
UWM = frontend/logic/useWorkoutManager.js.

Two facts the implementer needs before reading the rest:
- Build facts: Babel (babel-preset-expo -> @react-native/babel-preset, main.js:43 `plugin-transform-block-scoping`) turns `const`/`let` into `var` with no TDZ check. Several places in this partition read a `const` BEFORE its declaration inside the same function (AWM:392/420 `lockFriend`, AWM:1077/1080 `handleStatFocus`, UWM:545/556/570/596 `syncCurrentWorkoutRemote`). They "work" only because the early read yields `undefined` (in dependency arrays) and the closures read the variable later. See E3/E4 and H.
- zustand is 4.5.7 and `frontend/state/workoutStore.js` is created with `createWithEqualityFn` WITHOUT `subscribeWithSelector`. `store.subscribe` therefore takes ONE argument. See E5.

---------------------------------------------------------------------------------------------------

## A. Module map

- **ABS** (458 lines). The persistent @gorhom bottom sheet (collapsed peek / 94% expanded) that hosts the active workout; bridges the sheet's animated index into `workoutStore.sheetSharedAnimatedIndex` and `collapseProgressSV`; wires `sheetHandlers` from the store into AWM. Exports: default `memo(ActiveWorkoutBottomSheet, comparator)` (ABS:377-382). Imported by: `App.js:77` (rendered App.js:1712-1718 with `hideForFocus, overlayProgressSV, visibilityProgressSV, isActive, collapseProgressSV`). Only place AWM is rendered.
- **AWM** (2069 lines). The active-workout editor/spectator body: header (GroupHeader) with collapse animation, title input, exercise list (ScrollView for self, FlashList/FlatList for a viewed group member), add/replace exercise modal, rest timer, cancel/finish confirmation, end-workout sheet, group menu, invites, cheer events + confetti. Exports: default `memo(ActiveWorkoutModal, areEqualModalProps)` (AWM:2068). Imported by: ABS:15 (the only renderer) and `frontend/components/Footer.js:45` (dynamic `import('./3_Workout/NewWorkout/ActiveWorkoutModal')` prefetch: the path string must stay valid).
- **EWM** (469 lines). Full-screen modal to edit a completed workout draft (name, exercises, sets) with dirty tracking and async save. Exports: default `EditingWorkoutModal`. Imported by: `frontend/screens/PastWorkoutScreen.js:20` (rendered :1170-1175 with `visible, workout, onClose, onSave`; `title` is never passed, default used).
- **RTM** (462 lines). Rest-timer modal (SVG countdown ring, presets, +15s/reset). Exports: default `RestTimerModal`. Imported by: AWM:50 only (rendered AWM:1639-1648).
- **SWM** (417 lines). Read-only viewer of a friend's (live or past) workout: a cut-down fork of AWM's friend view. Exports: default `memo(SpectatingWorkoutModal, areEqualModalProps)`. Imported by: `frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:6` (rendered :244) and `frontend/components/2_Competition/UserStats/UserStatsWorkoutViewerScreen.js:4` (rendered :34).
- **UWM** (1493 lines). The workout lifecycle hook: timer, start-from-template, debounced persistence of `currentWorkout` to users/usersPublic/usersPrivate + `workouts/{wid}`, cancel, finish (stats deltas, hexagon recompute, rank payload), join external workout, rehydration. Exports: default `useWorkoutManager({ uid, navigation, millisToHMS })`. Imported by: `frontend/components/3_Workout/WorkoutExperiencePortal.js:4` only (destructures `timerRef, isNewWorkoutVisible, setIsNewWorkoutVisible, isSummaryModalVisible, setIsSummaryModalVisible, startNewWorkoutFromTemplate, updateNewWorkout, cancelWorkout, finishWorkout, joinExternalWorkout, persistCurrentWorkout`; does NOT take `completedWorkout` or `postWorkout`).

Machine "unused exports" list for this partition is empty; confirmed (each file has only a default export and each default export has a live importer).

---------------------------------------------------------------------------------------------------

## B. Verified dead code

Nothing in this partition is used by a PARKED file (grep of the 16 PARKED files for the six module names: no hits), so there are no KEEP-for-PARKED items.

### B1. AWM
| Identifier | Kind | Where | Evidence |
|---|---|---|---|
| `Weight` | unused import | AWM:28 | ESLint; no other occurrence in file. Remove whole line (only specifier from iconsax-react-native). |
| second `react-native` import | duplicate import | AWM:19 | `Dimensions, FlatList` should join the list at AWM:3-18. |
| `setCountdown` | unused destructured value | AWM:366 | ESLint; grep `setCountdown` in AWM: only :366. |
| `meIsMember` | unused useMemo | AWM:1163-1168 | ESLint; grep: only defined. Removing one `useMemo` call is safe (hook count changes for all renders alike). |
| `reminderVisible` | constant flag (`false`) | AWM:354, read AWM:911 | `const reminderVisible = false;` so `targetOpacity = reminderVisible ? 0.6 : (dimDueToContext ? 0.6 : 1)` folds to `dimDueToContext ? 0.6 : 1`. Also drop the "When Reminder Modal is visible" sentence in the comment at AWM:870-872. |
| commented-out reminder code | commented-out code | AWM:61, 352-353, 356, 1473-1495, 1729-1734 | The component it refers to (`components/WorkoutReminderModal.js`) is a DEAD file. |
| stale notes | stale comments | AWM:20, 38, 48-49, 370-371, 444, 573-578, 745 | They describe code that is gone ("AsyncStorage removed", "Invite picker moved", "no-op", "deleteExercise and updateSets provided by hook"). |
| `setIsDoneState(...)` | call to undefined name | AWM:733 | See E1 (delete the line). |
| `userWorkoutStats={activeStats}` | prop no callee reads | AWM:1635 | `SelectExercise/SelectExerciseModal.js:138` signature is `({ closeModal, appendExercises })`; grep `userWorkoutStats` in that file: none. `activeStats` stays (used AWM:930). |
| `styles.end_workout_sheet_handle` | unused StyleSheet key | AWM:1967-1973 | ESLint; grep: only the definition. |
| commented-out style props | commented-out code | AWM:1836, 1841, 1843, 1984-1985, 1990, 1994 | |
| `perfNow` + `[perf]` logs | DEV-gated tracing | AWM:135-142, 339, 928, 956-963, 1511-1516 | Logs fire on every render in dev. `const t0 = perfNow()` at AWM:928 runs unconditionally (prod too) but its result is only used under `__DEV__`. Policy call (they are `__DEV__`-gated): recommended removal; if kept, see C1. |
| props never passed by the only caller (ABS:318-333) | props no caller passes | AWM:322 `onPressBack`, 323 `onCheer`, 324 `onCopyTemplate`, 327 `forceViewingFriend`, 328 `friendPfp`, 329 `friendPfpVersion`; `streamLive` is always `true` (ABS:330) | ABS is the only renderer of AWM. Consequences if folded: `forcedUid` is always `null` and `lockFriend` always `false` (AWM:453-457), so AWM:392-395, the first arm of AWM:468-469, `lockToViewingUid` AWM:515, `|| lockFriend` AWM:519, AWM:533, AWM:899, AWM:1103-1105, AWM:1150, the `lockFriend ||` in AWM:1343/1349/1562 and the `!lockFriend &&` at AWM:1714 are constant; `if (!streamLive)` AWM:388-391 never runs; `handleBack`'s first line AWM:1325 never runs; `onCheer?.()` AWM:1318 and `onCopyTemplate?.(...)` AWM:1335 are no-ops. NOT recommended for the first pass: see H2 and I4. Safe subset: none without touching fragile logic; leave the props, record for the owner. |
| unreachable arms of `hasActiveWorkoutContext` | branch that can never run | AWM:884-889 (and AWM:877-881 redundant) | `cardWid` is `String(workout?.wid || "")` (AWM:449); the check at AWM:883 `String(workout?.wid || "") === widCard` is therefore always true when `widCard` is non-empty, so the memo equals `!!cardWid`. Do not fold: see I4. |
| `handleStatFocus` | effectively inert | AWM:1497-1509 | It scrolls `listRef`, but `listRef` is only attached to the FlashList of the read-only friend view (AWM:1612), where inputs cannot focus; in the self view (ScrollView, AWM:1581) `listRef.current` is null. Leave (I6). |

### B2. ABS
| Identifier | Kind | Where | Evidence |
|---|---|---|---|
| `setIsViewingSelf` state | state set, never read | ABS:52, passed ABS:327 | `const [, setIsViewingSelf] = useState(true)`. Value is discarded. Removing it removes one re-render of ABS when the viewed participant changes (which recomputes `userWorkoutStats` at ABS:265; the getter returns the same `global.userData.statsExercises` object unless it was reassigned). Low risk but not zero: see H5. |
| `COLLAPSED_SNAP` | alias of `COLLAPSED_PEEK` | ABS:24, used ABS:50 | Pure alias. |
| `styles.sheetOffset` | empty style holding commented-out code | ABS:436-438, used ABS:299 | `{ // marginBottom: -FOOTER_HEIGHT }`. `[sheetStyle, styles.sheetOffset]` is visually identical to `sheetStyle`. If removed, `FOOTER_HEIGHT` (ABS:22) is still used by ABS:23. |
| `perfNow` + `[perf]` logs | DEV-gated tracing | ABS:38-45, 48, 268-271, 279-284 | Same policy call as AWM. |

### B3. RTM
| Identifier | Kind | Where | Evidence |
|---|---|---|---|
| `useState` | unused import | RTM:2 | ESLint. |
| `screenHeight` | unused const | RTM:20 | ESLint. Then `Dimensions` (RTM:9) is unused too. |
| `CARD_BG`, `CARD_BORDER` | unused consts | RTM:26-27 | ESLint. (Note `styles.card` has `borderWidth` but no `borderColor`: I9.) |
| `scaledSize` | wrapper that only forwards | RTM:21 | `(size) => scaleSize(size)`; 29 call sites. Replace with `scaleSize` (identical for every input). |
| header comment | stale path | RTM:1 | "components/Tracking/RestTimerModal.jsx". |

### B4. SWM
| Identifier | Kind | Where | Evidence |
|---|---|---|---|
| second `react-native` import | duplicate import | SWM:4 | Merge into SWM:3. |
| `userWorkoutStats` | prop destructured, never read | SWM:26 | ESLint. It IS compared in the memo comparator SWM:407 and passed by both callers; removing the destructure only is safe. Removing the comparator line or the callers' prop is a cross-partition change (G6). |
| `listRef` | ref attached, never read | SWM:45, 308 | grep: only these two. |
| `scaledSize` (`ss` from utils/scale) next to `scaleSize` | two names for one function | SWM:15 vs SWM:20 | See C8. |
| redundant arms of `isActiveSelf` | always-true tail | SWM:114-115 redundant, SWM:116 always true | Same shape as AWM: `cardWid === String(workout?.wid||"")`. Leave (I4). |

### B5. EWM
| Identifier | Kind | Where | Evidence |
|---|---|---|---|
| `handleDeleteExercise` | wrapper that only forwards | EWM:190-192, used EWM:264 | `(index) => deleteExercise(index)`; `deleteExercise` from the hook is stable and ignores extra args; ExerciseLog calls `deleteExercise(exerciseIndex)` (ExerciseLog.js:123). |
| `updateWorkoutState` | wrapper that only forwards | EWM:110-112 | Forwards to `setDraftWorkout`. `useWorkoutEditing` always calls it with an object (useWorkoutEditing.js:71), never a function, so passing `setDraftWorkout` directly is equivalent. Optional. |
| `styles.bottomSpacer` | empty style | EWM:465, used EWM:337 | `{}`. |
| `title` prop | never passed | EWM:78 | Harmless default; keep. |

### B6. UWM
| Identifier | Kind | Where | Evidence |
|---|---|---|---|
| `ensurePrevSetsCache` | function never called | UWM:398-462 | grep: definition + the dependency array at UWM:556 only (ESLint: "unnecessary dependency"). It is a stable `useCallback([])`, so dropping it from the array does not change memoization. |
| `prevSetsCacheRef`, `PREV_CACHE_TTL_MS` | only used by the above | UWM:386, 388 | |
| `lastPersistSentAtRef` | ref written, never read | UWM:384, 533 | grep. |
| `postWorkout` | returned, never consumed | UWM:1319-1326, 1488 | Only importer (WorkoutExperiencePortal.js:41-53) does not destructure it; grep `postWorkout` repo-wide: UWM only. |
| `completedWorkout` state | state only read by dead `postWorkout` | UWM:291, set UWM:1097, returned UWM:1483 | Portal does not destructure it. Removing `setCompletedWorkout(completed)` removes one synchronous re-render of the Portal (legacy root: no batching outside React events) that happens immediately before `setIsSummaryModalVisible(true)`; nothing renders from it. |
| `navigation` param | only used by dead `postWorkout` | UWM:290, 1324 | Becomes unused after the two rows above (G2). |
| ungated tracing | debug logging | UWM:879-882, 884-887 | `console.log?.("[WorkoutManager] setWorkoutInStore start")`, `console.time?.` etc.: NOT behind `__DEV__`. Remove. |
| DEV tracing | DEV-gated logging | UWM:138-145 (`perfNow`), 453-460 (inside dead fn), 534-542, 563-567, 805, 941-947 | Policy call as above. If the perf log goes, the `finally` block UWM:941-948 and `t0` UWM:805 go with it. |
| `cleanObj` | duplicate of `stripUndefined` | UWM:92 | See C4; also clears the `_` lint at UWM:92:85. |
| `syncCurrentWorkoutRemote` in deps | unused dependency | UWM:1317 | Not referenced in `finishWorkout`'s body. Leave the array alone unless the body changes (briefing: do not edit deps to silence lint). |
| stale notes | stale comments | UWM:23, 1168 ("via Cloud Function (with local fallback)": `runHexagonCompute` UWM:250-257 is local only), 1241 ("persist via CF after") | |
| `global.__showWorkoutReminderForWid = ...` | global written, never read | UWM:895, 1386-1389 | Only readers are inside the commented-out block AWM:1473-1495. Dead write once that block is deleted. It is a `global.*` write, so list it for the owner rather than silently dropping (I7). |
| `global.openCurrentWorkoutSignal = Date.now()` | global written, never read | UWM:890 | grep repo-wide: this line only. Same caveat (I7). |
| `global.userData.currentWorkouts` push | field written, never read locally | UWM:1125-1129 | grep `currentWorkouts`: only UWM and `NotificationCard.js:297` which reads it from ANOTHER user's Firestore doc, not from `global.userData`. Looks vestigial (pushes the COMPLETED workout into "currentWorkouts"). Do not remove without the owner (I7). |
| `setTimerString` -> `workoutStore.setTimer` | store field written every second, never read | UWM:309-311, calls at UWM:320, 326, 334 | grep for `.timer` readers of the store: none (`state.timer` appears only inside `setTimer` itself, workoutStore.js:49). Every tick notifies all store subscribers for nothing. Removal needs the store side too (G3). |
| `isNewWorkoutVisible` state | state set, never read | UWM:294, returned UWM:1481 | Portal destructures it (Portal:43) and never uses it. Its setter is the store's `sheetHandlers.setIsVisible`, called from ABS:132/137/229/237, Portal:31/144, workoutActions.js:17. Whole chain is write-only. Cross-partition (G4); leave in this pass. |

---------------------------------------------------------------------------------------------------

## C. Duplication

C1. **`perfNow`**: ABS:38-45, AWM:135-142, UWM:138-145. Byte-identical. No other definition repo-wide. If the `[perf]` logging is removed (B), all three go; otherwise one export in a new `frontend/utils/perfNow.js`.

C2. **`findStatsEntryForExercise` + `getPreviousOneRm`**: AWM:144-163 and UWM:269-288. Identical behaviour for every input (UWM calls `normalizeExerciseName(rawName)` at UWM:271, whose body `typeof value === "string" ? value.trim() : ""` is exactly the inline expression at AWM:146). A third `getPreviousOneRm` at `backend/workouts/updateCompletedWorkout.js:151` is DIFFERENT (looks entries up by `item.name`, no `> 0` guard, default param) -> leave it. Canonical home: the new pure-helper module proposed in D1 (`activeWorkoutMetrics.js`) or, better for layering, `frontend/utils/exerciseStatsLookup.js`, imported by both AWM and UWM.

C3. **"prev set" normaliser** (returns `null` for non-objects, else `{ weight: Number(x.weight)||0, reps: Number(x.reps)||0 }`): `normalizePrevSetRow` AWM:85-90, `normalizePrevPayload` UWM:45-51, `sanitizePrev` EWM:29-35, `normalizePrev` hooks/useWorkoutEditing.js:8-14 (outside partition). All four behave identically for every input (EWM omits `?.` after the null/type guard, which cannot matter). Canonical home: export `normalizePrev` from a small shared module (e.g. `frontend/utils/workoutSets.js`) and import in all four; needs G1 for the hook file.

C4. **strip-undefined**: `cleanObj` UWM:92 (local to `sanitizeWorkout`) and `stripUndefined` UWM:133-136. Identical. Use `stripUndefined` in `sanitizeWorkout` (it is a module-level `const` declared later in the file, but `sanitizeWorkout` only runs after module init, so the forward reference is safe). No other definition repo-wide.

C5. **`toMillis`**: UWM:37-44 is byte-identical to `frontend/utils/friends.js:4-11` (exported). `frontend/utils/date.js:6-18` (exported) gives the same result for every input UWM passes (number, Date, Firestore Timestamp, `{seconds}`, string, null/undefined) and differs only where the UWM version would THROW (truthy non-function `toMillis`, or `toMillis()` throwing: date.js catches and falls through). 19 other private copies exist repo-wide (22 definitions in total, see G7); several differ (`backend/workouts/updateCompletedWorkout.js:21` handles `_seconds`/nanoseconds and non-finite numbers). Recommendation: import from `../utils/date` (or from `../utils/friends` if the whole-app plan wants a zero-difference swap).

C6. **`genId`**: EWM:27 is byte-identical to hooks/useWorkoutEditing.js:6. The inline ids in UWM:824 and UWM:832 use `.slice(2,6)` (4 random chars, not 6) -> NOT identical, leave. `sanitizeSet` EWM:37-44 vs `normalizeSet` useWorkoutEditing.js:16-23: NOT identical (EWM stringifies the id, accepts `lbs/kg/load/rep/r` aliases, keeps `type` only if own property) -> leave both. The two `normalizeSets` inside UWM (UWM:93-104 and UWM:821-838) are NOT identical (id `null` vs generated; `type` handling) -> leave both.

C7. **`normalizeCalories` (UWM:74-78) vs `normalizeCalorieValue` (AWM:218-221)**: NOT identical. For `null` UWM returns `null`, AWM returns `0` (`Number(null)`). Leave both (and see E8).

C8. **Scaling helpers**: `scaleSize` (helper/scaleSize.js:21) and `ss` (helper/scaleSize.js:26, re-exported by utils/scale.js) are both `Math.round(n * SCALE_MIN)`: identical for every input (`ss` only adds a `'worklet'` directive). SWM imports both (`ss as scaledSize` SWM:15, `scaleSize` SWM:20) and never uses either in a worklet -> use `scaleSize` throughout SWM. RTM's `scaledSize` wrapper (RTM:21) is likewise identical to `scaleSize`.

C9. **FlashList detection block**: AWM:21-25 and SWM:6-10, identical apart from quote style (`RNAnimated` in AWM is the same `Animated` from react-native). No third copy. Canonical home: new `frontend/components/3_Workout/NewWorkout/AnimatedWorkoutList.js` exporting `canUseFlashList` and `AnimatedFlashList`. One shared animated component type instead of two is not observable. This also moves executable statements out of the middle of AWM's import block.

C10. **Confetti loader/trigger** (`confettiTick`, `confettiRef`, `ConfettiModuleRef`, `loadConfettiModule`, `fireConfetti`): AWM:1171-1189, SWM:161-178, `frontend/screens/PastWorkoutScreen.js:283-303` are identical in behaviour. `frontend/components/1_Feed/SimpleFeedPost.js:321-340` is DIFFERENT (extra `confettiVisible` state and a `requestAnimationFrame`). Canonical home: a hook `useConfettiCannon()` returning `{ confettiTick, confettiRef, loadConfettiModule, fireConfetti }` in `frontend/hooks/` (cross-partition for PastWorkoutScreen: G8). The confetti overlay JSX (AWM:1758-1777 inside 1736-1780, SWM:323-348, PastWorkoutScreen:1176 ff.) repeats the same two `<ConfettiCannon>` elements; AWM adds the cheer avatar, SWM uses `scaledSize(60)` (= `scaleSize(60)`), so a shared `<ConfettiOverlay>` is possible but is a rewrite, not a move: optional.

C11. **Cheer-event listener**: AWM:1354-1396 and SWM:218-256. Same query and bookkeeping; differences: gate flag (`liveFeaturesEnabled` vs `streamLive`), AWM additionally calls `triggerCheerOverlay(data)` (AWM:1387), SWM returns `undefined` in the catch (SWM:254). Could become `useCheerEvents({ enabled, wid, meUid, onCheer })`; moderate risk (effect dependencies change shape). Optional; if done, keep the dependency semantics exactly (`[db, cardWid, meUid, enabled, callback identities]`).

C12. **`sendCheerEvent`**: AWM:1192-1215, SWM:180-193, PastWorkoutScreen:303-327, SimpleFeedPost:355. NOT identical: AWM requires a non-empty `fromUid` and sends handle/name/pfp/pfpVersion; SWM sends only `type/fromUid/createdAt` and does not guard an empty uid; PastWorkoutScreen adds `source: "workout_viewer"`. Leave all (see I8).

C13. **Viewing bootstrap** (meUid, myActiveWid, cardWid, friendUidFromWorkout, forcedUid, lockFriend): AWM:447-457 == SWM:47-56 (jscpd). **Dim animation**: AWM:910-921 ~ SWM:120-131 (different target expression). **`areEqualModalProps`**: AWM:2053-2066 is a superset of SWM:405-414. **`workoutCreatedDisplay` memo**: AWM:586-589 == SWM:91-94. These are component-internal and short; extracting them would mean new hooks whose call order must be preserved. Leave; SWM is a deliberate fork.

C14. **ExerciseLog JSX inside AWM**: AWM:1065-1079 (`renderExerciseItem`) and AWM:1589-1604 (ScrollView map) pass the same 13 props. The ScrollView copy can become `renderExerciseItem({ item: ex, index: exerciseIndex })` wrapped in a keyed `React.Fragment`; behaviour-preserving but it is a rewrite of the map body, and it makes the self view depend on the memo identity of `renderExerciseItem`. Optional, low value.

C15. **Keyboard-height effect**: AWM:436-442 and EWM:93-108 are the same logic (a third lives in `components/2_MacroTracking/MacroGoalsSheet.js:323`). A `useKeyboardHeight()` hook would be a new abstraction touching three partitions; optional.

C16. **Sheet colour constants that must stay in sync across two files**: ABS:28 `HANDLE_BG_COLLAPSED = 'rgba(0, 0, 0, 1)'` == AWM:72 `HEADER_COLLAPSED_BG`; ABS:33 `COLLAPSE_COLOR_THRESHOLD = 0.15` == AWM:76 `SHEET_COLOR_THRESHOLD`; ABS:29 `HANDLE_BG_EXPANDED = theme.bg` == AWM:73/75. They are read inside worklets (imported bindings in worklets already work here: `theme.bg` at ABS:359). A shared `activeWorkoutSheetConstants.js` is safe but renames identifiers inside worklets; optional, handle with care (H1).

C17. **Styles repeated across AWM/EWM/SWM**: `scrollview`, `titleDisplayContainer`, `titleDisplayText`, `titleDisplayInput`, `add_exercise_btn`, `add_exercise_text` (AWM:1876-1897, 1904-1925; EWM:405-444; SWM:367-384). Values are NOT all equal (e.g. `titleDisplaySubText.fontSize` 13 in AWM:1889 vs 11 in SWM:381; SWM adds `textAlign`; EWM's `titleDisplayInput` lacks `paddingVertical`). Leave.

C18. **Set-history row builder inside UWM**: UWM:1253-1265 and UWM:1283-1295 build the same `{ weight, reps, date, wid, privacyMode }` rows in two closures of `finishWorkout`. Could be one local helper, but it is inside the most fragile function in the partition (H4). Leave.

C19. **Three-collection fan-out in UWM**: `syncCurrentWorkoutRemote` UWM:655-673, `appendCompletedWorkoutRemote` UWM:675-698, `persistHexagonStats` UWM:700-714 share the "try primary write, fall back to `updateDoc` helper per collection" shape but differ in primary call (`setDoc merge` vs `fsUpdateDoc`), ordering (parallel vs sequential, and collection order) and logging. NOT identical; leave.

---------------------------------------------------------------------------------------------------

## D. Decomposition plans

### D1. AWM (2069 lines)

Top-level layout now: imports 1-62 (with executable FlashList block 21-25 in the middle) | constants 64-77 | helpers 79-306 | list-size constants 308-312 | component 314-1787 | `CollapsedTimerText` 1789-1806 | `styles` 1808-2048 | comparator + export 2050-2068.

Move verbatim (all new files in `frontend/components/3_Workout/NewWorkout/`):

1. `ActiveWorkoutModal.styles.js`: `styles` AWM:1808-2048 plus `CTA_SHADOW_COLOR` AWM:77 (its only use is AWM:1845). Needs `StyleSheet`, `scaleSize`, `theme`. Export `styles`. (Delete the unused key and commented-out props from B1 while there.)
2. `activeWorkoutMetrics.js` (pure, no React): `getUserExerciseStats` 126-133, `findStatsEntryForExercise` 144-154, `getPreviousOneRm` 156-163, `deriveWorkoutMetrics` 165-216, `normalizeCalorieValue` 218-221, `buildExercisesForCalories` 223-233, `resolveDurationForCalories` 235-243, `computeWorkoutCalories` 245-264, `ensureWorkoutMetrics` 266-306. Needs `calculate1RM`, `estimateWorkoutCalories`, `resolveUserBodyweight`. AWM only needs `ensureWorkoutMetrics` (used AWM:555). Also export `findStatsEntryForExercise`/`getPreviousOneRm` for UWM (C2), or place those two in `frontend/utils/` and import them here.
3. `previousSets.js` (pure): `normalizePrevSetRow` 85-90, `extractLatestSetsFromStats` 92-114, `extractSetsFromCompletedWorkout` 116-124 (used AWM:935, 950). If C3 is done, `normalizePrevSetRow` becomes the shared `normalizePrev`.
4. `AnimatedWorkoutList.js`: AWM:21-25 (C9); AWM then imports `{ canUseFlashList, AnimatedFlashList }` (uses: AWM:991, 1010, 1013, 1029, 1610). `UIManager` and `FlatList` imports stay needed in AWM only if still referenced (UIManager yes at AWM:342; FlatList no).
5. `CollapsedTimerText.js`: AWM:1789-1806. Needs `React, memo, useEffect, useState`, `Text`, and `styles` from file 1.
6. Optional subcomponents (JSX moved verbatim, handlers passed as props under the same names so the JSX does not change):
   - `EndWorkoutSheet`: AWM:1673-1712 (uses `endWorkoutSheetVisible`, `closeEndWorkoutSheet`, `handleEndWorkoutFinish`, `handleEndWorkoutCancel`, `withStrongPress`, `styles.end_workout_*`).
   - `CheerConfettiOverlay`: the body of the IIFE AWM:1736-1780 (needs `loadConfettiModule`, `cheerOverlay`, `cheerOverlayAnimatedStyle`, `cheerOverlayPfp`, `setCheerOverlayReady`, `confettiRef` as a plain prop, `confettiTick`, `screenWidth`). Adds a component boundary only.
7. Optional custom hook `useWorkoutCheers` (clean seam, contiguous hooks): AWM:1170-1312 (confetti state, `sendCheerEvent`, `handleCheerPress`, cheer overlay state/animation, `triggerCheerOverlay`, the two overlay effects) together with the listener effect AWM:1354-1396. Inputs: `db, cardWid, meUid, participants, friendPfpCacheRef, liveFeaturesEnabled`. Effect order is preserved if the listener effect is placed last inside the hook (today the effects run in the order 1300, 1307, 1355, then 1469; nothing between 1312 and 1355 is an effect). Medium risk; do it only after items 1-5 are green.

What stays: constants 64-76 and 308-312 (they are captured by worklets / memo bodies; moving them buys little), `ensureUri`/`toUidString` 79-83, the component, comparator 2050-2066, export.

What blocks a deeper split: about 95 hook calls share closures over `workout`, `viewingSelfEffective`, `cardWid`, `meUid`, `lockFriend`, `liveFeaturesEnabled`, `updateWorkoutWithMetrics`; two forward references to later `const`s (AWM:392/420 -> 457, AWM:1077/1080 -> 1498) whose dependency-array slots currently evaluate to `undefined` (E4); the title focus effect AWM:611-670 depends on six of those values; `useGroupViewing` must be called between AWM:495 and the effects that use `viewing`/`setViewing`. Do not extract the title logic, the viewing bootstrap or the header animated styles.

Expected size after 1-5 plus dead-code removal: about 1,380 lines (styles -241, helpers -200, timer text -18, list block -5, dead/commented/perf about -95, new imports +6). With 6-7: about 1,150.

### D2. UWM (1493 lines)

Top-level layout now: imports 1-34 | module helpers 37-288 | hook 290-1492.

Move verbatim (new files in `frontend/logic/`):

1. `workoutSanitize.js` (pure): `toMillis` 37-44 (or import, C5), `normalizePrevPayload` 45-51 (or shared, C3), `normalizeCalories` 74-78, `toDayKeySafe` 80-87, `sanitizeWorkout` 89-122, `stripUndefined` 133-136, `normalizeExerciseName` 147, `getTodayKey` 186-188. Needs `coercePrivacyMode`.
2. `workoutFinishStats.js`: `cloneHexagon` 149-157, `buildRankPayload` 159-184 (E2), `buildExerciseStatDeltas` 190-248, `runHexagonCompute` 250-257, `captureHexSnapshot` 259-267 (writes `global.__hexChangeFrom/__hexChangeTo/__hexSnapshot`: keep exactly), `findStatsEntryForExercise` 269-279 and `getPreviousOneRm` 281-288 (or import the shared copy, C2). Needs `calculate1RM`, `computeHexagonStats`, `normalizeExerciseName`.
3. `workoutGroupUtils.js` (pure): `extractFollowerUids` 52-73, `asUid` 125-129, `filterOutUid` 130-131.
4. Hoist to module scope inside UWM (no behaviour change, they are plain numeric constants re-created every render): `HEAVY_DELAY_MS` UWM:365, `PERSIST_DEBOUNCE_MS` UWM:387 (`PREV_CACHE_TTL_MS` UWM:388 is dead).
5. Reorder inside the hook (E3): move the `syncCurrentWorkoutRemote` block UWM:655-673 to just above `performPersist` (before UWM:520).
6. Optional, medium risk (requires adding a `uid` parameter, so not a pure move): Firestore-only functions that close over nothing but `uid`/`db` -> `workoutRemote.js` as plain async functions, with thin `useCallback` wrappers left in the hook: `upsertWorkoutDoc` 463-519 (closes over nothing), `readCreatorDetails` 600-619, `createWorkoutDoc` 621-653, `syncCurrentWorkoutRemote` 655-673, `appendCompletedWorkoutRemote` 675-698, `persistHexagonStats` 700-714, `leaveWorkoutGroup` 735-792. `upsertWorkoutDoc` is the only one that can move byte-for-byte (unwrap the `useCallback`, keep the body).

What stays: every stateful piece (timer 313-343, persist debounce 381-397 and 520-597, `clearCurrentWorkoutLocally`, `startNewWorkoutFromTemplate`, `cancelWorkout`, `finishWorkout`, `joinExternalWorkout`, the three effects 1434-1476).

What blocks a deeper split: `finishWorkout` (UWM:990-1317, 328 lines) is one long sequence of ordered side effects with closures over `currW`, `completed`, `cleanedExercises`, `startDayKey`, `uid` and a chained `pendingHeavyRef` (H4); `startNewWorkoutFromTemplate` mixes store writes, globals, timer and Firestore in a deliberate order; module-level mutable state does not exist, but `global.*` is used as shared state throughout (H3).

Expected size after 1-5 plus dead-code removal: about 1,080 lines (helpers -230, dead about -120, imports +5). With 6: about 850.

### D3. Files under 500 lines (no plan required)
ABS (458), EWM (469), RTM (462), SWM (417): no split needed. If desired, RTM's `CountdownRing` (RTM:47-98) and `styles` (RTM:313-461) are clean seams; EWM's pure helpers (EWM:27-71) could move to `editingWorkoutUtils.js`.

---------------------------------------------------------------------------------------------------

## E. Latent bugs

E1. **AWM:733 `setIsDoneState` is not defined** (ESLint no-undef; introduced in commit 1e62444c, the state it belonged to no longer exists). Reached when an exercise is REPLACED in the active workout. Runtime today: `SelectExerciseModal.handleFinish` first runs `closeModal` (which already does `setSelectExerciseModalVisible(false); setReplaceIndex(null)`, AWM:717), then calls `appendExercises` inside `try { } catch { // ignored }` (SelectExerciseModal.js:318-324). So `updateWorkoutWithMetrics` at AWM:732 applies the replacement, AWM:733 throws a ReferenceError that is swallowed, and AWM:734-736 never run (they would be no-ops: both states are already reset). **Minimal fix: delete line AWM:733.** Observable behaviour is unchanged. Confidence: high.

E2. **UWM:161 `computeRankProgressFromData` is not defined** (ESLint no-undef; `buildRankPayload` was added in commit dd4d0e18 without the import). Runtime today: the ReferenceError is caught at UWM:180, `console.warn("buildRankPayload failed", ...)` fires after every finished workout, `rankPayload` is always `null`, so UWM:1187 writes only hexagon fields and UWM:1193-1198 never run. The intended source is unambiguous: `shared/rankProgress.js:238` exports it, and `backend/workouts/updateCompletedWorkout.js:491-510` builds the same `{ currentRank: {key,tier,level,label,index}, rankTier, rankLabel, rankLevel }` shape from it. **Minimal fix: `import { computeRankProgressFromData } from "../../shared/rankProgress.js";`** BUT this activates a write path that has never executed (rank fields written to usersPublic/users/usersPrivate at workout finish and mirrored on `global.userData`). That is a Firestore-visible behaviour change, so it needs the owner's yes; the strictly behaviour-preserving alternative is to leave the code as it is. Do not delete `buildRankPayload` (intent is clear). Confidence in diagnosis: high; in applying the import under the "behaviour-preserving" rule: medium.

E3. **UWM:556 and UWM:596 read `syncCurrentWorkoutRemote` in dependency arrays ~100 lines before its `const` declaration at UWM:655** (also used in the bodies at UWM:545, 570). Under the Babel `var` transform the array slot is always `undefined` and the closures see the assigned value later, so it works; with real `const` semantics this would be a TDZ ReferenceError on first render. **Minimal fix: move the `syncCurrentWorkoutRemote` `useCallback` (UWM:655-673) above `performPersist` (UWM:520).** Safe: its identity changes only with `uid`, which is already in both dependency arrays, so memo invalidation is unchanged. Confidence: high.

E4. **Same pattern in AWM**: (a) `lockFriend` is read in the effect body AWM:392 and its dependency array AWM:420, declared at AWM:457; (b) `handleStatFocus` is read at AWM:1077 and in the dependency array AWM:1080, declared at AWM:1498. **Minimal fix**: (b) move the `handleStatFocus` block AWM:1497-1509 above `renderExerciseItem` (AWM:1061): it is a stable `useCallback([])`, so nothing changes. (a) move the plain-const block AWM:447-457 (`meUid` ... `lockFriend`) above the `liveFeaturesEnabled` effect (above AWM:386); the dependency slot changes from constant `undefined` to the real boolean, which only matters if `lockFriend` changes between renders, and it is constant `false` in the app (B1). Confidence: high for (b), medium-high for (a).

E5. **UWM:1451-1462 `useWorkoutStore.subscribe(selector, listener)` on a store without `subscribeWithSelector`** (workoutStore.js:1, 13; zustand 4.5.7 `vanilla.js:22` `subscribe(listener)`). The first argument `(state) => state.workout` is registered as the listener and does nothing; the real persistence callback (second argument) is never invoked. Persistence actually happens through `updateNewWorkout` (UWM:953-956) and the one-shot call at UWM:1463-1470. **Do NOT "fix" this**: making the subscription live would start persisting on every store change, including `setWorkoutInStore(null)` -> `persistCurrentWorkout(null)` -> remote clear, i.e. new Firestore writes. Leave the code byte-for-byte and raise I1. Confidence that it is a bug: high; that any fix is behaviour-preserving: none.

E6. **UWM:1463-1470 persists whatever is in the store at mount**, and when the store is empty that means `persistCurrentWorkout(null)` -> `syncCurrentWorkoutRemote(null)` -> `currentWorkout: null` merged into users/usersPublic/usersPrivate (UWM:560-573). The Portal mounts on `authChecked && isAuthenticated` (App.js:1708-1710), which can precede user-doc hydration (`userReady`), so a resumable workout may be cleared remotely before it is rehydrated. Not a refactor fix; I2. Confidence: medium (depends on hydration timing).

E7. **UWM:1105-1121 double write to usersPrivate at finish**: the direct `fsUpdateDoc(usersPrivate, { completedWorkouts: arrayUnion, statsTotalWorkouts: increment(1), statsTotalVolume: increment, statsTotalHours: increment })` at UWM:1108-1120 is followed by `appendCompletedWorkoutRemote(...)` at UWM:1121, whose targets (UWM:684) include `usersPrivate` again with the same increments. `arrayUnion` is idempotent, the three `increment`s are not: usersPrivate totals advance twice per workout while users/usersPublic advance once. Not a refactor fix; I3. Confidence: high that it happens, unknown whether anything reads the private totals.

E8. **AWM:218-221 / 287-291 `normalizeCalorieValue(null)` is `0`**, so when both the stored and the recomputed calories are `null`, `caloriesChanged` (`null !== 0`) is true and `ensureWorkoutMetrics` returns a fresh object on every call; the short-circuit at AWM:556 can then never hit for such workouts. Harmless (extra store writes on no-op updates); changing it alters write frequency. Leave; I5. Confidence: high.

E9. **ABS:345 `const pointerEvents = animatedIndex.value > 0.05 ? 'auto' : 'none'`** reads a shared value during render. `SheetBackdrop` renders once (stable `renderBackdrop`, ABS:165), so `pointerEvents` is frozen at whatever the index was at mount (normally `'none'`): the dimmed backdrop never intercepts touches. Leave; I10. Confidence: medium.

E10. **ABS:302-316 `handleComponent`/`backgroundComponent` are new component types on every render** (ESLint no-unstable-nested-components). Each ABS render unmounts and remounts `AnimatedIndexBridge` and `SheetBackground`, restarting the derived value that copies the sheet index into `sharedAnimatedIndex`. Evident intent is the stable pattern already used for the backdrop (ABS:165). Fix in F1. Confidence: medium-high.

No duplicate object keys, no conditional hooks found in the six files (ABS's early return at ABS:267 comes after every hook).

---------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

F1. ABS:302-307, 312-316: components defined during render. Hoist to `useCallback`s like `renderBackdrop`: `renderHandle = useCallback((props) => <AnimatedIndexBridge {...props} sharedIndex={sharedAnimatedIndex} />, [sharedAnimatedIndex])` and `renderBackground = useCallback((props) => <SheetBackground {...props} />, [])`. Risk: medium-low. It changes mount behaviour (the handle/background stop remounting on each ABS render), which is the intended behaviour but is in the gesture/animation path: verify the collapsed/expanded colour transition and the Footer collapse progress on device. If the orchestrator wants zero animation risk, leave and record.
F2. ABS:377-382: `export default` sits in the middle of the file, before `AnimatedIndexBridge` (ABS:384) and `styles` (ABS:420). Move it to the end. Risk: none (declarations are only read at render time).
F3. AWM:19 and SWM:4: duplicate `react-native` imports. Merge. Risk: none.
F4. AWM:21-25, SWM:6-10: executable statements between import declarations. Resolved by C9; otherwise move below the imports. Risk: none (imports are hoisted anyway).
F5. AWM:342-344 and SWM:37-39: `UIManager.setLayoutAnimationEnabledExperimental(true)` is called on every render. Could run once at module scope. Risk: low (idempotent native flag), but it is a timing change of a side effect: optional.
F6. E3/E4 reorders (use-before-define). Risk: low; see the per-item notes.
F7. UWM:365, 387: per-render constants -> module scope. Risk: none (neither is in a dependency array).
F8. UWM:600-619 `readCreatorDetails` is a plain function re-created every render and called from two `useCallback`s (UWM:623, 849) whose arrays omit it. It closes over `uid` only, which both arrays contain, so there is no stale-closure bug. Making it a module function `readCreatorDetails(uid)` is clean but edits two call sites. Risk: low. Optional.
F9. AWM:747-755 `confirmCancelWorkout` is a plain function, so `handleEndWorkoutFinish`/`handleEndWorkoutCancel` (AWM:1047-1059) are re-created every render. Wrapping it in `useCallback([viewingSelfEffective, workout, cancelWorkout])` is correct, but it adds a hook in the middle of the component; only do it together with other AWM hook edits. Risk: low. Optional.
F10. SWM:287 inline `() => onCopyTemplate?.(baseWorkout)` and SWM:316 `Animated.event(...)` re-created each render (AWM memoises the equivalent at AWM:1031-1037 and 1334-1336). Risk of changing: low; benefit small. Optional.
F11. AWM:345 / SWM:41 use `getFirestore()` per render while UWM imports `db` from `firebase.config` (firebase.config.js:22 `getFirestore(app)`, same instance). Consistency only; `db` sits in several dependency arrays (AWM:1215, 1396, 1466). Leave unless the whole-app plan standardises it.
F12. RTM:98: arrow-function component declaration without a trailing semicolon; RTM:100-108 JSDoc omits `restTotal`. Cosmetic; leave (no formatting churn) unless the line is otherwise touched.
F13. AWM:1307-1312: cleanup calls `setCheerOverlayReady(false)` during unmount (a state update on an unmounting component; silent in React 18). Harmless; leave.
F14. UWM:660, 686, 703: the callback/loop variable is named `collection`, shadowing the `collection` import from firebase/firestore (UWM:13) inside those scopes. Works (it is only used as the string path segment). Renaming to `collectionName` is safe but touches Firestore call lines; optional, low risk.
F15. Effects/timers without cleanup that are intentional and should stay: UWM:368-379 (the delayed heavy task must still run after unmount), UWM:588-594 (debounce timer; the Portal lives for the whole session), AWM:659 (retry `setTimeout`s are guarded by the `cancelled` flag set in the cleanup at AWM:669), AWM:912-921 and RTM:195-218 (native/JS driven timings that end on their own).

Do not touch dependency arrays flagged by exhaustive-deps (AWM:714, 743, 890, 1010, 1029; SWM:118; UWM:518, 556, 652, 950, 1317, 1431) except the mechanical removal of `ensurePrevSetsCache` from UWM:556 when the dead function is deleted (it is a stable callback, so the array's change behaviour is identical).

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

G1. `frontend/components/3_Workout/NewWorkout/hooks/useWorkoutEditing.js`: export (or move to a shared util) `normalizePrev` (:8-14) and `genId` (:6) so AWM/EWM/UWM can import them (C3, C6). Also in that file: `useWorkoutStore` import (:3) is unused, `toggleIsDone` (:158-184, returned :203) has no caller repo-wide.
G2. `frontend/components/3_Workout/WorkoutExperiencePortal.js`: stop destructuring `isNewWorkoutVisible` (:43, unused); after UWM drops `postWorkout`, stop passing `navigation` to `useWorkoutManager` (:55) (the Portal still uses its own `navigation`). `persistWorkout` handler (:22, :101) has no reader anywhere (grep `persistWorkout`: Portal only); if it is removed, UWM's returned `persistCurrentWorkout` (UWM:1490) becomes unused externally.
G3. `frontend/state/workoutStore.js`: `timer` (:16) and `setTimer` (:47-50) have no reader (only UWM writes, once per second); `patchWorkout` (:36-42) has no caller. Remove together with UWM's `setTimerString` (UWM:309-311 and calls at 320, 326, 334, plus the dependency entries at 328, 335).
G4. Write-only "visible" chain: UWM `isNewWorkoutVisible`/`setIsNewWorkoutVisible` (UWM:294-299) <- `sheetHandlers.setIsVisible` (workoutStore.js:24; Portal:20, 93; ABS:116 and calls; `frontend/workout/workoutActions.js:11-22`; Portal:29-32, 144). Nothing reads the boolean. Removing it spans four files and a `global.openWorkoutModal` hook; raise with the owner rather than doing it in this pass.
G5. `frontend/components/3_Workout/NewWorkout/hooks/useRestTimer.js:175`: `setCountdown` in the return object is unused once AWM:366 is removed.
G6. SWM `userWorkoutStats`: ignored by SWM (only compared in its memo). Callers pass it: `FeedWorkoutViewerSheet.js:247` (`stats` from `friendStatsCacheRef`, :238) and `UserStatsWorkoutViewerScreen.js:37`. If the owning partitions drop the prop (and any cache that exists only to feed it), SWM can drop it from the signature and the comparator (SWM:26, 407).
G7. Shared `toMillis`: 22 definitions repo-wide (backend/admin/exportFoodLogsTable.js:220, backend/workouts/deleteCompletedWorkout.js:20, backend/workouts/updateCompletedWorkout.js:21, components/1.1_Messages/MessageCard.js:36, components/1.2_Chat/MessageItem.js:104, components/1_Feed/Notifications/NotificationsModal.js:224, components/1_Feed/SimpleFeedPost.js:61, components/2_Competition/UserStats/userStatsUtils.js:53, components/3_Workout/NewWorkout/Group/GroupModal.js:24, helper/estimateWorkoutCalories.js:66, hooks/useCommunityActivity.js:5, hooks/useLiveFollowing.js:6, logic/communityStats.js:60, logic/useWorkoutManager.js:37, screens/PastWorkoutScreen.js:51, screens/ProfileWorkoutsAndPostsScreen.js:39, screens/feed/hooks/useFeedUserData.js:18, utils/date.js:6, utils/favoriteFoods.js:32, utils/friends.js:4, functions/scripts/clearStaleCurrentWorkouts.js:17, functions/shared/rebuildHexagonStats.js:15). Exported canonical candidates are `frontend/utils/date.js:6` and `frontend/utils/friends.js:4` (the latter byte-identical to UWM:37-44). The whole-app plan should pick one; bodies were only compared for the UWM / friends.js / date.js / updateCompletedWorkout.js copies.
G8. `frontend/screens/PastWorkoutScreen.js:283-303`: confetti loader/trigger identical to AWM/SWM (C10); adopt the shared hook if one is created.
G9. `frontend/components/3_Workout/NewWorkout/Group/useGroupViewing.js:456, 483`: `friendDoneDerived` (`useMemo(() => 0, ...)`) is returned and used by neither caller (AWM:495-508, SWM:62-68). `Group/GroupHeader.js:28, 152-156`: `onFinish` is passed by neither caller.
G10. `frontend/components/Footer.js:45` dynamically imports AWM by path; keep the file at its path (rule 8 already guarantees it).

---------------------------------------------------------------------------------------------------

## H. Fragile areas

H1. **Reanimated worklets and their captured constants.** ABS:77-91, 140-142, 161-163, 167-187, 341-343, 356-367, 385-411; AWM:422-433, 782-868. Do not rename, reorder or "simplify" the inline clamps (`x < 0 ? 0 : x > 1 ? 1 : x`), the interpolation ranges, or the constants AWM:64-76 / ABS:22-36. AWM:427-428 mutates a React ref (`sheetReadyRef.current`) from inside a worklet: on the UI runtime this is a captured copy, so it acts as UI-thread-local dedupe state; it looks wrong and must be left alone. AWM:782-789 calls `runOnJS` on every index change with the dedupe on the JS side (AWM:776-780): leave.
H2. **AWM viewing / live gating (AWM:386-539, 874-907).** The interplay of `liveFeaturesEnabled`, `liveEnabled`, `sheetReadyForFocus`, `forceSelfView`, the one-shot globals `global.__enableLiveForWid` (AWM:479, 486) and `global.__forceWorkoutSelfViewWid` (AWM:460, 491), `ensuredSelfViewRef` and `useGroupViewing`'s arguments controls when Firestore listeners attach and when presence is published. Constant-folding `lockFriend`/`streamLive`/`hasActiveWorkoutContext` (B1) is logically valid today but touches every line of this block; do not do it in a behaviour-preserving pass.
H3. **`global.*` contract used by this partition.** Written by UWM: `isCurrentlyWorkingOut` (718, 815, 1397, 1443), `userData.currentWorkout` (720, 1398, 1444), `userData.completedWorkouts`/`workoutsByDate` (1088-1091), `userData.statsExercises` (1166, 1268), `userData.statsHexagon` (1192, 1226), rank fields (1194-1197, currently unreachable: E2), `__suppressCurrentWorkoutUntil` (722; read by `screens/feed/hooks/useFeedUserData.js:49` and UWM:1435), `__hexChangeFrom/__hexChangeTo/__hexSnapshot` (263-265; read by Portal:212-214 and UserStatsAfterWorkoutSheet.js:82-116), `__enableLiveForWid`, `__forceWorkoutSelfViewWid` (1400-1401; consumed by AWM). Keep names, value shapes and write order.
H4. **`finishWorkout` (UWM:990-1317).** Order matters: hex snapshot capture (994) -> local `completedWorkouts` push + `emitUserDataUpdate` (1084-1095) -> `setCompletedWorkout`/`setIsSummaryModalVisible(true)` (1097-1098) -> `clearCurrentWorkoutLocally()` (1100) -> Firestore writes (1103-1123) -> awaited `upsertWorkoutDoc` (1132) -> preview hexagon async (1212-1236) -> `pendingHeavyRef` assigned at 1239 and then re-wrapped at 1305-1306 (the chain runs `scheduleHeavy` then `persistSetsHistory`; it is triggered by the effect UWM:368-379 only when the summary modal CLOSES, after `HEAVY_DELAY_MS`). The final `wid` read at UWM:1310 happens after the store was cleared at 1100 whenever `hasWork` is true, so in that (normal) case it is `""` and `leaveWorkoutGroup` at 1312 is skipped; when `hasWork` is false the store is never cleared by `finishWorkout` at all (only ABS:234-240 hides the sheet) and `leaveWorkoutGroup` does run. Looks like a bug, do not touch (I11). Only safe edits inside: deleting `setCompletedWorkout` (B6), deleting the ungated tracing, and comment fixes.
H5. **ABS sheet state machine (ABS:120-240).** `allowCloseRef`, `handleSheetCloseJS`/`handleSheetChangeJS` snapping back to index 0, `syncToSheetState` calling both `expand()` and `snapToIndex(1)`, the three effects ABS:202-218, and the double remount key (`contentKey` bumped by the effect ABS:220-224 AND `wid` inside the key at ABS:319) are timing-sensitive. The memo comparator ABS:377-382 deliberately ignores `collapseProgressSV`. AWM's comparator AWM:2053-2066 deliberately ignores `showGroupModal`, `registerInviteHandler`, `onPressPfp`, `streamLive`, `animatedIndex`, `friendPfp`, `friendPfpVersion`: do not "complete" either list.
H6. **Persistence debounce (UWM:381-397, 520-597).** `pendingPersistValueRef`, `saveCurrentWorkoutDebouncedRef`, the JSON hash dedupe (`lastPersistSentHashRef`) and `InteractionManager.runAfterInteractions` wrapping decide how often Firestore is written. Only the dead `lastPersistSentAtRef` and `ensurePrevSetsCache` may be removed.
H7. **Title autofocus effect (AWM:611-670)**: retry loop (10 x 80 ms), `requestAnimationFrame` chain, `__focusTitle`/`__justStarted` flags stripped by `sanitizeWorkout` (UWM:109). Leave byte-for-byte.
H8. **RTM animation effects (RTM:187-227)**: the `[visible]`-only effect with its `eslint-disable` comment (RTM:217) is intentional (re-sync only on open). Keep the comment and the array.
H9. **Rehydrate effect dependency `[global?.userData?.currentWorkout]` (UWM:1448)** reads a mutable global during render; it re-runs only when something re-renders the Portal. Intentional (eslint-disable at UWM:1447). Leave.
H10. **Odd indentation UWM:806-938** (body of the `try` is not indented). Rule 6: do not reformat.
H11. **SWM vs AWM**: SWM is a fork; unify only the items listed in C (FlashList block, scale helper, confetti hook). Its `GroupHeader` props, `maintainVisibleContentPosition`, and `sendCheerEvent` payload differ on purpose or by accident (I8) and must stay.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

I1. UWM:1451-1462: the store subscription that is meant to persist the workout on every store change never fires (zustand `subscribe` takes one argument without `subscribeWithSelector`). Is persistence through `updateNewWorkout` alone the intended behaviour? If yes, the subscription block can be deleted; if no, it needs a deliberate fix (which will add Firestore writes).
I2. UWM:1463-1470: at mount, an empty store causes `currentWorkout: null` to be written to users/usersPublic/usersPrivate. Is clearing the remote workout at every cold start (possibly before the user doc has hydrated) intended?
I3. UWM:1108-1121: usersPrivate gets `statsTotalWorkouts/Volume/Hours` incremented twice per finished workout (once directly, once via `appendCompletedWorkoutRemote`). Intended?
I4. AWM:874-890 `hasActiveWorkoutContext` always equals `!!cardWid` (and SWM:109-118 `isActiveSelf` equals `viewingSelfEffective && !!cardWid`). Consequently, inside the bottom sheet the header never shows Cheer / Copy Template / left avatar (AWM:1550-1564) and `onPressPfp` from ABS:246-258 is never forwarded. Combined with the six props ABS never passes (B1), about 40 lines of AWM's friend-lock logic are unreachable. Fold it away, or keep AWM able to act as a locked friend viewer?
I5. AWM:218-221: should `null` calories compare equal to `null` (today `null` vs `0` forces an update on every edit)?
I6. AWM:1497-1509 `handleStatFocus` can never scroll in the self view (the list ref is only on the read-only FlashList). Remove the handler and the `onStatFocus` prop, or re-attach a ref to the ScrollView?
I7. Dead global writes: `global.__showWorkoutReminderForWid` (UWM:895, 1389), `global.openCurrentWorkoutSignal` (UWM:890), `global.userData.currentWorkouts` (UWM:1125-1129, pushes the completed workout). OK to delete?
I8. SWM:180-193 sends cheer events without handle/name/pfp and without the empty-uid guard that AWM:1192-1215 has; receivers (AWM:1269-1298) then fall back to participants/cache for the avatar. Should SWM send the same payload as AWM?
I9. RTM:321-332: `styles.card` sets `borderWidth` but no `borderColor`, while `CARD_BORDER`/`CARD_BG` (RTM:26-27) are defined and unused. Was the card meant to use them?
I10. ABS:345: backdrop `pointerEvents` is computed once from a shared value at render; the dimmed backdrop does not block touches when expanded. Intended?
I11. UWM:1310-1312: when the finished workout has logged work (`hasWork`, UWM:1080), the store was already cleared at UWM:1100, so `wid` is `""` and `leaveWorkoutGroup` is skipped: a finished group workout never removes the user from `workouts/{wid}.members` or deletes presence/invites. Conversely, when there is no logged work (exercises present but no completed sets; AWM:1047-1054 routes that case to "finish"), `finishWorkout` neither clears the store nor `global.userData.currentWorkout` nor the timer, while ABS:234-240 hides the sheet. Are both intended?
I12. E2: may the missing `computeRankProgressFromData` import be added (activating rank writes at finish), or should the rank payload stay inert?
I13. `[perf]` / `[WorkoutManager]` DEV logging (ABS:268-284; AWM:339, 928, 956-963, 1511-1516; UWM:453-460, 534-542, 563-567, 805, 941-947): keep as intentional instrumentation, or remove with `perfNow`?
