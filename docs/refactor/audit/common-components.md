# Audit: partition "common-components" (12 files, 2074 lines)

All 12 files were read completely, top to bottom. All are byte-identical to SPX/baseline. `SPX/tools/lint.sh` on the
partition is clean (no unused vars/imports/styles, no hook-rule errors, no unresolved imports). Line numbers below are
the numbers in the files as they are now.

Every file in this partition is LIVE. Two PARKED files import from it (VerifiedHandle only, see A).

---------------------------------------------------------------------------------------------------------------------

## A. Module map

| File | Purpose | Exports | Importers (outside the partition unless noted) |
|---|---|---|---|
| frontend/assets/PlusIcon.js (23) | 24x24 "plus" SVG icon; props `size`, `color`, `strokeWidth` | default `PlusIcon` | frontend/screens/MacroTracking.js:11 (only to prop-drill it: :943 -> components/2_MacroTracking/MacroDayPage.js:22,66 -> MealsSection.js:21,49,70-75 -> MealCard.js:9 where it is unused); frontend/components/2_MacroTracking/SearchResultCard.js:5,134 |
| frontend/assets/human_muscle_back_outline.js (215) | Back-view body SVG with per-region fills (`traps, calves, hamstrings, glutes, hands, forearms, triceps, back, shoulders`) and outline stroke | default `HumanMuscleBackOutline` | screens/PastWorkoutScreen.js:16; components/1_Feed/FeedSnapshotCard.js:12; components/1_Feed/SimpleFeedPost.js:21; components/2_Competition/sections/ProgressSection.js:36; components/2_Competition/UserStats/UserStatsProgressPreview.js:8; components/3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon.js:4 |
| frontend/assets/human_muscle_outline.js (238) | Front-view body SVG with per-region fills (`calves, quads, abs, obliques, hands, forearms, arms, shoulders, chest, traps`) | default `HumanMuscleOutline` | same six files as above (lines :15, :11, :20, :35, :7, :3) |
| frontend/components/charts/chartStyles.js (151) | Four shared StyleSheets for the progress charts (pointer bubble, typography, card layout) | named `chartPointerStyles`, `chartTypography`, `chartCardTypography`, `chartCardLayout` | screens/ExerciseDetail.js:22; components/2_Competition/sections/ProgressSection.js:32; components/2_Competition/UserStats/UserStatsProgressPreview.js:10 |
| frontend/components/common/CroppedVideo.js (107) | `react-native-video` wrapper that crops by scaling/translating the video inside an overflow-hidden View | default `CroppedVideo` (forwardRef) | components/1_Feed/Posts/PostMediaCarousel.js:11; components/1_Feed/SimpleFeedPost.js:18; components/5_Profile/MakePost/PostUploadOptionsScreen.js:6; .../MakePost/ClipBuilderScreen.js:10; .../MakePost/SelectPhotosScreen.js:13 |
| frontend/components/common/DismissableTextInput.js (33) | TextInput (or BottomSheetTextInput) + iOS keyboard-dismiss accessory | default `DismissableTextInput` (forwardRef) | screens/FoodDetail.js:17; 1_Feed/FeedHeader.js:29; 1_Feed/Comments/CommentsInputRow.js:8; 1_Feed/SharePost/ShareModal.js:10; 5_Profile/EditProfile/EditProfileModal.js:8; 5_Profile/ProfileTop/ProfileInfo.js:8; 5_Profile/MakePost/PostUploadOptionsScreen.js:27; 5_Profile/MakePost/ClipBuilderScreen.js:9; 3_Workout/NewWorkout/SelectExercise/SelectExerciseModal.js:31 (the LIVE one); 2_MacroTracking/LabeledNumber.js:4, PortionPickerModal.js:7, PersonalInfoSheet.js:19, QuickAddModal.js:7, FoodSearchOverlay.js:44 |
| frontend/components/common/ExerciseAvatar.js (104) | Round exercise thumbnail with initials fallback | default `ExerciseAvatar`; re-exports `getExerciseImageSource`, `toExerciseSlug`, `resolveExerciseImageByName` from ./exerciseImageMap (line 8) | screens/MuscleGroupExercises.js:19 (default + `toExerciseSlug`); 1_Feed/PastWorkoutExerciseLog.js:7; 3_Workout/NewWorkout/Tracking/ExerciseLog.js:13 |
| frontend/components/common/HistoryCalendarModal.js (395) | Bottom-sheet calendar listing months with marked (workout) days | default `HistoryCalendarModal` (memo) | screens/1_Feed.js:60 (single call site :1756-1763) |
| frontend/components/common/KeyboardDismissAccessory.js (44) | iOS InputAccessoryView with a "dismiss keyboard" button + id hook | default `KeyboardDismissAccessory`; named `useKeyboardAccessoryId` | in-partition: DismissableTextInput.js:4; outside: 3_Workout/NewWorkout/ActiveWorkoutModal.js:62 (:376, :1783); 3_Workout/NewWorkout/Tracking/EditableStat.js:6 (:107, :304) |
| frontend/components/common/ReportContentSheet.js (316) | Modal to report a post/comment/message/profile; calls helper/reportContent (Cloud Function `submitModerationReport`) | default `ReportContentSheet` | frontend/hooks/useReportContentSheet.js:2 only (hook used by screens/1.2_Chat.js:143, screens/4.1_ViewProfile.js:116, 1_Feed/SimpleFeedPost.js:439, 1_Feed/Comments/CommentsModal.js:34) |
| frontend/components/common/VerifiedHandle.js (149) | Handle text with leading verified badge sized from the text style | default `VerifiedHandle` | 17 files: screens/PastWorkoutScreen.js:31; components/FollowListBottomSheet.js:13; ViewProfile/ViewProfileHeader.js:9; 1_Feed/SimpleFeedPost.js:32; components/ProfileCard.js:10; 1_Feed/Posts/PostHeader.js:11; 1_Feed/Comments/CommentCard.js:14; 1_Feed/FeedHeader/ProfileCard.js:11; 1_Feed/Notifications/NotificationCard.js:19; 1.1_Messages/MessageCard.js:12; 5_Profile/ProfileTop/ProfileHeader.js:9; 4_Explore/UserCard.js:6; 2_Competition/UserStats/UserStatsModal.js:19; 1.2_Chat/ChatHeader.js:10; 3_Workout/NewWorkout/Group/GroupMenu.js:9; **PARKED** 2_Competition/Podium.js:7 and 2_Competition/LeaderboardCard.js:9 |
| frontend/components/common/exerciseImageMap.js (299) | slug -> bundled PNG `require()` table (263 entries) + slug normalisation | named `exerciseImageMap`, `toExerciseSlug`, `getExerciseImageSource`, `resolveExerciseImageByName` | in-partition: ExerciseAvatar.js:6,8; outside: screens/ExerciseDetail.js:24 (`toExerciseSlug`); 3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview.js:6 (`getExerciseImageSource`, `toExerciseSlug`) |

