# Audit: partition "user-stats" (12 files, 4781 lines)

Read-only audit. All 12 files were read top to bottom. Working-tree files are byte-identical to SPX/baseline, so the line numbers below are valid for both.

Abbreviations
- `US/` = `frontend/components/2_Competition/UserStats/`
- UPP = `US/UserStatsProgressPreview.js`, PS = `frontend/components/2_Competition/sections/ProgressSection.js`, ED = `frontend/screens/ExerciseDetail.js`
- PWP = `frontend/screens/ProfileWorkoutsAndPostsScreen.js`, FEED = `frontend/screens/1_Feed.js`

Tooling note: Babel (`@react-native/babel-preset` -> `@babel/plugin-transform-block-scoping`, unconditional, see `node_modules/@react-native/babel-preset/src/configs/main.js:43`) turns `const`/`let` into `var`, so there is no temporal dead zone at runtime. That matters for E1.

---------------------------------------------------------------------------------------------------

## A. Module map

| File (lines) | Purpose | Exports | Importers |
|---|---|---|---|
| `US/HexagonalStats.js` (355) | SVG radar ("hexagon") of the six muscle-group scores, optional previous-value diff labels | default `HexagonalStats` | `US/UserStatsProgressPreview.js:9`; `US/UserStatsAfterWorkoutSheet.js:6` (unused import); OUTSIDE: `frontend/components/2_Competition/sections/ProgressSection.js:47` (LIVE) |
| `US/UserStatsAfterWorkoutSheet.js` (136) | Post-workout bottom sheet: UserStatsModal with from->to hexagon diff and a haptic crescendo | default `UserStatsAfterWorkoutSheet` | OUTSIDE: `frontend/components/3_Workout/WorkoutExperiencePortal.js:3` (LIVE) |
| `US/UserStatsBottomSheet.js` (157) | Bottom sheet hosting UserStatsModal for any user; reports open progress through `sheetProgressSV` | default `React.memo(UserStatsBottomSheet)` | OUTSIDE: `frontend/screens/1_Feed.js:62` (LIVE), `frontend/screens/2_Competition.js:24` (LIVE), `frontend/components/2_Competition/sections/LeaderboardsSection.js:44` (PARKED) |
| `US/UserStatsExerciseCard.js` (90) | One exercise row (name, 1RM, sets/reps/volume/top set) | default | `US/UserStatsModal.js:14` |
| `US/UserStatsExerciseDetailScreen.js` (819) | Slide-in overlay: feed posts of every workout that contains the selected exercise (live `posts` listeners, comments sheet, likes sheet, edit/open navigation) | default | `US/UserStatsModal.js:15` |
| `US/UserStatsModal.js` (626) | The stats view itself (header, OVR pill, progress preview, grouped exercise list, detail overlay) | default | `US/UserStatsBottomSheet.js:6`, `US/UserStatsAfterWorkoutSheet.js:5`, OUTSIDE (same partition): `frontend/screens/UserStatsScreen.js:6` |
| `US/UserStatsProgressPreview.js` (1653) | Top pager (muscle map + hexagon) and the Volume/Reps/PRs line chart | default | `US/UserStatsModal.js:28` |
| `US/UserStatsStyles.js` (539) | Shared StyleSheet + palette for the feature | named `COLORS`, `scaledSize`, `screenWidth`, `styles` (+ 9 unused constants) and a default (`styles`) | `US/UserStatsExerciseCard.js:4`, `US/UserStatsExerciseDetailScreen.js:7`, `US/UserStatsModal.js:17`, `US/UserStatsWorkoutViewerScreen.js:6`; OUTSIDE: `frontend/components/2_Competition/sections/LeaderboardsSection.js:59` (PARKED, `scaledSize`), `frontend/components/2_MacroTracking/MacroStreakBadge.js:6` (LIVE, `scaledSize`) |
| `US/UserStatsWorkoutViewerScreen.js` (57) | Overlay wrapping SpectatingWorkoutModal | default | `US/UserStatsModal.js:16` (never visible, see B6) |
| `US/effectiveStatsUser.js` (52) | `buildEffectiveStatsUser(user)`: folds the latest completed workout and freshest hexagon into the signed-in user's record | default | `US/UserStatsBottomSheet.js:11`, `frontend/screens/UserStatsScreen.js:7` |
| `US/userStatsUtils.js` (197) | Pure helpers (1RM, volume, reps, wid extraction, timestamps, grouping, join date) | named: `safeNumber, fmtK, estimate1RM, computeVolume, computeTotalReps, extractWid, toMillis, workoutSortTimestamp, ensureWorkoutPrivacy, bestTopSet, getExercisesGrouped, formatJoinDate` | `US/UserStatsExerciseCard.js:6-12`, `US/UserStatsExerciseDetailScreen.js:10`, `US/UserStatsModal.js:21-27` |
| `frontend/screens/UserStatsScreen.js` (88) | Root-stack route "UserStats": full-screen UserStatsModal for self or another user | default | `frontend/screens/index.js:36` -> `App.js:69`, `App.js:1613`. Navigated to by `frontend/screens/5_Profile.js:124-126` and `frontend/screens/4.1_ViewProfile.js:317` |

Call-site props (needed for the "props nobody passes" items):
- `UserStatsBottomSheet`: FEED `:1796-1802` (`isVisible, setIsVisible, user, navigation, heightRatio`), `2_Competition.js:347-354` (+ `sheetProgressSV`), PARKED `LeaderboardsSection.js:1950-1956` (`user, navigation, isVisible, setIsVisible, sheetProgressSV`).
- `UserStatsAfterWorkoutSheet`: `WorkoutExperiencePortal.js:259-265` (`visible, onClose, user, fromHexagon, toHexagon`).
- `UserStatsModal`: `US/UserStatsBottomSheet.js:144-151` (`key, user, toViewProfile, navigation, visible, onDetailActiveChange`), `US/UserStatsAfterWorkoutSheet.js:110-132` (`user, toViewProfile, hexProps, deferExercises, visible`), `frontend/screens/UserStatsScreen.js:70-77` (`key, user, navigation, toViewProfile, onBack, onDetailActiveChange`).
- `HexagonalStats`: UPP `:1331-1338` (`statsHexagon, size, labelFontPx, valueFontPx, valueFontBigPx, ...hexProps` where hexProps = `{prevStatsHexagon, valueFontBigPx, diffHighlightColor}` from `US/UserStatsAfterWorkoutSheet.js:113-129`), PS `:2762-2768` (`statsHexagon, size, labelFontPx, valueFontPx, valueFontBigPx`).

