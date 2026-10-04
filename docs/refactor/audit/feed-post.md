# Audit: partition "feed-post" (4 files, 4743 lines)

Read-only audit. All four files were read completely, top to bottom. All four are byte-identical to SPX/baseline (checked with diff), so every line number below is valid for both the working tree and the baseline.

Legend (paths relative to the project root):
- SFP  = frontend/components/1_Feed/SimpleFeedPost.js (2501 lines, 4-space indent, double quotes mostly, single quotes in styles)
- PWS  = frontend/screens/PastWorkoutScreen.js (1495 lines, 4-space indent, double quotes)
- PWEL = frontend/components/1_Feed/PastWorkoutExerciseLog.js (393 lines, **2-space indent**, double quotes)
- FWVS = frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js (354 lines, **2-space indent**, mixed quotes)
- PUO  = frontend/components/5_Profile/MakePost/PostUploadOptionsScreen.js (partition profile-makepost)
- SetRow = frontend/components/3_Workout/NewWorkout/Tracking/SetRow.js (partition workout-tracking)

Runtime fact that several findings depend on: `babel-preset-expo` -> `@react-native/babel-preset` always applies `@babel/plugin-transform-block-scoping` (node_modules/@react-native/babel-preset/src/configs/main.js:43, in `defaultPlugins`, not gated on Hermes). `const`/`let` therefore compile to `var` with no TDZ check: reading a `const` above its declaration yields `undefined` instead of throwing.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| SFP | The feed card for one post (workout post, media post, clip, live workout): header, title/caption, body-graph + metrics, best-set table, media carousel with video controls, like/comment footer, owner options sheet (edit post / edit workout / delete), report sheet, cheer + confetti for live posts, default delete flow. | `default` = `React.memo(SimpleFeedPost)` (SFP:1955). No named exports. | Outside partition: frontend/components/1_Feed/PostListItem.js:2 (feed-cards), frontend/screens/ProfileWorkoutsAndPostsScreen.js:18 (profile), frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:9 (user-stats). |
| PWS | "PastWorkout" route: workout detail screen (owner header, body-graph + metrics, per-exercise set log, live listener on `users/{uid}.currentWorkout`, cheer for live workouts, edit via EditingWorkoutModal + `updateCompletedWorkout`). | `default` = `PastWorkoutScreen` (PWS:1494). | frontend/screens/index.js:22 (re-export) -> App.js:54, App.js:1615-1616 (route name `"PastWorkout"`). Navigated to by 1_Feed.js:1222, ExerciseDetail.js:2391-2392, ProfileWorkoutsAndPostsScreen.js:702, UserStatsExerciseDetailScreen.js:507, ProgressSection.js:2217-2218, UserStatsModal.js:395-396. Route params read: `workout`, `owner`, `postMeta.pid`, `isLiveWorkout`, `startEditing`. |
| PWEL | Read-only exercise block (name + avatar, Set / Previous / lbs / Reps / done columns) used by the PastWorkout screen. | `default` = `PastWorkoutExerciseLog` (PWEL:392). | Only PWS:19 (inside partition). |
| FWVS | Bottom sheet (94%) wrapping `SpectatingWorkoutModal` in a `PagerView`, locked to friend/past view; lazily fetches the owner's `statsExercises`; "copy template" with toast. | `default` = `memo(FeedWorkoutViewerSheet, areEqual)` (FWVS:353). | Outside partition: frontend/screens/5_Profile.js:9 (use at :202), frontend/screens/4.1_ViewProfile.js:14 (use at :445). Both pass exactly `expandToggle, workout, friendUid, friendPfp, onClose`. |

---

## B. Verified dead code

No PARKED file imports anything from this partition; no export of this partition is unused (knip list is empty, confirmed by grep). Everything below is internal.

### B1. SFP

| # | Identifier | Kind | Where | Evidence / action |
|---|---|---|---|---|
| 1 | `handlePressSaveButton`, `isSaved` | unused destructured values | SFP:898-899 | Only referenced inside the commented-out save button (SFP:1740, 1743). Remove both names from the destructuring. The hook keeps returning them (PostFooter.js:39-43 in feed-social still uses them). |
| 2 | commented-out save button JSX | commented-out code | SFP:1737-1747 | Rule 7. Delete the whole `{/* ... */}` block. |
| 3 | `liveDurationTick` | state value never read | SFP:1011 | The setter is the point (forces a re-render every second, SFP:1022). Change to `const [, setLiveDurationTick] = useState(0);`. Do NOT remove the state. |
| 4 | `workoutResult` | assigned, never read | SFP:1284 (`let workoutResult = null;`), SFP:1289 (`workoutResult = res;`) | Delete both lines. `res` is used directly afterwards. |
| 5 | `styles.metricColumnLeft` | unused style | SFP:1977-1979 | grep `metricColumnLeft` -> only the definition. |
| 6 | `styles.metricsLeft` | unused style | SFP:2095-2098 | only the definition. |
| 7 | `styles.metricCenter` | unused style | SFP:2132-2134 | only the definition. |
| 8 | `styles.metricRight` | unused style | SFP:2135-2137 | only the definition. |
| 9 | `styles.recordsValueText` | unused style | SFP:2261-2263 | only the definition (see E1: the JSX references a non-existent `metricValueText` instead). |
| 10 | `styles.videoPlayIconCircle` | unused style | SFP:2351-2360 | only the definition. |
| 11 | `styles.metricValueText` | reference to a style key that does not exist | SFP:1613 | No such key in the StyleSheet (script-checked: 102 keys defined, this is the only used-but-undefined one). `undefined` inside a style array is ignored, so removing the reference is a no-op. See E1 / I1. |
| 12 | `styles.sectionBottomDivider` | empty style object `{}` + its use | def SFP:1984-1985, use SFP:1683 | Empty object = no-op. Optional: delete key and reduce SFP:1681-1684 to `style={styles.sectionBottom}`. |
| 13 | `styles.actionButtonMiddle` | empty style object `{}` + its use | def SFP:2414-2415, use SFP:1730 | Empty object = no-op. Optional: delete key and make SFP:1730 `style={styles.actionButton}`. |
| 14 | prop `onPressShare` and `onPressShareButton: () => onPressShare?.(index, data)` | prop whose handler can never fire | SFP:243, SFP:903 | SFP renders no share control (footer = like SFP:1719-1726 + comment SFP:1728-1735). The only consumers of `onPressShareButton` are `pressShare` and `handleTapAt` in usePostFooterInteractions.js:278-285 / 287-326, and SFP does not destructure either (SFP:893-900). Removing the prop and the argument is behaviour-preserving (the hook guards `typeof onPressShareButton !== 'function'`). Callers that still pass it: PostListItem.js:83, ProfileWorkoutsAndPostsScreen.js:951 (see G4). |
| 15 | `ref={(node) => assignButtonRef?.("like"/"comment", node)}` | refs stored, never read | SFP:1720, SFP:1729 | The registry is read only by `handleTapAt` (hook:287-326), which SFP never calls. Functionally dead, but it touches render props of the footer buttons; LOW value. Recommendation: leave unless the coordinator wants it gone (then also drop `assignButtonRef` from SFP:895). |
| 16 | `getMillis` defined inside the component | function re-created every render | SFP:992-1008 | Not dead; pure, no closure capture -> hoist to module scope (see F2). |