No file in the partition is referenced from scripts/, tests/, backend/admin/ or functions/ (scripts/crop_exercise_images.py and
scripts/removeWhiteExerciseBackgrounds.js only touch the `exercises copy/` image folder, not the map module).

---------------------------------------------------------------------------------------------------------------------

## B. Verified dead code

Legend: SAFE = removal is behaviour-preserving and verified; OPTIONAL = dead today but part of a reusable component's API
or defensive, low value; KEEP = looks dead but must stay.

### B1. Machine findings (knip) - both verified

| Identifier | Kind | Location | Evidence | Action |
|---|---|---|---|---|
| `resolveExerciseImageByName` | unused export + unused function | exerciseImageMap.js:297-298; re-exported at ExerciseAvatar.js:8 | Repo-wide grep: only these two definitions/re-exports; nobody imports it (not LIVE, PARKED, TOOLING, functions/). Not used inside its own file. | SAFE: delete lines 297-298 (and the blank line 296) and drop the name from ExerciseAvatar.js:8. |
| `exerciseImageMap` (the object) | export keyword unused | exerciseImageMap.js:3 | Grep for the identifier: every other hit is the module *path* `./exerciseImageMap`; the binding is read only at exerciseImageMap.js:295. No dynamic/string access. | SAFE: change `export const exerciseImageMap` to `const exerciseImageMap` (keep the object). |

### B2. Unused re-exports

| Identifier | Location | Evidence | Action |
|---|---|---|---|
| re-export `getExerciseImageSource` | ExerciseAvatar.js:8 | Nobody imports it from ExerciseAvatar (ExerciseImagePreview.js:6 imports it from exerciseImageMap). | SAFE: remove from the re-export list. |
| re-export `resolveExerciseImageByName` | ExerciseAvatar.js:8 | see B1 | SAFE: remove. |
| re-export `toExerciseSlug` | ExerciseAvatar.js:8 | USED by screens/MuscleGroupExercises.js:19 (`import ExerciseAvatar, { toExerciseSlug } from ".../ExerciseAvatar"`). | Keep unless cross-partition request G1 is applied; then delete line 8 (and the blank line 7) entirely. Without G1, shrink line 8 to `export { toExerciseSlug } from "./exerciseImageMap";`. |

### B3. Dead prop / dead computation chain (verified against node_modules source)

| Identifier | Location | Evidence | Action |
|---|---|---|---|
| `contentContainerStyle={[styles.sheetContent, { paddingBottom: contentPaddingBottom }]}` on `<BottomSheet>` | HistoryCalendarModal.js:247 | @gorhom/bottom-sheet 4.6.4 (`node_modules/@gorhom/bottom-sheet/src/components/bottomSheet/BottomSheet.tsx`, the `react-native` entry Metro uses) destructures a fixed prop list (lines 100-175) with no rest-spread; `contentContainerStyle` exists only as an internal variable (line 1381). The project patch `patches/@gorhom+bottom-sheet+4.6.4.patch` does not add it. The prop is silently ignored, so the padding has never been applied. | SAFE to delete the prop. Do NOT "fix" it by applying the padding (that changes the UI; see E1/I1). |
| `contentPaddingBottom` (useMemo) | HistoryCalendarModal.js:111-114 | Only consumer is the ignored prop above. | SAFE to delete together with line 247. |
| `insets` / `useSafeAreaInsets` | HistoryCalendarModal.js:105, import at :4 | Only consumer is `contentPaddingBottom`. Removing the hook removes one hook from every render consistently (no conditional-hook issue) and one context subscription that had no visible effect. | SAFE to delete together with the two rows above. |
| `styles.sheetContent` | HistoryCalendarModal.js:337-340 | Only referenced at :247. | SAFE to delete with :247. |
| `styles.sheetContainer` (empty object `{ }`) | HistoryCalendarModal.js:331, used at :246 (`style={styles.sheetContainer}`) | Empty style = no-op. | SAFE: delete the key and the `style=` prop line. |
| `styles.dayLogged` (empty object `{}`) | HistoryCalendarModal.js:382, used at :298 (`cell.isMarked && styles.dayLogged`) | Empty style = no-op. | SAFE: delete the key and the array entry at :298. |

