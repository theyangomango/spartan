# Audit: partition "macro-screens" (9 files, 3625 lines)

All line numbers are the files as they are now. All nine files are byte-identical to `SPX/baseline` (checked with `diff -q`), so baseline line ranges can be used for `sed -n 'A,Bp'` extraction.
Files read completely, top to bottom: 9 of 9.

Legend
- T1 = unconditionally dead (no input can reach it, or nothing references it). Remove.
- T2 = dead only because no current caller passes a route param / prop. Behaviour-preserving to remove today, but it deletes a deliberate (if unused) capability. Default: KEEP, ask the owner (section I).
- "Verbatim" = move with `sed -n 'A,Bp' SPX/baseline/<path>`; then add only imports/exports.

Build fact used in several places below: `babel-preset-expo` 10.0.2 delegates to its nested `@react-native/babel-preset` 0.73.21, whose `src/configs/main.js:30` always applies `@babel/plugin-transform-block-scoping`. `const`/`let` become `var`; there is no temporal dead zone at runtime. A `const` read before its declaration line yields `undefined`, it does not throw.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `frontend/logic/macroLogsIndexer.js` (167) | Module-level index + cache that turns `global.userData.loggedFoods` into `{ meals, totals }` per day. Rebuilds when `global.__loggedFoodsSig` changes. | `buildFromGlobal` (:45), `invalidateMealsCache` (:118, unused), `getLoggedFoodStreak` (:134, unused) | `frontend/screens/MacroTracking.js:30` (`buildFromGlobal` only). |
| `frontend/screens/FoodDetail.js` (1173) | Route `FoodDetail`: add a food to a day (`mode:'add'`) or edit servings/meal of a logged entry (`mode:'edit'`), with macro ring, nutrition facts, favourite toggle, discard-changes modal. Also holds private components `FavoriteFoodButton`, `MacroBadge` (unused), `MacroRow`, `MacroStat`, `NutritionFacts` and an unused named export `FoodDetailInline`. | default `FoodDetail` (:34); named `FoodDetailInline` (:582, unused) | `frontend/screens/index.js:24` (default) -> `App.js:57`, registered `App.js:1703`. Navigated to by `frontend/screens/MacroTracking.js:420`, `frontend/screens/ProfileLoggedFoodsScreen.js:208`, `frontend/components/2_MacroTracking/MealsSection.js:60`, `frontend/components/2_MacroTracking/FoodSearchOverlay.js:767`. |
| `frontend/screens/MacroTracking.js` (1042) | Tab/route `MacroTracking`: horizontally paged day view (VirtualizedList of 100000 virtual pages), macro goals + personal info persistence, add/delete food, barcode FAB, workout-calorie offset. | default `MacroTracking` (:240) | `frontend/screens/index.js:20` -> `App.js:55` (`App.js:1512-1513`) and `frontend/navigation/MainTabs.js:4,28`. Route name also referenced in `App.js:99`, `frontend/components/Footer.js:282-284`. |
| `frontend/screens/ProfileLoggedFoodsScreen.js` (480) | Route `ProfileLoggedFoods`: owner-only history of logged foods grouped by day. | default (:89) | `frontend/screens/index.js:34` -> `App.js:67,1575`. Navigated to by `frontend/screens/MacroTracking.js:468,471`, `frontend/screens/5_Profile.js:173`, `frontend/screens/4.1_ViewProfile.js:419`. |
| `frontend/screens/fatsecretClient.js` (93) | Thin client for four FatSecret Cloud Functions (`httpsCallable`). Lives in `screens/` although it is a service module. | `searchFood` (:12), `fatsecret` (:21, unused), `lookupBarcode` (:26), `getFoodById` (:31) | `frontend/screens/FoodDetail.js:11` (`getFoodById`); `frontend/components/2_MacroTracking/WorkoutBarcodeScannerModal.js:9` (`lookupBarcode`); `frontend/components/2_MacroTracking/FoodSearchOverlay.js:28` (`searchFood`, `lookupBarcode`). |
| `frontend/utils/loggedFoods.js` (149) | Pure helpers over the `loggedFoods` map (nested-by-day or legacy flat): count, flatten, group by day. | `countLoggedFoods` (:9), `flattenLoggedFoods` (:69, used only in-file), `groupLoggedFoodsByDay` (:128) | `frontend/screens/5_Profile.js:15` and `frontend/screens/4.1_ViewProfile.js:22` (`countLoggedFoods`); `frontend/screens/ProfileLoggedFoodsScreen.js:22` (`groupLoggedFoodsByDay`). |
| `frontend/utils/macroRecommendations.js` (240) | Pure calorie/macro recommendation model from the personal-info form. | named `computeRecommendedMacrosFromPersonalInfo` (:114) and the same binding as default (:239, unused) | `frontend/components/2_MacroTracking/MacroGoalsSheet.js:24` (named). |
| `frontend/utils/nutrition.js` (226) | Pure parsing/formatting of FatSecret description strings. | `coercePortion` (:4, in-file only), `scaleMacros` (:54), `parseMacrosFromDescription` (:69), `parseExtraNutrientsFromDescription` (:107), `formatPortion` (:168, in-file only), `summarizeFood` (:183) | `frontend/logic/macroLogsIndexer.js:4`, `frontend/utils/loggedFoods.js:2`, `frontend/screens/MacroTracking.js:33`, `frontend/screens/FoodDetail.js:9`, `frontend/screens/ProfileLoggedFoodsScreen.js:24`, `frontend/components/2_MacroTracking/MealsSection.js:5`. (DEAD `frontend/hooks/useFoodLogs.js:19` does not count.) |
| `frontend/utils/recentFoods.js` (55) | Firestore helpers for `usersPrivate/{uid}/recentFoods`. | `fetchRecentFoods` (:6), `touchRecentFood` (:19), `deleteRecentFood` (:44) | `frontend/screens/MacroTracking.js:32`, `frontend/screens/FoodDetail.js:8` (`touchRecentFood`); `frontend/components/2_MacroTracking/FoodSearchOverlay.js:30` (`fetchRecentFoods`, `deleteRecentFood`). |

---

## B. Verified dead code

Evidence method: `grep -rnE` over the repo (js/jsx/cjs/mjs, excluding node_modules, ios, .git, output, exports, tmp) for every name, plus a defined-vs-used pass over each StyleSheet.

### B.1 `frontend/logic/macroLogsIndexer.js` (T1)

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `invalidateMealsCache` | exported fn | :118-120 | Repo grep: definition only. |
| `getLoggedFoodStreak` | exported fn | :134-166 | Repo grep: definition only (`MacroStreakBadge.js` does not use it). |
| `dayKeyToDate` | fn | :122-132 | Only caller is `getLoggedFoodStreak` (:144). |
| `DAY_MS` | const | :12 | Only read at :151 inside `getLoggedFoodStreak`. |

After removal the file ends at :116. Both imports stay used (`parseMacrosFromDescription` :78, `toDayKey` :54).