All SFP imports are used (ESLint agrees). All 15 props are passed by at least one caller except as noted in #14 (passed but inert).

### B2. PWS

| # | Identifier | Kind | Where | Evidence / action |
|---|---|---|---|---|
| 1 | `deleteCompletedWorkout` import | unused import | PWS:25 | Only referenced in the commented-out block (PWS:774). Delete with #3. |
| 2 | `// const [deletingWorkout, setDeletingWorkout] = useState(false);` | commented-out code | PWS:570 | Rule 7. |
| 3 | `performDeleteWorkout` / `handleRequestDeleteWorkout` block | commented-out code | PWS:758-815 (`/* ... */`) | Rule 7. After deletion `Alert` (PWS:466, 897, 904) and `emitHexagonUpdate` (PWS:884) are still used. |
| 4 | commented-out trash button JSX | commented-out code | PWS:931-946 | Rule 7. Keep the now-empty `<View style={styles.headerRight}>` (PWS:930, 947): it is the right-hand spacer that keeps the title centred. |
| 5 | `styles.headerIconButton` | unused style | PWS:1237-1239 | Only used at PWS:936 inside #4. |
| 6 | tracing `console.log` x2 | debug logging | PWS:828-832 (`updateCompletedWorkout -> start`, logs the whole payload), PWS:835 (`-> result`) | Delete both. Keep `console.warn` PWS:838, 888 and `console.error` PWS:893 (real failure paths). |
| 7 | `fallbackLive = false` parameter of `deriveLiveStatus` | parameter no caller passes | PWS:253, read at PWS:259 | Callers PWS:264, 331, 448 all pass one argument. Remove the parameter and `|| fallbackLive`. |
| 8 | inner `workout ? (...) : (<View style={styles.titleBlock}>...)` | unreachable branch | condition PWS:1026, dead else branch PWS:1041-1052 | The whole block is inside `{workout ? (` at PWS:951, so `workout` is always truthy here. Keep the `<Pressable>` branch (PWS:1027-1040), delete the ternary and the else branch. |
| 9 | `{workout ? ( ... ) : null}` around the metrics row | always-true condition | PWS:1055 / PWS:1144 | Same reason as #8. Optional: unwrap (keep PWS:1056-1143). |
| 10 | "Live" style variants that restate the base value | no-op styles | defs PWS:1211-1213 `safeAreaLive`, 1220-1222 `headerLive`, 1243-1245 `contentLive`, 1250-1252 `detailSectionLive`, 1259-1261 `sectionHeaderLive`; uses PWS:922, 923, 950, 952, 953 | `safeAreaLive`, `detailSectionLive`, `sectionHeaderLive` repeat the exact value of their base style (PWS:1209, 1248, 1255). `headerLive` paints `theme.bg` on a header that already sits on a `theme.bg` SafeAreaView; `contentLive` sets `transparent` on a container with no background. All five are visually no-ops. OPTIONAL removal (see I7); if kept, nothing else depends on them. |
| 11 | `handlePressWorkoutHeader = useCallback(() => {}, [])` | no-op handler | def PWS:682, uses PWS:1028, 1057 | Not safely removable: replacing the two `Pressable`s by `View`s changes the accessibility tree. KEEP (see I7). |
| 12 | `if (!Array.isArray(exercises) ...` | always-false sub-condition | PWS:343 | `exercises` is always an array (PWS:334-340). Harmless; leave. |
| 13 | `sanitizedHandle || "Friend"` and `if (!displayName) return ""` | unreachable fallbacks | PWS:981, PWS:555 | `displayName` always ends in `"user"` (PWS:503). Harmless; leave. |

### B3. PWEL

| # | Identifier | Kind | Where | Evidence / action |
|---|---|---|---|---|
| 1 | `muscle` | unused variable | PWEL:79 | Never read. Delete the line. |
| 2 | `default:` branches of `typePillBg` / `typePillText` | unreachable | PWEL:375-376, PWEL:387-388 | Both are called only when `normalizedType` is truthy (PWEL:148, 149), i.e. one of the five set types. Leave unless the functions are shared (C7). |
| 3 | `fallback = "0"` parameter of `formatNumber` | parameter never passed, fallback unreachable | PWEL:19, 21 | Callers PWEL:42, 62, 66, 68, 70 always pass a finite number. Leave. |
| 4 | `disabled={!onPress}`, `!onPress && styles.nameContainerDisabled`, style `nameContainerDisabled: { opacity: 1 }` | branch the only caller never triggers | PWEL:106, 111, 243-245 | PWS:1153 always passes `onPress`. Defensive component API; leave. |

### B4. FWVS

| # | Identifier | Kind | Where | Evidence / action |
|---|---|---|---|---|
| 1 | props `items` (`itemsProp`), `activeIndex`, `onChangeIndex` | props no caller passes | FWVS:25-27; reads at FWVS:41, 49, 65, 78, 88, 196, 347-348 | Both callers (5_Profile.js:202-208, 4.1_ViewProfile.js:445-451) pass only `expandToggle, workout, friendUid, friendPfp, onClose`. So `items` always comes from `workout` (FWVS:50-63), `activeIndex` is always 0, `onChangeIndex?.()` is always a no-op. Removal is possible with these exact edits and nothing else: FWVS:41 -> `useState(0)`; delete FWVS:49; deps FWVS:65 -> `[workout, friendUid, friendPfp]`; FWVS:78 `Math.min(activeIndex, ...)` -> `0` (i.e. `const target = 0;`), deps FWVS:88 -> `[items]`; delete FWVS:196 and make deps FWVS:197 `[]`; drop the two comparisons FWVS:347-348. Keep the `PagerView`, `currentIndex` state and the effect at FWVS:76-88 (they still reset the pager when the workout changes). Medium-low risk, fragile file: see I6 before doing it. |
| 2 | `chip: null` | object field never read | FWVS:61 | `item.chip` is read nowhere (item fields read: `key`, `workout`, `friendUid`, `friendPfp`, `friendPfpVersion` at FWVS:224-237). Delete the line. |
| 3 | `noop` + `onCheer={noop}` | wrapper that only forwards nothing | FWVS:107-108, FWVS:249 | SpectatingWorkoutModal calls `try { onCheer?.(); } catch {}` (SpectatingWorkoutModal.js:203), so omitting the prop is identical. Optional: delete FWVS:107-108 and FWVS:249. |
| 4 | `catch (e)` binding | unused catch binding | FWVS:179 | Optional: `catch {`. |