---------------------------------------------------------------------------------------------------

## B. Verified dead code

Every ESLint and knip finding in SPX/findings/user-stats.md was checked against the code and is confirmed; the list below adds what the tools could not see. "KEEP" marks things that look unused but must stay.

### B1. `US/HexagonalStats.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| `screenHeight` | destructured const | 7 | never read. Destructure only `width: screenWidth`. |
| `x`, `y` | locals | 133-134 | never read; the returned object recomputes the same expressions at 136-137. Delete both lines. |
| props `showLabels` (20), `labelOffsetPx` (23), `prevColor` (27), `polygonColor` (28), `polygonFillColor` (29), `polygonFillOpacityStart` (30), `polygonFillOpacityEnd` (31), `dotColor` (32) | props no caller passes | 20-32 | Neither call site passes them (see A). `diffHighlightColor` (26) is only ever passed with its default value `'#F2B84B'`. So the `showLabels === false` branches (95-99, 211) never run. Low value: removing them means rewriting geometry expressions. Recommendation: LEAVE (component API defaults), record only. |

### B2. `US/UserStatsAfterWorkoutSheet.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| `useState` | import | 1 | unused |
| `HexagonalStats` | import | 6 | unused |
| `clamp01` | const | 15 | unused |
| `interpHex` | function | 18-24 | unused. Once removed, `lerp` (16) and `GROUP_KEYS` (14) are unused too (their only references are inside `interpHex`, line 21). Delete 14-24. |
| `anim` | Animated.Value that is driven but never read | 46, 51, 69-74, dep at 77 | `anim` appears only on lines 45-46, 51, 69, 77: it is reset and animated to 1 but bound to no style or prop. Dead animation driver. Removing it makes `Animated` and `Easing` (import line 3) unused. KEEP the haptic timers (55-67) and their cleanup (76). The comments at 45, 48 and 87 describe the removed crossfade and go with it. Risk low (a native-driver timing on an unattached value has no observable effect). See I5. |
| `sheetRef` | ref attached, never read | 34, 95 | harmless; optional removal. |
| `heightPercent` | prop no caller passes | 32, 35-42 | only caller passes nothing; snap point is always `"92%"`; the string branch (36) and the `> 1` branch (41) are unreachable. Optional; leave unless simplifying. |
| Android LayoutAnimation enable block | redundant module side effect | 9-12 | identical block in `US/UserStatsModal.js:30-33`, which is imported (and therefore evaluated) first at line 5. Removing 9-12 also frees `Platform`, `UIManager` (line 3). Risk nil. |

### B3. `US/UserStatsBottomSheet.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| `StyleSheet`, `View` | imports | 4 | unused |
| `isFullHeight` | const | 25 | unused |
| `handleDetailActiveChange` | no-op callback | 112-114, passed at 150 | does nothing; UserStatsModal's default for that prop is also a no-op (`US/UserStatsModal.js:76`). Optional removal (the only difference is how often a no-op effect re-runs, see F10). |

### B4. `US/UserStatsExerciseCard.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| `style: containerStyle` | prop no caller passes | 19, used 38 | sole caller `US/UserStatsModal.js:583-589` passes `name, exercise, isFirst, onPress`. |
| `chevronSide` | prop no caller passes | 20, 27, 43-47, 82 | always `'right'`: the left-chevron block (43-47) is unreachable, `chevronName` (27) is always `'chevron-right'`, and `styles.cardChevronColumnLeft` (`US/UserStatsStyles.js:257-260`) is then unused. Removal is behaviour-preserving (small rewrite of 27 and 82). |

### B5. `US/UserStatsExerciseDetailScreen.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| `getDoc` | import | 5 | unused |
| `scaleSize` | import | 6 | unused (file uses `scaledSize` from UserStatsStyles) |
| `resolveWorkoutCreatedAt` | const fn | 21-28 | unused. With it `TIMESTAMP_FIELDS` (19) and the `toMillis` import (10) become unused. Delete 19-28 and drop `toMillis` from line 10. |
| `commentTargetRef` | ref written, never read | 165; writes at 416, 536, 544 | no `.current` read anywhere. Remove the ref and the three writes. |
| `_options = {}` | unused parameter | 569 | the caller forwards `opts` at 733 for nothing. Drop the parameter and the `opts` pass-through. |
| always-true guards on `workoutClone` | unreachable alternatives | 179 (`workoutClone ? ... : null`), 182 (`if (workoutClone)`), 189 (`workoutClone \|\| {}`) | `workoutClone` is always an object (178). Harmless; LEAVE (removing is a logic rewrite). |
| `feedItem.__linkedWid`, `feedItem.__source` and locals `widRaw`/`wid` | fields written, never read | 179-180, 238-239 | `grep -rn "__linkedWid\|__source\|user-stats-detail"` finds only these two lines. The object is handed to SimpleFeedPost and CommentsBottomSheet, so LEAVE unless the owner confirms (I4). |
| deps `extractPidFromWorkout`, `extractWid` | module-level names in dependency arrays | 370, 411 | informational; do not touch. |

### B6. `US/UserStatsModal.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| Workout-viewer overlay (whole feature) | state only ever set to its initial value | see below | `viewerOpen` starts `false` (294) and is only ever set to `false` (340, 342, 351). `viewerWorkout` starts `null` (295) and is only ever set to `null` (339, 342, 350). So `<UserStatsWorkoutViewerScreen visible={viewerOpen} ...>` (611-623) always hits `if (!visible) return null` (`US/UserStatsWorkoutViewerScreen.js:21`). Chart taps go to the `PastWorkout` route instead (`handleWorkoutPress`, 355-401). |
| -> dead with it | | 16 (import); 293-306 (`viewerOpen`, `viewerWorkout`, `viewerTranslateX`, `viewerHandleOpacity`, `timerRef` and their comments); 336-343 (`closeViewer`); 350-352 (three viewer lines in `resetToHome`) and `viewerTranslateX` in its deps (353); 451-473 (`viewerBackEligible`, `onViewerBackUpdateX`, `onViewerBackEnd`, `viewerBackPan`); 611-623 (JSX) | Behaviour-preserving. Afterwards `US/UserStatsWorkoutViewerScreen.js` has no importer ("files that can now be deleted"), and in `US/UserStatsStyles.js` the keys `workoutOverlay` (335-347), `viewerHandleWrap` (348-357), `viewerHandleIndicator` (358-363), `lockedWrap` (502-507), `lockedTitle` (508-514), `lockedSubtitle` (515-520) and the constants `HANDLE_FRIEND_ACCENT` (20), `HANDLE_FRIEND_BACKGROUND` (21) become unused. See I1. |
| `detailExercise` | const + prop the child does not declare | 290, passed as `exercise=` at 605 | `UserStatsExerciseDetailScreen` (`:149-159`) has no `exercise` prop. Delete both. |
| `hexOverlay` | prop no caller passes | 76, forwarded at 550 | none of the three callers passes it (see A). Dead here and in UPP (1117, 1339, dep at 1356). |
| `({ finished })` | unused destructure | 152, 338 | replace with `() =>` (338 disappears with the viewer). |
| extra deps `user?.uid` (191), `screenWidth` (305, 353) | informational | | leave. |