### B.2 `frontend/screens/fatsecretClient.js` (T1)

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `fatsecret` | exported fn | :21-24 | Repo grep for `fatsecret(` and import lists: definition only. |
| `callGeneric` | const + its comment | :6-7 | Only used by `fatsecret` (:22). `httpsCallable(...)` only builds a callable reference (no network, no side effect), so deleting it changes nothing at load. The Cloud Function `fatsecretMethod` (`functions/index.js:1937`) stays deployed; do not touch it. |
| `console.log(res.data)` | tracing log | :33 | Prints every FatSecret food payload; not a failure path. |
| Commented-out legacy OAuth client | commented code | :38-92 (and blank :36-37) | Rule 7. NOTE: :39-40 contain a hard-coded FatSecret consumer key and secret. See E.8 / I.8. |

### B.3 `frontend/utils/loggedFoods.js` (T1)

- `flattenLoggedFoods` (:69): the `export` keyword is unnecessary; the only use is :129 in the same file. Make it a module-private `const`.

### B.4 `frontend/utils/macroRecommendations.js` (T1)

- Default export (:239, plus blank :238): same binding as the named export; the only importer (`MacroGoalsSheet.js:24`) uses the named form. Delete the default.

### B.5 `frontend/utils/nutrition.js` (T1)

- `coercePortion` (:4): `export` unnecessary (uses: :55, :109, :184, all in-file). `backend/admin/exportFoodLogsTable.js:130` has its own copy (TOOLING, plain node script; it cannot import this ESM file).
- `formatPortion` (:168): `export` unnecessary today (uses: :205, :216). If cross-partition request G.5 is taken (SearchResultCard imports it), keep the export instead.
- `_` (:198): unused destructured element. Change `const [_, frac, unitRaw] = perFraction;` to `const [, frac, unitRaw] = perFraction;`.

### B.6 `frontend/screens/FoodDetail.js`

T1:

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `FoodDetailInline` | named export (component) + its 2-line header comment | :580-707 | Whole-repo grep (all file types): definition only. Not used by PARKED/TOOLING/functions/DEAD. knip missed it. `git log -S` shows its last user was removed in c994d2f2. Deleting it also removes three of the four jscpd clones in this file. No import becomes unused (everything it uses is also used by `FoodDetail`). |
| `MacroBadge` | component | :792-799 (+ blank :800) | ESLint; no JSX use. |
| styles `badge`, `badgeLabel`, `badgeValue` | StyleSheet keys | :1038-1046, :1047, :1048 | Only used by `MacroBadge` (:794-796). `badgeSuffix` (:1049) stays: `MacroStat` uses it (:936). |
| style `brand` | StyleSheet key | :1022 | ESLint; no reference. |
| `saving` / `setSaving` | state | :66 | Setter never called; `saving` is constant `false`. Reads: `disabled={saving}` (:447, :451) and `saving ? 'rgba(255,255,255,0.5)' : COLORS.text` (:448, :452). Remove the state, drop the two `disabled` props, replace the two ternaries with `COLORS.text`. |
| `apiServing` / `setApiServing` | state | :67, setter call :198 | Never read. Remove the state and the `setApiServing(def);` line; keep `setExtrasPS(cached);` inside the `if (!cancelled)` block. (On the legacy root this removes one redundant intermediate render that showed identical UI.) |
| Empty effect | useEffect | :246-248 | Body is a comment only. |
| `COLORS.card`, `COLORS.muted` | object keys | :21, :27 | `COLORS` is module-private and never passed as a prop; `grep -o "COLORS\.[A-Za-z]*"` in the file shows only accent, accentSoft, bg, carbs, fat, hairline, protein, subtext, text. |
| Comment `{/* Nutrition facts (collapsible) */}` | stale note | :538 | The section is not collapsible. Reword to `{/* Nutrition facts */}` or drop. |

T2 (KEEP unless the owner says otherwise, see I.5):

| Identifier | Location | Evidence |
|---|---|---|
| `readOnly` route param and every branch on it | :41, :256, :264 (dep), :284, :293, :442, :444-445, :478, :480-482, :489-492, :499-501, :504-506, :521-523; styles `inputWrapReadOnly` (:1067), `stepBtnDisabled` (:1077, an empty object), `mealChipReadOnly` (:1089) | None of the four `navigate('FoodDetail', ...)` call sites passes `readOnly` (MacroTracking.js:420-425, ProfileLoggedFoodsScreen.js:208-213, MealsSection.js:60, FoodSearchOverlay.js:767-772). No deep-link config in App.js. So `readOnly` is always `false`. |

### B.7 `frontend/screens/MacroTracking.js`

T1:

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `lastCountRef` and its comment | ref | :244-245 | ESLint; never read. |
| Stale notes | comments | :10, :36, :272, :377, :567, :569 (and blank :568, :570), :805-806, :860, :910 | They describe code that moved away or behaviour that no longer exists (:860 says date updates are kept to the end-of-gesture callback, but sits on `onScroll`, which does update the header date). Keep :273, :283, :286, :311, :355, :379, :443, :452, :476, :497, :515, :523, :538, :545, :547, :571, :694, :753, :758, :808. |
| `personalSheetIndex` / `setPersonalSheetIndex` | state | :394 | The only call that could open the sheet is `onOpenPersonalInfo={() => setPersonalSheetIndex(1)}` (:1004), but `MacroGoalsSheet` does not declare or forward that prop (`MacroGoalsSheet.js:44-54`, no rest spread; repo grep for `onOpenPersonalInfo`: only :1004). Every other setter call writes `-1` (:1013, :1014) or is the sheet's own `onChange` (:1010), which cannot fire for a sheet that never leaves index -1. So the value is constant `-1`. |
| `onOpenPersonalInfo` prop | prop | :1004 | Ignored by the receiver (see above). Removing this line alone is a pure no-op. |
| Standalone `<PersonalInfoSheet>` | JSX + import | :1008-1016, import :19 | Its `index` is constant -1 (see above), so it can never open. The personal-info form the user actually sees is `PersonalInfoContent` embedded in `MacroGoalsSheet.js:456`. Removing it un-mounts a permanently closed @gorhom bottom sheet (nothing visible). `PersonalInfoSheet`'s default export stays in use by PARKED `LeaderboardsSection.js:52,2056`: do not touch that file. Risk: low; see H.9. |
| `collapsedMeals` / `setCollapsedMeals`, `toggleMealCollapse` | state + callback | :399, :429-433, props :938-939 | `toggleMeal` is passed down MacroDayPage (:62) -> MealsSection (:17) and never called; `collapsed` is read only by the two memo comparators (`MacroDayPage.js:80`, `MealsSection.js:89`) and its identity never changes. Removal needs G.1 (two files outside this partition). After removal `LayoutAnimation` (import :3) is unused here. |
| `UIManager.setLayoutAnimationEnabledExperimental(true)` block | module side effect | :38-40 (+ `UIManager`, `Platform` in import :3) | Only needed for `LayoutAnimation` in `toggleMealCollapse`. Every other `LayoutAnimation` user enables the flag itself (`UserStatsModal.js:31-32`, `ActiveWorkoutModal.js:342-343`, `ExerciseLog.js:60-61`, `SetRow.js:55-56`; also `UserStatsAfterWorkoutSheet.js:10-11`, `SpectatingWorkoutModal.js:37-38`). Removable only together with `toggleMealCollapse`; keeping it is equally fine. Android-only. |
| inner `clamp` | fn | :771-775 | Same behaviour as `clampInt` (:730-734) for every input (`parseInt(x, 10)` already stringifies). Replace the three calls at :788-790 with `clampInt` and delete :771-775. |
| `COLORS.chipBg`, `COLORS.addBtnBg`, `COLORS.shadow`, `COLORS.modalCard` | object keys | :52, :53, :61, :62 | `COLORS` is passed as a prop to DateHeader, MacroDayPage (-> NutritionSummaryCard, MealsSection -> MealCard, MealItemCard, MacroStreakBadge), FoodSearchOverlay (-> SearchResultCard, PortionPickerModal, QuickAddModal), MacroGoalsSheet, PersonalInfoSheet. Grep of every one of those files for `COLORS.x` / `theme.x` (SearchResultCard aliases the prop as `theme`), `COLORS[`, destructuring and spreads: none reads these four keys. Keys that ARE read by children and must stay: bg, card, text, subtext, hairline, ringTint, ringBg, ringTrack, fieldBg, accentBlue, accent, protein, carbs, fat. |