---

## C. Duplication

"Identical" below means verified with `diff` on the exact line ranges unless stated otherwise.

### C1. Workout display helpers duplicated between SFP and PWS (both inside this partition)

| Helper | SFP | PWS | Identical? |
|---|---|---|---|
| `BODYGRAPH_OUTLINE_COLOR`, `MUSCLE_HIGHLIGHT`, `MUSCLE_SEGMENTS` | SFP:45-54 | PWS:39-48 | byte-identical |
| `formatDuration(durationMs)` | SFP:102-118 | PWS:112-128 | byte-identical |
| `formatNumber(value)` (toLocaleString, `"--"` for non-finite) | SFP:120-128 | PWS:130-138 | byte-identical |
| `resolveWorkoutTitle(workout, caption)` | SFP:138-144 | PWS:151-157 | byte-identical |
| `resolveWeightUnit()` | SFP:146-155 | PWS:140-149 | byte-identical |
| `initialsFrom(name)` | SFP:196-201 | PWS:159-164 | byte-identical |
| `workedSegments` useMemo body (forEach over exercises) | SFP:1171-1185 | PWS:345-359 | identical except the iterated expression (`workout.exercises` vs `exercises`) and the guard line (SFP:1169 vs PWS:343) |
| `muscleFills` useMemo | SFP:1187-1193 | PWS:362-368 | byte-identical |
| `shouldShowSubtitle`, `workoutName`, `isWorkoutTitle` useMemos | SFP:375-382, 389-402 | PWS:423-445 | byte-identical bodies |
| confetti JSX (IIFE with two `ConfettiCannon`s) | SFP:1753-1776 | PWS:1177-1200 | byte-identical; the outer condition differs (SFP:1752 vs PWS:1176) |