### B7. `US/UserStatsProgressPreview.js`
| Identifier | Kind | Line | Evidence / action |
|---|---|---|---|
| `useWindowDimensions` | import | 2 | unused |
| `plotHeight` | unused destructure in ChartCard | 796 | (the geometry memo still needs its own `plotHeight`, 1129-1144) |
| `overallHexDisplay` | useMemo result never read | 1120-1123 | delete; then the `formatHexStat` import (13) is unused |
| `styles.chartSurface` | StyleSheet key | 1544-1551 | no reference |
| `hexOverlay` | prop never passed | 1117, 1339, dep 1356 | see B6 |
| `CHART_ACCENTS.reps`, `.personalRecords` | object keys never read | 20-21 | only `.volume` is read (25, 503-505) |
| `BASE_METRIC_META.*.key`, `.label`, `.line` | fields never read | 457-458, 464; 467-468, 474; 477-478, 484 | tabs carry their own `key`/`label` (1258-1260). Data only; optional. |
| ChartCard prop `title` | fallback that can never be used | 771, 882, 1363 | `activeMeta` always resolves to an entry that has `title` (787). Optional. |
| `bottomMargin` in the geometry object | field never read by a consumer | 1148 | harmless; leave. |

### B8. `US/UserStatsStyles.js`
- Unused StyleSheet keys (no `styles.<key>` in any of the four importing files; no dynamic `styles[...]` access exists): `hexWrap` 160-163 (+ comment 159), `hexDescription` 164-173, `accentBar` 232-241, `detailHeaderCard` 381-388, `detailHeaderTopRow` 389-393, `detailOneRmPill` 426-435, `detailOneRmLabel` 436-442, `detailOneRmValue` 443-447, `detailMetricsRow` 448-457, `detailMetric` 458-465, `detailMetricLabel` 466-473, `detailMetricValue` 474-482, `detailMetricDivider` 483-486. (Plus `cardChevronColumnLeft` 257-260 if B4 is applied, plus the six viewer keys if B6 is applied.)
- Unused constants and their export lines (no reference anywhere in the repo): `GOLD_BG` 23/530, `GOLD_BORDER` 24/531, `DETAIL_HEADER_GRADIENT` 25/533, `DETAIL_METRIC_GRADIENT` 26/534, `SHEET_HANDLE_GRADIENT` 27/535, `SHEET_HANDLE_GRADIENT_ACTIVE` 28/536.
- Exported but only used inside this file (un-export, keep the const): `HANDLE_FRIEND_ACCENT` 527, `HANDLE_FRIEND_BACKGROUND` 528, `GOLD` 529 (`GOLD` stays in use at 282).
- `export default styles` (539): every importer uses the named `{ styles }`; remove the default (duplicate default + named export of one binding).
- `COLORS` keys never read: `iconBg` (15), `statBg` (16), `statBorder` (17).
- KEEP `scaledSize` export (525): imported by PARKED `LeaderboardsSection.js:59` and LIVE `MacroStreakBadge.js:6`. KEEP `screenWidth` (used by `US/UserStatsModal.js`).

### B9. `US/UserStatsWorkoutViewerScreen.js`
Entire file is unreachable once B6 is applied (do not delete the file; list it for the owner).

### B10. `US/userStatsUtils.js`
- `safeNumber` in the export list (185): no external importer; used internally. Remove from the export list only.
- `toMillis` in the export list (191): the only external import is `US/UserStatsExerciseDetailScreen.js:10`, used solely by the dead `resolveWorkoutCreatedAt`. After B5, remove from the export list (still used internally by `workoutSortTimestamp`, 68-77).

### B11. `US/effectiveStatsUser.js`, `frontend/screens/UserStatsScreen.js`
Nothing dead. In UserStatsScreen the ESLint "unnecessary dependency `hexagonTick`" (54) is intentional, see H7.

No `console.log`, no commented-out code and no constant feature flags exist in this partition (the three `console.warn` calls at `US/UserStatsExerciseDetailScreen.js:319, 360, 582` are on real failure paths: keep).

---------------------------------------------------------------------------------------------------

## C. Duplication

### C1. `sanitizeWorkoutForRoute`
- Identical (only quote style and blank lines differ): `US/UserStatsModal.js:35-72`, `US/UserStatsExerciseDetailScreen.js:101-140`, `frontend/screens/1_Feed.js:274-313`.
- Different: `frontend/screens/ExerciseDetail.js:873-898` and `frontend/components/2_Competition/sections/ProgressSection.js:462-487`. Same result when the JSON round trip succeeds; their `catch` fallback only strips `onComplete`/`onDelete` from sets and does not normalise weight/reps/unit/prev. Leave those two.
- Canonical home: new `frontend/utils/sanitizeWorkoutForRoute.js` (default export) holding the three-way identical body; the two UserStats files and FEED import it.