If the implementer prefers zero risk in this timing-sensitive file (see H2), the whole B3 block can be left in place; it is
dead, not harmful.

### B4. Unreachable branches / constant conditions

| What | Location | Evidence | Action |
|---|---|---|---|
| `if (!videoWidth || !videoHeight) return null;` | CroppedVideo.js:18 | Lines 10-11 already returned when `!naturalSize?.width || !naturalSize?.height`; lines 16-17 just copy those two values. Always false. | SAFE: delete line 18 only (lines 16-17 are still used at 20-28). |
| `theme.textPrimary ?? '#F6F8FF'` (5x) | chartStyles.js:49, 89, 99, 105, 115 | `frontend/theme/mfpDark.js:17` defines `textPrimary: '#EAF0F7'` as a constant literal; the `??` right side can never be used. | SAFE: replace each with `theme.textPrimary`. Purely cosmetic; skip if in doubt. |
| `if (!parts.length) return "?";` | ExerciseAvatar.js:15 | `String.prototype.split` on a string always returns at least one element (`"".split(/\s+/)` -> `[""]`), and the empty case is already covered by `return initials || "?"` at :21. | SAFE: delete line 15. Low value. |
| `if (!style) return 0;` | VerifiedHandle.js:12 | Only caller passes `flattened`, which is `StyleSheet.flatten(textStyle) || {}` (line 43): never falsy. | OPTIONAL (defensive one-liner in a tiny helper). Recommend leaving it. |
| rAF fallback: `typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 0)` and the cleanup `else if (typeof handle === "number") clearTimeout(handle)` | HistoryCalendarModal.js:127-129 and :137-141 | `requestAnimationFrame`/`cancelAnimationFrame` always exist in the RN runtime; the same file calls `requestAnimationFrame` unguarded at :212. | OPTIONAL. Recommend LEAVING it (fragile timing code, H2). |
| `if (InteractionManager?.runAfterInteractions) ... else performScroll();` | HistoryCalendarModal.js:219-220 | `InteractionManager.runAfterInteractions` always exists. | OPTIONAL. Recommend LEAVING it (H2). |
| `marksSet` Array and object branches | HistoryCalendarModal.js:182-183 | Sole caller passes a `Set` (screens/1_Feed.js:468 `buildWorkoutDaySet(...)`, :1761). | OPTIONAL defensive input normalisation. Recommend leaving. |
| non-number `size` branch `scaleSize(Number(size) || DEFAULT_SIZE)` | ExerciseAvatar.js:34 | All three call sites pass a number (`scaleSize(50)`, `scaleSize(42)`, `scaleSize(46)`); default is a number. | OPTIONAL. See E2 (the branch is also wrong). Recommend leaving, or collapse `resolvedSize` to `size` only with owner sign-off. |

### B5. Props that no caller passes

| Prop | Location | Evidence | Action |
|---|---|---|---|
| `videoStyle` | CroppedVideo.js:37, used :70, :75, dep :82 | None of the 5 call sites passes it (PostMediaCarousel.js:39-52, SimpleFeedPost.js:786-797, PostUploadOptionsScreen.js:743-754, ClipBuilderScreen.js:580-590, SelectPhotosScreen.js:397-411). | OPTIONAL: remove the prop and its three uses. Result is identical (`undefined` entries in a style array are ignored). |
| `onLayout` (`onLayoutProp`) | CroppedVideo.js:39, :51, dep :53 | No call site passes it. | OPTIONAL: remove (then `handleLayout` needs no dependency). Note: if removed from the destructuring, a future `onLayout` would flow through `...props` to `<Video>`; irrelevant today. |
| `showFallbackInitials` | ExerciseAvatar.js:30, :54 | Repo-wide grep: only these two lines. Always `true`. | OPTIONAL: remove prop; `showInitials` becomes `!imageSource`. |
| `iconColor` | VerifiedHandle.js:29, :109 | No `<VerifiedHandle` call site passes it (the only `iconColor=` in the repo is `<AuthButton>` in components/auth/AppleAuthButton.js:72). Always `theme.primary`. | OPTIONAL: remove prop, use `theme.primary` at :109. |
| `textProps` | VerifiedHandle.js:34, :95, :120 | No call site passes it. Always `{}`. | OPTIONAL: remove prop and both spreads. |
| `inputAccessoryViewID` (`providedAccessoryId`) | DismissableTextInput.js:8, :14, :16 | No `<DismissableTextInput` call site passes it and none spreads props into it (the two `inputAccessoryViewID=` hits in ActiveWorkoutModal.js:694 and EditableStat.js:295 are on plain `TextInput`s). | KEEP (recommended): it is the standard TextInput prop this wrapper has to intercept; removing it would make the wrapper silently override a caller-supplied id. |
| `onSubmit` | ReportContentSheet.js:43, :93, dep :114 | Its only caller, hooks/useReportContentSheet.js:5,24, forwards `options.onSubmit`, and all four `useReportContentSheet()` calls pass no options. Always `undefined`, so `fn` is always `reportContentHelper`. | Cross-partition (G2): remove only together with the hook's `options` parameter. Otherwise KEEP. |
| payload field `isToday` | HistoryCalendarModal.js:229 | Sole consumer `handleSelectCalendarDate` (screens/1_Feed.js:1263-1299) reads `timestamp`, `dayKey`, `isMarked` only. | OPTIONAL: remove line 229. Low value. |
| `title` default `"Calendar"` | HistoryCalendarModal.js:103 | Sole caller passes `title="Calendar"` (1_Feed.js:1762): default and argument are redundant with each other. | Leave (harmless); see G3. |