T2 (KEEP unless the owner says otherwise, see I.5):

| Identifier | Location | Evidence |
|---|---|---|
| `focusDate` / `date` route params: `parseFocusParam`, `initialFocus` param read, the "new params arrive" effect | :246-268, :270, :379-390 | Repo grep for `focusDate`: only this file. The only navigation into `MacroTracking` is `Footer.js:282` `go('MacroTracking')` with no params (`Footer.js:121-139`), and tab registration (`MainTabs.js:28`, `App.js:1512`). Nobody passes either param, so `parseFocusParam` always receives `undefined`. If kept, hoist `parseFocusParam` to module scope (it is pure; see D.2). |

Not dead, do not remove:
- `buildFromGlobal` in the dependency array at :565 (ESLint "unnecessary dependency"): informational; leave the array as is.
- `isFocused={Math.abs(offset) <= 1}` (:946): only consumed by `MacroDayPage`'s memo comparator (`MacroDayPage.js:85`), where it changes re-render timing. See H.4.
- `console.log` at :759 and :801: real failure paths. Keep as they are (changing them to `console.warn` would surface LogBox warnings in dev).

### B.8 `frontend/screens/ProfileLoggedFoodsScreen.js`

T1:
- `COLORS.bg` (:57), `COLORS.ringTint` (:62), `COLORS.accent` (:63): the object is only read locally at :438 (`hairline`) and :442 (`card`) and passed to `MealItemCard` (:199), which reads card, hairline, subtext, text only. Keep `text` and `subtext`.
- Optional, zero visual effect: style `daySection` (:387-388) is an empty object (used at :180); style `cardLast` (:447-449) repeats the `borderBottomWidth` that `card` (:437) already sets. Leaving both is fine.

Keep:
- The `!canViewContent` branch (:244-248) and the `!isViewingSelf` LockedView (:231-237) cannot be reached through today's three callers (all are self-only: `5_Profile.js:173`, `MacroTracking.js:462-466`, and `4.1_ViewProfile.js:416` returns unless `isViewingSelf`), but they are the privacy guard. Do not remove.
- The callers pass an `isViewingSelf` param that this screen never reads (it derives its own at :96). Leave the callers alone (route params contract).
- `console.log` at FoodDetail.js:370, :428 are failure paths: keep.

### B.9 `frontend/utils/recentFoods.js`

Nothing dead. All ten Firestore imports are used.

---

## C. Duplication