### C2. Small helpers in `US/UserStatsExerciseDetailScreen.js`
| Helper | Locations | Verdict |
|---|---|---|
| `toNumber(value, fallback = 0)` | US detail 87-90; FEED 230-233; PWP 62-65; `frontend/components/1_Feed/SimpleFeedPost.js:56-59`; `backend/workouts/updateCompletedWorkout.js:9-12`; `backend/workouts/deleteCompletedWorkout.js:7-10` | identical in all six. Also behaviourally identical: `safeNumber(v, d = 0)` at `US/userStatsUtils.js:3` and `frontend/utils/loggedFoods.js:4-7`. (One-argument `toNumber` in `utils/workoutSummary.js:1`, `utils/macroRecommendations.js:44`, `helper/countCompletedWorkoutsWithExercise.js:25` not compared.) |
| `stringCandidates` | US detail 76-85; PWP 76-85 | identical |
| `extractPidFromWorkout` | US detail 142-147; PWP 131-136 | identical |
| `sanitizeEntry` | US detail 92-99; PWP 67-74; FEED 1160-1167 (declared inside a callback) | behaviourally identical (parameter name only) |
| `ensureHandle` | US detail 65-69; PWP 87-91 | behaviourally identical (parameter name/default only). `helper/useFilteredFeed.js:429` is an unrelated function with the same name. |
| `ensureAtHandle` | US detail 71-74; FEED 315-320; PWP 33-37 | NOT identical: for the input `"@"` the US version returns `''`, the other two return `"@"`. Leave. |
| `normalizeMediaEntry` | US detail 30-43; PWP 93-106; SimpleFeedPost 157-171; `frontend/components/1.2_Chat/MessageItem.js:45-62` | all four differ (PWP adds `?? entry.photo`; SimpleFeedPost uses `\|\|` and spreads the entry; MessageItem adds `url`). Leave. |
| `mergeMediaSources` | US detail 45-63 `(post, workout)`; PWP 108-121 `(...sources)` | different signature and different `normalizeMediaEntry`. Leave. |
| `resolveWorkoutCreatedAt` | US detail 21-28 (dead); PWP 138-146 (live) | delete the US copy (B5). |
Canonical home for the identical ones (`toNumber`, `stringCandidates`, `extractPidFromWorkout`, `sanitizeEntry`, `ensureHandle`): a feed-owned util, e.g. new `frontend/utils/feedItemUtils.js`; this partition would import from it. If the feed partition does not create it, move them to `US/userStatsDetailUtils.js` (D2) and leave the copies elsewhere alone.

### C3. Chart maths: UPP vs PS vs ED
| Helper | UPP | PS | ED | Verdict |
|---|---|---|---|---|
| `niceNumber` | 278-295 | 694-711 | 305-322 | identical x3 |
| `computeAxisMetrics` | 297-336 | 713-752 | 324-360 | UPP = PS textually; ED same logic written with `-=`/one-line `if`. Identical behaviour x3 |
| `formatAxisValue` | 401-425 | 754-778 | 362-377 | UPP = PS textually; ED condensed, same logic. Identical behaviour x3 |
| `accentToRgba(accent, alpha)` | 488-492 | 104-108 | 193-197 | identical x3 |
| `sanitizeCompletedWorkouts` | 118-121 | 414-417 | 1065-1068 | identical x3 |
| `toMillisSafe` | 63-106 | 219-262 | 199-243 | UPP = PS (comment text only). ED differs in two spellings with equal results (`Number.isNaN(getTime())` vs `Number.isFinite(ms)`; `new Date(s).getTime()` vs `Date.parse(s)`). Identical behaviour x3. Same-named functions elsewhere are different: `frontend/helper/feedRanking.js:1` (no Date/`_seconds`/numeric-string handling), `frontend/utils/livePostMeta.js:1` (returns `null`), `frontend/screens/MuscleGroupExercises.js:223` (inline), `functions/index.js:3553` (cannot share). |
| `formatVolumeValue` | 257-266 | 489-498 | - | identical x2 |
| `buildChartSeries` | 338-399 | 622-692 | 379-449 | PS = ED textually. UPP differs in two places that cannot change the result: `/ Math.max(yRange, 1)` where `yRange` is already `>= 1` (or NaN in both), and no `if (!points.length)` guard, which is unreachable after the `chartData.length === 0` early return. Identical behaviour x3; use the PS/ED text as canonical. |
| `ChartBubble` | 25-61 | 111-151 | 452-492 | PS = ED. UPP renders the same circles when `accent` is passed (it always is, UPP 1025) but its default accent is `CHART_ACCENTS.volume` {45,158,255} instead of `.standard` {100,160,255}, and it uses an un-clamped inline rgba helper (31). Shareable only if every caller passes `accent`. "Partly". |
Not identical, leave as is: `DEFAULT_X_AXIS_LABEL_COUNT` (UPP 17 = 4; PS 580 = 5), `CHART_ACCENTS`, `resolveWorkoutTimestamp` (UPP 108-116 reads `created, createdAt, timestamp`; PS 405-412 and ED 1014-1021 read only `created`), `sanitizeVolumeEntries` / `sanitizeRepsEntries` / `sanitizePersonalRecordEntries` (PS uses `makeID()`, other value and wid candidates), `resolvePreferredWeightUnit` (UPP 244-255 returns `"lbs"`; PS 264-276, `MuscleGroupExercises.js:86`, `WeightMeasurementsScreen.js:33` return `"lb"` and also test `includes('kilo')`; ED 1086 is different again), `toDisplayWeightUnit` (UPP 494-500 maps any `k...` to kg and unknown strings to the fallback; PS 278-289 / MuscleGroupExercises 100 / WeightMeasurements 47 / ED 1104 return unknown strings unchanged), `formatTimestamp` (empty text "No data yet" vs "No Logged Data"), `buildXAxisLabels` (label formatter), `PointerBubbleCard`, the three `*PointerLabel` components (PS: `React.memo`, `canNavigate` without a name, different accent source and timestamp formatting), and the cloned style blocks (one value differs in each: `pointerBubbleLineSpacing.marginTop` 4 vs 2, UPP 1525-1527 vs PS; `metricToggleLabel.fontSize` `scaleSize(13)` vs `ts(13)`, UPP 1642-1646 vs PS).
Canonical home for the identical set: new `frontend/components/charts/chartMath.js` next to `chartStyles.js`, exporting `toMillisSafe, niceNumber, computeAxisMetrics, formatAxisValue, accentToRgba, buildChartSeries, formatVolumeValue, sanitizeCompletedWorkouts`. All three files already take `scaleSize` from `components/2_Competition/layoutConstants`, so a shared `ChartBubble` would scale identically.

### C4. Inside UPP
- `sanitizeVolumeEntries` 123-163 / `sanitizeRepsEntries` 165-206 / `sanitizePersonalRecordEntries` 208-242: same skeleton, not identical (value candidates; id prefix `vol-`/`rep-`/`pr-`; the PR version omits `sessionId` from the id). Shared sub-blocks: wid candidates 137-143 = 180-186 = 216-222; name 149-152 = 192-195 = 228-231; running total 158-162 = 201-205 = 237-241. Merging is a rewrite: leave.
- Pointer labels: the workout-name block is repeated three times, 590-619 = 655-684 = 721-750 (30 lines each). Could become one small component; it adds a component level but renders the same. Optional, low risk.
- `yTicksByKey` IIFEs 1206-1213 = 1214-1221 = 1222-1229.
- y-tick ratio computation 924-931 = 961-968.