`PlusIcon` (`size`, `color`, `strokeWidth`), both muscle outlines (`color`, `fills`, `strokeColor`, `strokeWidth`, rest),
`KeyboardDismissAccessory` (`accessoryID`), `DismissableTextInput` (`enableAccessory`, `useBottomSheetInput`),
`ExerciseAvatar` (`name`, `slug`, `size`, `style`, `imageStyle`), `VerifiedHandle` (`handle`, `isVerified`, `textStyle`,
`containerStyle`, `iconSize`, `iconStyle`, `numberOfLines`, `ellipsizeMode`, `preserveTextAlignment`) and
`HistoryCalendarModal` (all six props): every remaining prop is passed by at least one LIVE caller.

### B6. Invisible SVG content (verified, optional)

| What | Location | Evidence | Action |
|---|---|---|---|
| Six `<G display="none">` joint-marker groups | human_muscle_outline.js:115-233 | react-native-svg 14.1.0 honours `display="none"` (`src/lib/extract/extractProps.ts:98-99`), so these 24 ellipses are never drawn. | OPTIONAL-SAFE: delete lines 115-233. |
| `<Defs><RadialGradient id="jointradial">` | human_muscle_outline.js:30-42 | The gradient is referenced only by `fill="url(#jointradial)"` inside the hidden groups above. | Delete only together with 115-233; then `Defs`, `RadialGradient`, `Stop`, `Ellipse` become unused imports (lines 3, 4, 5, 8) and must be removed too. |
| `data-name="hover"` attributes | human_muscle_outline.js:120, 139, 147, 158, 166, 177, 185, 198, 206, 219, 227 | Not a react-native-svg prop (not extracted, not forwarded). All sit inside the hidden groups. | Goes away with 115-233. |
| Seven `<G display="none">` joint-marker groups (+ their comments) | human_muscle_back_outline.js:165-209 | Same evidence. | OPTIONAL-SAFE: delete lines 165-209. |
| `<Defs>` gradient | human_muscle_back_outline.js:29-41 | Referenced only inside 165-209. | Delete with 165-209; then `Defs`, `RadialGradient`, `Stop` imports (lines 3-5) go. `Ellipse` STAYS (visible ankle ellipses at :50-69). |

Pixel output is identical; the only runtime difference is fewer native SVG nodes per body graph. This removes about 197
lines. It is listed as optional because these are SVG-export assets (the hidden groups look like "hover joints" from the
source artwork, see I4). If removed, do it with line-range deletes only and leave every path `d` string untouched.

### B7. Nothing to remove

No `console.log`, no commented-out code and no stale notes anywhere in the partition. `console.error` at
ReportContentSheet.js:109 is on a real failure path (keep). The empty `catch { }` blocks at HistoryCalendarModal.js:134
and :216 wrap native sheet/scroll calls (keep, defensive). The comments at PlusIcon.js:4, exerciseImageMap.js:1,
VerifiedHandle.js:20-23 and :58 explain intent (keep).

---------------------------------------------------------------------------------------------------------------------

## C. Duplication

### C1. `scaleSize`: two different functions with the same name  (NOT identical - do not unify)
- frontend/helper/scaleSize.js:21 (default export): `Math.round(n * min(W/390, H/844))`.
- frontend/components/2_Competition/layoutConstants.js:11 (named `scaleSize`, imported by chartStyles.js:4): divides the
  window size by an *already scaled* base (`BASE = { width: baseScaleSize(390), height: baseScaleSize(844) }`), so the
  ratio is ~1.0 on every device. Computed: on 430x932 `helper(184)=203` but `layoutConstants(184)=184`; on 375x667
  `helper(184)=145` vs `184`; identical only on a 390x844 screen.