| # | Cluster | Locations | Identical? | Recommendation |
|---|---|---|---|---|
| C.1 | FoodDetail vs FoodDetailInline (jscpd 166-197 == 627-658, 210-230 == 597-617, 463-471 == 688-696) | `FoodDetail.js` | n/a | Resolved by deleting `FoodDetailInline` (B.6). Nothing to extract. |
| C.2 | "FatSecret default serving -> extras object" | `FoodDetail.js:92-134` (`normalizeExtrasObject` + `extractExtrasFromServing`, used at :138-155) vs hand-built `cached` at :179-196 | NO. `normalizeExtrasObject` returns `null` when every field is null; the hand-built object at :180-196 is always an object. With an all-null serving, step 3 stores a truthy all-null object in state and in AsyncStorage (so the next open short-circuits at :167-168 and makes no API call); the helper would store nothing and refetch every time. | Do not merge. Only hoist `normalizeExtrasObject` (:92-116) and `extractExtrasFromServing` (:118-134) verbatim to module scope of the new hook file (D.1); they capture nothing. |
| C.3 | Rounded macros object in `save` and `addNew` (jscpd 322-330 == 389-397) | `FoodDetail.js:322-330`, `:389-397` | The 9 cloned lines are identical; the surrounding objects differ (edit patch vs new entry). | Leave. Too small to be worth a helper, and both sit in fragile optimistic-write code (H.6). |
| C.4 | Row builder in `flattenLoggedFoods` (jscpd 81-99 == 103-121) | `loggedFoods.js:80-97` (nested body), `:102-119` (flat body) | Identical except the first argument of `normalizeDayKey`: `entry?.dayKey \|\| dayKey` (:81) vs `entry?.dayKey` (:103). | Safe to fold into one module-private `toRow(entryKey, entry, dayKeyHint)` that uses `entry?.dayKey \|\| dayKeyHint` and returns the row or `null`; the flat branch passes no hint (`x \|\| undefined` behaves like `x` inside `normalizeDayKey`, which only tests truthiness). This is a small rewrite, not a move: low risk, optional. |
| C.5 | "Is the loggedFoods map nested by day?" | `macroLogsIndexer.js:26-27` (tests only the FIRST value), `loggedFoods.js:14` and `:75` (tests ANY value with `.some`) | NO: they disagree on maps that mix legacy flat entries with day maps. | Leave all three. See I.9. |
| C.6 | `DAY_MS = 24 * 60 * 60 * 1000` | `macroLogsIndexer.js:12`, `MacroTracking.js:75` | Identical. | The indexer copy dies with B.1; one copy remains. |
| C.7 | Macro colours | `FoodDetail.js:29-31` and `MacroTracking.js:58-60`: `'#6c98fcff'`, `'#ff7cb5ff'`, `'#FFC874'` (identical; FoodDetail.js:28 even says "match MacroTracking"). `ProfileLoggedFoodsScreen.js:67-69`: `"#6c97fccc"`, `"#FF7CB5cc"`, `"#FFC874cc"` (different alpha, and 6c97 vs 6c98). | First two identical; third differs. | Canonical home: `frontend/theme/mfpDark.js` if the theme owner adds `macroProtein/macroCarbs/macroFat`, else a tiny `MACRO_COLORS` export in the new `macroTrackingConstants.js` (D.2) imported by FoodDetail's styles module. Leave ProfileLoggedFoodsScreen's values alone. |
| C.8 | Meal names and empty shapes | `FoodDetail.js:431` (`MEAL_OPTIONS`), `MacroTracking.js:67-73` (`mealsMeta` names), `:274`, `:444`, `:453` (empty meals), `:275`, `:445`, `:454` (zero totals), `macroLogsIndexer.js:49-50`, `:61-62`, `ProfileLoggedFoodsScreen.js:83` | Same literals. Each use needs a FRESH object (state values; `buckets` at indexer :61 is mutated by `push`). | Optional: export `createEmptyMeals()` / `createEmptyTotals()` factories from `macroLogsIndexer.js` and use them at MacroTracking :274-275, :444-445, :453-454. Must be factories, never shared constants. Low value; skip if in doubt. |
| C.9 | Integer clamp for form fields | `MacroTracking.js:730-734` (`clampInt`), `:771-775` (`clamp`), PARKED `LeaderboardsSection.js:1258-1262` | Identical for every input. | Use `clampInt` at :788-790 (B.7). Leave the PARKED copy. |
| C.10 | Numeric `clamp(value, min, max)` | `macroRecommendations.js:42` `Math.min(max, Math.max(min, value))`; identical semantics: `MuscleGroupExercises.js:84`, `1_Feed/Posts/Post.js:56`, `shared/hexagon/computeHexagonCore.js:182`. Different: `helper/estimateWorkoutCalories.js:87` `Math.max(min, Math.min(max, value))` (min wins when min > max), `NotificationCard.js:59` (default bounds), `ZoomCropper.js:36`. | Partly. In `macroRecommendations.js` min CAN exceed max (:163, :169), and the result must be `max`; only the "max wins" variants are interchangeable. | If the global plan creates a shared math util, `macroRecommendations.js:42` may import it, provided it is exactly the "max wins" form. Otherwise leave (one line). |
| C.11 | `safeNumber(value, fallback = 0)` | `loggedFoods.js:4-7`; same behaviour: `2_Competition/UserStats/userStatsUtils.js:3`, `5_Profile/ProfileTop/WorkoutStats.js:8` (no fallback arg), TOOLING `backend/admin/exportFoodLogsTable.js:125` and others in functions/ (cannot share). | Identical for all inputs among the three frontend copies. | Candidate for a shared util if the global plan has one; otherwise leave. |
| C.12 | `toNumber` | `macroRecommendations.js:44-47` returns `null` for non-finite; every other `toNumber` in the repo (`workoutSummary.js:1`, `1_Feed.js:230`, `ProfileWorkoutsAndPostsScreen.js:62`, ...) returns 0 or a fallback | NO. | Do not merge. The `null` is what makes the validation at :124-127 work. |
| C.13 | Signed-in uid lookup `global?.userData?.uid \|\| global?.userData?.id` | `MacroTracking.js:313, :525, :595, :708, :746, :768`; `FoodDetail.js:310, :376, :710`; also `FoodSearchOverlay.js` x4 | Identical to each other. NOT identical to `getViewerUid()` (`frontend/utils/userRefs.js:65`), which trims, writes `global.__lastKnownUid` and falls back to the cached uid when `userData` is empty. | Do not replace with `getViewerUid`: writes would then proceed for a last-known uid where today they are skipped. Leave inline. |
| C.14 | Logged-food id generator | `FoodDetail.js:382` and `MacroTracking.js:643-644`: `Date.now().toString(36)` + `Math.random().toString(36).slice(2, 10)` | Identical output format. | Optional: one `newLoggedFoodId()` in `frontend/utils/loggedFoods.js`. Low value. |
| C.15 | `toDayKeyString` | `MacroTracking.js:104-133` vs `frontend/screens/1_Feed.js:111-150` | NO. The Feed version also accepts Firestore Timestamp-like objects (`toDate`/`toMillis`) and delegates to a `dateToDayKey` helper; the MacroTracking version returns `null` for them. | Leave both. |
| C.16 | `resolveWorkoutTimestamp` | `MacroTracking.js:135-152` vs `MuscleGroupExercises.js:255`, `ExerciseDetail.js:1014`, `ProgressSection.js:405`, `UserStatsProgressPreview.js:108` | NO. Every copy uses a different field list and priority (MacroTracking prefers completedAt/finishedAt/endedAt first, then falls back to `date`; the others start with `created`), and a different millis helper (`toMillis` vs `toMillisSafe`). | Leave all. |
| C.17 | Day-key regex | `MacroTracking.js:103` (`DAY_KEY_PATTERN`) and the literal inside `parseFocusParam` :254 | Identical regex. | When `parseFocusParam` is hoisted (D.2), use `DAY_KEY_PATTERN` at :254. |
| C.18 | `formatPortion` | `nutrition.js:168-174` vs `2_MacroTracking/SearchResultCard.js:20-26` | Identical for string `unit` (the only thing SearchResultCard passes: regex captures). They differ only for null/non-string `unit` (nutrition.js tolerates it, SearchResultCard would throw). | G.5. Note SearchResultCard's `getSummary` is NOT the same as `summarizeFood` (integer-only kcal regex, no scaling): leave it. |
| C.19 | Description-macro parsing | `nutrition.js:4-16, :54-99` vs TOOLING `backend/admin/exportFoodLogsTable.js:125-178` | Same behaviour, different module system/runtime. | Leave (operator script cannot import frontend ESM). |
| C.20 | `LockedView` | `ProfileLoggedFoodsScreen.js:26-36` vs `ProfileWorkoutsAndPostsScreen.js:215-225` | NO: different copy, and the styles differ (82 vs 78 px circle, different colours, fonts, margins). | Leave both. |
| C.21 | "Midnight copy of a date" | `MacroTracking.js:77-86` `startOfDay`; ad-hoc at :386, :450-451, :486-490, :869-871, :902-904, :914-916 | `jumpToToday` :450-451 equals `startOfDay(new Date())`. `isHeaderDateToday` :483-495 is NOT `startOfDay`-equivalent (`startOfDay` maps an invalid date to today, the memo returns `false`). The three pager snippets add days first. | Leave; all sit in or next to the fragile pager (H.3). |
| C.22 | Macro coercion | `MacroTracking.js:626-631` (`Number(x) \|\| 0`) vs `loggedFoods.js:34-52` (`ensureMacros`, `Number.isFinite`) | NO (`Infinity` handling differs). | Leave. |
| C.23 | Portion parsing (other partition, for information) | `QuickAddModal.js:37-47` == `PortionPickerModal.js:18-28`; both differ from `nutrition.js` `coercePortion` (`parseFloat` vs `Number`: "1.5x" gives 1.5 vs 1) | Those two are identical to each other, not to `coercePortion`. | G.7. |

---

## D. Decomposition plans

Naming follows existing precedent in the repo (`UserStatsStyles.js`, `selectExerciseModalStyles.js`, `layoutConstants.js`, `userStatsUtils.js`). If the global plan prefers `<Name>.styles.js` next to the screen, the same content applies; only the paths change.

### D.1 `frontend/screens/FoodDetail.js` (1173 lines). Extraction risk: LOW

Do B.6 T1 first (it removes about 160 lines and all cross-component duplication). Then, by moving:

| New module | Moves in (current line ranges) | Needs |
|---|---|---|
| `frontend/components/2_MacroTracking/foodDetailStyles.js` | `COLORS` :19-32 (minus dead keys :21, :27); `styles` :1008-1172 (minus dead keys :1022, :1038-1048) | imports `StyleSheet`, `theme` (`../../theme/mfpDark`), `scaleSize` (`"../../helper/scaleSize"`); `export const COLORS`, `export const styles`. One shared sheet, not one per component: `hairline` (:1037) is shared by FoodDetail and NutritionFacts, and keeping one sheet makes the move byte-for-byte. |
| `frontend/components/2_MacroTracking/FavoriteFoodButton.js` | `FavoriteFoodButton` :709-790 | React + `useState, useEffect, useCallback, useRef`; `Pressable`; `Ionicons`; `getCachedFavoriteStatus, isFavoriteFood, removeFavoriteFood, upsertFavoriteFood` from `../../utils/favoriteFoods`; `strong as haptic` from `../../utils/haptics`; `COLORS, styles` from `./foodDetailStyles`. `export default`. Uses styles `favoriteBtn`, `favoriteBtnDisabled` only. |
| `frontend/components/2_MacroTracking/MacroRow.js` | `MacroRow` :801-927 and `MacroStat` :929-941 | React; `View, Text`; `Svg, { Circle }` from `react-native-svg`; `COLORS, styles`. `export default MacroRow`. Styles used: macroFourRow, ringBoxFour, centerLabel, centerCal, centerSub, macroStat, macroStatDot, macroStatLabel, macroStatValue, badgeSuffix. |
| `frontend/components/2_MacroTracking/NutritionFacts.js` | `NutritionFacts` :943-1006 | React; `View, Text`; `styles`. `export default`. Styles used: sectionHeader, sectionHeaderText, hairline, factsWrap, factRow, factLabel, factRight, factValue, factUnit, factPercentHigh, factPercentSub, factsEmpty. The `DV` table (:945-953) may be hoisted to module scope in the same file (constant). |
| `frontend/components/2_MacroTracking/useFoodExtrasPerServing.js` | state :68 and the effect :82-206 (minus `setApiServing`, B.6). `normalizeExtrasObject` :92-116 and `extractExtrasFromServing` :118-134 can sit at module scope of this file (they capture nothing). | `useState, useEffect`; `getFoodExtrasPS, setFoodExtrasPS` from `../../utils/foodCache`; `getFoodById` from `../../screens/fatsecretClient`. Signature: `useFoodExtrasPerServing(mode, food, entry)` returning `extrasPS`. Keep the dependency array exactly `[mode, food?.food_id, entry?.foodId, entry?.food_id]` (ESLint will repeat its exhaustive-deps warning; do not "fix" it: adding `food`/`entry` objects would refetch on every param identity change). |

What stays in `FoodDetail.js`: the screen component (:34-578) and its imports. Additionally hoist to module scope in place (pure, capture nothing): `round2` (:35-39) and `MEAL_OPTIONS` (:431). Expected size after the plan: about 440 lines.

Blockers / cautions:
- `FoodDetail` call order of hooks: put `const extrasPS = useFoodExtrasPerServing(mode, food, entry);` where :68 is now. The hook's effect is the first effect of the component today and stays first.
- Inside the effect, the local `const servings` (:146, :174) shadows the `servings` state. Inside a separate hook file the shadowing disappears by itself; do not rename when moving.
- `FavoriteFoodButton` is declared with `const` below its first JSX use (:461). That works today because the module finishes evaluating before any render; as an import it is trivially fine.
- `foodDetailStyles.js` imports nothing from `screens/`, so there is no cycle.
- Do not touch the ring maths in `MacroRow` (H.7).

### D.2 `frontend/screens/MacroTracking.js` (1042 lines). Extraction risk: MEDIUM overall (steps 1-3 low, steps 4-5 medium)

Do B.7 T1 and E.1/E.2 first. Then:

Step 1 (low). `frontend/utils/macroDayUtils.js`: pure helpers, moved verbatim.

| Declaration | Lines | Exported? (used by the component at) |
|---|---|---|
| `DAY_MS` | :75 | no |
| `startOfDay` | :77-86 | no |
| `clampDateToToday` | :88-92 | yes (:266, :270, :442, :872, :887, :905, :907) |
| `clampForwardDelta` | :94-101 | yes (:518, :868, :892) |
| `DAY_KEY_PATTERN` | :103 | no |
| `toDayKeyString` | :104-133 | no |
| `resolveWorkoutTimestamp` | :135-152 | no |
| `resolveWorkoutDayKey` | :154-163 | no |
| `parseCaloriesValue` | :165-181 | no |
| `getCompletedWorkoutsArray` | :183-190 | no (reads `global.userData.completedWorkouts`; keep that read exactly) |
| `sumWorkoutCaloriesForDay` | :192-209 | yes (:926) |
| `computeCompletedWorkoutsSignature` | :211-223 | yes (:277, :303) |
| `scaleGoalsWithBurn` | :225-238 | yes (:929) |
| `parseFocusParam` (hoisted out of the component; dedent only) | :247-268 | yes (:270, :382) |
| `formatDate` (hoisted) | :435-436 | yes (:820) |
| `clampInt` (hoisted) | :730-734 | yes (:739-742, and :788-790 after C.9) |

Imports needed there: `{ toDayKey, toMillis } from './date'`. None of these capture component state.

Step 2 (low). `frontend/components/2_MacroTracking/macroTrackingConstants.js`: `COLORS` :42-63 (minus the four dead keys), the four icon imports :14-17 and `mealsMeta` :67-73, `TOTAL_PAGES` / `BASE_INDEX` :477-478 (currently re-created inside the component every render; they are literals). Relative paths change when moving: `../assets/*.png` becomes `../../assets/*.png`, `../theme/mfpDark` becomes `../../theme/mfpDark`. `COLORS` and `mealsMeta` must remain module singletons: the memo comparators in `MacroDayPage.js:77-89` and `MealsSection.js:86-97` compare them by identity.

Step 3 (low). `useCompletedWorkoutsSignature()` hook (same folder as step 2 or `frontend/hooks/`): state :276-278 and effect :301-309; returns the signature string. Clean seam: it only uses `computeCompletedWorkoutsSignature` and `subscribeUserData`.

Step 4 (medium, optional). `useMacroGoals(goalsSheetIndex)` hook: state :279-281 (`applyWorkoutCalories`), :284 (`macroGoals`), :287-299 (`goalForm`); the `onSnapshot` effect :312-375; the seeding effect :572-582; `onToggleCalorieOffset` :706-726; the persistence parts of `onSaveGoals` :737-761 and `onSavePersonalInfo` :767-803. Returns `{ macroGoals, goalForm, setGoalForm, applyWorkoutCalories, onToggleCalorieOffset, saveGoals, onSavePersonalInfo }`. In the screen: `const onSaveGoals = async () => { await saveGoals(); closeGoalsSheet(); };` (today `closeGoalsSheet()` at :763 runs after the awaited write; keep that order).
Blockers: (a) the seeding effect depends on `goalsSheetIndex`, which is screen state: pass it in; (b) moving the two effects into a hook changes their position relative to the other effects of the screen (today: subscribe :301, snapshot :312, params :380, header sync :498, seed :572, focus :809). I found no ordering dependency between them (they touch disjoint state), but this cannot be run here, hence "medium"; (c) the snapshot effect's `[]` dependency array and the `global.userData = { ...global.userData, ... }` replacement writes (:338, :346-352, :369) must stay literally the same (H.5).

Step 5 (medium, optional). The pure first half of `onSelectResult` (:598-653: resolve name/brand/id/description, macros, new id, `entry`) can become `buildLoggedFoodEntry(food)` returning `{ newId, factor, macros, entry }` in `macroDayUtils.js`. It uses `Date.now()`/`Math.random()` but no component state. The second half (:654-703: optimistic global write, state updates, Firestore writes, `closeSearch`) stays in the screen.

What must stay in the screen: all pager state and handlers (:476-521, :831-954), `shiftDate`, `jumpToToday`, `deleteFood`, `refreshDayData`, the focus effect, the JSX. They share `focusedDate`, `baseIndex`, `headerDate`, `meals`, `totals`, `listRef`, `lastHeaderIndexRef`.