### C5. Edit-post payload builder
`US/UserStatsExerciseDetailScreen.js:585-664` = PWP `738-821` = FEED `977-1056`, identical except the fallback variable on one line (`item.workout` / `resolved.workout` / `sourcePost.workout`; PWP has three extra lines for `shouldRefreshOnFocusRef`). Candidate: `buildEditPostPayload(latest, fallbackSource, pid)` returning `{ resolvedCaption, mediaEntries, workoutName, editingPayload }` in a feed util. The code around it differs and must stay per file (FEED replaces `latest` with the fetched doc, the other two merge; `navigateOneWay` vs `navigation.navigate`).

### C6. wid -> pid lookup in Firestore
`US/UserStatsExerciseDetailScreen.js:300-317` vs PWP `541-553`: the same two queries (`posts` where `workoutWid == wid`, then `workout.wid == wid`, `limit(1)`), different result handling (US rejects pids starting with `workout:` and falls back to `''`; PWP stores the document). Only the two-query fetch is shareable. Low value; leave unless the feed partition creates the helper.

### C7. `handleOpenWorkout`
`US/UserStatsExerciseDetailScreen.js:428-508` vs FEED `openViewWorkoutModal` `1112-1223`: similar, NOT identical (US adds rank fallbacks from the workout at 484-486, has no `isLiveWorkout`, uses `''` instead of `index` in the pid fallback at 489, navigates with `navigateOneWay`). Leave both.

### C8. `navigationProxy`
`US/UserStatsExerciseDetailScreen.js:694-706` = `708-720` (same `navigate` body twice inside one `useMemo`). Declare the function once inside the memo and reference it from both places. Behaviour-identical.

### C9. Back-swipe gestures
`US/UserStatsModal.js:428-449` vs `451-473`: identical apart from names. The second disappears with B6.

### C10. Other
- Android LayoutAnimation enable block: `US/UserStatsModal.js:30-33` = `US/UserStatsAfterWorkoutSheet.js:9-12` (five more copies elsewhere in the repo). See B2.
- `HANDLE_FRIEND_ACCENT` / `HANDLE_FRIEND_BACKGROUND`: `US/UserStatsStyles.js:20-21` = `frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:18-19`. Goes away with B6.
- `GROUP_KEYS`: `US/UserStatsAfterWorkoutSheet.js:14` = `frontend/logic/exerciseCatalog.js:31` = `shared/hexagon/computeHexagonCore.js:4`. Dead here (B2).
- `GROUP_ORDER`: `US/userStatsUtils.js:103-112` vs PARKED `SelectExercise/SelectExerciseModal.js:24-33` (last key `Other` vs `default`). Different and PARKED: leave.
- `toMillis` (`US/userStatsUtils.js:53-66`): more than twenty same-named functions repo-wide (`utils/date.js:6`, `utils/friends.js:4`, `SimpleFeedPost.js:61`, PWP 39, `PastWorkoutScreen.js:51`, ...). Each differs in null/NaN/`_seconds`/Date handling (e.g. `utils/date.js` returns non-finite numbers unchanged and ignores `_seconds`; PWP returns `undefined`; PastWorkoutScreen returns `null`). No identical twin: leave.
- `toDayKey` (`US/effectiveStatsUser.js:3-9`) vs `frontend/utils/date.js:3` (needs a Date, no try/catch) and the backend/shared variants: different, leave.
- `scaledSize = (n) => scaleSize(n)`: `US/HexagonalStats.js:10` and `US/UserStatsStyles.js:5` are forwarding wrappers around `helper/scaleSize` (one-argument function, so identical). The UserStatsStyles one is exported to a PARKED file: KEEP.
- Inline `require(".../theme/mfpDark").default`: `US/UserStatsBottomSheet.js:126`, `US/UserStatsAfterWorkoutSheet.js:101`, `US/UserStatsStyles.js:7` (see F2).

---------------------------------------------------------------------------------------------------

## D. Decomposition plans (files over ~500 lines)

### D1. `US/UserStatsProgressPreview.js` (1653) - extraction risk LOW
Every top-level declaration is pure (no module state, no shared closures). Do B7 first.
1. `US/UserStatsProgressPreview.styles.js` <- `PREVIEW_HORIZONTAL_PAD` (23) and `styles` (1381-1653, minus `chartSurface`). Imports: `StyleSheet`, `theme` (`../../../theme/mfpDark`), `{ scaleSize, DEVICE_WIDTH, ts }` from `../layoutConstants`.
2. `US/userStatsChartUtils.js` <- constants `DEFAULT_X_AXIS_LABEL_COUNT` (17), `CHART_ACCENTS` (18-22), `BASE_METRIC_META` (455-486) and functions `toMillisSafe` (63-106), `resolveWorkoutTimestamp` (108-116), `sanitizeCompletedWorkouts` (118-121), `sanitizeVolumeEntries` (123-163), `sanitizeRepsEntries` (165-206), `sanitizePersonalRecordEntries` (208-242), `resolvePreferredWeightUnit` (244-255), `formatVolumeValue` (257-266), `formatTimestamp` (268-276), `niceNumber` (278-295), `computeAxisMetrics` (297-336), `buildChartSeries` (338-399), `formatAxisValue` (401-425), `buildXAxisLabels` (427-453), `accentToRgba` (488-492), `toDisplayWeightUnit` (494-500). Needs `dayjs`. If C3's shared `chartMath.js` is created, the eight identical helpers are imported from there instead of being moved here.
3. `US/UserStatsChartPointers.js` <- `PointerBubbleCard` (502-560), `VolumePointerLabel` (562-626), `RepsPointerLabel` (628-691), `PersonalRecordPointerLabel` (693-768). Imports: React, `View/Text/Pressable`, `chartPointerStyles`, `chartTypography`, the styles module, and from (2) `accentToRgba, CHART_ACCENTS, toDisplayWeightUnit, formatVolumeValue, formatTimestamp`.
4. `US/UserStatsChartCard.js` <- `ChartBubble` (25-61) and `ChartCard` (770-1115). Imports: `useState/useEffect/useCallback`, `View/Text/Pressable/StyleSheet`, `Ionicons`, `Svg, Path, Defs, LinearGradient, Stop, Circle, G, Line`, `theme`, `scaleSize` from `../layoutConstants`, the four `chartStyles` sheets, the styles module, `accentToRgba, formatAxisValue, CHART_ACCENTS`, and the pointer labels.
Stays: imports, `MUSCLE_OUTLINE_COLOR` (16), the default component (1117-1379), about 265 lines.
Blockers: none. Notes: (a) every new file must keep importing `scaleSize`/`ts` from `../layoutConstants`, NOT `helper/scaleSize` (different function, H6); (b) `ChartBubble` declares an inner `accentToRgba` (31) that shadows the module-level one: move verbatim; (c) the mis-indented block 903-913 is formatting only, do not reformat.