- Consequence for this partition: chartStyles.js:4 must keep importing `scaleSize` from `../2_Competition/layoutConstants`.
  Swapping it to `helper/scaleSize` would resize every chart tooltip/card on all non-iPhone-13 devices.
- `ts` from layoutConstants (re-export at layoutConstants.js:46) IS the same binding as `ts` in helper/scaleSize.js:56;
  identical. Leave the import line as is (changing only `ts` buys nothing).
- Other local `scaleSize` definitions exist outside this partition (screens/0.0_SignUp.js:24, 0.1_LogIn.js:24,
  0.3_UserLogInCredentials.js:14, components/ViewProfile/ViewProfileRowButtons.js:15,
  5_Profile/MakePost/PostUploadOptionsScreen.js:32, ClipBuilderScreen.js:24): not compared here.

### C2. Day-key formatting (`YYYY-MM-DD`, local time)
Locations: HistoryCalendarModal.js:12 `dayKey`; frontend/utils/date.js:3 `toDayKey`; screens/1_Feed.js:87 `dateToDayKey`
(+ :111 `toDayKeyString`); screens/MacroTracking.js:104 `toDayKeyString`;
components/2_Competition/UserStats/effectiveStatsUser.js:3 `toDayKey`; logic/useWorkoutManager.js:80 `toDayKeySafe`;
backend/workouts/updateCompletedWorkout.js:43 and deleteCompletedWorkout.js:34 `toDayKey`;
shared/hexagon/computeHexagonCore.js:150; functions/index.js:4159; functions/shared/rebuildHexagonStats.js:37.

All produce the same string for a valid `Date`. They differ in accepted inputs and failure value:
- HistoryCalendarModal `dayKey(dateLike)`: anything `new Date()` accepts; falsy or invalid -> `""`.
- utils/date `toDayKey(d)`: requires a `Date`; no validation (throws on non-Date, `"NaN-NaN-NaN"` on invalid Date).
- 1_Feed `dateToDayKey(date)`: requires a `Date`; non-Date or invalid -> `null`.
- effectiveStatsUser `toDayKey`: number/string/Timestamp; anything else -> today; exception -> `""`.
- useWorkoutManager `toDayKeySafe`: via `toMillis`; missing/zero -> today.
- backend/shared/functions variants: via `toMillis`; zero/missing -> `""` (functions/index.js: -> today).

Within HistoryCalendarModal the three call sites (:45, :72, :73) always pass a valid `Date`, so there `dayKey(x)` is
equivalent to `toDayKey(x)` from frontend/utils/date.js. Recommended canonical home: frontend/utils/date.js `toDayKey`.
Replacing the local helper is permissible under rule 4 (identical for every input it receives) but gains 7 lines; treat as
OPTIONAL. The other variants are NOT interchangeable with each other: leave them.

### C3. Day-key parsing
- HistoryCalendarModal.js:22 `parseKeyToDate(key)` -> `Date | null`.
- screens/1_Feed.js:96 `dayKeyToTimestamp(key)` -> `number | null`: same algorithm (split on "-", exactly 3 parts, finite
  numbers, `new Date(y, m-1, d)`, midnight), but returns epoch ms and additionally rejects non-string keys
  (`parseKeyToDate` would throw on a truthy non-string).
- logic/macroLogsIndexer.js:122 `dayKeyToDate(dk)` -> `Date | null`: coerces with `String()`, does not require exactly 3
  parts (accepts `"2024-01-02-xx"`), and rejects any zero component.