Expected size: about 790 lines after steps 1-3 and the dead-code removal; about 560 after steps 4-5. Steps 1-3 alone are an acceptable stopping point.

### D.3 Files under 500 lines

`ProfileLoggedFoodsScreen.js` (480): no split needed. The other six are small single-purpose modules.

### D.4 Suggested order of work, totals, new files

1. Small utils first (no importer changes): B.1, B.2, B.3, B.4, B.5, C.4.
2. `FoodDetail.js`: B.6 T1, then D.1.
3. `MacroTracking.js`: E.2, E.1 (per decision), B.7 T1 (the `collapsed` part only together with G.1), C.9, then D.2 steps 1-3 (4-5 optional).
4. `ProfileLoggedFoodsScreen.js`: B.8, F.3, F.4.

Estimated removable lines (T1 only): about 340 (FoodDetail about 160, fatsecretClient about 65, macroLogsIndexer about 50, MacroTracking about 45, loggedFoods about 17, others about 5). T2 would add about 60.

Files that can be deleted after this partition's refactor: none.
New files proposed: `frontend/components/2_MacroTracking/foodDetailStyles.js`, `FavoriteFoodButton.js`, `MacroRow.js`, `NutritionFacts.js`, `useFoodExtrasPerServing.js`, `macroTrackingConstants.js`; `frontend/utils/macroDayUtils.js`; optionally `useCompletedWorkoutsSignature.js` and `useMacroGoals.js`. None of these names exists today.

---

## E. Latent bugs

### E.1 `haptic` is not defined in MacroTracking.js (confidence: high)
- Where: `frontend/screens/MacroTracking.js:405`, `:430`, `:585`, `:728` (`try { haptic(); } catch {}`); no import. ESLint `no-undef` x4.
- Cause: commit c994d2f2 ("GOT RID OF USELESS STUFF") deleted the line `import { strong as haptic } from '../utils/haptics';` and left the calls. Because each call is inside `try/catch`, the `ReferenceError` is swallowed: nothing crashes, and no haptic fires.
- Minimal fix matching evident intent: restore `import { strong as haptic } from '../utils/haptics';` (the exact line that was removed; siblings `DateHeader.js:7`, `MealsSection.js:9`, `FoodDetail.js:14` use the same import).
- This fix is user-perceptible. Effect per call site: :405 barcode FAB gets a haptic (new); :728 "Edit Goals" pill gets a haptic (new); :585 "Add Food" would fire twice in the same tick, because `MealsSection.js:68` already calls `haptic()` before `onAddPress`; :430 never runs (B.7).
- Strictly behaviour-preserving alternative: delete the four dead `try { haptic(); } catch {}` statements instead.
- Recommendation: restore the import (hard rule 2 names this class of bug) and record it in the report as a visible change; see I.1 for the owner decision on the "Add Food" double tap. If the owner cannot be asked, use the alternative for :585 only (delete that one call) so no interaction fires twice.

### E.2 `refreshDayData` is read before it is declared (confidence: high)
- Where: effect at `MacroTracking.js:498-501` lists `refreshDayData` in its dependency array (:501); the `const refreshDayData = useCallback(...)` is at :561-565.
- Today: because of the block-scoping transform (see the build fact at the top) the dependency evaluates to `undefined` on every render, so the array is effectively `[focusedDate, undefined]`; the effect body runs later, when the variable is assigned, so the call at :500 works. Under real ES semantics (or if the Babel preset ever stops down-levelling `const`) line :501 would throw on first render.
- Minimal fix: move :561-565 (the `refreshDayData` useCallback) to just above the comment at :497. Behaviour is unchanged: `refreshDayData`'s identity changes exactly when `focusedDate` changes (deps `[focusedDate, buildFromGlobal]`, the latter a module constant), so the effect fires on the same renders as before. Hook order changes consistently for every render, which is allowed. Do not edit either dependency array.

### E.3 Editing a food from "Logged Food Items" silently discards the edit (confidence: high on the diagnosis; DO NOT FIX without the owner)
- Where: `ProfileLoggedFoodsScreen.js:208-213` navigates with `entry: entry.raw || entry`. `raw` (set at `loggedFoods.js:96, :118`) is the stored Firestore entry, which has no `key` field (writers: `FoodDetail.js:383-400`, `MacroTracking.js:682-692`, neither stores `key`); the row's key lives on `entry.key` only. `FoodDetail.save` starts with `if (!entry?.key || !dayKey) { navigation.goBack(); return; }` (:309).
- Effect: from this screen the checkmark just goes back; nothing is written. The "Discard changes?" modal still appears on the back arrow, so the screen looks editable.
- Evident-intent fix would be `entry: { ...(entry.raw || entry), key: entry.key }`, but that turns a no-op into a Firestore write, which is a behaviour change. Record as an open question (I.2).

### E.4 First swipe-to-delete after changing day targets the previous day (confidence: medium; static analysis only; DO NOT FIX without the owner)
- Where: `deleteFood` (`MacroTracking.js:524-559`) computes `dk = toDayKey(focusedDate)` from its closure (deps `[focusedDate]`). It reaches the row through `MacroDayPage` and `MealsSection`, both wrapped in `React.memo` with comparators that ignore function props (`MacroDayPage.js:77-89`, `MealsSection.js:86-97`).
- Mechanism: when the user swipes from day D to D-1, the page for D-1 receives props that are all identity-equal to its previous render (`buildFromGlobal` returns cached objects, `isFocused` stays true, `macroGoals` is unchanged unless the workout-calorie offset is on and that day has burned calories), so it is not re-rendered and keeps the `deleteFood` created when `focusedDate` was D. A delete then removes the row from local state (:528-537) but issues `delete map[D][key]` and Firestore `deleteField()` on `loggedFoods.D.key`: no-ops. The entry survives in `global.userData` and Firestore and reappears on the next refresh; the second delete works because the first one changed `meals` and forced a re-render.
- Smallest fix inside this file: keep a ref with the current `focusedDate` and read it in `deleteFood`. This changes behaviour (it fixes a data bug), so it needs sign-off (I.3). At minimum, do not make it worse: see H.4.

### E.5 Index in `macroLogsIndexer.js` is only invalidated by local writes (confidence: medium; DO NOT FIX here)
- Where: `rebuildGlobalIndexIfNeeded` (:14-43) rebuilds only when `global.__loggedFoodsSig` differs from `lastSig` or the index is empty. The signature is bumped only by `MacroTracking.js:548, :669` and `FoodDetail.js:342, :408`. `App.js:965, :976` replace `global.userData` on sign-out and on every user-doc snapshot without bumping it.
- Effect: after sign-out and sign-in as another user in the same JS session, or after a change made on another device, `buildFromGlobal` keeps serving the old index until the next local food write. Needs an App.js change and a product decision (I.4).

### E.6 Mixed-shape `loggedFoods` maps (confidence: low that it occurs in real data)
- `FoodDetail.save` writes a flat entry at the top level when `map[dayKey]` is not an object (:339-341). A map that then mixes flat entries and day maps is treated as "nested" by `loggedFoods.js:14, :75` (`.some`) and by `macroLogsIndexer.js:27` only if the FIRST value is a day map. In the nested branches a flat entry is iterated as if it were a day (its `macros` object becomes a junk row keyed `macros`). Not fixable without knowing the data; see I.9.