### D2. `US/UserStatsExerciseDetailScreen.js` (819) - extraction risk MEDIUM
Do B5 first.
1. `US/userStatsDetailUtils.js` <- `normalizeMediaEntry` (30-43), `mergeMediaSources` (45-63), `ensureHandle` (65-69), `ensureAtHandle` (71-74), `stringCandidates` (76-85), `toNumber` (87-90), `sanitizeEntry` (92-99), `extractPidFromWorkout` (142-147), plus `buildFeedItem` (173-242): it is a `useCallback(..., [])` that closes over nothing from the component, so its body moves verbatim and only the wrapper lines 173 and 242 change into a plain function (then drop it from the deps at 411). `sanitizeWorkoutForRoute` (101-140) goes to the shared util of C1 instead.
2. `US/useExercisePosts.js` (custom hook) <- state `postsLoading`/`postsByPid` (161-162), refs `listenersRef`/`widToPidRef` (163-164), the subscription effect (244-370) and the unmount cleanup (372-377). Signature `useExercisePosts(visible, workouts)` returning `{ postsByPid, postsLoading, widToPidRef }`. Imports `collection, doc, getDocs, limit, onSnapshot, query, where`, `db`, `extractWid`, `extractPidFromWorkout`.
3. `US/userStatsDetailActions.js` <- the bodies of `handleOpenWorkout` (428-508), `handleOpenProfile` (510-532) and `handleEditPost` (569-690) as plain module functions. All three have `[]` deps and use only imports (`navigateOneWay`, `isThisUser`, `hapticStrong`, `readDoc`, `isClipPost`, `Alert`, the utils). Their identities stay stable, so `renderItem` (723-736) and `handleEditWorkout` (564-567) keep their meaning.
Stays: comment/likes state (165-171), `feedItems` (379-411), visibility-reset effect (413-420), `keyExtractor` (422-426), comment and likes handlers (534-562), `handleEditWorkout`, `navigationProxy` (692-721), `renderItem`, `footerComponent` (738-746), JSX (748-818): about 250 lines.
Blockers: (a) `feedItems` reads `widToPidRef.current` during render (395): the hook must return the same ref object, never a copy in state; (b) call the hook where line 161 is so the effect order (subscription 244 -> unmount cleanup 372 -> visibility reset 413) is unchanged; (c) keep the `null` vs `undefined` meaning in `widToPidRef` (H4); (d) the early `return null` at 748 must stay after every hook.

### D3. `US/UserStatsModal.js` (626) - extraction risk MEDIUM
Step 0: B6 (dead viewer, `detailExercise`, `hexOverlay`) brings the file to about 560 lines. Decide E1 before moving anything.
1. `sanitizeWorkoutForRoute` (35-72) -> shared util (C1). File is then about 520 lines.
2. `US/useExerciseDetailWorkouts.js` (custom hook) <- `detailWorkoutCache` (206), `detailWorkouts`/`detailLoading` (207-208), `sortWorkouts` (210-212), the loading effect (214-288) and `findWorkoutByWid` (308-334). Signature `({ user, detailName, detailWorkoutIds, viewerUid, viewerData })` returning `{ detailWorkouts, detailLoading, findWorkoutByWid, resetDetailWorkouts }`. Imports `getDoc, doc`, `db`, `canViewWorkout`, `ensureWorkoutPrivacy`, `extractWid`, `workoutSortTimestamp`.
   Blockers: (a) E1: inside the hook `findWorkoutByWid` must be declared before the effect; (b) `resetToHome` (345-353) calls `setDetailWorkouts([])` and `setDetailLoading(false)` (347-348), so the hook has to expose a reset function or the two setters (a few new lines); (c) `handleWorkoutPress` (355-401) also needs `findWorkoutByWid`; (d) call the hook where line 206 is, so the effect order stays: defer effect 109 -> `onDetailActiveChange` effect 158 -> workouts effect 214 -> visibility reset 406.
3. `US/useEdgeBackSwipe.js` <- 428-449 generalised over `(translateX, onClose)`, with the constants 424-425 at module scope. Only worth it if the viewer gesture is kept; with B6 applied a single gesture remains: leave it inline. If moved, keep the worklet bodies and `runOnJS` targets verbatim (H2).
4. Optional presentational splits (they need new prop plumbing, so lower priority): header JSX 479-541 with the pfp resolution 84-108; exercise list JSX 556-595 with `collapsed`/`toggleGroup` 123-127.
Stays: component shell, viewer-aware stats memo (117-122), OVR/joined labels (128-135), detail open/close (138-156), `detailSets`/`detailWorkoutIds` (167-204), `handleWorkoutPress`, reset effect (403-421), back gesture, JSX.

### D4. `US/UserStatsStyles.js` (539) - risk LOW
Already a styles module. B8 removes about 115 lines (about 165 with the viewer styles), which puts it well under 500. No split.

---------------------------------------------------------------------------------------------------

## E. Latent bugs

### E1. `findWorkoutByWid` is used before its declaration - `US/UserStatsModal.js:288` (declared at 308-334). Confidence: HIGH that it is a defect.
The effect at 214-288 lists `findWorkoutByWid` in its dependency array (288). The array is evaluated during render, 20 lines before `const findWorkoutByWid = useCallback(...)` (308). In standard JavaScript that is a ReferenceError on every render. It works today only because Babel compiles `const` to `var`, so the name is hoisted and is `undefined` at line 288 on every render: the dependency is a constant `undefined` and never triggers the effect. (The use inside the effect body at 277 is fine: it runs after render.) Confirmed with ESLint `no-use-before-define` (277:38, 288:82).
Minimal fix that matches the evident intent: move lines 308-334 verbatim to just above line 206, so the dependency is the real callback. Because `user` is already in the same array and `findWorkoutByWid` only changes when `user?.completedWorkouts` or `user?.uid` change, the effect's re-run set stays the same unless one of those fields changes on an unchanged `user` object (no caller does that: self users come out of `buildEffectiveStatsUser` as fresh objects).
Alternative with strictly identical runtime behaviour: delete `findWorkoutByWid` from the array at 288 (it is always `undefined` there). Record whichever is chosen.