- backend/workouts/*.js `parseDayKey`, shared/hexagon/computeHexagonCore.js `parseDayKey`: return ms / 0, default missing
  parts to 1.
Not identical: leave all in place.

### C4. Calendar label constants (identical values)
- `MONTH_NAMES` HistoryCalendarModal.js:9  ==  local `months` array in components/2_Competition/UserStats/userStatsUtils.js:180.
- `WEEKDAY_LABELS` HistoryCalendarModal.js:10  ==  `WEEKDAY_LABELS` screens/ExerciseDetail.js:158 (used at :1273).
Identical arrays. Canonical home if the plan wants one: frontend/utils/date.js (e.g. `MONTH_ABBREVIATIONS`,
`WEEKDAY_ABBREVIATIONS`). Low value (two one-line constants); only do it if the other two partitions agree (G6).

### C5. Muscle outline preamble (identical)
human_muscle_outline.js:11-12 + :21-26 and human_muscle_back_outline.js:12-13 + :22-25: same `OUTLINE_STROKE_WIDTH = 5`,
`OUTLINE_STROKE_COLOR = "#d8e2ff"`, and same `outlineStrokeColor` / `outlineStrokeWidth` / `fillColor` logic (only line
wrapping and 2- vs 4-space indent differ). Also the same `<Defs>` block (:30-42 vs :29-41). Recommendation: leave
duplicated (two generated asset files, about 8 logic lines; a shared module would add an import for no gain).

### C6. Redundant per-element SVG props (same file)
human_muscle_back_outline.js:118-163: every `<Path>`/`<Line>` inside the outline `<G>` repeats
`fill="none" stroke=... strokeLinecap strokeLinejoin strokeWidth=...`, which the parent `<G>` at :117 already sets.
Functionally redundant, but do NOT strip (exported asset, 30 long lines of churn, inherited-vs-explicit prop risk).

### C7. "slug or slug-from-name" lookup
ExerciseAvatar.js:46-52 and 3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview.js:31-38 both compute
`slug || toExerciseSlug(name)` then `getExerciseImageSource(...)`. Behaviour is the same (toExerciseSlug returns `""` for
non-strings). Three lines each inside `useMemo`s; not worth a shared helper. (The existing helper
`resolveExerciseImageByName` does not cover the explicit-slug case and is unused: delete it, B1.)

### C8. Identical style entries (same file)
VerifiedHandle.js:142-147 `text` and `fallbackText` are both `{ includeFontPadding: false }`. Could be one key; leave
(two call sites, zero benefit).

### C9. Form reset repeated (same file)
ReportContentSheet.js:52-55 (effect on `!visible`) and :117-120 (`handleDismiss`) run the same four setters. Leave: the
second one also covers the case where `onClose` does not flip `visible`, and merging changes when state resets.

No jscpd clones (>= 8 lines) were reported for the partition, which matches the reading.

---------------------------------------------------------------------------------------------------------------------

## D. Decomposition plans for files over about 500 lines

None. The largest files are HistoryCalendarModal.js (395), ReportContentSheet.js (316) and exerciseImageMap.js (299, of
which 265 are the generated `require` table). No split is recommended.

If someone wants a seam anyway: HistoryCalendarModal.js:9-95 (`MONTH_NAMES`, `WEEKDAY_LABELS`, `dayKey`, `monthIndexOf`,
`parseKeyToDate`, `buildMonthData`, `buildCalendarMonths`) is pure, closes over nothing and could move verbatim to
`frontend/components/common/historyCalendarUtils.js`; the component needs `MONTH_NAMES`, `WEEKDAY_LABELS`, `monthIndexOf`
and `buildCalendarMonths` back. Not needed at this size.

---------------------------------------------------------------------------------------------------------------------

## E. Latent bugs

E1. HistoryCalendarModal.js:247 - `contentContainerStyle` is not a `BottomSheet` prop (v4.6.4), so `styles.sheetContent`
(paddingHorizontal 20, paddingTop 12) and the safe-area bottom padding are never applied. Confidence: HIGH (library
source checked, B3). Minimal change that preserves behaviour: delete the ignored prop and its dead inputs (B3), or leave
it. Do NOT wire the padding to a wrapper View: the layout was evidently tuned without it (`weekHeader` and `monthBlock`
carry their own `paddingLeft: scaleSize(20)` at :358 and :361), so applying it would visibly shift the calendar. Recorded
as open question I1.

E2. ExerciseAvatar.js:34 - fallback `scaleSize(Number(size) || DEFAULT_SIZE)` double-scales the default
(`DEFAULT_SIZE` is already `scaleSize(38)` at :10). Unreachable today (every caller passes a number), so it has no
effect. Confidence it is unintended: MEDIUM. No fix recommended (not unambiguous, not reachable); either leave or remove
the branch as dead (B4).

E3. DismissableTextInput.js:14-16 - with `useBottomSheetInput` on iOS the input gets `inputAccessoryViewID={generatedId}`
but no `InputAccessoryView` with that id is rendered (`showAccessory` is false). The id dangles, which iOS treats as "no
accessory". Probably intentional (no accessory inside sheets); net behaviour equals passing `undefined`. Confidence that
it is harmless: MEDIUM-HIGH. No change recommended (I2).

E4. exerciseImageMap.js:271 vs :26 - `EXERCISE_SLUG_OVERRIDES["bicep-curl-machine"] = "biceps-curl-machine"` although the
map has its own `'bicep-curl-machine'` image (a different PNG; md5 differs). Via name lookup the `bicep-` image can never
be shown; it is reachable only through an explicit `slug` prop. Unclear whether intended. No change (I3).

No references to undefined names, no duplicate object keys (the 263 map keys were checked for duplicates; all 263 PNG
paths exist on disk), no conditional hooks, no effects missing cleanup (the two effects in HistoryCalendarModal clean up
their timer / frame; ReportContentSheet's effect needs none).

---------------------------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Issue | Location | Suggested change | Risk |
|---|---|---|---|---|
| F1 | A module is imported through two paths: `toExerciseSlug` comes from `exerciseImageMap` in two files and from the `ExerciseAvatar` re-export in one. | ExerciseAvatar.js:8; MuscleGroupExercises.js:19 | Apply G1, then delete the re-export line. | None (same binding). |
| F2 | Re-export statement sits between the import block and the code. | ExerciseAvatar.js:8 | Disappears with F1; otherwise leave. | None. |
| F3 | Anonymous arrow inside `forwardRef` -> component has no display name in DevTools/warnings. | DismissableTextInput.js:6-30 | `forwardRef(function DismissableTextInput({...}, ref) { ... })` (touches lines 6, 11 and 30 only). | Very low; purely a name. OPTIONAL. |
| F4 | Inline style object created per render. | KeyboardDismissAccessory.js:34 `<View style={{ flex: 1 }} />` | Add `spacer: { flex: 1 }` to the StyleSheet at :7-22 and use `styles.spacer`. | None. OPTIONAL. |
| F5 | `useRef(expr)` evaluates `Math.random()...` on every render although only the first value is kept. | KeyboardDismissAccessory.js:25 | Leave. A lazy initialiser would be cleaner but changes nothing observable. | n/a |
| F6 | Exported object that only its own module reads. | exerciseImageMap.js:3 | Drop `export` (B1). | None. |
| F7 | Dead optional-fallback expressions on a constant theme. | chartStyles.js:49, 89, 99, 105, 115 | `theme.textPrimary` (B4). | None. |
| F8 | Shared chart style module depends on a feature folder (`../2_Competition/layoutConstants`). | chartStyles.js:4 | Leave: the two `scaleSize`s are different functions (C1). | High if "fixed". |
| F9 | JSX indentation is off (children of `<BottomSheet>` indented 8 extra spaces; the day-circle block mis-nested). | HistoryCalendarModal.js:249-318, :294-310 | Leave (rule 6: no formatting churn). If :298 is edited for B3, change only that line. | n/a |
| F10 | File naming: snake_case files exporting PascalCase components; front outline uses 2-space indent, ReportContentSheet uses 2-space indent. | frontend/assets/human_muscle_*.js; ReportContentSheet.js | Leave (no renames; keep each file's own style). | n/a |

Hook order is correct everywhere: all hooks run before the early returns at HistoryCalendarModal.js:233 and
VerifiedHandle.js:89; KeyboardDismissAccessory's early return (:30) has no hooks. No component is defined inside another
component's render (`ReasonRow` is module-level; `renderHandle`/`renderBackdrop` are memoised render callbacks, which is
the bottom-sheet API). Imports have no duplicates.

---------------------------------------------------------------------------------------------------------------------

## G. Cross-partition requests

G1. frontend/screens/MuscleGroupExercises.js:19 - change
`import ExerciseAvatar, { toExerciseSlug } from "../components/common/ExerciseAvatar";` to import `toExerciseSlug` from
`"../components/common/exerciseImageMap"` (as ExerciseDetail.js:24 and ExerciseImagePreview.js:6 already do), keeping the
default `ExerciseAvatar` import. Then ExerciseAvatar.js:8 can be deleted. If this is not done, ExerciseAvatar.js:8 must
keep `toExerciseSlug`.

G2. frontend/hooks/useReportContentSheet.js:4-5,24 - `options` / `onSubmit` is never supplied by any of the four callers
(1.2_Chat.js:143, 4.1_ViewProfile.js:116, SimpleFeedPost.js:439, CommentsModal.js:34). If the hooks partition removes it,
remove the `onSubmit` prop from ReportContentSheet in the same change (ReportContentSheet.js:43; replace :93 with a
direct `reportContentHelper(payload)` call; drop `onSubmit` from the deps at :114). Also note for that partition: the
hook's returned `closeReportSheet` and `isReportSheetVisible` are not destructured by any caller.

G3. frontend/screens/1_Feed.js:1762 - `title="Calendar"` equals the component default (HistoryCalendarModal.js:103);
either side is redundant. And `handleSelectCalendarDate` (1_Feed.js:1263-1299) never reads `payload.isToday`; if the
feed-screen owner agrees, HistoryCalendarModal.js:229 can go.

G4. Macro tracking: `PlusIcon` is imported in screens/MacroTracking.js:11 only to be prop-drilled
(:943 -> MacroDayPage.js:22,66 -> MealsSection.js:21,49,70-75 -> MealCard.js:9, where the prop is unused). MealsSection
could import `../../assets/PlusIcon` directly (as SearchResultCard.js:5 does), which removes the prop from three
components and makes the `PlusIcon ? ... : null` guard at MealsSection.js:70 unnecessary. Nothing changes in PlusIcon.js.

G5. components/3_Workout/NewWorkout/SelectExercise/SelectExerciseModal.js:535 - bare `enableAccessory` equals the
default (`true`, DismissableTextInput.js:7); redundant at the call site.

G6. Optional shared constants: if a shared date module is extended (frontend/utils/date.js), ExerciseDetail.js:158
(`WEEKDAY_LABELS`) and userStatsUtils.js:180 (`months`) hold the same arrays as HistoryCalendarModal.js:9-10 (C4).

G7. Warning to every partition that touches charts or `2_Competition`: `scaleSize` from
components/2_Competition/layoutConstants.js is NOT the same function as helper/scaleSize (C1). Do not "normalise" imports
between the two.

---------------------------------------------------------------------------------------------------------------------

## H. Fragile areas

H1. exerciseImageMap.js:3-267 - 263 static `require()` calls that Metro resolves at bundle time; the path contains a
space (`exercises copy`). Keep every string literal and the `../../../` depth exactly; do not generate the table
dynamically, do not move the file. Do not "fix" the misspelt keys (`incline-chess-press-machine` :89, `pullover-dumbell`
:134, `standing-tricep-extention-dumbbell` :192): they are the on-disk folder names, and `EXERCISE_SLUG_OVERRIDES`
(:270-275) maps the correct spellings onto them. `normalizeName` (:277-287) defines the slug contract for exercise names
(the regex at :282 contains a typographic apostrophe; keep it byte-for-byte).

H2. HistoryCalendarModal.js:109-143 and :202-221 - mount/unmount choreography: `mounted` state with a 320 ms unmount
delay, `snapToIndex(0)` / `close()` on the next animation frame, `scrolledRef` reset effect, and the initial
scroll-to-month done from `onLayout` through `InteractionManager.runAfterInteractions` + `requestAnimationFrame`. Order
and timing are tuned to the bottom-sheet animation. Leave all of it (including the unreachable fallbacks in B4).
The early `return null` at :233 must stay after every hook.

H3. DismissableTextInput.js / KeyboardDismissAccessory.js - the accessory works only because the input's
`inputAccessoryViewID` and the accessory's `nativeID` are the same string, generated once per mount by `useRef`
(KeyboardDismissAccessory.js:25). In DismissableTextInput the prop order matters: `{...rest}` first, then
`inputAccessoryViewID={accessoryID}` (:22-23). The component returns a Fragment with two siblings; parents rely on that.
`ref` is forwarded to either `TextInput` or `BottomSheetTextInput` (CommentsInputRow, ProfileInfo and FoodSearchOverlay
call `.focus()`/`.blur()` on it).

H4. CroppedVideo.js:86-91 - prop order on `<Video>`: `ref`, `{...props}`, then `style` and `onLoad`, so the wrapper's
`style`/`onLoad` win over anything in `props`. `handleLoad` must keep forwarding the original event (SimpleFeedPost,
PostUploadOptionsScreen, ClipBuilderScreen and SelectPhotosScreen read `naturalSize`/duration from it). The crop maths
(:20-30) scales by width only, by design.

H5. Muscle outlines - the region names passed to `fillColor(...)` are a contract with the callers' fill maps
(front: calves, quads, abs, obliques, hands, forearms, arms, shoulders, chest, traps; back: traps, calves, hamstrings,
glutes, hands, forearms, triceps, back [used twice: lats :99 and lower back :104], shoulders). Path data must stay
byte-identical (it even contains an exporter artefact, `.12000000000000001`, at human_muscle_outline.js:77). `{...props}`
on `<Svg>` (:29 / :28) must stay after `fill` and `viewBox` because callers pass `width`, `height`,
`preserveAspectRatio`, `style`. The visible ankle ellipses at human_muscle_back_outline.js:50-69 are NOT part of the
hidden joint groups.

H6. chartStyles.js - the four sheets are shared by ExerciseDetail.js, ProgressSection.js and
UserStatsProgressPreview.js (about 280 references; every one of the 26 keys is used). Any value change shows up in all three. The
`scaleSize` import must stay on layoutConstants (C1).

H7. ReportContentSheet.js:18-25 and :94-98 - `REASONS[].key` values must match `ALLOWED_REPORT_REASONS` in
functions/index.js:4171-4178, and the payload shape `{ context, reason, details }` is the `submitModerationReport`
contract (functions/index.js:4296 ff.). Do not rename keys or fields. The `title` switch (:61-73) matches the
`targetType` strings sent by callers (`post`, `comment`, `comment-reply`, `message`, `profile`).

H8. VerifiedHandle.js:42-83 - icon slot geometry (margin ratio, minimum sizes, padding mirroring) is visual tuning used
by 17 files including PARKED Podium.js and LeaderboardCard.js. Props `handle`, `isVerified`, `textStyle`,
`containerStyle`, `numberOfLines`, `iconSize` are used by the PARKED files and must keep working unchanged.

---------------------------------------------------------------------------------------------------------------------

## I. Open questions for the owner

I1. HistoryCalendarModal.js:247 - the sheet's content padding (20 horizontal, 12 top, safe-area bottom) has never been
applied because `contentContainerStyle` is not a BottomSheet prop. The calendar currently has 20 px padding on the left
only (`weekHeader`/`monthBlock` `paddingLeft`), none on the right. Is the current asymmetric look intended? The refactor
will keep it and at most delete the ignored prop.

I2. DismissableTextInput.js:14-16 - inside bottom sheets (`useBottomSheetInput`) the input references an accessory id
that is never rendered. Intentional ("no dismiss bar in sheets") or should the dismiss bar appear there too?

I3. exerciseImageMap.js:26, :28, :271 - both `bicep-curl-machine` and `biceps-curl-machine` images exist and differ, but
the override sends the first name to the second image. Is the `bicep-curl-machine` artwork obsolete (then its map entry
and folder could go) or is the override wrong?

I4. human_muscle_outline.js:115-233 and human_muscle_back_outline.js:165-209 - hidden joint markers (`display="none"`,
"hover" artwork) plus their gradient defs. Keep for a planned feature, or delete (about 197 lines, fewer native nodes)?

I5. exerciseImageMap.js:1 says "Auto-generated", but no generator exists in the repo. If one exists elsewhere, edits to
this file (B1) need to be mirrored there.

I6. ExerciseAvatar.js:34 - should a non-numeric `size` be supported at all? Today it is unreachable and double-scales
the default.