### E.7 Trivial
- `nutrition.js:198`: unused `_` (B.5). Confidence: high.
- `MacroTracking.js:399`: initial `collapsedMeals` has no `Snacks` key; moot once B.7 removes it.
- `MacroTracking.js:218` (`computeCompletedWorkoutsSignature`) ignores `calories_burned`, which `sumWorkoutCaloriesForDay` (:201-205) does read; a workout that only has `calories_burned` changing would not refresh the pager. Leave; note for the owner.

### E.8 Credentials in source (security, not a runtime bug)
- `fatsecretClient.js:39-40` (inside the commented-out block) hold a FatSecret consumer key and secret in clear text. Deleting the block (B.2) removes them from the working tree, but they remain in git history. The owner should rotate them (I.8). Do not copy the values into any report.

---

## F. Best-practice issues

| # | Issue | Location | Fix | Risk |
|---|---|---|---|---|
| F.1 | Variable used before its declaration | `MacroTracking.js:501` vs :561 | E.2 | low |
| F.2 | Pure functions/constants re-created on every render | `MacroTracking.js:247-268` (`parseFocusParam`), :435-436 (`formatDate`), :477-478 (`TOTAL_PAGES`, `BASE_INDEX`), :730-734 (`clampInt`); `FoodDetail.js:35-39` (`round2`), :431 (`MEAL_OPTIONS`), :945-953 (`DV`) | Hoist to module scope (D.1, D.2). None captures props/state. | low |
| F.3 | Component defined during render | `ProfileLoggedFoodsScreen.js:267` `ItemSeparatorComponent={() => <View .../>}` | Add a module-level `const SectionSeparator = () => <View style={styles.sectionSeparator} />;` next to `LockedView` and pass `ItemSeparatorComponent={SectionSeparator}`. (`styles` is resolved at call time, exactly as `LockedView` already does.) | low |
| F.4 | `require()` inside an effect | `ProfileLoggedFoodsScreen.js:142` `const { subscribeUserData } = require("../utils/userDataEvents");` | Add a static `import { subscribeUserData } from "../utils/userDataEvents";` and delete only the `require` line (:142). Keep the surrounding `try/catch` and `return unsubscribe` exactly as they are. The module is already loaded at startup through `MacroTracking.js:34`, so evaluation timing does not change. Keep the `if (!isViewingSelf) return undefined;` guard. | low |
| F.5 | Import hygiene | `MacroTracking.js:2-34`: react-native, third-party and local imports are interleaved (firebase/firestore at :31 after local modules; comments :10, :26, :36 are stale). `FoodDetail.js:2-17`: same (react-native-svg at :13 after local imports). | Regroup as react, react-native, third-party, firebase, local. No side-effect-only imports are involved, and every imported module is already evaluated by App.js before these screens load. No duplicate module imports exist in the partition. | low |
| F.6 | IIFE in JSX | `FoodDetail.js:464-470` (tagline) | Optional: compute `const tagline = [displayBrand, servingLabel].filter(Boolean).join(', ');` above the return. Same output for all inputs (both values are strings). Leave if not otherwise touching the block. | low |
| F.7 | Timers without cleanup | `MacroTracking.js:419-426` (80 ms before `navigate`), :509-511 and :877-879 (16 ms `scrollToIndex` retry) | Leave. Each callback is null-safe/try-wrapped, and the delays are part of the pager/modal choreography (H.3). | n/a |
| F.8 | exhaustive-deps warnings | `FoodDetail.js:206`, `MacroTracking.js:565`, and the explicit disable at :389 | Informational. Do not change any dependency array. | n/a |
| F.9 | Service module in `screens/` | `frontend/screens/fatsecretClient.js` | Cannot be moved (hard rule 8). Note for the owner (I.10). | n/a |
| F.10 | Forwarding wrapper around this partition's export | `MacroGoalsSheet.js:168-171` wraps `computeRecommendedMacrosFromPersonalInfo` in a `useCallback` that only forwards | G.6 | low |
| F.11 | Indentation glitches | `MacroTracking.js:846-852`, `ProfileLoggedFoodsScreen.js:186-194`; `macroLogsIndexer.js` and `recentFoods.js` use 2-space indent | Leave (no formatting churn; keep each file's own style). | n/a |

Hook-rule check: all hooks in `MacroTracking`, `FoodDetail`, `FavoriteFoodButton`, `ProfileLoggedFoodsScreen` are at top level with no early return before them. No conditional hooks.

---

## G. Cross-partition requests

| # | Target files | Request |
|---|---|---|
| G.1 | `frontend/components/2_MacroTracking/MacroDayPage.js` (:17-18, :61-62, :80), `frontend/components/2_MacroTracking/MealsSection.js` (:16-17, :89) | Drop the unused `collapsed` / `toggleMeal` props and the two `prev.collapsed === next.collapsed` comparator terms, so MacroTracking can delete `collapsedMeals`, `toggleMealCollapse` and the `LayoutAnimation` import (B.7). The identity of `collapsed` never changes, so the comparators' results are unaffected. Do NOT touch the `isFocused` comparator term (H.4). |
| G.2 | `frontend/components/2_MacroTracking/MacroGoalsSheet.js` | Nothing to change for B.7 (it already ignores `onOpenPersonalInfo`). For that partition's own audit: it is the sole live importer of `macroRecommendations.js`; see G.6. |
| G.3 | `frontend/components/2_MacroTracking/MealCard.js` (:9, :11), `MealsSection.js` (:49, :51) | `MealCard` never uses `PlusIcon` or `onAddPress`; MealsSection can stop passing them. |
| G.4 | `frontend/components/2_MacroTracking/FoodSearchOverlay.js` (:321-322, :532-586) | Props `scannerAutoOpenKey` and `onScannerAutoOpenComplete` are never passed by its only caller (`MacroTracking.js:986-993`). Dead in that partition. Also :716 puts `(global?.__loggedFoodsSig \|\| 0)` in a dependency array; it relies on the signature bumps listed in H.1. |
| G.5 | `frontend/components/2_MacroTracking/SearchResultCard.js` (:20-26) | Replace the local `formatPortion` with `import { formatPortion } from '../../utils/nutrition'` (identical for the string units it passes). If taken, keep `export` on `nutrition.js:168`; if not, B.5 drops the `export`. |
| G.6 | `frontend/components/2_MacroTracking/MacroGoalsSheet.js` (:168-171) | The `computeRecommendedMacros` useCallback only forwards to `computeRecommendedMacrosFromPersonalInfo`; call the import directly (and drop it from the dependency list at :258 only if that list is otherwise being edited). |
| G.7 | `frontend/components/2_MacroTracking/QuickAddModal.js` (:37-47), `PortionPickerModal.js` (:18-28) | The two `parsePortion` helpers are identical to each other; they are NOT interchangeable with `coercePortion` in `nutrition.js` (C.23). If that partition wants one copy, `nutrition.js` is a reasonable home for a second, separately named export. |
| G.8 | `frontend/theme/mfpDark.js` or the constants module of D.2 | Canonical macro colours (C.7), if the plan wants one definition. |
| G.9 | `App.js` (:965, :976) | Only if the owner approves E.5: bump `global.__loggedFoodsSig` whenever `global.userData` is replaced. Not part of a behaviour-preserving refactor. |
| G.10 | `functions/index.js:1937` (`fatsecretMethod`) | No client calls it (before or after B.2). Do NOT remove it in this refactor (deployed surface; `fn-check.sh` compares exported functions). Owner question I.8. |

---

## H. Fragile areas

1. `macroLogsIndexer.js` module state (:8-11) and identity-stable results. `buildFromGlobal` returns the SAME cached `{ meals, totals }` object for a day until `global.__loggedFoodsSig` changes; `MacroDayPage`/`MealsSection` memo comparators depend on those identities, and `MacroTracking` state stores them directly (:563-564). Do not copy, freeze or re-wrap the result, do not change when caches are cleared, and keep every `global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1` bump (`MacroTracking.js:548, :669`, `FoodDetail.js:342, :408`).
2. `MacroTracking.js:497-501` effect with the `undefined` dependency (E.2). Fix only by moving the declaration; never by editing the array.
3. The pager, `MacroTracking.js:476-521` and :831-954: `TOTAL_PAGES`/`BASE_INDEX`, `initialScrollIndex`, `getItemLayout`, `onLayout -> scrollToIndexSafe(baseIndex, false)`, `onScroll` header preview, `onMomentumScrollEnd` (re-bases `baseIndex`, calls `shiftDate`, clamps forward movement to today), the 16 ms retry timers, `extraData`, and the "show empty, then refresh" sequence in `shiftDate`/`jumpToToday` (:438-456). The order of `setBaseIndex` / `shiftDate` / `setHeaderDate` (:900-905) matters. Do not hoist the inline list callbacks, do not memoise `renderItem`, do not merge the three "add N days" snippets.
4. Memo comparators vs closures (E.4). `isFocused` (:946) and `date` (:944) look redundant but drive re-render timing of pages (and therefore which `deleteFood` closure a page holds). Do not remove them, and do not wrap `deleteFood`, `openGoalsSheet`, `shiftDate` in new memoisation.
5. `onSnapshot` effect, `MacroTracking.js:312-375`: runs once (`[]`), reads the uid at mount, hydrates only EMPTY form fields, defaults `applyWorkoutCaloriesToGoals` to `false` when the field is absent, and mirrors into `global.userData` by REPLACING the object (`global.userData = { ...global.userData, ... }`, :338, :346-352, :369) without emitting a user-data event. Same replacement pattern at :718-724, :755, :799. Keep literally (global contract).
6. Optimistic write then background persistence: `FoodDetail.save` (:308-373), `FoodDetail.addNew` (:375-429), `MacroTracking.onSelectResult` (:593-704), `deleteFood` (:524-559). Order is: mutate `global.userData.loggedFoods` in place, bump the signature, `navigation.goBack()` / update state, then Firestore. Field paths `loggedFoods.${dayKey}.${id}` and legacy flat `loggedFoods.${id}` with `deleteField()`, collection `usersPrivate`, `setDoc(..., { merge: true })` fallback (:422), `createdAt/updatedAt` as `serverTimestamp()` remotely but `Date.now()` locally, `touchRecentFood` payload incl. `microsPS` + `extrasPerServing` (`recentFoods.js:34`). None of it may change.
7. `MacroRow` ring maths (`FoodDetail.js:801-851`) and draw order (Carbs, Fat, Protein circles; remainder pushed into the last non-zero segment; `baseOffset = 0`). Move verbatim only.
8. `FavoriteFoodButton` (`FoodDetail.js:709-790`): `favoriteBusyRef` / `favoriteTouchedRef` / `favoriteLoadSeqRef` race guards and the `requestAnimationFrame`-scheduled haptic. Move verbatim only.
9. Removing the never-opened `<PersonalInfoSheet>` (`MacroTracking.js:1008-1016`) un-mounts a closed @gorhom BottomSheet that sits between `MacroGoalsSheet` and `Footer`. It renders nothing visible at index -1, but it does register keyboard/gesture listeners. I rate the removal low risk; if the plan wants zero risk, remove only the ignored `onOpenPersonalInfo` prop (:1004) and leave the sheet.
10. `UIManager.setLayoutAnimationEnabledExperimental(true)` at module load (`MacroTracking.js:38-40`): global, Android-only. See B.7 for why removal is safe; keeping it is also fine.
11. `macroRecommendations.js`: the model is order- and rounding-sensitive. `clamp` must stay "max wins" (C.10). The redundant-looking checks at :125-127 and the repeated floor at :187 (same expression as :160) must stay; do not simplify.
12. `nutrition.js` regular expressions and `FoodDetail.js:233-244` (`servingLabel`): parsing of third-party text; do not touch.
13. `FoodDetail` `servings` state holds a number OR a string (intermediate input such as `""`, `"."`, `"1."`, :292-306). Every consumer goes through `round2(Number(servings) || 1)`; `hasUnsavedChanges` (:255-264) has a dedicated branch for the unparsable case. Do not normalise the type.
14. `ProfileLoggedFoodsScreen.js:89-158`: privacy gating (self-only, derived from `global.userData`, not from the `isViewingSelf` param). Keep both LockedView branches.
15. `Footer currentScreenName` strings (`MacroTracking.js:1018` `'MacroTracking'`, `ProfileLoggedFoodsScreen.js:297` `"Profile"`) and route names `'FoodDetail'`, `'ProfileLoggedFoods'` (incl. the `getParent?.('ROOT')` fallback at `MacroTracking.js:471`).
16. `recentFoods.js`: document id is `String(foodId || name).trim()`; `limit(Math.max(1, Math.min(50, max || 20)))`; best-effort `catch {}` blocks are intentional.

---

## I. Open questions for the owner

1. Haptics in MacroTracking (E.1): restore the accidentally deleted import (haptic returns on the barcode button and "Edit Goals"; "Add Food" would fire twice because MealsSection already fires one), or delete the dead calls and keep today's silence?
2. Editing from "Logged Food Items" (E.3): the save button does nothing because the entry is passed without its key. Should edits from that screen be saved (one-line fix), or should the screen open the food read-only?
3. Swipe-to-delete right after changing day (E.4) appears to delete only locally. Has "deleted food comes back" been observed? Approve a fix?
4. `macroLogsIndexer` staleness across account switches and remote changes (E.5): approve bumping `global.__loggedFoodsSig` in App.js when `global.userData` is replaced?
5. Unused route params: `FoodDetail` `readOnly` (never passed; about 25 lines of branches and 3 styles) and `MacroTracking` `focusDate` / `date` (never passed; about 35 lines). Keep for planned features, or delete?
6. The standalone Personal Info bottom sheet in MacroTracking can never open (B.7). Delete it, or was `onOpenPersonalInfo` meant to be wired into MacroGoalsSheet?
7. `NutritionFacts` shows "Loading micronutrient info..." forever when a food has no micronutrient data (`FoodDetail.js:1001`). Intended?
8. FatSecret: the consumer key/secret in the commented block (`fatsecretClient.js:39-40`) are in git history: rotate? And is the generic `fatsecretMethod` Cloud Function (no client caller) still wanted?
9. Can real `loggedFoods` maps mix legacy flat entries with per-day maps (E.6)? If yes, the three "looksNested" checks need one agreed rule.
10. `fatsecretClient.js` sits in `frontend/screens/`. Moving it to `frontend/services/` needs sign-off (file moves are not allowed in this refactor).
11. `computeCompletedWorkoutsSignature` ignores `calories_burned` while the daily sum reads it (E.7). Intended?