### E2. Stale unit in the chart summary - UPP `:1238-1254`. Confidence: MEDIUM.
`latestByKey` reads `metricMeta` (1242) but the dependency array (1254) omits it. When the user's weight unit changes while the view is mounted (the sheet stays mounted in Feed) and the workout list does not, the summary unit at 899 keeps the old unit while the pointer label (848) shows the new one. Minimal fix: add `metricMeta` to the array at 1254 (`metricMeta` only changes when `volumeUnit` changes, 1162-1169). This is a real stale value, not lint silencing, but it does change output in that edge case: apply only if the plan accepts it, otherwise keep as an open question.

### E3. Unmanaged timer - `US/UserStatsExerciseDetailScreen.js:545`. Confidence: LOW.
`closeComments` schedules `setTimeout(() => setCommentTarget(null), 180)` with no handle. If comments are reopened within 180 ms the pending timer clears the new target; it also fires after unmount (harmless on React 18). No fix proposed: clearing or guarding the timer changes timing. Listed for the owner.

No duplicate object keys, no conditional hooks and no references to undefined names were found in this partition.

---------------------------------------------------------------------------------------------------

## F. Best-practice issues

| # | Issue | Location | Suggested change | Risk |
|---|---|---|---|---|
| F1 | Component created during render | `US/UserStatsAfterWorkoutSheet.js:104-106` (`backdropComponent={(props) => <BottomSheetBackdrop .../>}`) | Hoist to a module-level function and pass the reference. | Low-medium: today the backdrop is a new component type on every render of the sheet and therefore remounts; a stable reference stops that. Same visuals, different mount timing. |
| F2 | `require()` used as an import | `US/UserStatsBottomSheet.js:126`, `US/UserStatsAfterWorkoutSheet.js:101`, `US/UserStatsStyles.js:7` | `import theme from "../../../theme/mfpDark"` (the theme module has no imports, so no cycle). | Nil |
| F3 | Pure helpers re-created on every render | `US/HexagonalStats.js:34-39` (`approxTextWidth`), `41-67` (`renderStrikeLine`), `68-72` (`toRoundedStat`) | Move verbatim to module scope (they close over nothing but each other). | Nil |
| F4 | Forwarding wrapper | `US/HexagonalStats.js:10` (`scaledSize`) | Could call `scaleSize` directly (15 call sites). Churn outweighs benefit: optional. | Nil |
| F5 | Constants and a pure function declared inside the component | `US/UserStatsModal.js:424-425` (`EDGE_BACK_GESTURE_WIDTH`, `BACK_SWIPE_TRIGGER`), `210-212` (`sortWorkouts`, `useCallback` with `[]`) | Hoist to module scope. Hoisting `sortWorkouts` means removing it from the array at 288. | Low |
| F6 | Mixed `React.useCallback` / `useCallback` | `US/UserStatsModal.js:429, 432, 453, 456` | Use the imported `useCallback`. | Nil |
| F7 | Import grouping | `US/UserStatsBottomSheet.js:1-12` (react-native after third-party, stray blank line 9), `US/UserStatsModal.js:1-28`, `US/UserStatsExerciseDetailScreen.js:1-17`, `US/UserStatsAfterWorkoutSheet.js:1-7` | Regroup only in files that are being edited anyway. | Nil |
| F8 | `useCallback` on a render helper that is called inline | UPP `1291-1356`, called at 1360 | No memo benefit (`hexProps` is a new object each render). Its missing `muscleFills` dependency is harmless because `muscleFills` derives from `user?.statsHexagon`, which is listed. Leave, or unwrap. | Low |
| F9 | Timers without cleanup | `US/UserStatsExerciseDetailScreen.js:545`, `US/UserStatsModal.js:113` (catch fallback) | Leave (E3). | - |
| F10 | Default prop creates a new function per render | `US/UserStatsModal.js:76` (`onDetailActiveChange = () => {}`) | The effect at 158-165 re-runs on every render for callers that omit the prop (UserStatsAfterWorkoutSheet). A module-level no-op constant would stop that. Only the frequency of a no-op changes. | Low |
| F11 | Default + named export of the same binding | `US/UserStatsStyles.js:532, 539` | Drop the default (B8). | Nil |
| F12 | `useCallback` with `[]` around a function that needs no component state | `US/UserStatsExerciseDetailScreen.js:173-242, 428-508, 510-532, 569-690` | Move to module scope (D2). | Low |
| F13 | Redundant module side effect | `US/UserStatsAfterWorkoutSheet.js:9-12` | Remove (B2). | Nil |
| F14 | Zero-size decorative view | `US/UserStatsModal.js:525` with `ovrGlow` (`US/UserStatsStyles.js:98-101`, width 0 / height 0) | Renders nothing. Leave unless the owner agrees (I11). | - |

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

1. `frontend/screens/1_Feed.js`: replace the local `sanitizeWorkoutForRoute` (274-313) with the shared util of C1 (identical body). Optionally `toNumber` (230-233) and the inline `sanitizeEntry` (1160-1167) with the shared feed helpers of C2.
2. `frontend/components/2_Competition/sections/ProgressSection.js` and `frontend/screens/ExerciseDetail.js`: adopt the shared `frontend/components/charts/chartMath.js` (C3) for `toMillisSafe`, `niceNumber`, `computeAxisMetrics`, `formatAxisValue`, `accentToRgba`, `buildChartSeries`, `sanitizeCompletedWorkouts` (and `formatVolumeValue` in ProgressSection). Whoever owns those files should create the module; this partition then imports from it instead of creating `userStatsChartUtils.js` copies.
3. `frontend/screens/ProfileWorkoutsAndPostsScreen.js` (and FEED): shared feed helpers `stringCandidates`, `toNumber`, `sanitizeEntry`, `ensureHandle`, `extractPidFromWorkout` (C2) and the edit-post payload builder (C5: PWP 738-821, FEED 977-1056, US detail 585-664).
4. `frontend/components/2_MacroTracking/MacroStreakBadge.js:6`: imports `scaledSize` from UserStatsStyles, a forwarding wrapper around `helper/scaleSize`. Importing `scaleSize` from `frontend/helper/scaleSize` directly is identical and removes a cross-feature dependency. (The export itself must stay for PARKED LeaderboardsSection.)
5. `frontend/components/3_Workout/NewWorkout/SpectatingWorkoutModal.js`: if B6 is applied, `FeedWorkoutViewerSheet.js:244` becomes its only caller. Its owner should re-check props that only the UserStats viewer passed (`forceViewingFriend`, `friendPfp`, `streamLive`, see `US/UserStatsWorkoutViewerScreen.js:34-45`).
6. `frontend/screens/2_Competition.js:346-355`: this `UserStatsBottomSheet` cannot open while the Compete block is commented out (`handleShowUserStats`, 165-168, is referenced only from the commented block at 236). It belongs to the restore path: keep it, and keep the `sheetProgressSV` and `heightRatio` props of UserStatsBottomSheet.
7. `frontend/utils/formatHexStat.js`: exports the same function as named and default; this partition uses the default in all three imports (`US/HexagonalStats.js:5`, `US/UserStatsModal.js:18`, UPP 13). Information for the owner of `utils/`.