Recommended canonical home: new `frontend/utils/workoutDisplay.js` exporting, moved verbatim from SFP: `BODYGRAPH_OUTLINE_COLOR`, `MUSCLE_HIGHLIGHT`, `MUSCLE_SEGMENTS`, `formatDuration`, `formatNumber`, `resolveWorkoutTitle`, `resolveWeightUnit`, `initialsFrom`. Both files import them under the same names, so no call site changes.
- Optional, small rewrite: `resolveWorkedSegments(exercises)` = guard `if (!Array.isArray(exercises)) return [];` + SFP:1170-1185 with `workout.exercises` replaced by `exercises`. SFP then calls it with `workout ? workout.exercises : null`, PWS with `exercises`. Equivalent for every input (an empty array yields `[]` either way; `ex?.` already tolerates null entries).
- Other holders of the same constant: `BODYGRAPH_OUTLINE_COLOR = "#40485c"` also at frontend/components/1_Feed/FeedSnapshotCard.js:60 and frontend/components/2_Competition/sections/ProgressSection.js:102 (identical value) -> G6. `MUSCLE_HIGHLIGHT` in SelectExerciseModal.js:35 is `"#ff6f67ff"` (different literal; leave).
- `formatNumber` exists with different behaviour elsewhere: PWEL:19 (fallback `"0"`; identical to the shared one for every input PWEL passes, see B3#3), frontend/components/5_Profile/ProfileTop/WorkoutStats.js:13 (k/m/b abbreviations, different). Keep the shared one workout-specific (do not put a generic `formatNumber` in a generic util).
- Do NOT merge the two metrics JSX blocks (SFP:1531-1618 vs PWS:1055-1144) or the two StyleSheets (clones SFP:2019-2039 == PWS:1298-1318, SFP:2097-2123 == PWS:1367-1392, SFP:2176-2204 == PWS:1427-1455): the sheets diverge in individual values (`avatarWrap` 38/24/11 vs 34/23/10, `avatarInitials` 15.5 vs 15, `cheerButton.paddingVertical` 5 vs 4, `metricsColumnStack.flex` 0.6 vs 0.65, `sectionTop.paddingTop`) and the records value uses different style keys (E1).

### C2. Same name, different behaviour: leave both

| Helper | Locations | Difference |
|---|---|---|
| `toMillis` | SFP:61-73; PWS:51-80; frontend/utils/date.js:6; frontend/utils/friends.js:4; ProfileWorkoutsAndPostsScreen.js:39; plus about 15 more repo-wide | SFP returns `0` on failure, ignores `{seconds}` plain objects (falls to `new Date(obj)` -> 0). PWS returns `null` on failure, handles `seconds/_seconds` (+ fractional nanos), rejects Date instances. utils/date.js returns `0`, passes NaN numbers through, handles `Date` and `seconds`. Not interchangeable. |
| `getMillis` (SFP:992-1008) vs the above | SFP only | Third variant: `null` on failure, `seconds ?? _seconds` via `Number()`, floors nanos, accepts Date instances through `new Date(value)`. Keep separate; only hoist (F2). |
| `formatTimestamp` | SFP:75-100; PWS:82-110; ProgressSection.js:313; UserStatsProgressPreview.js:268 | SFP: `month: "short", day: "numeric"`, `hour12: true`, upper-cases AM/PM, takes a raw value. PWS: `month: "long", day: "2-digit"`, goes through its own `toMillis`. The other two use dayjs and different fallbacks. frontend/utils/date.js:20 `formatWorkoutTimestamp` is close to PWS but uses `day: 'numeric'` and an ISO fallback. All different. |
| `normalizeMediaEntry` | SFP:157-171; ProfileWorkoutsAndPostsScreen.js:93; UserStatsExerciseDetailScreen.js:30; 1.2_Chat/MessageItem.js:45 | SFP uses `||` chains, spreads `...entry`, 4 uri keys. The others use `??`, more/other keys, do not spread. Different. |
| `mediaSignatureFor` | SFP:173-194; PUO:48-59 | Differ for non-string `uri`: SFP -> `""` for a missing/number uri and try/catch around stringify; PUO -> `JSON.stringify(entry.uri || '')` (`'""'` for missing, `"12"` for a number). Different. |
| `sendCheerEvent` | SFP:345-368; PWS:303-327; SpectatingWorkoutModal.js:180-193; ActiveWorkoutModal.js:1192-1215 | Different payloads (`source: "feed"` vs `"workout_viewer"` vs none; pfp fields present or not; `isLiveWorkout` guard only in PWS). Leave all. |
| `buildPreviousDisplay` | PWEL:54-75; SetRow:29-50 | PWEL formats with `formatNumber` (toLocaleString: `1,000`, `12.345`), SetRow with `formatCount` (no grouping, 2 decimals). Different output for >= 1000 and for > 2 decimals. Leave both. |
| delete-post flow | SFP `runDefaultDelete` SFP:1270-1364; 1_Feed.js `handleDeletePost` :803-960 | Same structure; differ in timestamp parser (`toMillis` vs `toMillisSafe`), order of `invalidateFeedCacheForUser`, alert text ("The post was deleted, but ..." vs "The workout could not be removed ..."), guard on pending pid. Leave both. The 10-line `global.userData` sync after `deleteCompletedWorkout` IS identical (SFP:1292-1301 == 1_Feed.js:890-899) -> optional shared helper, G7. |

### C3. `toNumber(value, fallback = 0)`: 6 byte-identical copies
SFP:56-59, frontend/screens/1_Feed.js:230-233, frontend/screens/ProfileWorkoutsAndPostsScreen.js:62-65, frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:87-90, backend/workouts/deleteCompletedWorkout.js:7-10, backend/workouts/updateCompletedWorkout.js:9-12. (functions/shared/rebuildHexagonStats.js:3 is the same body but lives in the separately deployed functions/ tree: leave.) Different, do not merge: frontend/utils/workoutSummary.js:1, frontend/utils/macroRecommendations.js:44, frontend/helper/countCompletedWorkoutsWithExercise.js:25 (single-arg, string cleaning).
Canonical home: coordinator's choice (a small `frontend/utils/number.js` exporting `toNumber`); this partition then imports it in SFP. See G2.

### C4. `formatClockTime(seconds)`: 3 identical copies
SFP:130-135, PUO:41-46 (byte-identical), frontend/components/5_Profile/MakePost/ClipBuilderScreen.js:29-34 (differs only in quote characters). Canonical home: coordinator's choice (e.g. `frontend/utils/formatClockTime.js`). See G1. Not the same as PreviewPhoto.js:10 `formatDuration` (rounds instead of floors).

### C5. Video slide controls: SFP vs PUO
jscpd clones SFP:548-584 == PUO:584-620, SFP:587-622 == PUO:621-656, SFP:646-668 == PUO:675-697, SFP:671-699 == PUO:697-725, SFP:817-830 == PUO:770-783, SFP:431-439 == PUO:224-232, SFP:501-514 == PUO:822-835.
Identical logic in both: state `videoPauseState / videoDurations / videoProgress / videoControlsVisible`, refs `videoRefs / scrubbingStateRef / videoControlsHideTimeoutsRef / videoControlsOpacityRef`, unmount timer cleanup effect, `getControlsOpacityValue`, `clearControlsHideTimeout`, `setControlsVisibility`, `toggleVideoPlayback`, `assignVideoRef`, `handleVideoProgress`, `beginScrub`, `handleScrubChange` (SFP:667-676 spelled with a temp variable, same semantics), `finishScrub`, and the "show controls for the active slide" effect (SFP:503-514 == PUO:824-835).
Differences: `handleVideoLoad` (SFP:638-646 also calls `handleMediaLoad()`), `toggleVideoMute` (SFP:622-628 supports an external toggle), reset on media change (SFP:458-477 only), and the effect position (PUO declares it after `setControlsVisibility`; SFP before, see E2).
A shared hook (`useVideoSlideControls({ mediaIndex, mediaList, onVideoLoaded })`) is feasible but is a rewrite of stateful logic in two files with no tests: MEDIUM risk. Recommendation: not in the first pass; record as a candidate (G8).

### C6. Confetti loader + fire
`confettiTick / confettiRef / ConfettiModuleRef / loadConfettiModule / fireConfetti`: PWS:283-302, SpectatingWorkoutModal.js:161-178, ActiveWorkoutModal.js:1171-1189 are semantically identical (formatting differs). SFP:321-344 differs: extra `confettiVisible` state and the ref call is deferred with `requestAnimationFrame`. A shared `useConfettiCannon()` hook could serve the first three; SFP must stay as it is. Cross-partition candidate (G5), low priority.

### C7. Set-row helpers: PWEL vs SetRow
- `normalizePrev`: PWEL:11-17 == SetRow:14-20 (identical apart from indentation). (frontend/components/3_Workout/NewWorkout/hooks/useWorkoutEditing.js:8 is different: no zero check.)
- `typePillText`: PWEL:379-390 == SetRow:384-395 (identical).
- `typePillBg`: PWEL:363-378 vs SetRow:367-382: the five typed cases are identical; the `default:` body differs (PWEL adds `borderWidth`/`borderColor`), but the default is unreachable in both files (PWEL:148 and SetRow:174 only call it for a non-null normalized type). So they behave identically for every input they can receive.
Canonical home: `frontend/components/3_Workout/shared/` (next to setTypeUtils.js, which both files already import), e.g. a new `setTypePillStyles.js` (`typePillBg`, `typePillText`) and `normalizePrev` in a small `previousSet.js`. See G3. Low value (about 35 lines), low risk.

### C8. Minor
- `HANDLE_FRIEND_ACCENT = "#E0A500"`, `HANDLE_FRIEND_BACKGROUND = "#e0a4002c"`: FWVS:18-19 and frontend/components/2_Competition/UserStats/UserStatsStyles.js:20-21 (same values; UserStatsStyles is currently modified in the owner's working tree). Leave unless a shared colour module appears.
- "open owner profile through the ROOT navigator" (Profile vs ViewProfile): FWVS:251-264 and PWS:657-680 are two of 19 sites repo-wide with different payloads. Not identical; leave.
- Inside SFP: the two "more" buttons SFP:1486-1492 and SFP:1494-1500 differ only in `onPress`; the title block is written twice (SFP:1507-1516 Pressable, SFP:1518-1527 View); five near-identical options rows (SFP:1805-1828, 1832-1854, 1858-1883, 1902-1925, 1927-1945); the two options-sheet state machines (owner: SFP:425-426, 1200-1223, 1248-1268, 1389-1401; report: SFP:427-428, 705-727, 1225-1240, 1403-1415) are the same pattern with translate distance 240 vs 200. Collapsing any of these is a JSX/logic rewrite: optional, not required.

---

## D. Decomposition plans

### D1. SFP (2501 lines)

Top-level layout today: imports 1-41; constants 43-54; pure helpers 56-201; `OptionsWeightIcon` 203-233; component 235-1953; export 1955; StyleSheet 1957-2500.

Regions inside the component (for orientation): props 235-251; highlight animation 252-279; `workout/clipPost/isLivePost/workoutWid` 281-320; confetti + cheer event 321-368; title/caption 369-402; `mediaList` 404-419; state + refs 421-442; fingerprint + `postPid` 444-456; content-ready effects 458-494; timer cleanup effect 496-501; controls-visibility effect 503-514; `handleMediaLoad` 516-518; index clamp effect 520-524; aspect/layout/scroll 526-548; video control callbacks 550-697; `handleCheer` 699-703; report handlers 705-750; `getAspectRatioForEntry` 752-756; `renderMediaItem` 758-863; owner pfp 865-869; like/comment counts 871-891; `usePostFooterInteractions` 893-904; liker summary 906-990; live duration 992-1035; metric labels 1036-1049; `displayName/reportHandle` 1051-1062; `viewerUid` 1067-1075; `postOwnerUid` 1077-1091; verified 1093-1119; `isViewerOwner` 1121; delete identifier/flags 1124-1167; body-graph memo 1168-1193; delete labels 1194-1198; sheet animation effects 1200-1240; handlers 1242-1387; interpolations 1389-1415; JSX 1417-1952 (header 1427-1529, metrics 1531-1618, summary 1620-1640, media 1642-1679, footer 1681-1750, confetti 1752-1777, overlays 1778-1786, owner modal 1787-1886, report modal 1888-1949).

Stage 1: pure moves, LOW risk (do these)
1. `frontend/components/1_Feed/SimpleFeedPost.styles.js` <- SFP:1957-2500 verbatim (after the B1 deletions). Needs `StyleSheet`, `theme` (`../../theme/mfpDark`), `scaleSize` (`../../helper/scaleSize`); `export default styles`. SFP keeps importing `StyleSheet` (used for `StyleSheet.absoluteFill`, SFP:1755).
2. `frontend/utils/workoutDisplay.js` (shared with PWS, see C1) <- SFP:45-54, 102-118, 120-128, 138-144, 146-155, 196-201.
3. `frontend/components/1_Feed/feedPost/feedPostUtils.js` <- `toMillis` SFP:61-73, `formatTimestamp` SFP:75-100, `normalizeMediaEntry` SFP:157-171, `mediaSignatureFor` SFP:173-194, plus `getMillis` SFP:992-1008 (hoisted; see F2). `toNumber` SFP:56-59 and `formatClockTime` SFP:130-135 go here unless the coordinator creates the shared homes of C3/C4.
   (Folder name `feedPost/` rather than `SimpleFeedPost/` so that `./SimpleFeedPost` keeps resolving unambiguously to the file.)
4. `frontend/components/1_Feed/feedPost/OptionsWeightIcon.js` <- SFP:203-233 (needs `React`, `Svg, { Path }`). SFP then no longer imports `react-native-svg`.
What stays: `AnimatedPressable` (SFP:43), `SCREEN_WIDTH` (SFP:44), the component, the export. Result: about 1760 lines.

Stage 2: custom hooks moved as contiguous blocks, LOW-MEDIUM risk (each is a verbatim move of statements into a hook body plus a `return {...}`)
5. `feedPost/useFeedPostCheer.js` <- SFP:321-344 (confetti state/refs/loader/fire), SFP:345-368 (`sendCheerEvent`), SFP:699-703 (`handleCheer`). Input `workoutWid`. Returns `{ confettiTick, confettiVisible, confettiRef, loadConfettiModule, handleCheer }`. No effects inside, so call position is free (keep it where SFP:321 is). Carries imports `resolvePhotoURL`, `addDoc/collection/serverTimestamp`, `db`, `hapticStrong`.
6. `feedPost/useFeedPostLikes.js` <- SFP:871-875 (`likeCount`) + SFP:906-990 (`normalizedLikes`, `firstLiker`, `formattedFirstHandle`, `likeMessage`, first-liker `usePfp`, initials). Input `data`. Returns `{ likeCount, likeMessage, firstLikerAvatar, firstLikerInitials }`. Contains a `usePfp` call, so call the hook at the position of SFP:906 (after `usePostFooterInteractions`) to keep effect order; `likeCount` is not referenced between SFP:875 and SFP:906 (checked), so moving it down is safe.
7. `feedPost/useLiveWorkoutDuration.js` <- SFP:1010-1028 (ref, tick state, interval effect) + SFP:1030-1035 (`durationLabel`). Inputs `(isLivePost, workout)`. Returns `durationLabel`. One effect: call it exactly where SFP:1010 is (after the first-liker `usePfp`, before the `subscribeUserData` effect at SFP:1068).
8. `feedPost/useFeedPostDelete.js` <- SFP:429 (`pendingDeletePid` state), SFP:1124-1161 (`workoutDeleteIdentifier`), SFP:1163 (`canAutoDeleteWorkout`), SFP:1194-1198 (labels), SFP:1270-1364 (`runDefaultDelete`). Inputs `{ workout, isViewerOwner, postPid, postOwnerUid, viewerUid }`. Returns `{ deleteOptionLabel, runDefaultDelete }` (every other moved name is used only inside the moved code: checked `canAutoDeleteWorkout` SFP:1163, 1194-1196, 1286, 1355, 1364; `workoutDeleteIdentifier` SFP:1163, 1286, 1288, 1364; `deleteConfirmTitle/Message` SFP:1350-1351, 1364). No effects. `canEditWorkoutOption` (SFP:1164-1167) stays in SFP.
Result after stage 2: about 1420 lines.

Stage 3: presentational sub-components (JSX moved verbatim, closure names become props), LOW-MEDIUM risk
9. `feedPost/FeedPostOptionsModals.js`:
   - `FeedPostOwnerOptionsModal` <- JSX SFP:1788-1886. Props: `visible` (isOptionsSheetVisible), `onRequestClose` (handleBackdropPress), `backdropOpacity`, `translateY`, `onPressEditPost`, `clipPost`, `canEditWorkoutOption`, `onPressEditWorkout`, `onPressDeletePost`, `deleteOptionLabel`.
   - `FeedPostReportOptionsModal` <- JSX SFP:1888-1948. Props: `visible`, `onRequestClose` (handleReportOptionsBackdrop), `backdropOpacity`, `translateY`, `onSelectReport`.
   - The `isViewerOwner ? ... : ...` switch (SFP:1787/1887) stays in SFP. Both need `AnimatedPressable`: export it from this file (or a one-line module) and import it in SFP for SFP:1719, 1728.
10. `feedPost/FeedPostWorkoutMetrics.js` <- JSX SFP:1532-1617. Props: `onPress`, `muscleFills`, `isLivePost`, `durationLabel`, `volumeLabel`, `weightUnit`, `caloriesLabel`, `hasCalories`, `onPressCaloriesInfo`, `recordsLabel`. Optionally `FeedPostExerciseSummary` <- SFP:1621-1639 (`exerciseSummaries`, `onPress`).
Result after stage 3: about 1150 lines.

Not recommended without explicit sign-off (HIGH risk): extracting the media carousel / video controls (state SFP:430-438, effects SFP:458-477, 496-514, 520-524, callbacks SFP:516-697, `renderMediaItem` SFP:752-863, JSX SFP:1642-1679).
Blockers: (a) the reset effect SFP:458-477 resets card-level state (`contentReady`, `mediaLoadedCount`) and video state in one effect, and its position before SFP:479-488 matters; (b) `handleMediaLoad` couples video `onLoad` to the card's content-ready gate; (c) `renderMediaItem` closes over about 17 values; (d) `setControlsVisibility` is called inside a `setVideoPauseState` updater (SFP:608-619); (e) the mute state has an external/internal dual source (SFP:440-441, 622-628). If it is ever done, do it as the shared hook of C5 with PUO, with device testing.

Blockers that apply to every stage
- Use-before-define dependency arrays (E2): SFP:514, 708, 744. Any move that changes whether `setControlsVisibility`, `isViewerOwner`, `postOwnerUid`, `reportHandle` are assigned before those lines changes the dependency values from `undefined` to real values. Apply the E2 fix first, deliberately.
- Effect order is observable only for: reset effect (SFP:458-477) before ready check (SFP:479-488) before 3 s timeout (SFP:490-494); hooks with effects (`usePfp` x2, `usePostFooterInteractions`, `useUserVerified`, `subscribeUserData`) are independent of each other, but keep their relative order anyway by calling extracted hooks at the original positions as stated above.
- Every extracted file imports `styles` from `SimpleFeedPost.styles.js`; do not split the StyleSheet.

### D2. PWS (1495 lines)

Top-level layout: imports 1-35; constants 37-48; helpers 51-244; component 246-1204; StyleSheet 1206-1492; export 1494.

Stage 1: pure moves, LOW risk
1. `frontend/screens/PastWorkoutScreen.styles.js` <- PWS:1206-1492 verbatim (after B2 deletions) plus `HEADER_ICON_SIZE` (PWS:37) as a named export, because it is used both in the sheet (PWS:1234) and in JSX (PWS:925). PWS keeps `StyleSheet` for `StyleSheet.absoluteFill` (PWS:1179).
2. `frontend/utils/workoutDisplay.js` (C1): PWS drops PWS:39-48, 112-128, 130-138, 140-149, 151-157, 159-164 and imports them.
3. `frontend/screens/pastWorkout/pastWorkoutUtils.js` (sub-folder following the existing `frontend/screens/feed/` precedent) <- `toMillis` PWS:51-80, `formatTimestamp` PWS:82-110, `pickFirstString` PWS:166-173, `EXERCISE_META_LOOKUP` PWS:175-191, `findExerciseMeta` PWS:193-204, `extractEquipmentLabel` PWS:206-236, `resolveEquipmentLabel` PWS:238-244, together with the `EXERCISES` import (PWS:35, path becomes `../../components/3_Workout/NewWorkout/SelectExercise/EXERCISES`). Exports needed by the screen: `toMillis`, `formatTimestamp`, `pickFirstString`, `findExerciseMeta`, `resolveEquipmentLabel`.
What stays: `SCREEN_WIDTH` (PWS:38) and the component. Result: about 1495 - 287 - 195 - 100 (B2) = about 910 lines.

Stage 2: LOW-MEDIUM risk, optional
4. `pastWorkout/usePastWorkoutCheer.js` <- PWS:283-302 (confetti), PWS:303-327 (`sendCheerEvent`), PWS:915-919 (`handleCheer`). Inputs `{ isLiveWorkout, workoutWid }`. Returns `{ confettiTick, confettiRef, loadConfettiModule, handleCheer }`. No effects.
5. `pastWorkout/useSaveEditedWorkout.js` <- PWS:817-900. Inputs `{ canEditWorkout, viewerUid, workout, workoutIdentifier, setWorkout }`; returns the callback. No effects. Carries `updateCompletedWorkout`, `invalidateFeedCacheForUser`, `emitHexagonUpdate`, `emitUserDataUpdate`, `Alert`, `toMillis`.
6. `buildExerciseDetailPayload(exercise)` in pastWorkoutUtils.js <- body PWS:689-751 (pure; the early `return` at PWS:704 becomes `return null`, add `return basePayload`). `handlePressExercise` (PWS:684-756) keeps the guards at PWS:686-687 and the `navigation.navigate` at PWS:753. Small rewrite of two return statements; flag it in the report.
Result: about 720 lines. Going below that requires extracting the summary header JSX (PWS:953-1145, about 20 props); not worth the risk.

Blockers
- `workoutOwnerUid`/`displayName`/`pfpUri` (PWS:472-513) feed both the live listener effect (PWS:515-540) and the owner payload (PWS:588-655): do not move them into a hook that would be called after PWS:515.
- `viewerUid` is intentionally a plain render-time read of `global.userData` (PWS:560-566); do not replace it with `getViewerUid()` (C: different fallbacks).

### D3. PWEL (393) and FWVS (354)
Under 500 lines; no decomposition. Only the B3/B4 removals and, if the coordinator creates the shared homes, C7.

---

## E. Latent bugs

E1. SFP:1613 references `styles.metricValueText`, a key that does not exist; the sibling screen uses `styles.recordsValueText` in the same spot (PWS:1139) and SFP defines `recordsValueText` (SFP:2261-2263) but never uses it. Effect today: the records number in the feed card has no 6pt left margin after the medal icon, while the PastWorkout screen has it.
- Minimal behaviour-preserving action: delete `styles.metricValueText` from the array at SFP:1613 and delete the unused `recordsValueText` key. Do NOT swap in `recordsValueText`: that changes rendered UI (rule 1).
- Confidence that the reference is dead: high. Whether the margin was intended: open (I1).

E2. Three hook dependency arrays in SFP read a `const` above its declaration; because of the block-scoping transform they receive `undefined` (confirmed with ESLint `no-use-before-define`: SFP:507, 509, 512, 514, 706, 708, 736, 737, 744).
- (a) SFP:503-514: effect uses `setControlsVisibility` (declared SFP:565). Dependency is always `undefined`; the body works because it runs after render. No visible consequence (`setControlsVisibility` is referentially stable). PUO:824-835 has the same effect placed after the declaration, which shows the intent.
  Minimal fix: move SFP:550-605 (`getControlsOpacityValue`, `clearControlsHideTimeout`, `setControlsVisibility`: three `useCallback`s, no effects, depend only on refs/state declared at SFP:434-438) to just above SFP:503. Effect order is unchanged. Confidence: high.
- (b) SFP:705-708 `openReportOptions`: dependency `isViewerOwner` (declared SFP:1121) is always `undefined`, so the callback is created once and sees the first render's `isViewerOwner` forever.
- (c) SFP:729-744 `handleReportPost`: dependencies `postOwnerUid` (SFP:1077) and `reportHandle` (SFP:1059) are always `undefined`; the report is sent with the owner uid/handle of the render in which `caption/data.id/postPid/workoutName` last changed.
  Minimal fix for (b) and (c): move the block SFP:705-750 (`openReportOptions`, `closeReportOptions`, `handleReportOptionsBackdrop`, `handleReportPost`, `handleSelectReport`: all `useCallback`, no effects, used only in JSX at SFP:1496, 1892, 1897, 1907, 1932) to just after SFP:1122. Observable behaviour is unchanged in every normal flow (the report button is only rendered when `!isViewerOwner`; a post's owner uid/handle do not change for a mounted card); it only removes the stale-closure hazard. Confidence: high that this matches intent; medium-high that it is free of side effects.
  If the coordinator prefers zero semantic movement, leave (b)/(c) as they are and record them; but then every later extraction must keep those declarations below the callbacks (see H1).

E3. PWS:853: `Math.abs(toMillis(created) - toMillis(targetCreated)) < 2000` where PWS `toMillis` returns `null` on failure: two unparseable but truthy timestamps compare as equal (`null - null === 0`), so a wrong workout could be picked as `updatedEntry` when the wid does not match. Requires malformed data. Minimal fix would be to require both values non-null; intent is clear but the path is unreachable with well-formed data. Confidence: low-medium. Recommendation: do not change; listed in I9.

E4. FWVS:121-124: `sanitizeStatsForViewer(data?.statsExercises || null, key, viewerUid, viewerData)` is called without the owner document as 5th argument, so workoutPrivacy.js:194-199 builds `{ uid, settings: {} }`, `isProfilePrivate` is false and the function always returns the stats unchanged. The privacy filter is therefore a no-op here, although the owner doc (`data`) is in scope. Not unambiguous (passing `data` would start hiding stats for private profiles = behaviour change). Do not fix; I5.

E5. FWVS:113-130 (ESLint exhaustive-deps): `fetchFriendStats` has `[]` deps but reads `viewerUid`/`viewerData`. Harmless because of E4 (the two arguments cannot influence the result) and because results are cached per uid. Do not touch the dependency array.

E6. SFP:166: `(entry.type || entry.mediaType || entry.kind || "image").toLowerCase()` throws if `type` is a truthy non-string. Never observed shape; leave.

No conditional hooks, no duplicate object keys, no references to undefined identifiers (ESLint `no-undef` clean) in the four files.

---

## F. Best-practice issues

F1. Use-before-define in dependency arrays (SFP:514, 708, 744): see E2. Risk of fixing: low.

F2. Function defined during render: `getMillis` (SFP:992-1008) is pure and captures nothing; hoist to module scope / feedPostUtils. Risk: none (it is referenced only inside the effect at SFP:1015, and is not in that effect's deps).

F3. Side effect inside a state updater: `toggleVideoPlayback` calls `setControlsVisibility` (timers + animation) inside the `setVideoPauseState` updater (SFP:608-619; same in PUO). Works in production; would double-fire under StrictMode. Fixing changes timing: leave. Risk if changed: medium.

F4. Effects / async work without cleanup (all harmless today, React 18 ignores state updates after unmount; adding cleanup would change timing, so leave):
- SFP:260-279 highlight `Animated.sequence` not stopped on unmount.
- SFP:334 `requestAnimationFrame` in `fireConfetti`; SFP:1212, 1229 `requestAnimationFrame` before the sheet-open animations (the unmount effects SFP:1221-1223, 1238-1240 stop the value but do not cancel the frame).
- SFP:1281-1346 async delete sets `pendingDeletePid` after the card may be gone.
- FWVS:73, 80 `requestAnimationFrame`; FWVS:139, 189 `InteractionManager.runAfterInteractions` handles not cancelled; FWVS:148-152 toast animation not stopped.
PWS:515-540 (Firestore listener) cleans up correctly.

F5. Unstable memo input: PWEL:80 `sets` is a fresh `[]` each render when `exercise.sets` is not an array, so `displayNumbers` (PWEL:87) recomputes. Cosmetic; leave (the ESLint note is informational).

F6. Import grouping: SFP:14-41 interleaves third-party and local imports (`CroppedVideo` local at SFP:18 before `Slider` at SFP:19; `firebase/firestore` at SFP:35 after locals). FWVS:3-16 likewise (local SpectatingWorkoutModal at FWVS:6 before `firebase/firestore` at FWVS:7). PWS:12-35 is grouped except `firebase/firestore` (PWS:17) sitting above the blank line. Regroup only as part of the import edits the decomposition already requires; none of these imports is order-sensitive. Risk: low.

F7. `FWVS` reads `global.userData` during render (FWVS:43-46) and PWS computes `viewerUid` from it during render (PWS:560-566): not reactive, by design of the `global.userData` architecture. Leave.

F8. Trivial `useMemo`s around booleans (SFP:1163-1167) and a template literal around a string (SFP:962): harmless; leave (no formatting churn).

F9. Inconsistent JSX indentation in SFP:1506-1528, 1536-1617 (one line at column 8, SFP:1574): leave unless those lines are moved to a new file in stage 3, in which case re-indent only the moved block.

---

## G. Cross-partition requests

G1. profile-makepost: PUO:41-46 and ClipBuilderScreen.js:29-34 hold copies of `formatClockTime` identical to SFP:130-135. If a shared home is created, all three import it.
G2. feed-screen (1_Feed.js:230-233), profile (ProfileWorkoutsAndPostsScreen.js:62-65), user-stats (UserStatsExerciseDetailScreen.js:87-90), backend/workouts (deleteCompletedWorkout.js:7-10, updateCompletedWorkout.js:9-12): identical `toNumber(value, fallback = 0)`. One canonical export; coordinator picks the path.
G3. workout-tracking (SetRow:14-20 `normalizePrev`, SetRow:367-382 `typePillBg`, SetRow:384-395 `typePillText`) and workout-rest (owner of frontend/components/3_Workout/shared/): host shared `normalizePrev`, `typePillBg`, `typePillText` there so PWEL:11-17 and PWEL:363-390 can be deleted. If `typePillBg` is shared, keep SetRow's default branch (either is unreachable).
G4. feed-cards (PostListItem.js:11 `openShareModal` prop, :43-47 `handleShare`, :83 `onPressShare={handleShare}`), profile (ProfileWorkoutsAndPostsScreen.js:951 `onPressShare={() => { }}`), feed-screen (1_Feed.js:755 `openShareModal`, :1388, :1399): once SFP drops the inert `onPressShare` prop (B1#14), these pass-throughs are dead. Order between partitions does not matter (an extra prop is ignored). Feed-screen must check whether `openShareModal` has other users before removing it.
G5. workout-active (SpectatingWorkoutModal.js:161-178, ActiveWorkoutModal.js:1171-1189): confetti loader/fire logic identical to PWS:283-302; candidate shared hook `useConfettiCannon`. Low priority.
G6. feed-cards (FeedSnapshotCard.js:60) and progress-section (ProgressSection.js:102): `BODYGRAPH_OUTLINE_COLOR = "#40485c"` duplicates SFP:45 / PWS:39; import from `frontend/utils/workoutDisplay.js` if it is created.
G7. feed-screen (1_Feed.js:890-899): the `global.userData` sync after `deleteCompletedWorkout` is identical to SFP:1292-1301; optional shared helper (e.g. `applyDeletedWorkoutToUserData(res)` next to userDataEvents). Only if both partitions agree; otherwise leave both.
G8. profile-makepost (PUO:224-232, 579-725, 822-835): video slide control logic duplicated with SFP (C5). Candidate shared hook; recommended to defer.
G9. No change requested, for information: callers of the `"PastWorkout"` route build params that PWS never reads: every `postMeta` field except `pid` (1_Feed.js:1202-1214, ProfileWorkoutsAndPostsScreen.js:682-695, UserStatsExerciseDetailScreen.js:488-500) and `owner.rankTier / currentRank / rank` (those three plus ExerciseDetail.js:2385-2387, ProgressSection.js:2211-2213, UserStatsModal.js:389-391). Route params are frozen by rule 1; see I8.

---

## H. Fragile areas

H1. SFP dependency arrays at SFP:514, 708, 744 (E2): moving the referenced declarations, or the callbacks, silently changes the dependency values. Handle only through the two explicit moves described in E2.
H2. SFP content-ready gate: `previousMediaFingerprintRef` initialised to the current fingerprint (SFP:449), reset effect (SFP:458-477), ready check (SFP:479-488), 3 s fallback timer (SFP:490-494), `cardHidden` opacity 0 (SFP:1422) and the loading overlay (SFP:1782-1786). Order of these three effects and the `mediaLoadedCount` counting (`handleMediaLoad` SFP:516-518, called from image `onLoad` SFP:859 and `handleVideoLoad` SFP:639) must stay exactly as is, or cards stay invisible / flash.
H3. SFP video controls (SFP:496-514, 550-697, 758-863): per-index timeout map, lazily created `Animated.Value`s, 180 ms fades, 2000 ms auto-hide, scrubbing state in a ref, `seek(value, 0)`. Timing-sensitive; do not restructure.
H4. SFP confetti: lazy `require("react-native-confetti-cannon")` inside try/catch (SFP:325-330), ref API first and key-remount fallback via `requestAnimationFrame` (SFP:331-344), render IIFE (SFP:1752-1777); `confettiVisible` is intentionally never reset. Same pattern in PWS:286-302, 1176-1201.
H5. SFP live timer: ref + tick state + `DRIFT_MS = 500` (SFP:1010-1035). `durationLabel` must stay a per-render computation.
H6. SFP options sheets: open = set visible, then `requestAnimationFrame`, then 220 ms timing (SFP:1208-1219, 1225-1236); close = 200 ms timing and only then `afterClose()` (SFP:1253-1268, 710-723). Edit/delete/report run inside `afterClose` so that the Modal is gone before `Alert.alert`, navigation or the report sheet appear. Keep the sequencing; keep the force-close effect (SFP:1200-1206).
H7. SFP delete flow (SFP:1270-1364): order of `deleteCompletedWorkout` -> `global.userData` mutation -> `emitHexagonUpdate`/`emitUserDataUpdate` -> `invalidateFeedCacheForUser` -> `deletePost` -> second cache invalidation -> `global.userData.posts/postCount` -> alerts. Move as one block only.
H8. `React.memo(SimpleFeedPost)` with the default shallow comparison (SFP:1955) together with `usePostFooterInteractions` mutating `data.likes`/`data.likeCount` in place: do not add a custom comparator or memoise on `data` contents.
H9. FWVS: `memo(..., areEqual)` deliberately ignores `onClose` (FWVS:345-351); `BottomSheet index={-1}` + `expand()` in a `requestAnimationFrame` keyed on `expandToggle` (FWVS:67-74); `mountContent` gating (FWVS:132-144, 215); `PagerView.setPageWithoutAnimation` (FWVS:76-88); `friendStatsCacheRef` + `setStatsTick` re-render (FWVS:110-130); the `privacyMode` defaulting that creates a new workout object (FWVS:226-228). Leave all of it.
H10. PWS live mode: `shouldListenToLive` is derived from the route only (PWS:447-450) so the listener (PWS:515-540) does not resubscribe when `isLiveWorkout` state flips; the listener merges `currentWorkout` over the previous workout (PWS:526). `workoutIdentifier` is derived from `routeWorkout`, not from the edited `workout` state (PWS:396-408). `handleSaveEditedWorkout` re-throws after the alert (PWS:897-898); EditingWorkoutModal depends on the rejection. `startEditing` param reset (PWS:574-582).
H11. PWEL column widths are percentages that must keep matching between header and rows (PWEL:259-285 vs 296-342); keep the StyleSheet values untouched.
H12. Module-level `Dimensions.get("window")` snapshots (SFP:44, PWS:38) and module-level `EXERCISE_META_LOOKUP` (PWS:175-191): keep them module-level when moved.
H13. PWEL and FWVS use 2-space indentation; keep it (rule 6).

---

## I. Open questions for the owner

I1. SFP:1613: should the records value in the feed card have the 6pt left margin that the PastWorkout screen has (`recordsValueText`)? Today it has none because the style key name is wrong. The refactor will only drop the dead reference.
I2. SFP:1737-1747: the bookmark/save button is commented out. It will be deleted (rule 7); the hook still supports saving for the other post component.
I3. PWS:570, 758-815, 931-946: the "delete workout" header button and its handlers are commented out. They will be deleted (rule 7); deleting a workout stays available from the post options sheet.
I4. Cheer failure logs use `console.log` (SFP:366, PWS:325; same in SpectatingWorkoutModal.js:191 and ActiveWorkoutModal.js). They are failure-path logs, not tracing: keep as they are, promote to `console.warn`, or remove?
I5. FWVS:123: stats privacy is effectively not applied (E4). Intended (the profile screens already gate access) or should the fetched owner document be passed so private profiles hide stats?
I6. FWVS:25-27: the multi-workout pager API (`items`, `activeIndex`, `onChangeIndex`) is unused since the feed opens the PastWorkout screen. Remove the plumbing (B4#1) or keep it for a possible return?
I7. PWS: the five no-op "Live" style variants (B2#10) and the two no-op `Pressable`s around title and metrics (PWS:682, 1028, 1057) look like leftovers from a design where the live screen was tinted and the header was tappable. Remove the styles? Turn the Pressables into Views (changes accessibility focus only)?
I8. Callers pass route params to `"PastWorkout"` that the screen never reads (G9). Left untouched because route params are frozen; confirm that nothing else is expected to read them.
I9. PWS:853: unparseable timestamps compare as equal (E3). Leave?
I10. SFP has a complete share callback path (`onPressShare`) but no share button. Dead plumbing to remove (B1#14, G4), or a button that is meant to come back?
I11. The calorie info alert has two different texts for the same icon (SFP:1044-1047 vs PWS:466-469). Intentional?
I12. PWEL:132 prints the column label "lbs" and PWEL:66-70 hard-codes "lb" for previous sets, while `formatWeight` (PWEL:39-42) can print "kg". Out of scope for a behaviour-preserving refactor; noted only.
