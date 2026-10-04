# Spartan whole-app refactor: final plan

Inputs: SPX/context.md (hard rules), SPX/partitions.json, the 26 audits in SPX/audit/*.md, the baseline source, and
three independent reviews of the draft of this plan (their findings were re-checked in the source; the outcome is in
"Critic issues not adopted" at the end and in the sections they touch).
SPX = /tmp/claude-501/spx. All paths are relative to /Users/yangbai/Desktop/Projects/spartan.

Line numbers in this plan and in the audits are BASELINE line numbers (SPX/baseline/<path>). They LOCATE code.
- Stage 0 copies text out of the baseline (at that time the working tree is identical to it).
- Stage 1 edits files in place first and moves text afterwards, so what is moved is the working-tree text, never a
  fresh copy of a baseline range (G-5).

Reading order for an implementer: "Global conventions", then your own section ("Stage 0: <id>" or
"Partition: <key>"), then the entries of "Shared modules" and "Cross-partition pairings" that your section names.
You need nothing else besides SPX/context.md and your partition's audit.

Abbreviations used throughout:
ED frontend/screens/ExerciseDetail.js; PS frontend/components/2_Competition/sections/ProgressSection.js;
UP frontend/components/2_Competition/UserStats/UserStatsProgressPreview.js; USM .../UserStats/UserStatsModal.js;
USD .../UserStats/UserStatsExerciseDetailScreen.js; WMS frontend/screens/WeightMeasurementsScreen.js;
MGE frontend/screens/MuscleGroupExercises.js; FEED frontend/screens/1_Feed.js;
PWP frontend/screens/ProfileWorkoutsAndPostsScreen.js; VPS frontend/screens/4.1_ViewProfile.js;
SFP frontend/components/1_Feed/SimpleFeedPost.js; PWS frontend/screens/PastWorkoutScreen.js;
PWEL frontend/components/1_Feed/PastWorkoutExerciseLog.js; FSC frontend/components/1_Feed/FeedSnapshotCard.js;
PUO frontend/components/5_Profile/MakePost/PostUploadOptionsScreen.js; CB .../MakePost/ClipBuilderScreen.js;
NW frontend/components/3_Workout/NewWorkout; AWM NW/ActiveWorkoutModal.js; EWM NW/EditingWorkoutModal.js;
ABS NW/ActiveWorkoutBottomSheet.js; UWM frontend/logic/useWorkoutManager.js;
FSO frontend/components/2_MacroTracking/FoodSearchOverlay.js.

---------------------------------------------------------------------------------------------------------------------

## Global conventions

### G-1 Shape of the run
- Stage 0 only CREATES or EXTENDS shared modules (providers). It never edits a consumer. The originals stay where
  they are until stage 1, so for a short time the shared copy and the local copies coexist. The one exception is
  s0-scale, which edits two small provider files together (helper/scaleSize.js and utils/scale.js).
- Stage 1 (26 packages in parallel, one per partition) adopts the shared modules in its own files, deletes the local
  copies listed as "Replace" under "Shared modules", removes dead code, applies the approved fixes and splits
  oversized files.
- Audit line numbers are valid at the start of stage 1 for every file except the seven provider files that stage 0
  edits. Only two of them shift: frontend/utils/weightEntries.js (existing lines move down by 2: an import and a
  blank line are added at the top) and frontend/helper/scaleSize.js (rewritten). frontend/utils/scale.js is reduced
  to one line. frontend/utils/date.js, livePostMeta.js, muscleTierColors.js only gain lines at the very end, and
  frontend/services/userProfileService.js gains one `export` keyword (no shift). The affected partitions
  (utils-logic, helpers-hooks, app-shell) carry a "Stale lines" note.
- Files CREATED by stage 0 are frozen in stage 1: no stage-1 package edits them. If one looks wrong, report it.
- No existing file is deleted, moved or renamed. PARKED and DEAD files are never edited.

### G-2 How to read an audit against this plan
The partition's audit is the work list. Unless the partition section says otherwise:
- items the audit marks certain / Tier 1 / T1 / SAFE / APPLY / REMOVE: do them;
- items marked OPTIONAL, "if desired", "only if the lines are touched": NOT applied, unless the partition section
  lists them as accepted. Nothing in this plan is left to the implementer's taste: an item is either accepted here
  or it is not done;
- items marked T2 / Tier 2 / Tier X / KEEP / "needs owner": not done;
- latent-bug fixes: ONLY the ones listed as "Approved fixes" in the partition section. Everything else in an
  audit's section E is an open question and stays byte-for-byte.
Where this plan and an audit disagree, this plan wins.

### G-3 Parallel-safety rules for stage 1
Stage-1 packages run at the same time in one working tree and cannot coordinate. Therefore:
1. A package may stop PASSING a prop/argument that the receiver provably ignores, and may stop ACCEPTING a
   prop/parameter that no caller passes. Both directions are safe on their own (an extra prop is ignored).
2. A package may switch its own import to a module/export that exists in the baseline or is created by stage 0.
3. A package must NOT remove or rename an export, a store field, a return member that is READ, or a prop that is
   READ by a file of another partition, even if the audit says the other side will stop using it. Such
   second-order removals are listed under X-2 ("Deferred removals") and are not part of this run.
4. A package must not import anything that another stage-1 package is supposed to create or export.
5. Before importing a shared name into a file, `grep -n "\bNAME\b"` that file. If the file already binds NAME
   (a local `const`, a parameter, another import) and that binding is not the duplicate you are deleting, stop and
   report: never let a local shadow a stage-0 import. (The shared live-post predicate is called `isLivePostData`
   precisely because SimpleFeedPost.js and PostFooter.js have a component-level local named `isLivePost`.)
6. Read any file OUTSIDE your partition from SPX/baseline, never from the working tree: another package may be
   half-way through editing it.
7. A lint error of the `import/*` family (or `no-undef` on an imported name) that points into another partition's
   file is not yours to fix. Check the export in the SPX/baseline copy of that file (or in the stage-0 module). If
   it exists there, keep your import as written and mention the transient error in your report. Never edit the
   foreign file and never change your import to work around it. Stage 2 is the authority for cross-partition
   import errors.
8. Create new files only at the paths listed under "New files" in your partition section.

### G-4 Policies settled once
- Canonical names, no aliases. A stage-0 export is imported and called under its own name. Do not write
  `import { x as y }` for a stage-0 export; rename the handful of call sites instead (the exact lines are given in
  the partition sections). Existing aliases of other modules (for example
  `DEFAULT_MUSCLE_SEGMENTS as MUSCLE_SEGMENTS`) stay as they are.
- Mechanical call-site renames are done with perl, never with `sed -E '\b...'`: on this machine sed is BSD sed,
  where `\b` is not a word boundary and the command silently does nothing.
  - edit:   `perl -pi -e 's/\bOLD\(/NEW(/g' <file>`
  - review: `diff <(perl -pe 's/\bOLD\(/NEW(/g' SPX/baseline/<file>) <file>` must show only the deleted
    definition, the import change and the package's other listed edits.
- Scaler forwarders `const scaledSize|scaled|s = (n) => scaleSize(n)`: in every LIVE file that defines one
  (including the unreachable Explore files), rename the calls (`scaledSize(` -> `scaleSize(`; `scaled(` ->
  `scaleSize(` in FSC; `s(` -> `scaleSize(` in frontend/components/ProfileCard.js) and delete the definition. Not an
  alias. PARKED copies stay, and so does the exported `scaledSize` of UserStats/UserStatsStyles.js together with
  its uses in the UserStats files that import it (PARKED LeaderboardsSection.js imports it too).
- Width-375 scalers (a local `scaleSize`, `wScale` or `s` defined as `Math.round(n * (screenWidth / 375))`): delete
  the local definition (and `scale`, `Dimensions`, `screenWidth` where lint then reports them unused), import
  `{ scaleWidth375 }` from frontend/helper/scaleSize, and rename the calls with the perl recipe
  (`scaleSize(` / `wScale(` / `s(` -> `scaleWidth375(`). See SM-13 for the file list.
- Never redirect an import between `frontend/helper/scaleSize` and
  `frontend/components/2_Competition/layoutConstants` (`scaleSize` there is a different function), and never replace
  a width-375 scaler by the default `scaleSize`.
- Dependency arrays are never edited to silence a warning. An array changes only when an identifier in it is
  deleted (the entry goes with it).
- "Declare before use" moves (a `const` that is read, usually in a dependency array, above its declaration; this
  works today only because Babel lowers `const` to `var`, so the array slot is a constant `undefined`). A move is
  approved only when the moved value is referentially stable, or changes only together with another entry that is
  already in the same array. Fix by moving the declaration, never by editing the array. The complete list:

  | Move | Package | Value that becomes a live dependency | Why the effect/memo fires exactly as before |
  |---|---|---|---|
  | PS E1 | progress-section | the eight `show*Pointer` / `schedule*Hide` callbacks | stable: their deps are `useCallback(..., [])` results and `useRef(...).current` |
  | SFP E2 (a) | feed-post | `setControlsVisibility` | stable `useCallback` over refs |
  | useFilteredFeed E3 | feed-screen | `buildLiveFeedEntry`, `recomputeFeed` | both stable |
  | UWM E3 | workout-active | `syncCurrentWorkoutRemote` | changes only with `uid`, which is already in both arrays |
  | AWM E4 (a) | workout-active | `lockFriend` | constant `false` in the app |
  | AWM E4 (b) | workout-active | `handleStatFocus` | `useCallback(..., [])` |
  | MacroTracking E.2 | macro-screens | `refreshDayData` | changes only with `focusedDate`, already in the array |
  | USM E1 | user-stats | `findWorkoutByWid` | changes only with `user?.completedWorkouts` / `user?.uid`; `user` is already in the array. Extra re-run only if those fields changed on an unchanged `user` object, which no caller does (self: fresh object from `buildEffectiveStatsUser`; others: fetched state objects). Name this in the report. |

  NOT applied (the moved value is not stable, so the move would add a real dependency): SFP E2 (b)/(c)
  (`isViewerOwner`, `postOwnerUid`, `reportHandle`), PWP E2 (`canViewContent`), FEED E1/E2. These declarations keep
  their current relative order and are recorded as accepted residuals (Q2, Q34).
- Components defined during render. Hoisting one stops it from being remounted on every parent render. That is a
  real (benign) behaviour delta, not "same pixels", so it is done only for this list, and each one must be named in
  the package report and exercised in the stage-2 smoke test:

  | Hoist | Package | What stops remounting |
  |---|---|---|
  | MGE F2 `ItemSeparator` | ladder-and-weight | a stateless `View` |
  | UserStatsAfterWorkoutSheet F1 backdrop | user-stats | the `BottomSheetBackdrop` of the after-workout sheet |
  | SearchUsers F4 separator | feed-screen | a stateless `View` |
  | MessagesHeader `Chip` | messages-chat | the two `RNBounceable` chips (their bounce is no longer cut by a re-render) |
  | MessageItem `MediaTile` | messages-chat | image/video tiles of a message (keys unchanged) |
  | MacroGoalsSheet E2 `backdropComponent={renderBackdrop}` | macro-components | the goals-sheet backdrop |
  | PWP F2 `ListEmptyComponent` element | profile | the empty view / spinner of the workouts list |
  | FollowListBottomSheet F5 `FollowRow`, F6 separator | app-shell | follow rows keep their `usePfp` state across sheet renders |

  NOT applied: FSO E3 (`HistoryFooter`; its rows are `Swipeable`s keyed with an index fallback, Q33), ABS F1,
  FEED F3.
- Logging: remove tracing `console.log` / `console.time` on success paths. Keep every failure-path log exactly as
  it is (do not turn `console.log` into `console.warn`). Keep `__DEV__`-gated perf logs (Q22).
- Not in this run: unhandled-rejection hardening (`.catch(() => {})` on best-effort calls), stale-closure
  dependency additions, and every fix that changes what is rendered, written to Firestore or sent over the network.
  What IS applied is listed per partition under "Approved fixes" / "Accepted" and belongs to one of these classes:
  the four classes of hard rule 2 (undefined name, duplicate key, conditional hook, unreachable code), a
  declare-before-use move from the table above, a hoist from the remount table above, or a value-preserving
  memoisation / hoist of a pure helper. A fix outside these classes is an open question, however small.
- Unreachable Explore code (frontend/screens/4_Explore.js, frontend/components/4_Explore/*, and
  1_Feed/Posts/Post.js, PostHeader.js, PostFooter.js, PostFooterInfoPanel.js, PostMediaCarousel.js): nothing
  navigates to the `Explore` route (Q5) and the smoke test cannot reach it. These files get only deletions that lint
  proves (unused imports, variables, parameters, StyleSheet keys), commented-out code and stale comments, and the
  mechanical scaler-forwarder rename. No splits, no shared-module adoption, no removal of hooks, effects or JSX.
- Route-param tolerance and constant-prop "modes" hidden by every caller (audits' T2) stay as they are.

### G-5 Order of work inside a stage-1 package
1. Dead code and approved fixes, in place, working from the bottom of each file upwards so the audit's line
   numbers stay valid for everything above the edit. When this step is finished, lint the file:
   `no-unused-vars`, `unused-imports/no-unused-imports` and `react-native/no-unused-styles` must be 0 for it, except
   for identifiers this plan says to keep. This is the last moment at which unused StyleSheet keys are visible to
   lint: once a sheet lives in its own module, ESLint no longer sees them.
2. Adopt shared modules, still in place: delete the local copy, add the import, apply the mechanical renames.
3. Splits. The line ranges in the audit and in this plan say WHICH declarations move. Find each declaration in the
   current working-tree file by its name (`grep -n "^const NAME\b"` and so on) and move THAT text: cut it out of the
   file and paste it into the new module, then add only imports/exports. Never fill a new module with
   `sed -n 'A,Bp' SPX/baseline/...`: that would resurrect what steps 1-2 removed or renamed.
4. Verify after each step:
   - `SPX/tools/lint.sh <your files and new files>`;
   - `node SPX/tools/changes.cjs <paths>` (NEW lines must be only imports, exports, hook/function wrappers and the
     edits listed in your section; REMOVED lines must be only the listed dead code and replaced duplicates);
   - for every module you created: compare it with the baseline range it came from (for example
     `diff <(sed -n 'A,Bp' SPX/baseline/<source>) <new module>`); the only differences allowed are the deltas of
     steps 1-2, the added imports/exports, and indentation forced by a changed wrapper line;
   - for every styles module you created:
     `NODE_PATH=SPX/tools/node_modules node SPX/plan/check-styles.cjs <module>` must print `ok`.
Stage-0 packages are different: they run before any edit, so they DO copy ranges from the baseline verbatim.

### G-6 Conventions for new files
- Location. Parts of a screen `frontend/screens/<File>.js` go to `frontend/screens/<lowerCamelName>/` when three or
  more files are extracted (precedent: `frontend/screens/feed/`); a lone styles file may sit next to the screen as
  `<File basename>.styles.js`. Parts of a component go next to it, or into a lower-camel sub-folder named after it
  when three or more files are extracted (`sections/progress/`, `1_Feed/feedPost/`). Never add an `index.js`
  barrel (a folder and a file share a stem in several places: `FeedHeader.js` + `FeedHeader/`).
- Names. Styles `<Name>.styles.js`; constants `<name>Constants.js`; pure helpers `<name>Utils.js`; hooks `useX.js`;
  components `PascalCase.js`.
- Exports. Component, hook and styles modules: one `export default`. Helper and constant modules: named exports
  only, no default aggregate object. Export only what an importer uses. A styles module that must also expose a
  constant exports it by name next to the default sheet.
- Imports. Grouped react, react-native, third-party, local; one statement per module; regroup only in files whose
  import block is being edited anyway. No extension in frontend imports. Keep the explicit `.js` extension in
  `shared/`, `backend/workouts/` and `functions/`. App.js lines 1-6 are never reordered.
- No import cycles: a new module never imports from the file it was extracted from (`import/no-cycle` must stay
  silent for new files). If a sub-component needs the parent's styles, the styles module is extracted first.
- Order inside a new module: keep the moved declarations in their original relative order. Anything a module-level
  expression evaluates at load time (the arguments of `StyleSheet.create`, a constant built from another constant)
  must be declared above it; a name used only inside a function body or as a default parameter value may be
  declared later.
- Style. 4-space indent in new files, except code moved from a 2-space file (keep the source indent; only
  dedent/indent what a changed wrapper line forces). A new file takes the quote style of its main source; when
  sources differ, quote-only conversion inside the NEW file is allowed and must be the only textual change.
- Moves are verbatim (hard rule 3). No "improvements" while moving.
- New files carry a one-line purpose comment at the top; no path comments.

### G-7 Package report
Every package ends with a short report: files edited and created; each approved fix applied (with file:line);
each accepted remount delta and each declare-before-use move applied; every listed item that was NOT done and why;
files that lost their last importer; the lint summary for the owned files (count per rule) and the
`changes.cjs` totals.

---------------------------------------------------------------------------------------------------------------------

## Shared modules

"Replace" = verified behaviour-identical by diffing the baseline bodies (re-run for this final plan); delete the
local copy and import the shared one under its canonical name. "Leave" = differs on a reachable input, or lives in
code this run does not touch; do not edit.

### SM-1 frontend/components/charts/chartMath.js (new, s0-charts)
Pure, no imports. Source of truth: PS.

| Export | Semantics | Source |
|---|---|---|
| `accentToRgba(accent, alpha)` | `rgba(r, g, b, a)` with alpha clamped to 0..1 | PS:104-108 |
| `formatVolumeValue(value)` | rounded, en-US grouped from 1000; `"0"` for non-finite or <= 0 | PS:489-498 |
| `buildChartSeries(chartData, axisMetrics, geometry)` | `{ points, linePath, areaPath, domain }` | PS:622-692 |
| `niceNumber(range, round)` | nice step size | PS:694-711 |
| `computeAxisMetrics(values, sections = 4)` | padded axis range and step (calls `niceNumber`) | PS:713-752 |
| `formatAxisValue(value)` | compact k/m tick label | PS:754-778 |
| `buildYTickValues(axisMetrics)` | `[]` for a falsy argument, else `sections + 1` tick values rounded to 2 decimals | body PS:1647-1653 |

- Replace: PS the six ranges above; ED accentToRgba 193-197, niceNumber 305-322, computeAxisMetrics 324-360,
  formatAxisValue 362-377, buildChartSeries 379-449; UP formatVolumeValue 257-266, niceNumber 278-295,
  computeAxisMetrics 297-336, buildChartSeries 338-399, formatAxisValue 401-425, accentToRgba 488-492.
  (ED's computeAxisMetrics/formatAxisValue are condensed spellings of the same statements; UP's buildChartSeries
  only lacks an unreachable guard and has a no-op `Math.max(yRange, 1)`.)
- Replace (buildYTickValues): the eight identical memo bodies PS:1646-1654, 1661-1669, 1676-1684, 1694-1702 and
  ED:1482-1490, 1500-1508, 1518-1526, 1536-1546. Each becomes one line that keeps its `useMemo` and its array, for
  example `const yTickValues = useMemo(() => buildYTickValues(axisMetrics), [axisMetrics]);` and
  `const progressVolumeTicks = useMemo(() => buildYTickValues(progressVolumeAxisMetrics), [progressVolumeAxisMetrics]);`.
- Leave: `DEFAULT_X_AXIS_LABEL_COUNT`, `formatXAxisDateLabel`, `buildXAxisLabels` in ED 265-303, PS 580-620 and
  UP 17, 427-453 (ED returns '' for timestamp <= 0, PS formats it, UP always uses 'MMM D' and 4 labels); the inner
  unclamped `accentToRgba` closure at UP:31 (inside UP's own ChartBubble); ED `formatNumberCompact`; every
  `METRIC_COLORS` / `CHART_ACCENTS`.

### SM-2 frontend/components/charts/ChartBubble.js (new, s0-charts)
`export default ChartBubble({ cx, cy, isActive, accent })`; text PS:110-151 (keep its comment). The only
non-verbatim edit: the default `accent = CHART_ACCENTS.standard` becomes `accent = DEFAULT_ACCENT`, with a module
constant `const DEFAULT_ACCENT = { r: 100, g: 160, b: 255 };` (the value of `.standard` at PS:89 and ED:187).
Imports `React`, `{ Circle, G }` from react-native-svg, `{ scaleSize }` from `../2_Competition/layoutConstants`
(NOT helper/scaleSize), `{ accentToRgba }` from `./chartMath`.
- Replace: PS:110-151, ED:451-492. Leave: UP:25-61 (different default accent, unclamped alpha).

### SM-3 frontend/components/charts/PointerBubbleCard.js (new, s0-charts)
`export default PointerBubbleCard({ children, accent, label, isRightAligned, accessibilityLabel })`.
Component text PS:153-217; the only non-verbatim edit is the default at PS:155: `accent = CHART_ACCENTS.standard`
becomes `accent = DEFAULT_ACCENT` (same constant value as SM-2, declared in this file). Its six styles
(`pointerBubbleGlow`, `pointerBubbleHeaderRow`, `pointerBubbleAccentDot`, `pointerBubbleHeaderLabel`,
`pointerBubbleHeaderDivider`, `pointerBubbleBody`) are PS:4454-4487 in a local `const styles = StyleSheet.create({...})`
so the JSX stays byte-identical. Imports `React`, `{ StyleSheet, Text, View }`, `{ chartPointerStyles }` from
`./chartStyles`, `{ scaleSize, ts }` from `../2_Competition/layoutConstants`, `{ accentToRgba }` from `./chartMath`.
- Replace: PS:153-217 and the six keys PS:4454-4487; UP:502-560 and the six keys UP:1485-1518. The two components
  differ only in the fallback accent (PS: default parameter, UP: `accent || CHART_ACCENTS.volume`); the styles are
  byte-identical and both files take `scaleSize`/`ts` from layoutConstants. PS callers always pass an accent. UP's
  three call sites (UP:572, 637, 703) change `accent={accent}` to `accent={accent || CHART_ACCENTS.volume}`, which
  reproduces UP's fallback exactly.
- Leave: the pointer LABEL components (`VolumePointerLabel`, `RepsPointerLabel`, `PersonalRecordPointerLabel`,
  `PointerLabelBubble`) of PS and UP: they differ (accent prop, timestamp format, `canNavigate`, memoisation, one
  style value).

### SM-4 frontend/utils/date.js (extended, s0-feed-workout-utils)
| Export | Semantics | Source |
|---|---|---|
| `toMillisSafe(value)` (new) | strict coercion (number, Date, Timestamp, `toDate`, `{seconds}`, `{_seconds}`, numeric or date string) to epoch ms; 0 on failure | ED:199-243 verbatim (single quotes, matches the file) |
| `formatClockTime(seconds)` (new) | `m:ss`, floor, clamp at 0 | SFP:130-135 verbatim |
| `toMillis(value)` (existing, unchanged) | lenient coercion; the canonical home of the lenient family | date.js:6-18 |

Both new exports are appended at the end of the file so existing line numbers do not move.
- toMillisSafe. Replace: ED:199-243, PS:219-262, UP:63-106 (three spellings of the same statements). Leave: the
  nested one in MGE:223-253, frontend/utils/livePostMeta.js:1-27 (returns null), frontend/helper/feedRanking.js:1-16
  (CommonJS, node test), functions/index.js:3553, every `toMillis` not named below.
  Recorded decision (added after the s0-feed-workout-utils review): "the same statements" holds for every input
  the app can produce, not for every input. The shared (ED) body ends its string branch with
  `new Date(trimmed).getTime()`; the PS:219-262 / UP:63-106 bodies use `Date.parse(trimmed)`. The three return the
  same value for every input except, under Hermes only (Hermes `Date.parse` does not TimeClip; on V8/Node the three
  are identical), a date STRING whose instant is outside +/-8.64e15 ms (extended year above +275760 or below
  -271821): PS/UP return the out-of-range number, the shared function returns 0. The same input reaches
  `resolveWorkoutTimestamp` (SM-8) through a `created` string of that kind. No app code path writes such a string
  (`created` / `createdAt` are written as `Date.now()` numbers or Firestore Timestamps, and `Date#toISOString`
  cannot emit an out-of-range instant), so the stage-1 replacement in PS and UP stands. date.js keeps ED:199-243
  verbatim (switching it to `Date.parse` would break identity with ED instead).
- formatClockTime. Replace: SFP:130-135, PUO:41-46, CB:29-34. Leave: PreviewPhoto.js:10 `formatDuration` (rounds),
  RestTimerModal.js:41 `formatTime`.
- toMillis. Replace the lenient copies with `import { toMillis } from ".../utils/date"`: UWM:37-44,
  frontend/hooks/useCommunityActivity.js:5-12, frontend/logic/communityStats.js:60-67; and in FEED replace line 44
  (`import { toMillis as toMillisSafe } from "../utils/friends";`) by `import { toMillis } from "../utils/date";`
  and rename the single call at FEED:856 to `toMillis(value)`. (The alias is dropped on purpose: date.js now also
  exports a different, strict `toMillisSafe`.) Recorded decision: date.js `toMillis` returns the same number for
  every input on which the old body returns; it differs only where the old body would THROW (a truthy non-function
  `toMillis` property, or a `toMillis()` that throws), which Firestore values never produce.
  Leave: useLiveFollowing.js:6-12 (no `.seconds` branch), SFP:61-73, PWS:51-80, PWP:39-45 (dead, deleted),
  GroupModal.js:24-30, userStatsUtils.js:53-66, estimateWorkoutCalories.js:66-85, favoriteFoods.js:32-52,
  NotificationsModal's local one (differs for Date instances), the chat variants, backend/ and functions/ copies.

### SM-5 frontend/utils/weightUnits.js (new, s0-weight)
Pure, no imports. Text WMS:33-58.
- `resolvePreferredWeightUnit(user)` -> "kg" | "lb". Replace: WMS:33-45, PS:264-276, MGE:86-98.
  Leave: ED:1086-1102 (global fallback, exact 'kg'), UP:244-255 (returns "lbs").
- `toDisplayWeightUnit(unit, fallback = "lbs")` -> "kg" | "lbs" | trimmed input | fallback. Replace: WMS:47-58,
  PS:278-289, MGE:100-111, ED:1104-1115. Leave: UP:494-500.
- Leave all five `formatWeightValue` functions (five behaviours).

### SM-6 frontend/utils/weightEntries.js (extended, s0-weight)
New named exports taken from WMS: `sanitizeEntries` (67-86), `normalizeEntryCollection` (106-113),
`selectWeightEntrySource` (115-132). Adds `import makeID from "../../backend/helper/makeID";`.
- Replace: WMS those three ranges; PS:351-370, 372-379, 381-403 (PS writes two `if`s with braces; same statements).
- Leave: `areEntriesEqual` (WMS:88-104, only user), `derivePublicWeightFields` and the rest of the file. Do not make
  frontend/utils/bodyweight.js import from this file (it is also loaded by backend code; KG_TO_LB stays duplicated).

### SM-7 frontend/components/2_Competition/AddMeasurementModal.js + AddMeasurementModal.styles.js (new, s0-weight)
- Component file: WMS:134-160 (`normalizeToMinute`, `clampDateToNow`, `mergeDateByMode`, module-private) and
  WMS:162-433 (`AddMeasurementModal`), `export default AddMeasurementModal`. Props unchanged:
  `isVisible, onDismiss, onSubmit, unit, isSaving, initialEntry, mode`.
- Styles file: the 31 keys WMS:923-1085 (`modalRoot` .. `iosPicker`) in one `StyleSheet.create`, default export;
  imports `Platform, StyleSheet`, `theme`, `{ scaleSize, ts }` from `./layoutConstants`.
- Replace: WMS 134-160, 162-433, 923-1085; PS 323-349, 1058-1329, 4500-4662. (PS differs only in two `useState`
  initialisers that evaluate to the same value, one `{ }` spacing, the order of the keys and the order of two
  properties inside `datetimeRow`; all 31 keys have equal values.)

### SM-8 frontend/utils/completedWorkouts.js (new, s0-feed-workout-utils)
- `sanitizeCompletedWorkouts(raw)` (PS:414-417). Replace: PS:414-417, ED:1065-1068, UP:118-121.
- `resolveWorkoutTimestamp(workout)` (PS:405-412, with module-private `WORKOUT_TIMESTAMP_FIELDS` PS:53; imports
  `toMillisSafe` from `./date`). Replace: PS:53 + 405-412, ED:159 + 1014-1021.
  Leave: UP:108-116, MGE:255-263, MacroTracking.js:135-152 (different field lists).

### SM-9 frontend/utils/workoutRouteParams.js (new, s0-feed-workout-utils)
- `sanitizeWorkoutForRoute(workout)`: JSON clone without functions; if serialisation throws, rebuilds each set as
  `{ ...rest, weight, reps, unit?, prev }`. Source FEED:274-313. Replace: FEED:274-313, USM:35-72, USD:101-140.
- `sanitizeWorkoutForRouteShallow(workout)`: same clone; if serialisation throws, shallow-copies the sets and drops
  `onComplete` / `onDelete`. Source PS:462-487. Replace: PS:462-487, ED:873-898; their single call sites (PS:2187,
  ED:2364) are renamed to `sanitizeWorkoutForRouteShallow({ ...workout, wid })`.
  The two differ only in that fallback and are deliberately NOT merged (Q30); a comment in the module says so.
- `sanitizeEntry(entry)`: JSON clone of one like/media entry, shallow copy on failure. Source FEED:1160-1167
  (dedented). Replace: the inline closure FEED:1160-1167, PWP:67-74, USD:92-99 (they differ only in the name of
  the replacer's parameter).

### SM-10 frontend/utils/feedItemUtils.js (new, s0-feed-workout-utils)
- `toNumber(value, fallback = 0)` (FEED:230-233). Replace: FEED:230-233, SFP:56-59, USD:87-90. (PWP:62-65 is dead
  and is deleted, not replaced.) Leave: backend/workouts copies (they get their own backend module, backend-shared),
  functions/ copies, the one-argument `toNumber` in workoutSummary.js / macroRecommendations.js /
  countCompletedWorkoutsWithExercise.js, the `safeNumber` / `normalizeNumber` variants.
- `ensureAtHandle(value)` (FEED:315-320). Replace: FEED:315-320, PWP:33-37 (same result for every input).
  Leave: USD:71-74 (returns '' for "@").
- `stringCandidates(values)` (PWP:76-85). Replace: PWP:76-85, USD:76-85.
- `extractPidFromWorkout(workout)` (PWP:131-136). Replace: PWP:131-136, USD:142-147.
- `buildEditPostPayload(latest, fallbackWorkout, pid)` -> `{ resolvedCaption, mediaEntries, editingPayload }` where
  `editingPayload = { pid, caption: resolvedCaption, mediaEntries, workoutName }`. Body = FEED:977-1056 verbatim
  (the `resolvedCaption` IIFE, the `mediaEntries`/`seen` loops, the `workoutName` IIFE, the `editingPayload`
  literal) with exactly one substitution: `sourcePost.workout` -> `fallbackWorkout`. Replace: FEED:977-1056
  (`const { resolvedCaption, mediaEntries, editingPayload } = buildEditPostPayload(latest, sourcePost.workout, pid);`),
  PWP:738-811 and 816-821 (`..., resolved.workout, pid`; the three `shouldRefreshOnFocusRef` lines 812-814 stay in
  PWP, directly after the call), USD:585-664 (`..., item.workout, pid`). The fetch/merge of `latest` before it and
  the navigation after it differ per file and stay; the code after the block reads only the three returned names.
  In all three files the fallback object is guarded non-null a few lines above, so evaluating `.workout` eagerly
  is equivalent.
- Leave in place (not shared): `ensureHandle`, `normalizeMediaEntry`, `mergeMediaSources`, `extractWidFromWorkout`
  vs `extractWid`.

### SM-11 frontend/utils/livePostMeta.js (extended, s0-feed-workout-utils)
`export const isLivePostData = (post) => Boolean(post?.isLive || post?.liveWorkout || (typeof post?.pid === "string" && post.pid.startsWith("workout:live")));`
(the expression of FEED:1184-1188). The name is `isLivePostData`, not `isLivePost`: two consumers have a local
called `isLivePost`, and a same-named import would be shadowed and called before initialisation.
- Replace, with these exact results:
  - FEED:1184-1188 -> `const isLiveWorkoutPost = isLivePostData(post);`
  - SFP:283-289 -> `const isLivePost = useMemo(() => isLivePostData(data), [data?.isLive, data?.liveWorkout, data?.pid]);`
  - 1_Feed/Posts/hooks/usePostFooterInteractions.js:131-135 -> `const isLivePid = isLivePostData(data);` (extend
    the existing import at line 12 to `{ buildLivePostMetadata, isLivePostData }`).
- Leave: 1_Feed/Posts/PostFooter.js:79-83 (unreachable Explore code, G-4).

### SM-12 frontend/utils/muscleTierColors.js (extended, s0-feed-workout-utils)
`export const BODYGRAPH_OUTLINE_COLOR = "#40485c";`
- Replace: PS:102, SFP:45, PWS:39, FSC:60 (delete the local constant, import the shared one), and UP:16
  (`MUSCLE_OUTLINE_COLOR`: delete it and rename its two uses UP:1307, 1317 to `BODYGRAPH_OUTLINE_COLOR`).

### SM-13 frontend/helper/scaleSize.js (extended, s0-scale)
`scaleWidth375(n)` = `Math.round(n * (SCREEN_WIDTH / 375))`, written as `const SCALE_W375 = SCREEN_WIDTH / 375;`
plus `export const scaleWidth375 = (n) => Math.round(n * SCALE_W375);` (the same float operations as the copies;
they all read `Dimensions.get("window")` once at module load).
- Replace (delete the local definition, rename the calls per G-4):

  | File | Local definition | Calls renamed |
  |---|---|---|
  | frontend/screens/0.0_SignUp.js | 20-26 (`scaleSize`) | `scaleSize(` -> `scaleWidth375(` (32 calls) |
  | frontend/screens/0.1_LogIn.js | 20-26 (`scaleSize`) | `scaleSize(` -> `scaleWidth375(` (34 calls) |
  | frontend/screens/0.3_UserLogInCredentials.js | 12-16 (`scale`, `scaleSize`); line 10 keeps only `height: screenHeight` | `scaleSize(` -> `scaleWidth375(` (25 calls) |
  | frontend/components/ViewProfile/ViewProfileRowButtons.js | 12-17 (`scaleSize`) | `scaleSize(` -> `scaleWidth375(` (15 calls); `scaleSizeGlobal(` is untouched (`\b` does not match inside it) |
  | frontend/components/5_Profile/EditProfile/EditProfileModal.js | 12-17 (`wScale`) | `wScale(` -> `scaleWidth375(` (10 calls) |
  | PUO | 30-34 (`scale`, `scaleSize`; keep line 29, `screenWidth` is used at 203) | `scaleSize(` -> `scaleWidth375(` (61 calls) |
  | CB | 22-24 (`scaleSize`) | `scaleSize(` -> `scaleWidth375(` (46 calls) |
  | frontend/components/1_Feed/FeedHeader.js | 37-38 (`scale`, `s`; keep line 35-36) | `s(` -> `scaleWidth375(` (48 calls on 40 lines); the default `scaleSize(` calls of this file are untouched |

  Delete the definition BEFORE running the rename, so the `function scaleSize(` line is not renamed.
- Leave: frontend/theme/headerMetrics.js:11-12 (evaluated lazily inside `buildMetrics`),
  1_Feed/FeedHeader/ProfileCard.js:15-18 (degenerate; handled in feed-cards).

### SM-14 frontend/components/3_Workout/shared/workoutSetUtils.js (new, s0-workout-sets)
Pure, no imports (must stay free of react-native).
- `genId()` (NW/hooks/useWorkoutEditing.js:6). Replace: useWorkoutEditing.js:6, EWM:27. Leave: the inline 4-char
  ids at UWM:824, 832.
- `normalizePrevKeepZero(prev)` -> null for non-objects, else `{ weight, reps }` (zeros kept). Text
  useWorkoutEditing.js:8-14. Replace the five spellings and rename their calls:

  | File | Local definition | Calls -> `normalizePrevKeepZero(` |
  |---|---|---|
  | NW/hooks/useWorkoutEditing.js | `normalizePrev` 8-14 | lines 22, 39, 40, 114, 115 |
  | EWM | `sanitizePrev` 29-35 | line 43 |
  | AWM | `normalizePrevSetRow` 85-90 | lines 102, 110, 121 |
  | UWM | `normalizePrevPayload` 45-51 | lines 102, 829 |
  | NW/Tracking/ExerciseLog.js | `normalizePrevCandidate` 37-42 | lines 134, 140, 351 |

- `normalizePrevOrNull(value)` -> additionally null when weight and reps are both 0. Text NW/Tracking/SetRow.js:14-20.
  Replace: SetRow.js:14-20 (call at 30) and PWEL:11-17 (call at 55), both locally named `normalizePrev`; the calls
  become `normalizePrevOrNull(`.
- Leave: both `buildPreviousDisplay` (different number formatting), `sanitizeSet` vs `normalizeSet`.

### SM-15 frontend/components/3_Workout/shared/setTypePillStyles.js (new, s0-workout-sets)
`typePillBg(type)`, `typePillText(type)`, text NW/Tracking/SetRow.js:367-395 (SetRow's default branch). Imports
`StyleSheet`, `theme`, `{ normalizeSetType }` from `./setTypeUtils`. Not added to setTypeUtils.js (that file must
stay react-native free). Replace: SetRow.js:367-395, PWEL:363-390 (PWEL's default branch differs but is
unreachable: both functions are only called with a truthy normalised type, PWEL:148-149, and `normalizeSetType`
returns one of the five handled keys or null).

### SM-16 frontend/screens/handleForm.styles.js (new, s0-misc-shared)
Default-exported StyleSheet: frontend/screens/0.4_CreateUsername.js:149-256 verbatim plus ChangeName's one extra key
`inputIcon: { marginRight: scaleSize(8) }` (ChangeName.js:210-212). Replace: 0.4_CreateUsername.js:149-256,
ChangeUsername.js:132-239 (byte-identical), ChangeName.js:143-247 (differs only in that one key; the union sheet
is visually identical for all three, and every key has a user).

### SM-17 frontend/components/1_Feed/rankTierThemes.js (new, s0-misc-shared)
Pure data: FSC:88-247 verbatim (the six theme objects and `export const RANK_TIER_THEMES`), plus `export` on
`goldTheme`. Replace: FSC:88-247 (FSC imports both names and keeps `export { RANK_TIER_THEMES };` because PARKED
Podium.js and LeaderboardCard.js import it from FSC); the LIVE importers ProfileTop/ProfileRankBadge.js:5 and
2_Competition/LevelUpTransition.js:7 switch to the new module.

### SM-18 frontend/services/userProfileService.js (s0-misc-shared)
`export` is added to `function resolveHandle` (line 16). Replace: frontend/auth/appleAccount.js:9-22,
frontend/auth/googleAccount.js:7-20 (`HANDLE_FIELDS` + `resolveHandle`: same nine keys, same result for every
input; both files already import from this service).

### SM-19 Not shared, on purpose (same name, different behaviour)
`formatWeightValue` x5, `withAlpha` x4, `resolveWorkoutTimestamp` (UP/MGE/MacroTracking), `normalizeSavedExercises`
x3 and `savedExercisesSignature` x2 (compared against each other at runtime), `extractWid` vs
`extractWidFromWorkout`, `buildMetricDeltaDisplay` (default formatter differs; its unused `unitLabel` parameter
stays in both files), the pointer LABEL components (PS vs UP), UP's `ChartBubble`, `normalizeMediaEntry` x4,
`mediaSignatureFor` x2, `sendCheerEvent` x4, `deriveWorkoutIdentityKey` vs `workoutIdentityKey`, `coerceUid`
(frontend vs backend vs backend/user), `clamp` variants, `calculate1RM` (frontend vs backend), `getMacroCalories`
vs `macroCalories`, `parsePortion` vs `coercePortion`, `LockedView` x3, `Pfp` (CommentCard vs MessageCard vs the
Explore-only PostFooterInfoPanel), the two barcode scanners, both `ensureVideoAsset` functions, every
`findUserByHandle` / `normaliseHandle` in functions/ and backend/admin.

---------------------------------------------------------------------------------------------------------------------

## Stage-0 packages

Six packages. Their file sets are disjoint and none depends on another, so all six may run in parallel. Each one
copies text from SPX/baseline with `sed -n 'A,Bp'` (the working tree is identical at this point), adds only
imports/exports and the edits named below, and ends with:
- `SPX/tools/lint.sh <files>`: 0 errors, no unused import/variable/style in the files it created;
- `node SPX/tools/changes.cjs <paths>`: NEW lines are only header comments, imports, export lines/keywords and the
  edits named in the package; REMOVED lines only where the package says so (s0-scale);
- a diff of every moved block against its baseline range (identical apart from the named edits and dedenting).
No stage-0 package touches a consumer.

## Stage 0: s0-charts
Risk: low. Depends on: nothing.
Edits: none.
Creates: frontend/components/charts/chartMath.js, frontend/components/charts/ChartBubble.js,
frontend/components/charts/PointerBubbleCard.js.
Steps:
1. chartMath.js (SM-1): one-line header comment, then PS:104-108, 489-498, 622-692, 694-711, 713-752, 754-778 in
   that order, `export` added to each of the six declarations. Then `buildYTickValues`:
   `export const buildYTickValues = (axisMetrics) => {`, the seven lines PS:1647-1653 dedented by four spaces, `};`.
   No imports. Double quotes as in PS.
2. ChartBubble.js (SM-2): header comment, imports, `const DEFAULT_ACCENT = { r: 100, g: 160, b: 255 };`, PS:110-151
   with the one default changed, `export default ChartBubble;`.
3. PointerBubbleCard.js (SM-3): header comment, imports, `DEFAULT_ACCENT`, PS:153-217 with the one default changed
   (PS:155), `const styles = StyleSheet.create({` + PS:4454-4487 + `});`, `export default PointerBubbleCard;`.
Verify: besides the common checks, lint reports no unused style in PointerBubbleCard.js (its sheet is private to
the file, so ESLint covers it).
Leave alone: frontend/components/charts/chartStyles.js; PS, ED, UP (their copies go in stage 1).

## Stage 0: s0-weight
Risk: low. Depends on: nothing.
Edits: frontend/utils/weightEntries.js.
Creates: frontend/utils/weightUnits.js, frontend/components/2_Competition/AddMeasurementModal.js,
frontend/components/2_Competition/AddMeasurementModal.styles.js.
Steps:
1. weightUnits.js (SM-5): header comment, WMS:33-58 verbatim, `export` on both functions. No imports.
2. weightEntries.js (SM-6): insert `import makeID from "../../backend/helper/makeID";` and a blank line at the very
   top (every existing line moves down by 2); append WMS:67-86, 106-113, 115-132 (each with `export`) at the END of
   the file, after the existing default export object. Do not touch the existing code or the default export object
   (utils-logic cleans them in stage 1).
3. AddMeasurementModal.styles.js (SM-7): header comment; `import { Platform, StyleSheet } from "react-native";`,
   `import theme from "../../theme/mfpDark";`, `import { scaleSize, ts } from "./layoutConstants";` (drop any of
   these that lint reports unused); `const styles = StyleSheet.create({` + WMS:923-1085 + `});`;
   `export default styles;`.
4. AddMeasurementModal.js (SM-7): header comment; imports
   `React, { useCallback, useEffect, useMemo, useState }`; from react-native `Alert, Keyboard, KeyboardAvoidingView,
   Modal, Platform, Pressable, Text, TextInput, View`; `DateTimePicker, { DateTimePickerAndroid }` from
   "@react-native-community/datetimepicker"; `RNBounceable` from "@freakycoder/react-native-bounceable"; `dayjs`;
   `{ toDisplayWeightUnit }` from "../../utils/weightUnits"; `styles` from "./AddMeasurementModal.styles" (the local
   name stays `styles`, so the JSX is byte-identical). Then WMS:134-160 and WMS:162-433, then
   `export default AddMeasurementModal;`.
Verify: besides the common checks, every one of the 31 style keys is read by AddMeasurementModal.js
(`NODE_PATH=SPX/tools/node_modules node SPX/plan/check-styles.cjs
frontend/components/2_Competition/AddMeasurementModal.styles.js` prints `ok`).
Leave alone: WMS, PS, frontend/utils/bodyweight.js.

## Stage 0: s0-feed-workout-utils
Risk: low. Depends on: nothing.
Edits: frontend/utils/date.js, frontend/utils/livePostMeta.js, frontend/utils/muscleTierColors.js.
Creates: frontend/utils/completedWorkouts.js, frontend/utils/workoutRouteParams.js, frontend/utils/feedItemUtils.js.
Steps:
1. date.js (SM-4): append `toMillisSafe` (ED:199-243) and `formatClockTime` (SFP:130-135), each with `export`, at
   the end of the file. Nothing above them changes.
2. livePostMeta.js (SM-11): append `export const isLivePostData = ...` at the very end of the file (after the
   default export object, which is legal and keeps every existing line number). Do not touch the default export
   object (utils-logic removes it in stage 1). Do not name the export `isLivePost`.
3. muscleTierColors.js (SM-12): append `export const BODYGRAPH_OUTLINE_COLOR = "#40485c";` at the very end of the
   file (after the export list); do not edit the export list.
4. completedWorkouts.js (SM-8): header comment; `import { toMillisSafe } from "./date";`; PS:53 (module-private),
   PS:405-412 and PS:414-417 with `export` on the two functions.
5. workoutRouteParams.js (SM-9): header comment; FEED:274-313 (`export`); PS:462-487 renamed in its declaration
   line only to `sanitizeWorkoutForRouteShallow` (`export`), preceded by a comment saying the two differ only in
   the fallback taken when the workout cannot be JSON-serialised and are deliberately not merged; FEED:1160-1167
   dedented to module level (`export const sanitizeEntry`). No imports.
6. feedItemUtils.js (SM-10): header comment; FEED:230-233, FEED:315-320, PWP:76-85, PWP:131-136 (the two PWP ranges
   converted quote-only to double quotes), each with `export`; then `buildEditPostPayload`:
   `export const buildEditPostPayload = (latest, fallbackWorkout, pid) => {`, FEED:977-1056 dedented by four
   spaces with the single substitution `sourcePost.workout` -> `fallbackWorkout`,
   `return { resolvedCaption, mediaEntries, editingPayload };`, `};`. This is the only code in the package that is
   wrapped rather than moved. No imports.
Verify: besides the common checks, `node tests/feedRanking.test.js` still passes (it does not load these files; this
only confirms nothing else was touched), and `grep -n "isLivePost\b" frontend/utils/livePostMeta.js` prints nothing.
Leave alone: the existing bodies of the three edited files; FEED, PS, ED, SFP, PWP, USD, USM.

## Stage 0: s0-scale
Risk: low-medium (removes exports; verified for this plan that nothing imports them: the only importers of
utils/scale take `ss`, and no file imports `hs`, `vs`, `ms`, `scaleFactors` or `scaleSizeWorklet`).
Depends on: nothing.
Edits: frontend/helper/scaleSize.js, frontend/utils/scale.js.
Creates: none.
Steps:
1. scaleSize.js (SM-13): add `const SCALE_W375 = SCREEN_WIDTH / 375;` next to the other factors and
   `export const scaleWidth375 = (n) => Math.round(n * SCALE_W375);` after the default `scaleSize`. Remove the unused
   `PixelRatio` import, `hs`, `vs`, `ms`, `scaleSizeWorklet` (with its comment) and `scaleFactors` (with its
   comment); drop the comment line 39 that contradicts the code. Keep `BASE_WIDTH`, `BASE_HEIGHT`, the default
   export, `ss`, `rs`, `ts` (App.js imports `rs`/`ts`; PARKED files use the default and `require(...).ts`), the
   `'worklet'` directives, the 2-space indent.
2. utils/scale.js: reduce the re-export list to `export { ss } from "../helper/scaleSize";`. `ss` is the only name
   any importer takes through this path. Importers today: ConfirmWorkoutModal.js (moves off it in stage 1),
   SpectatingWorkoutModal.js (frozen by X-3, keeps importing `ss` from here) and DEAD WorkoutReminderModal.js.
3. Verify: `grep -rnE "\b(scaleFactors|scaleSizeWorklet)\b" App.js frontend backend` prints nothing;
   `grep -rnE "utils/scale[\"']" frontend` lists only the three importers named above; lint reports no
   `import/named` error anywhere under App.js and frontend (an AST scan of the baseline found `hs`, `vs`, `ms` and
   `scaleFactors` imported by utils/scale.js only).
Leave alone: every consumer of either file.

## Stage 0: s0-workout-sets
Risk: low. Depends on: nothing.
Edits: none.
Creates: frontend/components/3_Workout/shared/workoutSetUtils.js,
frontend/components/3_Workout/shared/setTypePillStyles.js.
Steps:
1. workoutSetUtils.js (SM-14): header comment; NW/hooks/useWorkoutEditing.js:6 (`export const genId`);
   useWorkoutEditing.js:8-14 with the declaration renamed to `export const normalizePrevKeepZero`;
   NW/Tracking/SetRow.js:14-20 with the declaration renamed to `export const normalizePrevOrNull`. Bodies verbatim.
   No imports. 4-space indent, double quotes.
2. setTypePillStyles.js (SM-15): header comment; `import { StyleSheet } from "react-native";`,
   `import theme from "../../../theme/mfpDark";`, `import { normalizeSetType } from "./setTypeUtils";`;
   SetRow.js:367-395 with `export` on both functions.
Verify: the common checks; workoutSetUtils.js has no import statement at all; `diff` of each body against its
baseline range shows only the renamed declaration line and the `export` keyword.
Leave alone: setTypeUtils.js, workoutTypography.js, every consumer.

## Stage 0: s0-misc-shared
Risk: low. Depends on: nothing.
Edits: frontend/services/userProfileService.js.
Creates: frontend/screens/handleForm.styles.js, frontend/components/1_Feed/rankTierThemes.js.
Steps:
1. userProfileService.js:16 (SM-18): `function resolveHandle` -> `export function resolveHandle`. Nothing else.
2. handleForm.styles.js (SM-16): header comment; `import { StyleSheet } from 'react-native';`,
   `import theme from '../theme/mfpDark';`, `import scaleSize from '../helper/scaleSize';`;
   0.4_CreateUsername.js:149-256 verbatim (2-space indent and single quotes of the source) with ChangeName's
   `inputIcon` key (ChangeName.js:210-212) inserted directly after `usernamePrefix`; `export default styles;`.
3. rankTierThemes.js (SM-17): header comment; FSC:88-247 verbatim; add `export` to `const goldTheme`. No imports.
Verify: the common checks; `diff SPX/baseline/frontend/services/userProfileService.js
frontend/services/userProfileService.js` shows one changed line;
`diff <(sed -n '149,256p' SPX/baseline/frontend/screens/0.4_CreateUsername.js) frontend/screens/handleForm.styles.js`
shows only the header, the imports, the inserted `inputIcon` key and the export line; the same for FSC:88-247 against
rankTierThemes.js (header comment and one `export` keyword).
Leave alone: the rest of userProfileService.js (app-shell cleans it in stage 1); FSC, the three screens, the two
auth files.

---------------------------------------------------------------------------------------------------------------------

## Cross-partition pairings

### X-1 Independent-safe pairs (each side does its half in stage 1, in any order; each half is harmless alone)
| Topic | Side A | Side B |
|---|---|---|
| FeedHeader ignored props `workout`, `timerRef`, `openCurrentWorkout` | feed-cards deletes the unused destructuring (FeedHeader.js:589-592) | feed-screen stops passing them (FEED:1408-1409, deps 1419, destructure 357-362) |
| FeedSnapshotCard `onPressOverall` | feed-cards drops the unread prop | feed-screen stops passing it and deletes `handleOpenProgress` / `handleOpenUserStats` when lint then reports them unused |
| FeedHeader/ProfileCard `query` | feed-cards drops the unread prop | feed-screen drops `query={qStr}` (SearchUsers.js:240) |
| SimpleFeedPost `onPressShare` | feed-post drops the inert prop and the `onPressShareButton` argument | feed-cards (PostListItem.js:11, 43-47, 83) and profile (PWP:951) stop passing it; feed-screen keeps `openShareModal` unless lint reports it unused |
| NoInternet `onRetry`, `networkType`, `lastChecked` | auth-onboarding drops them from the component | app-shell stops passing them and deletes the state that only fed them |
| MacroDayPage/MealsSection `collapsed`, `toggleMeal` | macro-components stops reading/forwarding and drops the two comparator terms | macro-screens stops passing and deletes `collapsedMeals`, `toggleMealCollapse`, the `LayoutAnimation` import |
| MacroGoalsSheet `onOpenPersonalInfo` | (already ignored) | macro-screens deletes the prop, `personalSheetIndex` and the never-opening `<PersonalInfoSheet>` block; the component file stays (PARKED user) |
| UnderMealList `compact` | macro-components drops `compact` from MealsSection and MealItemCard | app-shell drops it from UnderMealList.js |
| ExerciseLog `muscle`, `showOptionsTriggerIcon` | workout-tracking drops them from the destructuring and from `areEqual` | workout-active stops passing them (AWM, EWM) |
| `useRestTimer().setCountdown` | workout-rest removes it from the return object | workout-active removes it from the destructure (AWM:366) |
| SelectExerciseModal `userWorkoutStats` | (never accepted) | workout-active deletes the prop at AWM:1635 |
| `useWorkoutManager` return and `navigation` param | workout-active removes `postWorkout`, the `completedWorkout` state and the param | workout-rest stops destructuring `isNewWorkoutVisible` and stops passing `navigation` |
| ReportContentSheet `onSubmit` | common-components removes the prop and always calls `reportContentHelper` | helpers-hooks removes the hook's `options` parameter and the prop pass |
| useAuthProviderFlow `pendingSocialAuth` | helpers-hooks deletes the dead branch | auth-onboarding deletes the dead branch in 0.4_CreateUsername.js |
| `toExerciseSlug` import path | ladder-and-weight imports it from `components/common/exerciseImageMap` in MGE:19 | common-components shrinks ExerciseAvatar.js:8 to `export { toExerciseSlug } from "./exerciseImageMap";` (keeps that one name) |
| `computeGlobalRanks` dead computation | functions-index removes it from functions/index.js | functions-scripts removes it from functions/scripts/simulateLeaderboardLastRanksRefresh.js; the backend/admin copy is untouched |
| Workout viewer chain | user-stats removes the dead viewer overlay from USM | profile removes the dead openers/state/mounts from both profile screens (X-3) |

### X-2 Deferred removals (NOT in this run; listed in the final report as follow-ups)
- `frontend/state/workoutStore.js` `timer` / `setTimer` and UWM `setTimerString` (the per-second store write may be
  what re-renders some subscriber; needs a device check).
- `export { MFP_DARK }` in frontend/theme/mfpDark.js (after macro-components stops using `require(...).MFP_DARK`).
- The default export of frontend/utils/pickAndUploadProfilePhoto.js (after profile deletes its dead default import).
- The remaining `toExerciseSlug` re-export in ExerciseAvatar.js.
- `rs` alias in helper/scaleSize.js (App.js still imports it).
- The in-screen `<Footer>` renders, `isOverlay`, `global.__USE_GLOBAL_FOOTER` (Q8).
- Footer / ActiveWorkoutBottomSheet props `isHiddenByFocus`, `hideForFocus`, `overlayProgressSV` (worklet edits).
- `MacroTracking.js` `PlusIcon` prop drilling.
- `this_user` first parameter of the seven backend/user actions.
- WorkoutExperiencePortal `enabled` prop and `persistWorkout` handler; the write-only `setIsVisible` chain.
- The six viewer style keys and two `HANDLE_FRIEND_*` constants of UserStats/UserStatsStyles.js (they go together
  with UserStatsWorkoutViewerScreen.js, Q4).
- The Tier-1 items of the unreachable Explore code that delete hooks, effects or JSX (feed-social #19, part of #21, #23,
  #24, #26, #27; feed-screen `large`, `styles.searchBar` prop, `posts.length < 6`, `userData`, `onSwipeUnfocus`), Q5.

### X-3 Unreachable workout-viewer chain
`openViewer` (4.1_ViewProfile.js:152) and `openWorkoutViewer` (5_Profile.js:47) have had no caller for several
commits, and USM's `viewerOpen` is only ever set to false. profile and user-stats therefore remove their dead
openers, state and mounts. Consequence: FeedWorkoutViewerSheet.js, CopyTemplateToast.js,
UserStatsWorkoutViewerScreen.js and SpectatingWorkoutModal.js lose their last LIVE importer. Those four files are
FROZEN: nobody edits them in this run (feed-post, workout-rest, user-stats, workout-active leave them
byte-for-byte), and they stay loadable: what they import must keep working. In particular
- UserStats/UserStatsStyles.js keeps the keys `workoutOverlay`, `viewerHandleWrap`, `viewerHandleIndicator`,
  `lockedWrap`, `lockedTitle`, `lockedSubtitle`, the constants `HANDLE_FRIEND_ACCENT` / `HANDLE_FRIEND_BACKGROUND`
  and the named export `styles` (UserStatsWorkoutViewerScreen.js uses all of them);
- frontend/utils/scale.js keeps exporting `ss` (SpectatingWorkoutModal.js imports it).
The four files go on the "can be deleted" list as one group (Q4). Props and code paths in ExerciseLog /
GroupHeader / EditableStat that only the spectator used stay as they are.

---------------------------------------------------------------------------------------------------------------------

## Oversized files

Target: no file above roughly 500 lines where a clean seam exists; 800 lines is the level above which a file must
either be split or be listed here as an accepted exception. Baseline has 23 files above 800 lines. Sizes after the
run are estimates from the audits' own figures for the steps this plan accepts. A stage-2 reviewer treats a file
that ends more than about 15% above its estimate, or a file missing from this table that ends above 800 lines, as
under-delivery.

| File | Baseline | After (est.) | Status |
|---|---|---|---|
| frontend/components/2_Competition/sections/ProgressSection.js | 4763 | ~2300 | ACCEPTED EXCEPTION. What stays is the component: four chart cards (PS:2852-4005) whose JSX holds the PanResponder layer, SVG gradient ids and per-card keys, and the four pointer clusters. Replacing the repeated card sub-blocks by components (`chartParts`) or the clusters by a hook is a rewrite of about 500 lines of JSX in four places with new prop plumbing, not a move; without pixel or device comparison it cannot be verified here. Follow-up with device QA. |
| frontend/screens/ExerciseDetail.js | 4688 | ~1800 | ACCEPTED EXCEPTION, same reason (the four scrub/pointer clusters, `renderProgress`, both effect chains). |
| functions/index.js | 4409 | ~4340 | ACCEPTED EXCEPTION: Cloud Functions cannot be executed or deployed from here; no module split without a deploy test. |
| frontend/components/1_Feed/SimpleFeedPost.js | 2500 | ~1150 | ACCEPTED EXCEPTION: the media carousel and video controls (state, three effects, `renderMediaItem` with 17 closures) stay. |
| NW/ActiveWorkoutModal.js | 2068 | ~1380 | ACCEPTED EXCEPTION: D1 items 6-7 (stateful hooks around cheer, keyboard and the sheet) are not done. |
| frontend/screens/1_Feed.js | 1949 | ~1200 | ACCEPTED EXCEPTION: the handler and subscription hooks of the central screen (D1 steps 6, 8, 9) are not done. |
| App.js | 1821 | ~1250 | ACCEPTED EXCEPTION: module start-up code, auth hydration effects and splash gating keep their order. |
| MakePost/PostUploadOptionsScreen.js | 1694 | ~1250 | ACCEPTED EXCEPTION: `sharePost`, the video controls and the caption logic stay (D.2 items 6-7 not done). |
| frontend/logic/useWorkoutManager.js | 1492 | ~1105 | ACCEPTED EXCEPTION: `finishWorkout` and the other ordered side-effect sequences stay; `buildRankPayload` stays in the file (Q1). |
| frontend/screens/ProfileWorkoutsAndPostsScreen.js | 1277 | ~850 | ACCEPTED EXCEPTION: D2 steps 4, 5, 7 (data hooks) are not done. |
| functions/shared/deleteUserAndContent.js | 1120 | 1120 | ACCEPTED EXCEPTION: account deletion code that cannot be run here. |
| frontend/screens/PastWorkoutScreen.js | 1494 | ~720 | below 800 (stage 1 and stage 2 items 4-5). |
| UserStats/UserStatsProgressPreview.js | 1653 | ~300 | below 500. |
| 2_MacroTracking/FoodSearchOverlay.js | 1325 | ~775 | below 800; the scanner and the sheet logic stay together. |
| frontend/screens/FoodDetail.js | 1172 | ~440 | below 500. |
| 1_Feed/FeedSnapshotCard.js | 1092 | ~480 | below 500. |
| frontend/screens/WeightMeasurementsScreen.js | 1086 | ~390 | below 500. |
| frontend/screens/MacroTracking.js | 1041 | ~790 | below 800; the pager and day handlers stay. |
| 1_Feed/FeedHeader.js | 973 | <500 | below 500. |
| frontend/screens/1.2_Chat.js | 886 | ~780 | below 800; swipe gestures and the list builder stay. |
| MakePost/ClipBuilderScreen.js | 882 | ~570 | between 500 and 800. |
| frontend/helper/useFilteredFeed.js | 857 | ~590 | between 500 and 800; the main effect stays whole. |
| UserStats/UserStatsExerciseDetailScreen.js | 819 | ~600 | between 500 and 800 (D2 steps 2-3 not done). |

Files between 500 and 800 lines at baseline that are not split on purpose: 1_Feed/Posts/Post.js (754, unreachable
Explore code), functions/scripts/resetUserContentByHandle.js and functions/shared/namePropagation.js (cannot be
run), backend/workouts/updateCompletedWorkout.js (split by backend-shared D1). The others in that band are handled
in their partition sections.

---------------------------------------------------------------------------------------------------------------------

## Stage-1 partition notes

One section per partition. Each section amends the partition's audit: "accepted" items are done, everything listed
as not done stays byte-for-byte. "Stale lines: none" means the audit's line numbers are valid when stage 1 starts.

## Partition: screen-exercise-detail
File: ED. Stale lines: none.
- Adopt: chartMath (`accentToRgba`, `niceNumber`, `computeAxisMetrics`, `formatAxisValue`, `buildChartSeries`, and
  `buildYTickValues` inside the four existing memos ED:1482-1546, arrays unchanged), ChartBubble (SM-2),
  `toMillisSafe` (utils/date), `toDisplayWeightUnit` (utils/weightUnits), `sanitizeWorkoutForRouteShallow`
  (delete ED:873-898, rename the call at ED:2364), `sanitizeCompletedWorkouts`, `resolveWorkoutTimestamp` (delete
  ED:159 with it). Keep ED's own `formatXAxisDateLabel`, `buildXAxisLabels`, `DEFAULT_X_AXIS_LABEL_COUNT`,
  `resolvePreferredWeightUnit`, `formatWeightValue`, `METRIC_COLORS`, `CHART_ACCENTS`, the saved-exercise normaliser
  and signatures.
- Dead code: audit B1-B11. Delete styles by LINE NUMBER (the live Favorites button uses
  `shareButton/shareIcon/shareText`).
- NOT applied: B12. `buildMetricDeltaDisplay(delta, unitLabel, formatter = formatNumberCompact)` (ED:1117) and its
  four call sites (2220, 2233, 2246, 2259-2263) stay byte-for-byte: dropping the unused middle parameter shifts a
  positional argument at eight call sites in two files for no functional gain.
- Approved fixes: E1 (wrap the existing `exercisePersonalRecordEntries` expression in `useMemo` keyed on
  `rawExercisePersonalRecordEntries`) and F2 (destructure the three other entry arrays directly, delete
  1465-1467). F5 (hoist `buildMetricColors`) and F6 (inline `handleTabChange`) accepted. F3, F4, F7 not done.
- Structure (accepted): audit D phase 1 and phase 2 items 1-6 with the shared helpers coming from "Shared modules"
  instead; phase 3 item 7 (memo bodies as pure functions `buildHistorySessions`, `buildExerciseProgressEntries`;
  the `useMemo` calls and their arrays stay) and item 9 for `ExerciseAboutTab` and `ExerciseHistoryTab` only.
  Delete the dead style keys (B7/B8) before the StyleSheet is extracted (G-5).
- Not done: phase 3 item 8 (`useProgressMetricChart`), `ExerciseProgressTab`, item 10. The four scrub/pointer
  clusters, `renderProgress`, the pointer state and both effect chains stay in the screen, in today's order.
- Do not touch: effect order 2275 -> 2304 -> 2319, the two react-native `SafeAreaView`s and their `edges` prop,
  `completedWorkoutsSignature`, gradient ids, the `prs` metric key.
- Expected size: about 1,800 lines (accepted exception, see "Oversized files").
- New files: frontend/screens/exerciseDetail/ (ExerciseDetail.styles.js, exerciseDetailConstants.js,
  exerciseDetailUtils.js, exerciseStatsUtils.js, ExercisePointerLabels.js, ExerciseAboutTab.js,
  ExerciseHistoryTab.js).

## Partition: progress-section
File: PS. Stale lines: none.
- Adopt: chartMath (all seven exports; `buildYTickValues` inside the four existing memos PS:1646-1702, arrays
  unchanged), ChartBubble (SM-2), PointerBubbleCard (SM-3: delete PS:153-217 and the six keys PS:4454-4487),
  `toMillisSafe`, weightUnits (both), weightEntries (`sanitizeEntries`, `normalizeEntryCollection`,
  `selectWeightEntrySource`), AddMeasurementModal (delete PS:1058-1329, the date helpers 323-349 and the 31 style
  keys 4500-4662), `sanitizeWorkoutForRouteShallow` (delete PS:462-487, rename the call at PS:2187),
  `sanitizeCompletedWorkouts`, `resolveWorkoutTimestamp` (PS:53 goes with it), `BODYGRAPH_OUTLINE_COLOR` (add to
  the existing muscleTierColors import). Keep PS's own x-axis label helpers, `formatWeightValue`,
  `formatTimestamp`, the three `sanitize*Entries`, `METRIC_COLORS`, `CHART_ACCENTS`, `POINTER_PANEL_ACCENTS`, the
  four pointer label components.
- Dead code: audit B1 #1-#16 and B2 #17-#19 (ManageMeasurementsModal can never open; with it go its handlers,
  `entryToEdit`, the edit branch of `handleSubmitMeasurement`: keep only the `else` body and change nothing else in
  that handler). B3: #22, #24, #25, #28, #30 accepted. #23 is superseded (the `if (!axisMetrics) return [];` guard
  now lives once, inside `buildYTickValues`); #27 now lives in the shared helper (leave). Once ChartBubble and
  PointerBubbleCard have left the file, `CHART_ACCENTS.standard` (PS:89) has no reader: delete that one line.
- NOT applied: B3 #20 (the `unitLabel` parameter of `buildMetricDeltaDisplay`, PS:291, and its callers at 1514,
  1529, 1542-1546, 1621 stay byte-for-byte; the function moves verbatim), #21, #26, #29, #31-#34.
- Approved fixes: E1 (reorder only, see G-4: move 2430-2581 above 1788 and the three state/ref pairs 1847-1848,
  1902-1903, 1944-1945 next to 1441-1444), E4 (= B3 #25). E2 and E3 are open questions (Q11, Q10).
- Structure (accepted): audit D stage 1 with the shared pieces imported instead of created:
  progressConstants.js (`METRIC_COLORS` without the six dead lines, `CHART_ACCENTS`, `POINTER_PANEL_ACCENTS`),
  progressMetrics.js (`buildMetricDeltaDisplay`, `formatWeightValue`, `formatTimestamp`, the three
  `sanitize*Entries`, and PS's own x-axis helpers 580-620), PointerLabels.js with its 3 styles (it imports the
  shared PointerBubbleCard), ProgressSection.styles.js (delete the dead keys first, G-5). Stage 2 (= E1). From
  stage 4 only `BodyOverviewPager`, `MuscleGroupList`, `MetricToggleRow`; they import `styles` from
  ProgressSection.styles.js (the sheet is not split per component).
- Not done: stage 3 (geometry hoist into chartGeometry.js: none of the three accepted components reads a geometry
  value, so it would be an edit inside the most fragile component with no beneficiary), stage 4 `chartParts.js`,
  stage 5 `useChartPointer`, `useWeightEntryMutations`, adopting ED's `<= 0` guard. The three conditional metric
  cards, the weight card, the pointer state, the PanResponders and the show/hide pipeline stay in the parent
  byte-for-byte (apart from the E1 reorder and the one-line tick memos).
- Do not touch: props `scrollSignal` / `onScroll` and the `React.memo` default export, `persistEntries` write
  shape, `makeID()` inside the sanitizers, gradient ids, style-array order, the tuned pager styles.
- Expected size: about 2,300 lines (accepted exception, see "Oversized files").
- New files: frontend/components/2_Competition/sections/progress/ (progressConstants.js, progressMetrics.js,
  PointerLabels.js, ProgressSection.styles.js, BodyOverviewPager.js, MuscleGroupList.js, MetricToggleRow.js).

## Partition: ladder-and-weight
Files: LevelUpTransition, RankBadgeEmblem, layoutConstants, muscleGroupIconLayout, rankBadgeLevelHelpers,
ExercisesSection, 2_Competition.js, MGE, WMS. Stale lines: none.
- Adopt: WMS -> weightUnits (`resolvePreferredWeightUnit` only: the single `toDisplayWeightUnit` call, WMS:287, sits
  inside the modal that leaves the file), weightEntries (three helpers; keep `areEntriesEqual`, `formatWeightValue`,
  `makeID`), AddMeasurementModal (delete WMS:134-433 and the 31 style keys 923-1085). MGE -> weightUnits (both),
  `MUSCLE_ICON_HIGHLIGHT` / `_DIM` from muscleGroupIconLayout (B1 #11), `toExerciseSlug` from
  `../components/common/exerciseImageMap` (keep the default ExerciseAvatar import). LevelUpTransition ->
  `RANK_TIER_THEMES` from `../1_Feed/rankTierThemes` (one import per module; the FeedSnapshotCard default stays).
- Dead code: audit B1 #1-#13. B2: #18, #19, #21 accepted; #14-#17, #20 not applied (route-param fallbacks and theme
  fallbacks stay). Everything in B3 stays (Compete restore path).
- Approved fixes: none. E1 (missing `completedWorkouts` dependency) and E2 (double dequeue) are open questions
  (Q9, Q7).
- Structure (accepted): D1 (LevelUpTransition.styles.js); D2 steps 1-4 (ladderQuestFormat.js, QuestRing.js,
  ExercisesSection.styles.js, LadderQuestPanel.js with the IIFE body verbatim); D3 steps 1-3; D4 step 5
  (styles). F2 (hoist the MGE separator; accepted remount delta, G-4).
- Not done: D4 step 4 hook; `clampRatio` export; touching `layoutConstants.scaleSize`; unifying MGE's stale icon
  tables; dropping `showRankTabs` / `forceTabKey` at the FeedSnapshotCard call sites; F6, F7, F13.
- Do not touch: the commented Compete block and everything that keeps it restorable, the tab animation refs, the
  ladder scroll loop (ExercisesSection 269-351), `buildSparklinePath` internals (move verbatim only), the exports
  of muscleGroupIconLayout.js and layoutConstants.js (other partitions import them).
- New files: frontend/components/2_Competition/LevelUpTransition.styles.js;
  frontend/components/2_Competition/sections/{ladderQuestFormat.js, QuestRing.js, LadderQuestPanel.js,
  ExercisesSection.styles.js}; frontend/screens/muscleGroupExercises/ (muscleGroupExercisesUtils.js,
  muscleGroupSparkline.js, MuscleGroupExercises.styles.js); frontend/screens/WeightMeasurementsScreen.styles.js.

## Partition: user-stats
Stale lines: none.
- UserStatsWorkoutViewerScreen.js: do not edit (X-3). It becomes unreferenced and must stay loadable.
- Adopt: UP -> chartMath (`accentToRgba`, `niceNumber`, `computeAxisMetrics`, `formatAxisValue`,
  `buildChartSeries`, `formatVolumeValue`), `toMillisSafe`, `sanitizeCompletedWorkouts`, `BODYGRAPH_OUTLINE_COLOR`
  (delete UP:16, rename the uses at UP:1307, 1317), PointerBubbleCard (SM-3: delete UP:502-560 and the six keys
  UP:1485-1518; the three call sites UP:572, 637, 703 pass `accent={accent || CHART_ACCENTS.volume}`).
  USM and USD -> `sanitizeWorkoutForRoute` (workoutRouteParams). USD -> `toNumber`, `stringCandidates`,
  `extractPidFromWorkout`, `buildEditPostPayload` (feedItemUtils), `sanitizeEntry` (workoutRouteParams).
  UP keeps its own ChartBubble (with its inner `accentToRgba`), the three pointer labels, x-axis labels, unit
  helpers, `resolveWorkoutTimestamp`, the three entry sanitizers. USD keeps `ensureHandle`, `ensureAtHandle`,
  `normalizeMediaEntry`, `mergeMediaSources`.
- Dead code: audit B1 (first two rows only), B2, B3, B4, B5, B6 (incl. the viewer overlay, X-3), B7, B10, and B8
  WITH THIS EXCEPTION: UserStatsStyles.js keeps the six viewer keys (`workoutOverlay`, `viewerHandleWrap`,
  `viewerHandleIndicator`, `lockedWrap`, `lockedTitle`, `lockedSubtitle`), the constants `HANDLE_FRIEND_ACCENT` /
  `HANDLE_FRIEND_BACKGROUND` with their export-list entries, and the named export `styles`. The default export may
  go (no importer uses it). HexagonalStats: `scaledSize(` -> `scaleSize(` (G-4). Keep the `scaledSize` export of
  UserStatsStyles and its uses in USD, UserStatsExerciseCard and USM.
- Approved fixes: E1 by moving `findWorkoutByWid` (USM:308-334) above line 206 (G-4 table; name the extra re-run
  condition in the report). E2 and E3 are open questions (Q9).
- Structure (accepted): D1 steps 1-4 with the shared pieces imported instead of moved
  (UserStatsProgressPreview.styles.js; userStatsChartUtils.js only for what is not shared;
  UserStatsChartPointers.js with the three pointer labels; UserStatsChartCard.js with UP's ChartBubble and
  ChartCard); D2 step 1 (userStatsDetailUtils.js incl. `buildFeedItem` as a plain function; the helpers that are
  now shared are imported, not moved; the dependency array at USD:411 is left exactly as it is); D3 step 0 and
  step 1; D4 as written minus the exception above. F1 (backdrop hoist in UserStatsAfterWorkoutSheet; accepted
  remount delta, G-4), F2, F3, F5 (the two constants only; `sortWorkouts` stays a hook), F6, C8 accepted.
- Not done: D2 steps 2-3 (`useExercisePosts`, `userStatsDetailActions`), D3 steps 2-4; removing HexagonalStats'
  unused props; touching the reanimated reactions, the gesture worklets, the `key={tick}` contract; F4 beyond the
  mechanical rename; F8, F10.
- Every new file keeps importing `scaleSize` / `ts` from `../layoutConstants`, never from helper/scaleSize.
- New files: frontend/components/2_Competition/UserStats/ (UserStatsProgressPreview.styles.js,
  userStatsChartUtils.js, UserStatsChartPointers.js, UserStatsChartCard.js, userStatsDetailUtils.js).

## Partition: feed-screen
Stale lines: none.
- Adopt: FEED -> `toNumber`, `ensureAtHandle`, `buildEditPostPayload` (feedItemUtils); `sanitizeWorkoutForRoute`,
  `sanitizeEntry` (workoutRouteParams; delete the inline closure FEED:1160-1167); `isLivePostData`
  (FEED:1184-1188 -> `const isLiveWorkoutPost = isLivePostData(post);`); `toMillis` (FEED:44 becomes
  `import { toMillis } from "../utils/date";` and FEED:856 becomes `const ms = toMillis(value);`; this call is the
  only non-import edit of that adoption). useFilteredFeed -> `FEED_CACHE_PREFIX` exported from feedCache.js (both
  files are yours).
- Dead code: FEED B1-B8. The pairings of X-1. useFeedUserData: delete the header timer (`headerTimerRef`,
  `headerTimerIdRef`, `toMillis`, the interval effect, the import) but KEEP the `activeWorkout` state and its
  setter (write it as `const [, setActiveWorkout] = ...` with a one-line why-comment: the re-render is what makes
  the Feed re-read `global.userData`). usePersonalizedFeed (`trendingLoading`, the two unread return fields),
  FeedFocusContext (the three unused exports; `defaultValue` and the default export stay), feedCache default
  export, feedRanking (drop `toMillisSafe` from `module.exports` only; the file stays CommonJS), feedSignals,
  Notifications.js.
- Explore files (4_Explore.js, components/4_Explore/*), per G-4 only: SearchBarComponent.js unused `Text` import
  and the stale comments (15, 16, 23, 240); UserCard.js `screenHeight`, `Dimensions`, the three unused style keys;
  ExpandedExploreList.js stale comments (17, 19, 101); the `scaledSize` forwarders of SearchBarComponent.js and
  UserCard.js (mechanical rename). Nothing else in these five files.
- NOT applied: FEED B9 (dependency array), B10, B11; `toStringUid`, the unreachable branch of
  `syncLiveSubscriptions`, usePersonalizedFeed line 27; the other Explore rows of the audit (X-2).
- Approved fixes: E3 (useFilteredFeed: declare `recomputeFeed`, `ensureHandle`, `buildLiveFeedEntry` before
  `updateLiveEntryForUid`; hoist the two pure ones; G-4 table). F4 (SearchUsers separator; accepted remount delta).
- NOT approved: E1, E2 (the two declaration-order bugs in FEED stay: lines 406-436, 454-460 and 493 keep their
  relative order, Q2), E4-E8, F3, F6.
- Structure (accepted): FEED D1 steps 1 (feedDayKeys.js), 2 (feedRankUtils.js), 4 (Feed.styles.js; delete B5's
  dead key first), 5 (FeedCreatePostMenu), 7 (useCollapsibleFeedHeader); useFilteredFeed D2 steps 1-3.
- Not done: D1 steps 6, 8, 9 (handler and subscription hooks in the central screen); sharing `buildRankSnapshot`
  with userDataEvents; the eight-assignment `global.userData` patch helper; removing the Explore route or fixing
  its bugs.
- Do not touch: the FlatList wiring, scroll restore globals and timers, the main effect of useFilteredFeed and its
  array, AsyncStorage key `feed-cache:v2:`.
- Expected size: 1_Feed.js about 1,200 lines (accepted exception); useFilteredFeed.js about 590.
- New files: frontend/screens/feed/ (feedDayKeys.js, feedRankUtils.js, Feed.styles.js,
  hooks/useCollapsibleFeedHeader.js), frontend/components/1_Feed/FeedCreatePostMenu.js,
  frontend/helper/filteredFeedUtils.js.

## Partition: feed-post
Files: PWEL, SFP, FeedWorkoutViewerSheet, PWS. Stale lines: none.
- FeedWorkoutViewerSheet.js: do not edit (X-3). Skip the audit's B4.
- Adopt: SFP -> `toNumber` (feedItemUtils), `formatClockTime` (utils/date), `BODYGRAPH_OUTLINE_COLOR`, and
  `isLivePostData`: SFP:283-289 becomes exactly
  `const isLivePost = useMemo(() => isLivePostData(data), [data?.isLive, data?.liveWorkout, data?.pid]);`
  (the local keeps its name `isLivePost`; never import anything under that name into this file).
  PWS -> `BODYGRAPH_OUTLINE_COLOR`. PWEL -> `normalizePrevOrNull` (delete PWEL:11-17, rename the call at PWEL:55),
  `typePillBg`, `typePillText` (setTypePillStyles).
- Dead code: B1 (#12, #13 accepted; #15 not applied), B2 (#9 accepted; #10, #11 not applied), B3 #1.
- Approved fixes: E1 (delete the reference to the non-existent `styles.metricValueText` and the unused
  `recordsValueText` key; do not swap one for the other); E2 (a) only: move SFP:550-605 above 503 (G-4 table).
- NOT applied: E2 (b)/(c). `openReportOptions` (SFP:705-708) and `handleReportPost` (SFP:729-744) stay above the
  declarations of `reportHandle` (1059-1062), `postOwnerUid` (1077-1091) and `isViewerOwner` (1121). No extraction
  may change that relative order: the five report callbacks SFP:705-750 are not moved into a hook, and the three
  declarations are not moved above them (Q34). E3-E6 are not touched.
- Structure (accepted): SFP stage 1 (SimpleFeedPost.styles.js after the B1 deletions, feedPost/feedPostUtils.js,
  feedPost/OptionsWeightIcon.js), stage 2 (the four hooks, each called at the position the audit names), stage 3
  (FeedPostOptionsModals.js, FeedPostWorkoutMetrics.js). The helpers shared by SFP and PWS (C1:
  `MUSCLE_HIGHLIGHT`, `MUSCLE_SEGMENTS`, `formatDuration`, `formatNumber`, `resolveWorkoutTitle`,
  `resolveWeightUnit`, `initialsFrom`) go to frontend/components/1_Feed/workoutDisplay.js, not to frontend/utils;
  the outline colour comes from muscleTierColors. PWS stage 1 (PastWorkoutScreen.styles.js,
  pastWorkout/pastWorkoutUtils.js) and PWS stage 2 items 4-5 (`usePastWorkoutCheer`, `useSaveEditedWorkout`:
  statement moves into a hook body, no effects inside; each hook is called where its first statement sits today).
- Not done: the media carousel / video-controls extraction and the shared hook with PUO; `useConfettiCannon`;
  `resolveWorkedSegments`; PWS item 6; a custom memo comparator.
- Expected size: SimpleFeedPost.js about 1,150 lines (accepted exception); PastWorkoutScreen.js about 720.
- New files: frontend/components/1_Feed/SimpleFeedPost.styles.js, frontend/components/1_Feed/workoutDisplay.js,
  frontend/components/1_Feed/feedPost/ (feedPostUtils.js, OptionsWeightIcon.js, useFeedPostCheer.js,
  useFeedPostLikes.js, useLiveWorkoutDuration.js, useFeedPostDelete.js, FeedPostOptionsModals.js,
  FeedPostWorkoutMetrics.js), frontend/screens/PastWorkoutScreen.styles.js,
  frontend/screens/pastWorkout/ (pastWorkoutUtils.js, usePastWorkoutCheer.js, useSaveEditedWorkout.js).

## Partition: feed-cards
Stale lines: none.
- Adopt: FSC -> import `{ RANK_TIER_THEMES, goldTheme }` from `./rankTierThemes`, delete FSC:88-247, keep
  `export { RANK_TIER_THEMES };` (PARKED importers); `BODYGRAPH_OUTLINE_COLOR` (extend the muscleTierColors import
  at FSC:15, delete FSC:60). FeedHeader -> `scaleWidth375` (SM-13: delete lines 37-38, rename `s(`).
- Dead code: all T1 (B.1, B.3, B.5; `fallbackSuggestions` deps become `[]` because the state it listed is
  deleted). T2 (B.2, B.4) stays. FSC `scaled(` -> `scaleSize(` (G-4). FeedHeader/ProfileCard.js: `avatarSize = 44`.
  PostListItem: stop passing `onPressShare` (keep the `openShareModal` prop it receives unless lint reports it
  unused). The pairings of X-1.
- Order (G-5): delete the dead FSC style keys (1001-1091 region) and run the `scaled(` rename BEFORE extracting
  FeedSnapshotCard.styles.js; run the `s(` rename before extracting FeedHeader.styles.js.
- Structure (accepted): D.1 FeedSnapshotCard.styles.js; D.2 FeedHeader.styles.js (exports default styles plus
  `METRICS`, `dynamicStyles`), FeedHeader/FeedScopeSelector.js, FeedHeader/SearchUsersBar.js. Never add
  FeedHeader/index.js.
- Not done: extracting the particle/pulse animation; `getViewerBlockedByUids`; C.3, C.11; merging header METRICS
  with theme/headerMetrics.
- New files: frontend/components/1_Feed/{FeedHeader.styles.js, FeedSnapshotCard.styles.js},
  frontend/components/1_Feed/FeedHeader/{FeedScopeSelector.js, SearchUsersBar.js}.

## Partition: feed-social
Stale lines: none.
- Adopt: `isLivePostData` in Posts/hooks/usePostFooterInteractions.js only (lines 131-135 ->
  `const isLivePid = isLivePostData(data);`, import added to line 12). PostFooter.js is NOT adopted.
- Dead code, reachable files (Comments/*, Notifications/*, SharePost/*, Posts/hooks/usePostFooterInteractions.js):
  Tier 1 #1-#17, #28-#35 (B-16 makes backend/user/declineFollowRequest.js unreferenced: list it). Tier 2 stays.
- Dead code, unreachable Explore files (Posts/Post.js, PostHeader.js, PostFooter.js, PostFooterInfoPanel.js,
  PostMediaCarousel.js), per G-4 only what lint proves plus comments: #18 (`bounce` and its three constants), #20
  (commented-out effect, stale note), of #21 only the unused `url` parameter of PostHeader.js:15, #22 (`Easing`),
  #25 (`TouchableOpacity`, `ts`), the PostFooter.js:101 comment of #34.
  NOT applied there: #19, the rest of #21, #23, #24, #26, #27 (they delete hooks, effects, props or JSX in code
  nobody can exercise; X-2). Posts/animConfig.js therefore keeps its importer.
- Approved fixes: none. E1-E10 are open questions (Q17, Q18); leave the dead scroll effect in NotificationsModal
  as it is.
- Structure (accepted): D-1 steps 1-3 (NotificationCard.styles.js after the Tier-1 deletions,
  notificationColors.js, notificationCardUtils.js); hoist the NotificationsModal time helpers to module scope
  inside the file (keep its local `toMillis`); F2, F4, F5.
- Not done: C1 (`Pfp`; its second user would be the unreachable PostFooterInfoPanel), D-2 (any split of
  Posts/Post.js, including postMediaTone.js), F3, D-1 steps 4-5, C2, importing `toMillis` from utils/date (differs
  for Date instances), touching the usePostFooterInteractions return shape or its updater side effects, the
  comment-sheet open/close effects.
- New files: frontend/components/1_Feed/Notifications/ (NotificationCard.styles.js, notificationColors.js,
  notificationCardUtils.js).

## Partition: messages-chat
Stale lines: none.
- Dead code: B1, B2 (first four rows; the two route-param reads `participants` and `returnTo` stay), B3 (first
  five rows), B4. F4, F5 (`ts` named import in MessageItem), C-9.
- Approved fixes: E-1 (move 1.1_Messages.js:421, the `if (!userData) return null;`, below the two memos, i.e.
  below line 449, so no hook is called conditionally), E-2 (delete the ignored `iconSize` prop).
  E-3..E-8 are open questions (Q19).
- Structure (accepted): the chat time/sender helpers (C-1, C-2, C-3) go to
  frontend/components/1.2_Chat/chatMessageUtils.js (`chatTimestampToMillis`, `dateKeyFromMs`, `getMessageTimeMs`,
  `getMessageSenderUid`); MessageCard may import `chatTimestampToMillis` (its only caller treats null and 0 alike).
  D-1 items 1, 2, 6; D-2 items 1 and 3 (hoist `getEpoch`, `buildParticipantKey` in the screen); D-3 items 1-3
  (`MediaTile` hoisted with props `m, item, onOpenMedia, onOpenActions`, `key` expressions unchanged);
  MessagesHeader `Chip` hoisted. The two hoists are accepted remount deltas (G-4).
- Not done: `useChatSwipeGestures`, `useChatParticipantRegistration`, the list-builder extraction,
  `useMessagesChats`, a shared `getChatLatestEpoch` with backend/getUserFeed.js, a shared ParticipantHandle, the
  `Cell` hoist in Chat, F-8, F-9.
- New files: frontend/screens/{1.2_Chat.styles.js, 1.1_Messages.styles.js}, frontend/components/1.2_Chat/
  (chatMessageUtils.js, chatUploadErrors.js, MessageItem.styles.js, chatMediaUtils.js, MediaTile.js).

## Partition: macro-components
Stale lines: none.
- Dead code: B1, B2, B3, B4 (the eight exact edits, nothing else in those effects), B5. MealCard: drop the unused
  `PlusIcon` / `onAddPress` params and MealsSection's two passes to MealCard; the `PlusIcon` prop drilling from
  MacroTracking stays (X-2). MacroStreakBadge: `scaledSize(16)` -> `scaleSize(16)`, drop the UserStatsStyles
  import. QuickAddModal: one top-level `import theme from '../../theme/mfpDark'` instead of the five inline
  requires. SearchResultCard: import `formatPortion` from `../../utils/nutrition`. The pairings of X-1.
- Approved fixes: E2 only (`backdropComponent={renderBackdrop}` in MacroGoalsSheet.js:344; accepted remount delta,
  G-4).
- NOT applied: E1. FoodSearchOverlay.js:1037 (`data.replace(/\\D/g, '')`) stays byte-for-byte, wherever the line
  ends up: correcting the regex makes an unreachable branch reachable, changes the message and removes a network
  call, and sits inside `CameraView.onBarcodeScanned`, which the simulator cannot exercise (Q32).
  E3: `HistoryFooter` (FSO:858-874, used at 981) stays a component defined during render; the accepted residual is
  one `react/no-unstable-nested-components` warning (Q33). E4-E7 are open questions.
- Structure (accepted): C1/C2 portionInput.js; D1 steps 0-3 (foodSearchUtils.js as one contiguous block,
  FoodSearchOverlay.styles.js exporting `makeStyles`, RecentHistoryItem.js); D2 steps 1-2; F3, F4, F6, F13.
- Not done: D1 steps 4-5 (the scanner hook and modal), `barcodeScannerConstants`, `useCtaPressAnimation`,
  AutoCalcRow, F7, F12, any comparator change beyond the `collapsed` term, any colour-fallback simplification.
- Do not touch: PersonalInfoSheet's default export, its `PersonalInfoContent` export and its props (PARKED user).
- Expected size: FoodSearchOverlay.js about 775 lines.
- New files: frontend/components/2_MacroTracking/ (portionInput.js, foodSearchUtils.js, FoodSearchOverlay.styles.js,
  RecentHistoryItem.js, MacroGoalsSheet.styles.js, macroGoalsUtils.js).

## Partition: macro-screens
Stale lines: none.
- Dead code: B.1-B.5 (keep `export` on `formatPortion`: macro-components imports it), B.6 T1, B.7 T1 (incl. the
  standalone PersonalInfoSheet block; the `UIManager` block at MacroTracking.js:38-40 stays), B.8 T1. T2 stays.
  C.9 (`clampInt`). F.3, F.4. The pairings of X-1.
  fatsecretClient.js: delete the tracing log and the commented legacy client (it contains credentials: do not copy
  them anywhere, not into the report either; the report tells the owner they remain in git history, Q28).
- Approved fixes: E.1 in its behaviour-preserving form: DELETE the four dead `try { haptic(); } catch {}`
  statements (MacroTracking.js:405, 430, 585, 728); do not restore the import (Q3). E.2 (move `refreshDayData`,
  561-565, above the comment at 497; G-4 table). E.7 (`_`).
  E.3-E.6 are open questions (Q13).
- Structure (accepted): FoodDetail D.1 in full; MacroTracking D.2 steps 1-3. Paths differ from the audit:
  everything goes under frontend/screens/foodDetail/ and frontend/screens/macroTracking/.
- Not done: D.2 steps 4-5; C.4, C.7, C.8, C.14; removing `isFocused` / `date` props; any memoisation around
  `deleteFood`; touching the pager.
- Expected size: FoodDetail.js about 440 lines, MacroTracking.js about 790.
- New files: frontend/screens/foodDetail/ (foodDetailStyles.js, FavoriteFoodButton.js, MacroRow.js,
  NutritionFacts.js, useFoodExtrasPerServing.js), frontend/screens/macroTracking/ (macroDayUtils.js,
  macroTrackingConstants.js, useCompletedWorkoutsSignature.js).

## Partition: workout-active
Files: ABS, AWM, EWM, RestTimerModal, SpectatingWorkoutModal, UWM. Stale lines: none.
- SpectatingWorkoutModal.js: do not edit (X-3).
- Adopt: `normalizePrevKeepZero` (AWM: delete 85-90, rename the calls at 102, 110, 121; EWM: delete 29-35, rename
  the call at 43; UWM: delete 45-51, rename the calls at 102 and 829), `genId` (EWM: delete line 27), `toMillis`
  from utils/date (UWM: delete 37-44; the calls at 81, 91, 1014 keep their text). RestTimerModal: `scaledSize(` ->
  `scaleSize(` (G-4). After the split, each file imports only what it still uses (lint decides).
- Dead code: AWM B1 rows 1-9 (incl. the commented WorkoutReminderModal import at line 61) and the
  `end_workout_sheet_handle` style; NOT the constant-folding rows, NOT the `[perf]` logs. ABS: `COLLAPSED_SNAP`,
  `sheetOffset`; keep `setIsViewingSelf`. RestTimerModal B3. EWM B5. UWM B6: `ensurePrevSetsCache` with its refs
  (the array entry at 556 goes because the identifier is deleted), `lastPersistSentAtRef`, `postWorkout`, the
  `completedWorkout` state, the `navigation` param, the ungated tracing at 879-887, `cleanObj` -> `stripUndefined`,
  stale comments. Keep the three dead global writes (Q23), `setTimerString` (X-2), the `[perf]` logs, the
  store-subscription effect byte-for-byte. The pairings of X-1.
- Approved fixes: E1 (delete AWM:733, the call of the undefined `setIsDoneState`; the surrounding lines stay),
  E3 (move `syncCurrentWorkoutRemote`, UWM:655-673, above `performPersist`), E4 (a) and (b) (G-4 table).
- NOT approved: E2, E5-E10, ABS F1. For E2 this means, without exception:
  - `buildRankPayload` (UWM:159-184) stays in useWorkoutManager.js byte-for-byte. It is NOT moved to
    workoutFinishStats.js.
  - Do not add an import of `computeRankProgressFromData` or of shared/rankProgress.js to useWorkoutManager.js or
    to any new file under frontend/logic. The name is undefined on purpose: the ReferenceError is caught at
    UWM:180, so no rank field is written at workout finish today, and adding the "obvious" import would start
    writing rank fields to three user documents (Q1).
  - The resulting `no-undef 'computeRankProgressFromData'` in useWorkoutManager.js is the one accepted hard lint
    error of the whole run. Do not silence it.
- Structure (accepted): AWM D1 items 1, 2, 3, 5 (item 4 becomes: move the FlashList detection block below the
  imports inside AWM); `findStatsEntryForExercise` / `getPreviousOneRm` live once in
  frontend/logic/workoutFinishStats.js and activeWorkoutMetrics.js imports them (C2); UWM D2 item 1
  (workoutSanitize.js; `toMillis` and the prev normaliser are imported from the shared modules, not moved), item 2
  WITHOUT `buildRankPayload` (workoutFinishStats.js gets `cloneHexagon`, `buildExerciseStatDeltas`,
  `runHexagonCompute`, `captureHexSnapshot` with its three `global.__hex*` writes exactly as they are,
  `findStatsEntryForExercise`, `getPreviousOneRm`), items 3, 4, 5; ABS F2; F3 (merge duplicate react-native
  imports in AWM).
- Not done: D1 items 6-7, D2 item 6, a `perfNow` module, `useConfettiCannon`, `useCheerEvents`,
  `useKeyboardHeight`, shared sheet constants (C16), anything inside `finishWorkout` except the deletions named
  above, F5, F8, F9, F14.
- Expected size: ActiveWorkoutModal.js about 1,380 lines and useWorkoutManager.js about 1,105 (accepted
  exceptions).
- New files: NW/{ActiveWorkoutModal.styles.js, activeWorkoutMetrics.js, previousSets.js, CollapsedTimerText.js},
  frontend/logic/{workoutSanitize.js, workoutFinishStats.js, workoutGroupUtils.js}.

## Partition: workout-tracking
Stale lines: none.
- Adopt: SetRow -> `normalizePrevOrNull` (delete SetRow.js:14-20, rename the call at 30), `typePillBg`,
  `typePillText` (delete 367-395); ExerciseLog -> `normalizePrevKeepZero` (delete ExerciseLog.js:37-42, rename the
  calls at 134, 140, 351); ConfirmWorkoutModal -> delete the `utils/scale` import (line 7) and rename
  `scaledSize(` -> `scaleSize(` (the file already imports the default `scaleSize`; same arithmetic as `ss`, and it
  is not used in a worklet there); GroupHeader, GroupMenu, GroupModal -> `scaledSize(` -> `scaleSize(` (G-4).
- Dead code: every row marked SAFE in B1-B11 (incl. E3, E4, E5 as removals). ExerciseLog: delete the in-render
  `UIManager` call and the constant-false flag; KEEP SetRow's module-level `setLayoutAnimationEnabledExperimental`
  call. Rows marked CARE / KEEP / OPTIONAL stay (the `copyPrevious` chain, context fields, `fadeAnim`,
  `placeholder`). The pairings of X-1.
- Approved fixes: none beyond the removals. E1 (`.catch`) and E2 (`areEqual` + `exerciseIndex`) are open questions
  (Q19, Q9).
- Structure (accepted): D1 steps 0-2; D2 (groupParticipantUtils.js); D3 (StatKeyboardOverlay.js with the whole
  styles object); F2, F3, F6.
- Not done: D1 step 3, D4, any change to the registration effect or the context value.
- New files: NW/Tracking/{ExerciseLog.styles.js, useDebounced.js, StatKeyboardOverlay.js},
  NW/Group/groupParticipantUtils.js.

## Partition: workout-rest
Stale lines: none.
- CopyTemplateToast.js (X-3) and EXERCISES.js: do not edit.
- Adopt: NW/hooks/useWorkoutEditing.js -> `genId` (delete line 6) and `normalizePrevKeepZero` (delete 8-14, rename
  the calls at 22, 39, 40, 114, 115) from `../../shared/workoutSetUtils`. The muscle filter code (in
  SelectExerciseModal.js today, in MuscleFilterBar.js after the split) imports `MUSCLE_ICON_HIGHLIGHT`,
  `MUSCLE_ICON_HIGHLIGHT_DIM`, `MUSCLE_ICON_STROKE_WIDTHS` and `OVERALL_MUSCLE_SEGMENTS` from
  2_Competition/muscleGroupIconLayout and uses those names in place of its identical local `MUSCLE_HIGHLIGHT`,
  `MUSCLE_HIGHLIGHT_DIM`, `MUSCLE_ICON_STROKES` and the inline "Full Body" segment array (values compared: equal);
  its own `MUSCLE_ICON_SCALES` / `MUSCLE_ICON_OFFSETS` differ and stay local. `scaledSize(` -> `scaleSize(` in
  AnimatedButton, ExerciseCard, SelectExerciseModal, selectExerciseModalStyles (G-4); delete the unused forwarder in
  TimerDisplay.
- Dead code: B.0 #1-#14, B.1 (the unreachable equipment filter chain), B.2 except `persistWorkout`, the `enabled`
  prop and the string-entry branch (those three stay, X-2) and except the two rows the audit marks optional
  (`offsetX`, `lastVolumeIcon`). `setCountdown` return entry and the Portal pairings
  per X-1. F.1.
- Approved fixes: none (E.1, E.2 are open questions, Q21; F.4: leave both animations).
- Structure (accepted): D steps 0-2 (MuscleFilterBar.js, exerciseCatalogIndex.js). selectExerciseModalStyles.js is
  an existing styles module: it loses its dead keys and constants (B.0, B.1, B.2) and is not re-split.
- Not done: step 3, F.2, F.3, merging `ensureSheetExpanded`, exporting the store's initial handlers.
- New files: NW/SelectExercise/{MuscleFilterBar.js, exerciseCatalogIndex.js}.

## Partition: profile-makepost
Stale lines: none.
- Adopt: `formatClockTime` from utils/date (delete PUO:41-46 and CB:29-34); `scaleWidth375` (SM-13: PUO delete
  30-34, CB delete 22-24, rename `scaleSize(`); SelectPhotosScreen `scaledSize(` -> `scaleSize(` (G-4, = B.1 #15).
- Dead code: B.1 #1-#3, #4 (delete PUO:959-977 only; lines 951/953 stay), #6 (the dead `appendedOptimistically`
  flag), #9-#15, #18. F1, F2, F7.
- NOT applied: B.1 #5, #7, #8, #16, #17; everything in B.2; F5 (it would edit the dependency array at PUO:855).
- Approved fixes: none. E1, E2, E4-E9 are open questions (Q14); `styles.blockMask` stays referenced and undefined.
- Structure (accepted): D.1 item 1 as composerLayout.js WITHOUT a scaler of its own (it holds
  `composeHorizontalPadding`, `avatarSize`, `headerBottomPadding`, `HIT_SLOP` and imports `scaleWidth375`;
  `screenWidth`, PUO:29, stays in PUO; CB deletes CB:26-27 and imports the two constants), item 2
  (postMediaUtils.js), item 3 (videoUploadAsset.js with both functions unmerged; the dependency array at CB:456 is
  left exactly as it is); D.2 item 4; D.3 item 8 and item 9 (`normalizeClipEntry` stays in CB); D.4 items 11-12.
  Run the scaler renames before extracting the three StyleSheets (G-5).
- Not done: D.2 items 6-7, merging the two `ensure*VideoAsset`, any change inside `sharePost`, the caption
  line-limit logic, ZoomCropper, ImageCropperModal maths.
- Expected size: PostUploadOptionsScreen.js about 1,250 lines (accepted exception), ClipBuilderScreen.js about 570,
  SelectPhotosScreen.js about 455.
- New files: frontend/components/5_Profile/MakePost/ (composerLayout.js, postMediaUtils.js, videoUploadAsset.js,
  PostUploadOptionsScreen.styles.js, ClipBuilderScreen.styles.js, SelectPhotosScreen.styles.js,
  selectPhotosUtils.js).

## Partition: profile
Stale lines: none.
- Adopt: PWP -> `ensureAtHandle`, `stringCandidates`, `extractPidFromWorkout`, `buildEditPostPayload`
  (feedItemUtils; the three `shouldRefreshOnFocusRef` lines PWP:812-814 stay, directly after the call),
  `sanitizeEntry` (workoutRouteParams). EditProfileModal and ViewProfileRowButtons -> `scaleWidth375` (SM-13; in
  ViewProfileRowButtons the `scaleSizeGlobal` import and its calls stay as they are). ChangeUsername, ChangeName ->
  `import styles from './handleForm.styles'` (delete their StyleSheets and the imports lint then reports unused).
  ProfileRankBadge -> `RANK_TIER_THEMES` from `../../1_Feed/rankTierThemes`. ProfileInfo, ProfileRowButtons,
  WorkoutStats -> `scaledSize(` -> `scaleSize(` (G-4).
- Dead code: B1 #1-#6 and B2 #1-#9 (this removes both FeedWorkoutViewerSheet mounts, X-3), B3 #1-#12 and #16
  (PWP:951 `onPressShare` and the `opts` pass-through), B4 (keep the `useUserDoc(...)` call with a why-comment),
  B5 #1-#5, #7-#16, #20. ProfilePicture keeps its named import.
- NOT applied: B3 #13, #14, #15, #17, #18; B5 #6, #17-#19.
- Approved fixes: E1 (move VPS:352-370, five derived constants and two `useMemo`s, all pure, above the early
  return at VPS:333, so no hook is called conditionally).
- NOT applied: E2 (PWP:387-389 stay below the focus effect at 288-347; `canViewContent` is not referentially
  stable, so moving it would add a live dependency, Q34); E3 (DeleteAccount.js: the screen is unreachable, Q5, and
  the fix changes behaviour on a failure path); E4-E7 (Q15, Q19).
- Accepted: F2 (pass an element as `ListEmptyComponent`; accepted remount delta, G-4), F3, F4, F5, F6.
- Structure (accepted): C3 (ring constants exported from ProfileIdentity.js), C5 (profileScreenStyles.js);
  D1 steps 0, 1, 3, 4; D2 steps 0-3 (the helpers that are now shared are imported, not moved; `canViewContent`
  and the focus effect keep their relative order).
- Not done: D1 step 2, D2 steps 4, 5, 7; InfoScreenHeader; a shared delete-account hook; `profileHeaderMetrics`;
  any change to the block/unblock handlers beyond hoisting them verbatim; any character of the legal texts.
- Expected size: ProfileWorkoutsAndPostsScreen.js about 850 lines (accepted exception).
- New files: frontend/components/ViewProfile/directChat.js, frontend/components/5_Profile/profileScreenStyles.js,
  frontend/screens/profileWorkoutsAndPosts/ (ProfileWorkoutsAndPosts.styles.js, profileWorkoutsAndPostsUtils.js,
  LockedView.js).

## Partition: auth-onboarding
Stale lines: none.
- Adopt: `resolveHandle` from `../services/userProfileService` (appleAccount.js: delete 9-22; googleAccount.js:
  delete 7-20; extend the existing import of that module). `scaleWidth375` in 0.0_SignUp, 0.1_LogIn and
  0.3_UserLogInCredentials per SM-13 (drop `Dimensions` where lint reports it unused; 0.3 keeps `screenHeight`).
  0.4_CreateUsername -> `import styles from './handleForm.styles'` (delete lines 149-256 and the imports lint then
  reports unused).
- Dead code: B1 #1-#20 (#14-#15 make frontend/auth/completeSocialSignup.js unreferenced: list it, do not edit it;
  #17 replaces the dependency-array entry `activeClientId` at useGoogleAuth.js:189 by `effectiveClientId`, the
  value it forwarded: the identifier is deleted, so this is the sanctioned kind of array change). index.js line 12
  -> `export { default as Feed } from './1_Feed';` (frontend/screens/FeedScreen.js becomes unreferenced: list it).
  F1, F2, C10. The pairings of X-1.
- Approved fixes: E1 (`style={textStyle}` in AuthButton: the referenced `styles.text` key does not exist).
  E2-E5 are open questions (Q16).
- Not done: C2 (`providerSignIn` helper), C4 (shared landing styles), any other edit in useGoogleAuth /
  useAppleAuth.
- New files: none.

## Partition: app-shell
Stale lines: frontend/services/userProfileService.js was edited by s0-misc-shared (no line shift;
`resolveHandle` is now exported: keep the `export`).
- FeedScreen.js: do not edit (it becomes unreferenced).
- Dead code: B1 #1-#10, #12-#28. #21 (the feed post-focus overlay plumbing in App.js) is accepted without
  condition: it was verified for this plan against the baseline that Footer.js (lines 33, 154, 165) and
  ActiveWorkoutBottomSheet.js (lines 47, 178, 276-277) compute exactly `false` and `1` when the props are omitted,
  and that nothing outside App.js references `__setFeedOverlayHidden`, `__setFeedOverlayProgress` or
  `__feedOverlayProgressSV`. Do not open the working-tree copy of ActiveWorkoutBottomSheet.js (G-3 rule 6). Name
  the removed global hooks in the report. B1 #11 not applied. B2 #1 accepted; B2 #2, #3, #5 are deferred (X-2).
  UnderMealList `compact` per X-1.
- Approved fixes: E1 (Footer gate component as written in the audit; keep the memo comparator on the export),
  E2 (delete the overwritten first `handle` style, FollowListBottomSheet.js:186-188), E3 (= B1 #25). E4: leave the
  line.
- Accepted: C3 (SafeAreaProviderWithStableInsets calls `useStableSafeAreaInsets`), C4, C5 (`dismissRestReminder`),
  F2 (static imports of navigationRef and updateDoc; keep `require('expo-notifications')` lazy), F3, F5 (hoist
  `FollowRow`; accepted remount delta, G-4), F6, F7 (frontend/components/ProfileCard.js `s(` -> `scaleSize(`; keep
  the double scaling).
- Structure (accepted): D1 RootNavigator.js, RestReminderModal.js, useNetworkStatus.js, usePresenceSync.js
  (each hook called where its effect sits today); D2 Footer.styles.js.
- Not done: C6, C7, footerRoutes, useCommunityStatsReady, StartWorkoutPrompt, trimming fonts.js, moving
  `detachInactiveScreens`, anything in H2-H5 (module start-up code, effect order, splash gating, arrays), F4, F8,
  F16.
- Expected size: App.js about 1,250 lines (accepted exception).
- New files: frontend/navigation/RootNavigator.js, frontend/components/{RestReminderModal.js, Footer.styles.js},
  frontend/hooks/{useNetworkStatus.js, usePresenceSync.js}.

## Partition: common-components
Stale lines: none.
- Dead code: B1, B2 (keep `export { toExerciseSlug } from "./exerciseImageMap";`), B3, B4 rows 1 and 3.
  ReportContentSheet `onSubmit` per X-1.
- Not done: B5 (other optional prop removals), B6 (hidden SVG groups), C2, C4, F3, F4, any change to
  chartStyles.js (three stage-0 and stage-1 modules import its four sheets), exerciseImageMap's table,
  HistoryCalendarModal's timing code.
- New files: none.

## Partition: helpers-hooks
Stale lines: frontend/helper/scaleSize.js was rewritten by s0-scale: do not edit it. The audit's B5, B6, B28 and
the F6 comment for that file are already done; B29 (`rs`) stays (X-2).
- Adopt: useCommunityActivity -> `toMillis` from `../utils/date` (delete lines 5-12); keep its local `chunk10`.
- Dead code: Tier 1 B1-B4, B7-B20. Tier 2 stays. useAuthProviderFlow dead branch per X-1.
- Approved fixes: E1 (getScrollTargetPosition.js:8 becomes `const getScrollTargetPosition = (width, height) => {`
  plus `export default getScrollTargetPosition;` at the end: the name was assigned without being declared),
  E2 (comment). E3-E7 are open questions.
- Accepted: F1 (hoist the two helpers in useUserDoc), F2, F5, F6 (without the scaleSize.js part).
- Not done: C3, C5, C6, C7, C10, F3; any dependency array.
- New files: none.

## Partition: utils-logic
Stale lines (stage 0 edited five of your files):
- frontend/utils/weightEntries.js: every audit line number is 2 too low (an import and a blank line were added at
  the top); three exported functions were appended at the end. Keep the import and the three exports.
- frontend/utils/date.js, livePostMeta.js, muscleTierColors.js: lines were appended at the very end only (audit
  line numbers still valid). Keep `toMillisSafe`, `formatClockTime`, `isLivePostData`, `BODYGRAPH_OUTLINE_COLOR`.
- frontend/utils/scale.js was reduced to `export { ss } from "../helper/scaleSize";`: do not edit it (the audit's
  B5 for this file is superseded; SpectatingWorkoutModal.js still imports `ss` through it).
- Adopt: communityStats -> `toMillis` from `../utils/date` (delete lines 60-67).
- Dead code: B1 (all default aggregate objects), B2 (except friends.js and `preferMeasurements`), B3, B4 rows 1-3.
  Do not edit friends.js (its only LIVE importer, 1_Feed.js:44, switches to utils/date; the other importer,
  helper/useWorkoutFeed.js, is DEAD; friends.js goes on the deletable list) nor pickAndUploadProfilePhoto.js (X-2).
  In muscleTierColors.js remove `hexToRgba` and un-export `HEX_TIER_COLORS`, `resolveHexTierColor` in the export
  list without touching the appended constant. In livePostMeta.js remove the default export object and the
  `export` keyword of `deriveWorkoutIdentityKey`; the appended `isLivePostData` stays exported. The optional
  `extraCandidates` row of B2 is not applied.
- Approved fixes: none (E1-E5 are open questions). `ownerId` / `isViewerOwner` unused locals: delete.
- Not done: C2 (KG_TO_LB), C3, C6, C9, F6-F8, removing communityStats or its App.js gate (Q24).
- New files: none.

## Partition: backend-shared
Stale lines: none.
- Dead code: B1-B11, B13-B15, B17-B19. B12 is NOT applied: shared/rebuildHexagonStats.js is not edited at all (it
  becomes unreferenced after functions-scripts F1; list it). B16, B20-B30 stay.
- Approved fixes: E1 (`for (const pid of pids)` in backend/posts/retrievePosts.js: undeclared loop variable),
  E2 (= B15). E3-E9 are open questions (Q26).
- Accepted: C4 (backend/user/coerceTargetUid.js with the five identical bodies), C8, F1, F5.
- Structure (accepted): D1 items 1-5 and D2 (workoutStatsPrimitives.js, buildRankFields.js,
  updateCompletedWorkoutStats.js, updateCompletedWorkoutUtils.js). Keep explicit `.js` extensions; `toMillis`,
  `toDayKey`, `deriveBestTimestamp`, `normalizeIdentifier`, `rebuildStatsFromWorkouts` of the delete and update
  files stay separate.
- Not done: C3, C7, the `this_user` removal, merging backend and frontend userRefs, any restructuring of
  shared/hexagon/computeHexagonCore.js beyond dropping `export` keywords.
- Link check for the Cloud Functions side (nothing executes it, and `SPX/tools/fn-check.sh` only checks syntax
  and that imported FILES exist, so check by hand after B6-B9):
  - `grep -n "^export default" shared/computeHexagon.js` prints exactly one line, the function
    `computeHexagonFromStats`;
  - the three in-app importers (backend/workouts/updateCompletedWorkout.js, deleteCompletedWorkout.js and their
    new sibling modules, frontend/logic/computeHexagonStats.js) take the default: lint `import/default` must be
    clean for them;
  - functions/shared/computeHexagon.js (not yours, not edited) re-exports `*` and `default` from this file, and
    its only consumer, functions/shared/rebuildHexagonStats.js:1, takes the default. Nothing in functions/ uses
    one of the named exports that B6/B7/B9 remove; this one-line command must print nothing (it prints nothing on
    the baseline):
    `grep -rnE "computeHexagonAlgorithm|defaultResolveMeta|FAMILY_ANCHORS|familyAnchorFor|FULL_BODY_DIST|GROUP_KEYS|GROUP_WR|normalizeEquipment|resolveMetaWithCatalog" functions --include="*.js" | grep -v node_modules`
  Run `SPX/tools/fn-check.sh` as well.
- New files: backend/workouts/ (workoutStatsPrimitives.js, buildRankFields.js, updateCompletedWorkoutStats.js,
  updateCompletedWorkoutUtils.js), backend/user/coerceTargetUid.js.

## Partition: tooling-scripts
Stale lines: none. Nothing here may be executed.
- Do: scripts/scale-fontsize-codemod.js (`willNeedImport`, `hasNamedTS`), scripts/bootstrap/seedAccounts.js:9
  (usage comment), scripts/check-relative-imports.js:15 (adopt the multi-line regex of find-unused-frontend.js:31;
  record it as a fix to a read-only dev tool).
- Not done: backend/admin/lib/handleUtils.js, splitting exportFoodLogsTable.js, every optional row, every E item.
- Verify with `node --check` (Node 20), lint, `node tests/feedRanking.test.js`.
- New files: none.

## Partition: functions-index
Stale lines: none. Nothing here can be executed or deployed; keep every change small and obviously correct.
- Do, in place and bottom-up: E1 (functions/index.js:4292: `Object.keys(patch.statsExercises).length` ->
  `Object.keys(updatePayload).length`; `patch` is not defined anywhere, `updatePayload` holds one key per exercise
  that received sets and is what the early return at 4268 already uses), B2, B1, B4 (touch only 3126-3127,
  3139-3140 and the function; paired with functions-scripts B2), B3, B9.
  Name E1 in the report as behaviour-visible once deployed: `appendWorkoutSets` returned INTERNAL after doing its
  writes and now returns `{ ok: true, appended }`. No client in the repo calls it (Q27).
- Not done: Plan A and Plan B (no module split of functions/index.js in this run), C1 `ensureFoodDescription`,
  E2 (`extractLatestWeight`), removing any export or option object. Do not edit functions/computeHexagon.js (list
  it).
- Verify: `SPX/tools/fn-check.sh` after every edit: the 25 exports (names, trigger types, options) must be
  identical to the baseline; `node --check functions/index.js`.
- New files: none.

## Partition: functions-shared
Stale lines: none.
- Do: B1, B2, B3, B4.
- Keep every K item, in particular: the default export of functions/shared/rebuildHexagonStats.js (360-364),
  its three named exports `rebuildStatsFromWorkouts` (126), `combineStatsExercises` (289),
  `computeHexagonFromUserData` (330) (functions-scripts F1 points two more scripts at them),
  `export *` and `export { default }` in functions/shared/computeHexagon.js, and `findUserByHandle`.
- Not done: propagationCommon.js, the deleteUser/ split, nameKeyHeuristics.js, N1-N12, every E item.
- Verify: `SPX/tools/fn-check.sh` after every edit; `grep -n "^export" functions/shared/rebuildHexagonStats.js`
  still prints the four export lines named above.
- New files: none.

## Partition: functions-scripts
Stale lines: none. Nothing here may be executed.
- Do: B1 (two `processed` counters), B2 (paired with functions-index B4), F1: in
  functions/scripts/recomputeHexagonByHandle.js:7 and recomputeHexagonStandalone.js:7 the import path
  `"../../shared/rebuildHexagonStats.js"` becomes `"../shared/rebuildHexagonStats.js"` (the module the root shim
  re-exports; functions/scripts/recomputeAllHexagonStats.js:5 already imports it this way). The three imported
  names do not change.
- Reviewer check for F1 (no tool link-checks functions/): `grep -nE "^export function
  (computeHexagonFromUserData|rebuildStatsFromWorkouts|combineStatsExercises)\b"
  functions/shared/rebuildHexagonStats.js` prints three lines.
- Not done: a shared script helper module, hoisting in clearUserContentByHandle.js, every E item, any console
  change.
- Verify: `node --check` on every edited script, `SPX/tools/fn-check.sh`.
- New files: none.

---------------------------------------------------------------------------------------------------------------------

## Stage 2: review, static gate, smoke test

### Per-package review
For every package: the diff against SPX/baseline, `changes.cjs` for its paths, and the package report are read
against its section of this plan. Anything changed that the section does not list is a defect. For every new
module the reviewer repeats the baseline comparison of G-5 step 4.

### Whole-project static gate
1. `SPX/tools/gate.sh`. Pass criterion: the HARD list has exactly ONE entry,
   `frontend/logic/useWorkoutManager.js:<line> [no-undef] 'computeRankProgressFromData' is not defined.`
   (identified by rule and identifier, not by line; Q1). The script therefore exits with status 1 by design: judge
   the list, not the exit code. The baseline HARD list has 31 entries; the other 30 are removed by backend-shared
   E1 (2), workout-active E1 (1), app-shell E2 (1) and E1 (16), helpers-hooks E1 (1), messages-chat E-1 (2),
   profile E1 (2), macro-screens E.1 (4), functions-index E1 (1). The import graph must report no UNRESOLVED
   import, and `node tests/feedRanking.test.js` must pass.
2. `grep -rn "computeRankProgressFromData" frontend/logic` prints exactly one line (the call inside
   `buildRankPayload` in useWorkoutManager.js) and `grep -rn "rankProgress" frontend/logic` prints nothing (no
   import of shared/rankProgress.js anywhere under frontend/logic). Both hold on the baseline.
3. `node SPX/plan/check-adoption.cjs` prints `clean`: every local duplicate listed under "Replace" is gone from
   its file and from the modules split out of it, and every stage-0 export exists and has an importer.
   (`--selftest` proves each pattern against the baseline.)
4. `NODE_PATH=SPX/tools/node_modules node SPX/plan/check-styles.cjs` prints `ok` for every new styles module (no
   key without a reader). Unused keys in extracted sheets are invisible to ESLint.
5. Shadowing of shared names: run
   `SPX/tools/lint.sh -f unix --rule '{"no-shadow":["warn",{"hoist":"all"}]}' App.js frontend | grep no-shadow`
   and filter for the stage-0 export names (the list is the USED table in check-adoption.cjs). Expected: exactly
   one line, the inner `accentToRgba` of UP's own ChartBubble (baseline: UP:31; after the split it sits in
   UserStats/UserStatsChartCard.js). Any other hit is a defect.
6. Import graph (`NODE_PATH=SPX/tools/node_modules node SPX/tools/graph.cjs .`): its DEAD list is exactly groups A
   and B of "Files that can be deleted once the owner approves" (38 + 10 = 48 files), PARKED is unchanged (16
   files), and UNRESOLVED is empty. Anything else is a defect.
7. Oversized files: `wc -l` on the files of the "Oversized files" table, compared with the estimates.
8. Accepted residual warnings (not errors): one `react/no-unstable-nested-components` for `HistoryFooter` in
   FoodSearchOverlay.js (Q33) and those of ABS (not approved); `no-unused-vars` inside the four frozen files of
   X-3; `react-hooks/exhaustive-deps` warnings everywhere (never silenced).
9. functions/: `SPX/tools/fn-check.sh` reports the export surface identical to the baseline (25 exports), plus the
   hand checks listed in backend-shared, functions-shared and functions-scripts (fn-check does not link-check the
   hexagon chain or the operator scripts).
10. Metro bundle: `SPX/tools/bundle.sh` completes.

### Smoke test (simulator), in this order
Cold start and sign-in; Feed (scroll, like, comment sheet, post options, report a post from another user, edit
post, delete post, calendar, create-post menu, search users incl. the separator rows); a post's PastWorkout screen
(cheer on a live workout if available, edit workout and save); Macro tab (swipe days, add food through search,
recent foods list, barcode sheet opens, quick add, edit goals: open, dismiss by tapping the backdrop, reopen;
delete a food, food detail favourite); Competition tab (ladder scroll, Progress charts: scrub all four charts and
check the tooltip card, switch metric, add a body weight entry, open Weight Measurements, add, edit and delete an
entry, open a muscle group, open ExerciseDetail: three tabs, scrub every metric chart including personal records,
favourite toggle, open a history workout); Profile (edit profile, change username/name screens, settings, view
stats incl. the preview charts and their tooltips, workouts and posts tabs incl. the empty state, followers list:
scroll and open a row; another user's profile: follow, message, block sheet, and a profile that blocks the viewer);
Messages and a chat (send text and image, open an image tile, reaction popover, swipe back, tap the two header
chips); start a workout (add and replace an exercise, sets, set type, rest timer, group menu, finish with summary
sheet and the after-workout stats sheet: open, dismiss by backdrop); log out and the auth screens (sign-up and
log-in layouts, username screen).
Not reachable in the simulator and therefore not covered: the camera barcode scan, Apple/Google sign-in, the
Explore route, Cloud Functions.

---------------------------------------------------------------------------------------------------------------------

## Out of scope

- Any behaviour change, including every audit item recorded as an open question below.
- The per-metric chart pointer hook for ED and PS and the shared chart-card sub-blocks (`chartParts`): the first is
  stateful gesture/animation code; the second is stateless, but replacing four inline copies inside the gesture and
  SVG layer is a JSX rewrite that cannot be verified here. Both need device QA. Likewise the video-controls hook
  shared by SFP and PUO.
- Removing the unused `unitLabel` parameter of the two `buildMetricDeltaDisplay` functions.
- Splitting functions/index.js and functions/shared/deleteUserAndContent.js; deduplicating operator scripts.
- Structural work on the unreachable Explore code (splitting Posts/Post.js, a shared `Pfp`, its Tier-1 items that
  delete hooks, effects or JSX).
- App-wide unification of `toMillis` (beyond the lenient family), numeric coercion, `clamp`, blocked-uid getters,
  `userRefs` (frontend vs backend), a `useLiveUserData` hook, calendar label constants, `GROUP_KEYS`,
  `DISPLAY_TITLES`.
- The deferred removals of X-2 and all file deletions.
- PARKED and DEAD files; package.json, native projects, rules, patches.

---------------------------------------------------------------------------------------------------------------------

## Open questions for the owner

Q1. useWorkoutManager.js:161 uses `computeRankProgressFromData` without importing it, so rank fields are never
    written when a workout is finished (the error is caught). The run leaves this exactly as it is. Add the import
    (starts writing rank to three user docs)?
Q2. 1_Feed.js: the level-up modal can never show on the Feed and the mute choice is not remembered, both because of
    declaration order (E1, E2). Fix or delete the dead plumbing?
Q3. MacroTracking.js calls an undefined `haptic` (import deleted in commit c994d2f2). The run deletes the dead
    calls; restore haptics on the barcode button and "Edit Goals" instead?
Q4. The friend-workout viewer (FeedWorkoutViewerSheet -> SpectatingWorkoutModal, and the UserStats viewer overlay)
    has been unreachable for several commits; the run removes its inert mounts (X-3) and keeps the four files
    loadable. Delete them (with utils/scale.js and the six viewer styles), or is "tap a workout to preview it"
    coming back?
Q5. Explore route (App.js:1586) and DeleteAccount route (App.js:1625) are registered but nothing navigates to them.
    Remove, park, or keep? (Explore keeps about 2,500 lines alive, with known crashes E5-E7 and feed-social E2-E3;
    its remaining dead hooks/effects/JSX were left in place. DeleteAccount.js never resets its in-flight flag on
    the "no uid" path.)
Q6. FeedSnapshotCard tab row / "Your Body" card and the FeedHeader logo and plain-title variants are hidden by every
    caller since commit 066bcf77. Delete those modes?
Q7. Rank-up queue: `dequeueRankPromotion()` plus a local `slice(1)` skips a step on multi-level promotions
    (ExercisesSection.js:355-358, 1_Feed.js:427-430), and two LevelUpTransition instances listen to one queue.
Q8. Nine in-screen `<Footer>` elements always render null because of `global.__USE_GLOBAL_FOOTER`. Remove them and
    the flag?
Q9. Stale closures that would need a dependency added: MuscleGroupExercises.js:554 (`completedWorkouts`),
    UserStatsProgressPreview.js:1254 (`metricMeta`), ExerciseLog `areEqual` ignoring `exerciseIndex`. Apply?
Q10. Weight save reports success when `updateDoc` returns false (not-found / permission-denied) in both weight
    screens. Show an error?
Q11. Chart tooltip: a tap during the 200 ms fade-out is lost (PS E2; same pattern in ED and UP). Fix?
Q12. ExerciseDetail: `completedWorkoutsSignature` samples the oldest 40 workouts; the unit resolver differs from the
    other screens (exact 'kg' only); `edges` on react-native's SafeAreaView is ignored. Intended?
Q13. ProfileLoggedFoodsScreen passes the entry without its key, so edits from "Logged Food Items" are discarded;
    swipe-to-delete right after changing day targets the previous day; the meals index is not invalidated on
    account switch (macro-screens E.3-E.5).
Q14. PostUploadOptionsScreen: editing a post drops `aspectRatio` / `isClip` of already-uploaded media;
    ImageCropperModal uses an undefined `styles.blockMask`; ClipBuilder rollback and permission edge cases.
Q15. ProfileWorkoutsAndPostsScreen: other users' profile refresh always fails (reads usersPrivate) and posts beyond
    the first chunk are dropped (E4, E5).
Q16. Auth: `additionalUserInfo` does not exist in the modular SDK (isNewUser always null); `auth/invalid-credential`
    is not mapped; Google code is exchanged twice. Fix any of these?
Q17. Notifications: scroll-to-top effect is a no-op on a SectionList; double haptic on follow notifications;
    Decline follow request UI is gone (backend/user/declineFollowRequest.js becomes unreferenced).
Q18. Share sheet can never open (ShareBottomSheet / ShareModal are stubs). Keep for a future feature?
Q19. Messages: `initChat` appends to the legacy `users/{uid}` doc; the group-chat sheet never closes
    programmatically; reaction and create-chat failures are unhandled rejections; best-effort calls without
    `.catch` (also useGroupViewing.js:189, EditProfileModal.js:63). Add catches?
Q20. useWorkoutManager: the store subscription never fires (zustand `subscribe` takes one argument); at mount an
    empty store clears the remote `currentWorkout`; usersPrivate totals are incremented twice per finished workout;
    `leaveWorkoutGroup` is skipped after a finish with logged work. Intended?
Q21. Rest timer: after "+15s" the notification is scheduled for the cumulative total; after a remount it cannot be
    cancelled. Fix?
Q22. `__DEV__` `[perf]` logging in the workout sheet and manager: keep or remove with `perfNow`?
Q23. Dead global writes (`__showWorkoutReminderForWid`, `openCurrentWorkoutSignal`, `userData.currentWorkouts`),
    the write-only `setIsVisible` chain, `persistWorkout`, the constant `enabled` prop of the workout portal, and
    the per-second `setTimer` store write: remove?
Q24. communityStats.js computes values nothing reads, costs Firestore reads on every user-doc snapshot and gates
    app readiness. Remove the module and its gate?
Q25. `coercePrivacyMode` always returns "global" and FeedWorkoutViewerSheet's stats privacy filter is a no-op. Is
    per-workout privacy retired?
Q26. backend/workouts: `wid: undefined` makes delete/update throw for id-less legacy workouts; editing an old
    workout re-dates it to the edit day; delete and update rebuild stats differently (`toMillis`, `setDay`).
Q27. functions/: three callables have no client caller (`computeHexagonStats`, `getTribeComparisonScores`,
    `appendWorkoutSets`; the last one always failed after writing, the run fixes its return line);
    `extractLatestWeight` iterates the wrong variable; live likes/comments never carry over to the auto post (key
    formats differ); handle/name propagation defects E-1..E-6 (double replacement, missing boundary, key-agnostic
    replacement, shared mutable config, over-broad name scope); unauthenticated paths in `deleteOwnAccount`,
    `submitModerationReport`, `resolveLoginIdentifier`.
Q28. fatsecretClient.js held a FatSecret consumer key and secret in a commented block (removed by this run, still
    in git history): rotate them? Is the generic `fatsecretMethod` function still wanted?
Q29. Which operator scripts are obsolete (resetUserContentByHandle, recomputeHexagonStandalone, setAllLastRanksToOne,
    the two codemods, removeWhiteExerciseBackgrounds, purgeLegacyData, the backend/admin simulate fork)?
Q30. May the two different `sanitizeWorkoutForRoute` fallbacks be unified (they differ only when a workout cannot be
    JSON-serialised)?
Q31. Small visual or text questions left untouched: SearchResultCard's invalid `'#rgba(...)'` fill; records value
    margin in the feed card; FollowListBottomSheet handle padding; `0:MM AM` at midnight in the chat list;
    `Nunito_500Medium` is not registered; hidden joint groups in the two muscle SVGs; unused fonts in fonts.js.
Q32. FoodSearchOverlay.js:1037 strips nothing from a scanned barcode (`/\\D/g` instead of `/\D/g`), so the local
    "Invalid barcode" branch can never run and the raw string goes to the server. Correct it? (Changes the message
    and saves a request for digit-less scans; needs a real camera to verify.)
Q33. FoodSearchOverlay's "Recent foods" list is rebuilt on every render of the overlay (a component defined during
    render); an open swipe row snaps shut on every keystroke. Hoist it? (Rows would then keep their swipe state;
    the list keys fall back to the row index when an entry has no id.)
Q34. Declaration-order residuals left in place because moving them would add a live dependency: SimpleFeedPost's
    report callbacks keep the owner uid/handle of the render in which the caption or post id last changed;
    ProfileWorkoutsAndPostsScreen's focus refresh does not re-run when `canViewContent` flips. Fix (declare first)?
Q35. The Babel preset lowers `const` to `var`; several screens rely on that (a value read above its declaration).
    The stable cases are fixed by this run; if the transform profile ever changes (for example `hermes-stable`),
    Q2 and Q34 become crashes. Worth fixing before upgrading React Native?

---------------------------------------------------------------------------------------------------------------------

## Files that can be deleted once the owner approves

Nothing is deleted in this run. The static gate expects exactly groups A and B to be unreachable.

A. The 38 files classified DEAD before the refactor (imported by nothing):
backend/getFollowers.js; backend/helper/generateFourDigitCode.js; backend/initUser.js; backend/initWorkout.js;
backend/messages/getChat.js; backend/messages/reactToMessage.js; backend/messages/sendMessage.js;
backend/posts/appendComment.js; backend/posts/eraseComment.js; backend/posts/likePost.js;
backend/posts/unlikePost.js; backend/retrieveFollowingUsers.js; backend/storage/getPFPs.js;
backend/storage/getPostImage.js; backend/storage/uploadImage.js; frontend/auth/socialAuthUtils.js;
frontend/components/2_Competition/RankTierMiniBadge.js;
frontend/components/3_Workout/NewWorkout/components/WorkoutReminderModal.js;
frontend/components/5_Profile/ViewStats/ViewStatsBottomSheet.js; frontend/constants/spartanAccount.js;
frontend/helper/formatTimestampToDateString.js; frontend/helper/getChatDisplayTime.js;
frontend/helper/getLeaderboardModalStyles.js; frontend/helper/getReverse.js; frontend/helper/leaveSharedWorkout.js;
frontend/helper/roundToNearestMinute.js; frontend/helper/useWorkoutFeed.js; frontend/hooks/useFoodLogs.js;
frontend/hooks/usePodiumPreview.js; frontend/hooks/usePodiumTop3.js; frontend/hooks/useResolvedUid.js;
frontend/hooks/useTemplates.js; frontend/lib/animstack/AnimStack.js; frontend/theme/ongoingWorkoutTheme.js;
frontend/utils/buildInitialUser.js; frontend/utils/postRecords.js; frontend/utils/workoutLinking.js;
shared/firestoreRefs.js.

B. Files that lose their last importer through this run:
- frontend/screens/FeedScreen.js (index.js exports the Feed screen directly).
- frontend/auth/completeSocialSignup.js (dead `pendingSocialAuth` branch removed).
- backend/user/declineFollowRequest.js (dead decline handler removed, Q17).
- frontend/utils/friends.js. Its only remaining importer is DEAD frontend/helper/useWorkoutFeed.js: delete the two
  together.
- The workout-viewer group (Q4), to be deleted together or not at all:
  frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js, frontend/components/3_Workout/ui/CopyTemplateToast.js,
  frontend/components/2_Competition/UserStats/UserStatsWorkoutViewerScreen.js,
  frontend/components/3_Workout/NewWorkout/SpectatingWorkoutModal.js, and with them frontend/utils/scale.js (its
  only remaining importers are SpectatingWorkoutModal.js and DEAD WorkoutReminderModal.js) and, inside
  UserStats/UserStatsStyles.js, the six viewer keys and the two `HANDLE_FRIEND_*` constants.
- shared/rebuildHexagonStats.js (the two operator scripts import functions/shared/rebuildHexagonStats.js directly
  after functions-scripts F1).

C. Already without importer before the run, never edited: functions/computeHexagon.js ("legacy entry point").
   After the owner deletes it, `export *` in functions/shared/computeHexagon.js can go too.

Not on the list: frontend/components/1_Feed/Posts/animConfig.js stays imported (the Explore-only item that would
orphan it is not applied); the Explore files and the operator scripts wait for Q5 and Q29.

---------------------------------------------------------------------------------------------------------------------

## Critic issues not adopted

Every issue of the three reviews was re-checked in the baseline source. All blockers and majors were confirmed and
are resolved in the sections above. This section records what was resolved by dropping or narrowing an item rather
than by the critic's alternative, the suggestions that were not taken, and one factual correction.

Resolution of each issue (lens / severity / where it landed):
| Issue | Resolution |
|---|---|
| behaviour 1 + mechanics 1: `isLivePost` name collision (SFP:283, PostFooter.js:79 confirmed) | Export renamed `isLivePostData`; exact result lines in SM-11; rule G-3.5; self-call pattern in check-adoption.cjs. |
| behaviour 2 + completeness 6: FSO E1 changes behaviour, E3 is not "same pixels" | E1 and E3 removed from the run (Q32, Q33). |
| behaviour 3 + mechanics 2: `buildRankPayload` move would invite the missing import | The function stays in useWorkoutManager.js; no-import rule in workout-active; gate criterion by rule + identifier. |
| behaviour 4: declare-before-use moves are not all neutral | Criterion and per-move table in G-4; SFP E2 (b)/(c) and PWP E2 not applied; USM E1 kept with its re-run condition stated. |
| behaviour 5: `unitLabel` parameter removal | B12 and #20 dropped. |
| mechanics 3: copying baseline ranges after in-place edits resurrects text; unused style keys invisible after extraction | G-5 rewritten (edit in place, then move working-tree text; lint the sheet before extraction); check-styles.cjs; baseline comparison per new module. |
| mechanics 4: BSD sed has no `\b` | perl recipes in G-4 (confirmed: the sed command changes nothing here). |
| mechanics 5: B8 would strip the frozen viewer file's styles | Exception in user-stats; X-3 keeps the file loadable. |
| mechanics 6 + completeness 7: aliases keep misleading names | Canonical names at all call sites (G-4, SM-4, SM-9, SM-13, SM-14). |
| mechanics 7: utils/scale.js still imported by SpectatingWorkoutModal.js | s0-scale text corrected; deletion coupling in the deletable list. |
| mechanics 8: fn-check does not link-check | Hand checks in backend-shared, functions-shared, functions-scripts; stage-2 item 9. |
| mechanics 9: transient cross-partition lint errors | G-3 rules 6-7; app-shell #21 verified against the baseline by the planner. |
| mechanics 10: no adoption check in stage 2 | check-adoption.cjs (GONE and USED tables), stage-2 item 3. |
| mechanics 11: B12 vs frozen shared/rebuildHexagonStats.js | "B1-B11, B13-B15, B17-B19". |
| completeness 1: oversized files unstated | "Oversized files" table with eleven accepted exceptions. |
| completeness 2: PointerBubbleCard clone | Shared in s0-charts (SM-3); bodies and styles confirmed identical apart from the fallback accent. |
| completeness 3: Y tick builder | `buildYTickValues` in chartMath (eight memo bodies confirmed identical). |
| completeness 4: geometry hoist without beneficiary | Stage 3 dropped from progress-section. |
| completeness 5: structural work on unreachable Explore code | No split, no `Pfp`, no adoption there; Explore-only files get lint-proven deletions only (G-4). |
| completeness 8: "optional" left open | Every such item is now accepted or not applied (G-2; feed-post, profile, profile-makepost). |

Not adopted, with the reason:
1. completeness 4, second alternative ("accept stage 3 together with the stateless chartParts pieces") and the
   implied further reduction of ProgressSection.js in completeness 1. Evidence: the repeated sub-blocks sit inside
   the four card JSX blocks PS:2852-4005, between the PanResponder views, the SVG gradients (ids differ per card)
   and keys with per-card prefixes; the audit itself rates the extraction "medium risk" and it is a rewrite under
   hard rule 3, not a move. No tool here can compare the rendered charts. The file stays at about 2,300 lines as a
   recorded exception with a follow-up.
2. behaviour 3, second alternative (move `buildRankPayload` and document the undefined name in the new file) and
   behaviour 5, second alternative (write out the eight call expressions). The smaller change was chosen in both
   cases: no move, no signature change.
3. behaviour 2, second alternative for E3 (apply the hoist as an "accepted behaviour delta"). Evidence:
   FSO:866 keys the rows with `String(it.id ?? idx)`, and each row owns `Swipeable` state; with stable mounts an
   index-keyed row can inherit the swipe state of a deleted neighbour. Left for the owner (Q33).
4. mechanics 10, alternative "rerun the knip configuration": replaced by the deterministic script, which is also
   self-tested against the baseline.
5. completeness 5 asked to limit Explore-only files to Tier-1 deletions; the plan is stricter (only what lint
   proves), which leaves feed-social #19, part of #21, #23, #24, #26, #27 undone and Posts/animConfig.js
   referenced.
6. Factual correction to completeness 7: the prev-normaliser renames touch 16 call sites, not 15 (useWorkoutEditing
   5, EWM 1, AWM 3, UWM 2, ExerciseLog 3, SetRow 1, PWEL 1).

Beyond the critics, two draft approvals were withdrawn for the same reason as FSO E1 (a behaviour change that the
smoke test cannot reach): profile E3 (DeleteAccount.js) and profile-makepost F5 (dependency-array edit).