---------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

1. `US/UserStatsBottomSheet.js:27-66`: reanimated shared values and the two `useAnimatedReaction` worklets that derive `sheetProgressSV` from the sheet position. Do not reorder, merge or "simplify"; the dependency arrays (`[]`, `[sheetProgressSV]`) are deliberate. `sheetProgressSV` is consumed by `2_Competition.js` and PARKED `LeaderboardsSection.js`.
2. `US/UserStatsModal.js:428-449` (and 451-473 if kept): `Gesture.Pan()` chains with `'worklet'` callbacks calling `runOnJS(onDetailBackUpdateX / onDetailBackEnd)`. The JS callbacks must stay plain stable functions. `onDetailBackEnd` (432-438) captures the first render's `closeDetail`; that is safe only because `closeDetail` (150-156) uses nothing but stable refs and setters. Do not add `closeDetail` to the deps and do not wrap it differently.
3. `US/UserStatsModal.js` effect order (109, 158, 214, 406) and the remount contract `key={tick}` (`US/UserStatsBottomSheet.js:145`) / `key={hexagonTick}` (`UserStatsScreen.js:71`): a hexagon update remounts the modal and resets all of its state. Any hook extraction must keep the relative effect order.
4. `US/UserStatsExerciseDetailScreen.js:244-377`: listener bookkeeping. `widToPidRef` uses `null` for "looked up, no post" and `undefined` for "not looked up yet" (286, 295, 313, 316, 320); listeners deliberately survive effect re-runs and are detached only when hidden, when no longer desired (326-336) or on unmount (372-377). The cleanup only sets `cancelled`.
5. `US/UserStatsAfterWorkoutSheet.js:49-77` and `80-85`: the haptic timer sequence with its cleanup, and the reset of `global.__hexChangeFrom` / `global.__hexChangeTo` (written by `frontend/logic/useWorkoutManager.js:263-264`, read by `WorkoutExperiencePortal.js:213-214`). Part of the `global.*` contract.
6. UPP takes `scaleSize`, `ts`, `DEVICE_WIDTH` from `frontend/components/2_Competition/layoutConstants.js`, whose `scaleSize` is NOT `frontend/helper/scaleSize` (different ratio, optional axis argument). The other files in this partition use `helper/scaleSize`. Never unify these imports.
7. `frontend/screens/UserStatsScreen.js:50-55`: `hexagonTick` in the `useMemo` deps is flagged as unnecessary but is required: `buildEffectiveStatsUser` reads `global.userData`, so the memo must be recomputed when the hexagon changes. Same for the `global.userData` expressions in the deps at `US/UserStatsBottomSheet.js:107-110`.
8. `US/HexagonalStats.js:142-150`: the `map` that builds `polygonPoints` also mutates `p.roundedX` / `p.roundedY`, which the vertex dots read at 203-204. Order-dependent; move as a unit.
9. `US/UserStatsModal.js:30-33`: the module-level Android `setLayoutAnimationEnabledExperimental` call must stay in this file (B2 relies on it).
10. `US/effectiveStatsUser.js:23-51`: merges the latest workout into `statsExercises` in memory only; the dedupe check is "last set's wid equals the workout's wid" (37-38). Do not touch.
11. `US/UserStatsStyles.js`: `scaledSize` is imported by PARKED `LeaderboardsSection.js:59`: same path, same name, same behaviour.
12. Double haptics (I2) are current behaviour: do not "fix" silently.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

1. Workout viewer overlay (B6): `UserStatsWorkoutViewerScreen` can no longer be opened (chart taps navigate to `PastWorkout`). Confirm it is retired so the state, the gesture, the file and its six styles can go.
2. Double haptic on some presses: `US/UserStatsModal.js:588` wraps the card's `onPress` in `withStrongPress` and `US/UserStatsExerciseCard.js:29` wraps it again; `US/UserStatsModal.js:491` wraps `toViewProfile` while `US/UserStatsBottomSheet.js:87` also calls `hapticStrong()`. Intended?
3. `US/UserStatsAfterWorkoutSheet.js:117-124`: "did the hexagon change" compares values rounded to integers, but the hexagon shows one decimal (`US/HexagonalStats.js:68-72`, `formatHexStat`). A change from 41.2 to 41.4 is treated as "no change" and hides the previous values. Intended?
4. `US/UserStatsExerciseDetailScreen.js:238-239`: `__linkedWid` and `__source = 'user-stats-detail'` are never read. Remove?
5. `US/UserStatsAfterWorkoutSheet.js:46-74`: the `anim` value animates nothing, and `hexOverlay` is never supplied. Was a crossfade overlay meant to exist, or can both go (B2, B6)?
6. `US/UserStatsAfterWorkoutSheet.js:112`: `toViewProfile={() => {}}` - tapping the header in the after-workout sheet gives a haptic and does nothing. Intended?
7. Units: UPP `resolvePreferredWeightUnit` returns `"lbs"` and its `toDisplayWeightUnit` maps unknown strings to the fallback, while the Progress tab versions return `"lb"` / the raw string (C3). Should the stats view follow the Progress tab? (Decides whether those helpers can ever be shared.)
8. E2: should the summary unit follow a unit change immediately?
9. `US/userStatsUtils.js:79-83` `ensureWorkoutPrivacy` adds `privacyMode: 'global'`, while `coercePrivacyMode` (`frontend/utils/workoutPrivacy.js:7`) is now a constant and `canViewWorkout` no longer reads `privacyMode`. Is the per-workout privacy mode retired?
10. `US/UserStatsExerciseDetailScreen.js:545`: the 180 ms delayed clear of the comment target can wipe a target reopened within that window (E3). Fix wanted?
11. `US/UserStatsModal.js:525` / `US/UserStatsStyles.js:98-101`: the `ovrGlow` view has zero size. Remove the element and the two styles?
12. `US/HexagonalStats.js`: eight props are never passed (B1). Keep them as component API or trim?
