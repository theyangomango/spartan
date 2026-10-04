# Audit: partition "macro-components" (16 files, 4145 lines)

Read-only audit. Every file in the partition was read completely. The working tree of this partition is byte-identical to SPX/baseline, so all line numbers are valid for both.

Conventions used below
- A bare file name (e.g. `MacroGoalsSheet.js:344`) means `frontend/components/2_MacroTracking/<file>`.
- "MT.js" = `frontend/screens/MacroTracking.js` (partition macro-screens), the only LIVE screen that mounts this feature.
- "KEEP" = must stay because a PARKED file or a live caller depends on it.
- Machine findings: every `react-native/no-unused-styles` hit reported as `undefined.<key>` is a FALSE POSITIVE of the `makeStyles(COLORS)` pattern, except the keys listed in section B. I checked every key of every StyleSheet in the partition against `styles.<key>` references (and against `styles={styles}` hand-offs to `LabeledNumber` and `RecentHistoryItem`).
- knip reported no unused exports for this partition; confirmed (see A).

---------------------------------------------------------------------------------------------------

## A. Module map

| File (lines) | Purpose | Exports | Imported by |
|---|---|---|---|
| DateHeader.js (185) | Day header: prev/next chevrons, tappable date title with bounce, "history" clock icon when the day is today. Contains private `HistoryClockIcon` (109-132). | default `DateHeader` | MT.js:12 (used MT.js:819) |
| FoodSearchOverlay.js (1326) | Bottom-sheet food search: FatSecret search with paging and client-side result filtering/ranking, favourites, recent foods (swipe to delete), portion picker, quick add, embedded barcode scanner modal. Contains private `RecentHistoryItem` (1098-1157). | default `FoodSearchOverlay` | MT.js:20 (used MT.js:986) |
| LabeledNumber.js (39) | Label + numeric `DismissableTextInput` + suffix; styles are injected by the caller through a `styles` prop (`inputLabel`, `inputBox`, `input`, `inputSuffix`). | default `LabeledNumber` | MacroGoalsSheet.js:18 only |
| MacroBar.js (57) | One macro progress bar (label, value/goal, track + fill). | default `MacroBar` | NutritionSummaryCard.js:4 only |
| MacroDayPage.js (122) | One horizontally paged day: "Nutrition" header + Edit Goals pill, `NutritionSummaryCard`, `MealsSection`. `React.memo` with custom `propsEqual` (77-89). 2-space indent file. | default memo(`MacroDayPage`) | MT.js:13 (used MT.js:932) |
| MacroGoalsSheet.js (611) | Bottom sheet to edit protein/carbs/fat goals; cross-fades to embedded `PersonalInfoContent`; auto-calculates from personal info; suppresses the app footer while open; expands on keyboard. | default `MacroGoalsSheet` | MT.js:18 (used MT.js:995) |
| MacroStreakBadge.js (260) | "Calories burned" flame pill + anchored info popover (Modal) with the "Add to calorie goal" switch. (Name is historical; it is not a streak.) | default `MacroStreakBadge` | MealsSection.js:10 only |
| MealCard.js (52) | Meal title row with total calories (header row of a meal group). | default `MealCard` | MealsSection.js:3 only |
| MealItemCard.js (134) | One logged food row; optional swipe-to-delete (`Swipeable`). | default `MealItemCard` | `frontend/components/UnderMealList.js:4` (app-shell), `frontend/screens/ProfileLoggedFoodsScreen.js:23` (macro-screens) |
| MealsSection.js (154) | "Daily meals" header + `MacroStreakBadge`; per meal: `MealCard`, `UnderMealList`, "Add Food" row. `memo` with custom `propsEqual` (86-97). | default memo(`MealsSection`) | MacroDayPage.js:6 only |
| NutritionSummaryCard.js (75) | Calorie ring (`AnimatedCircularProgress`) + three `MacroBar`s. | default `NutritionSummaryCard` | MacroDayPage.js:5 only |
| PersonalInfoSheet.js (359) | `PersonalInfoContent` (gender/weight/age/height/activity/goal form + "Save & Calculate") and a default BottomSheet wrapper around it. | named `PersonalInfoContent`; default `PersonalInfoSheet` | named: MacroGoalsSheet.js:17. default: MT.js:19 (used MT.js:1008, but can never open, see G1) and **PARKED** `frontend/components/2_Competition/sections/LeaderboardsSection.js:52` (used :2056) -> KEEP default export and its props `index, onChangeIndex, goalForm, setGoalForm, onClose, onSave, COLORS` |
| PortionPickerModal.js (140) | "How much did you eat?" modal with fraction chips + custom input; returns a positive multiplier. | default `PortionPickerModal` | FoodSearchOverlay.js:26 only |
| QuickAddModal.js (247) | Custom food entry modal (name, brand, kcal, P/C/F, portion); emits a FatSecret-shaped item with `source: 'custom'`. | default `QuickAddModal` | FoodSearchOverlay.js:27 only |
| SearchResultCard.js (144) | Search/recent row: title, one-line summary, favourite toggle, plus button. `memo`. | default memo(`SearchResultCard`) | FoodSearchOverlay.js:25 only (used :819 and :1147) |
| WorkoutBarcodeScannerModal.js (240) | Full-screen barcode scanner used by the floating barcode button of the macro screen (name is historical; nothing to do with workouts). | default `WorkoutBarcodeScannerModal` | MT.js:8 (used MT.js:979) |

No barrel/index file, no string-based or dynamic uses of any of these modules (grep of the whole repo for every component name; only the imports above plus two comments at MT.js:10, 567, 569).

---------------------------------------------------------------------------------------------------

## B. Verified dead code

### B1. Unused imports / variables / parameters (all verified by reading; ESLint agrees)

| Identifier | Kind | Where | Evidence / action |
|---|---|---|---|
| `Text` | import | DateHeader.js:2 | Only `Animated.Text` is used (73). Remove from the import list. |
| `theme` | import | MacroDayPage.js:9 | Never referenced. Remove the whole line. |
| `isFocused` | destructured prop | MacroDayPage.js:25 | Never read in the body. Its only "use" was the commented-out line 71. Remove from the destructuring ONLY. **Keep** `prev.isFocused === next.isFocused` (85) and keep the caller passing it (MT.js:946): see H2. |
| `// compact={!isFocused}` | commented-out code | MacroDayPage.js:71 | Delete the line. |
| `collapsed`, `toggleMeal` | props forwarded to a dead end | MacroDayPage.js:17-18 (destructure), :61-62 (forward), :80 (propsEqual); MealsSection.js:16-17 (destructure, never read), :89 (propsEqual) | MealsSection never reads either. The state behind `collapsed` (MT.js:399 `collapsedMeals`) is only changed by `toggleMealCollapse` (MT.js:429-433), whose only consumer is this dead prop chain, so the object identity never changes and both `prev.collapsed === next.collapsed` comparisons are always true. Remove all six sites in this partition; removal on the MT.js side is request G2. |
| `trackColor` | prop passed but never read | MacroBar.js:7 (param); NutritionSummaryCard.js:41, 42, 43 (passed) | The track colour is hard-coded (`'#bbdbff5d'`, MacroBar.js:35). Remove the param and the three `trackColor={...}` attributes. |
| `PlusIcon`, `onAddPress` | props passed but never read | MealCard.js:9, 11 (params); MealsSection.js:49, 51 (passed) | MealCard renders only title + calories. Remove from both sides. (MealsSection itself still uses `PlusIcon` at 70-76 and `onAddPress` at 68.) |
| `dayKey` | prop passed but never read | MacroStreakBadge.js:14 (param); MealsSection.js:35 (passed) | Remove from both sides (MealsSection still uses `dayKey` at :60). |
| `style` | prop no caller passes | MacroStreakBadge.js:17 (param), :108 (use) | Only caller is MealsSection.js:34-40, which does not pass it. Remove param and the array entry. |
| `onFocus` | prop no caller passes | LabeledNumber.js:12 (param), :32 (forward) | Only caller MacroGoalsSheet.js:366-377, 383-394, 400-411 never passes it. Remove both lines. |
| `title` (default `'Daily meals'`), `compact` (default `false`) | props no caller passes | MealsSection.js:13, :23, :63, :92 | Only caller MacroDayPage.js:58-72 passes neither. `title` is harmless (leave or inline; if inlined also drop `prev.title === next.title` at :92). `compact` is part of the constant-false chain below. |
| `compact` chain | constant-false flag | MealsSection.js:23, 63 -> `frontend/components/UnderMealList.js:16, 30` (app-shell) -> MealItemCard.js:18, 53, 63, 81; style `cardCompact` MealItemCard.js:108 | No caller anywhere passes a truthy `compact` (MacroDayPage does not pass it; ProfileLoggedFoodsScreen.js:196-214 does not pass it). So `compact && styles.cardCompact` (53) is always false, `!compact &&` (63) always true, `compact ||` (81) always false, and `cardCompact` is dead. Removing it end-to-end needs UnderMealList (request G4); the MealItemCard/MealsSection side can go first (an extra `compact={false}` from UnderMealList is simply ignored). |
| `COLORS` | unused parameter | MealItemCard.js:95 (`makeStyles = (COLORS) =>`) | Styles do not depend on COLORS (colours are applied inline at 54, 60, 64, 73). Turn into a static module-level `const styles = StyleSheet.create({...})`, delete line 21 and the then-unused `useMemo` import (line 2). |
| `renderBackdrop` | unused const | MacroGoalsSheet.js:125-128 | Body is character-identical to the inline arrow at :344. Recommended resolution is to USE it at :344 (see F1), which fixes both lint findings; do not just delete it. |
| `trimTrailingZeros`, `formatMacroValue` | unused functions | MacroGoalsSheet.js:188, 189-195 | `formatMacroValue` has no caller; `trimTrailingZeros` is only called by it (193). Delete lines 188-195. |
| `fieldBg` | unused local | PersonalInfoSheet.js:280 | Delete the line (and the now-orphaned comment at 277 only if it reads wrong afterwards; it describes `hairline` at 278, so keep it). |
| `fieldBg`, `card` | locals that become unused once the dead styles below are removed | MacroGoalsSheet.js:500 (+comment 499), :493 | `fieldBg` is only used by dead `backPill` (598); `card` only by dead `toggleButton` (603). Delete with them. |
| `scannerAutoOpenKey`, `onScannerAutoOpenComplete` | props no caller passes | FoodSearchOverlay.js:321-322 | Repo-wide grep: only this file. The only caller (MT.js:986-993) passes neither, so `scannerAutoOpenKey` is always `null`. See B3. |
| `background`, `mealCardShadow` | unused object keys | SearchResultCard.js:11, 15 (`DEFAULT_COLORS`) | Only `card`, `hairline`, `text`, `textPrimary`, `subtext`, `textSecondary`, `accent` are read from `theme` (lines 67-134). Delete the two keys. (The fallback object itself is defensive: the only caller always passes COLORS.) |

### B2. Unused StyleSheet keys (true positives)

| Keys | Where | Evidence |
|---|---|---|
| `smallLinkPill`, `smallLinkText` | MacroGoalsSheet.js:515-525 | no `styles.smallLink*` in the file; not read by LabeledNumber. (The live copies are in PersonalInfoSheet.js:319-329.) |
| `infoHeaderRow`, `backPill`, `backPillText` | MacroGoalsSheet.js:597-599 | unreferenced |
| `toggleRow`, `toggleButton`, `toggleButtonActive`, `toggleButtonText`, `toggleButtonTextActive` (+ comment 602) | MacroGoalsSheet.js:601-606 | unreferenced here (live copies in PersonalInfoSheet.js:312-316) |
| `inlineHint` | MacroGoalsSheet.js:608 | unreferenced |
| `textContainer` | SearchResultCard.js:80 | unreferenced (`textPressable` at 81 is the one in use) |

MacroGoalsSheet keys that LOOK unused but are live through `styles={styles}` -> LabeledNumber.js:21, 22, 28, 34: `inputLabel` (532), `inputBox` (533-546), `input` (552), `inputSuffix` (558). KEEP.

Deleting the dead MacroGoalsSheet keys also removes two of the three jscpd clones against PersonalInfoSheet (513-525 and 599-608).

### B3. Dead feature: scanner auto-open in FoodSearchOverlay

Because `scannerAutoOpenKey` is always `null`:
- refs `autoOpenScheduledKeyRef`, `autoOpenTimerRef`, `autoOpenConsumedKeyRef` (FoodSearchOverlay.js:432-434) are only ever `null`;
- effect 530-564 returns at line 532 on every run;
- effect 566-575 and effect 577-586 only clear refs that are already `null`.

Delete: props 321-322, refs 432-434, effects 530-586 (three consecutive effects). Follow-ups that then become constant:
- `openScanner(withHaptic = true)` (451): the only remaining call is `openScanner(true)` (935), so the parameter is always true. Smallest edit: drop the parameter, unwrap the `if (withHaptic)` (452-454) to the bare `try { haptic(); } catch {}`, and call `openScanner()` at 935.
- `openScanner`'s boolean results (`return false` 468, `return true` 470, `return false` 475) were only read by the deleted effect; the remaining call is `void openScanner(...)`. Lines 467-470 can be deleted and 475 dropped. Optional: leaving the returns is harmless.

Removing three `useRef`s and three `useEffect`s changes the hook count consistently on every render, which is safe.

### B4. Dead state: "placeholder macros" mode in MacroGoalsSheet (constant flag)

`usePlaceholderMacros` (MacroGoalsSheet.js:147) starts `false` and every write sets `false` (115, 187, 475). Therefore:
- `placeholderMacros` (148) is only written with non-null inside `if (usePlaceholderMacros)` (232, 242), which never runs; the other writes are `null` (116, 476). It is always `null`.
- `effectivePlaceholders` (151-166) always returns the `goalForm`-derived object; and its `calories` member (154) is never read (only `.protein/.carbs/.fat` at 372, 389, 406).
- branch 230-233 and branch 241-244 are unreachable.

Removal plan (each edit is a deletion or a one-token change):
1. delete 115-116 (two setter calls inside the "sheet closed" effect);
2. delete 146-148 (comment + two `useState`);
3. 150-166: delete the first line of the memo body (152) and the two deps (160-161); keep the rest;
4. 187: `markManual` becomes `(k) => { manualRef.current[k] = true; }`;
5. delete 230-233 (the effect at 228-235 keeps only the `manualRef.current = {...}` reset and its eslint-disable comment);
6. delete 241-244;
7. delete `usePlaceholderMacros,` from the deps at 257;
8. delete 474-476 (comment + two setter calls).
Setting a state to its current value never re-rendered, so this is behaviour-neutral. Risk: low, but this sits next to the fragile auto-calc effects (H4): make these exact edits and nothing else. If the implementer prefers not to touch the effects, leaving B4 undone is acceptable; then record it as "constant flag, not removed".

Related forwarder: `computeRecommendedMacros` (168-171) is a `useCallback` that only forwards to the imported `computeRecommendedMacrosFromPersonalInfo`. It can be replaced by the import at 231, 238, 464 and dropped from the deps at 258 (a module-level import is not a reactive dependency). Low risk, optional.

### B5. Stale comments / notes to delete

- FoodSearchOverlay.js:39-40 ("FIREBASE (adjust path ...)" and "Recent foods now backed by Firestore subcollection users/{uid}/recentFoods"): there is no firebase import here and the real path is `usersPrivate/{uid}/recentFoods` (`frontend/utils/recentFoods.js:9`). Delete both lines (and the blank line 41).
- FoodSearchOverlay.js:1293 ("Modal-related styles moved to extracted components"): it sits directly above the scanner modal styles that are still here. Delete.
- MacroGoalsSheet.js:263 (bare `// -----` rule), :278 "(unchanged)", :173 "(existing) with placeholder mode": change-log style notes; delete 263, and trim 173/278 only if B4 is done (173 then reads "AUTO CALC").
- QuickAddModal.js:210 trailing `// lighter than surface`: the value IS `surface`; delete the trailing comment when the inline `require` is replaced (F5).

### B6. Things that look dead but are NOT

- All ESLint `no-unused-styles` hits other than B2 (false positives).
- `PersonalInfoSheet` default export: KEEP (PARKED LeaderboardsSection.js:2056), even after G1 removes the MT.js usage.
- DateHeader.js:100-102 (spacer branch) and MacroStreakBadge.js:67-70 (no `measureInWindow` fallback): unreachable with today's caller/platform but they are defensive component-level fallbacks; leave.
- FoodSearchOverlay.js:838-842 `catch { loadRecentFoods(); }`: `deleteRecentFood` swallows its own errors (`utils/recentFoods.js:44-55`), so the catch cannot fire today; it is a defensive wrapper around a network call; leave.
- `COLORS?.primary`, `COLORS?.streak`, `COLORS?.placeholder`, `COLORS?.fieldDeep`, `COLORS?.primaryHairline`, `COLORS.background`, `COLORS.textPrimary/textSecondary`: keys that MT.js:43-63 never defines, so the literal fallbacks always win. Do not "simplify" them: they are the effective colours (see H7).

Estimated removable lines in this partition: about 175 (FoodSearchOverlay ~70, MacroGoalsSheet ~60, the rest ~45), before any dedupe.

---------------------------------------------------------------------------------------------------

## C. Duplication

C1. `parsePortion` (string -> positive multiplier)
- PortionPickerModal.js:18-28 and QuickAddModal.js:37-47: **byte-identical** (diffed).
- `coercePortion`, `frontend/utils/nutrition.js:4-16`: NOT identical. It accepts numbers, and it uses `Number()` where the modal copies use `parseFloat()`: `"1.5."` -> 1.5 (parsePortion) vs 1 (coercePortion); `"1/2x"` -> 0.5 vs 1. These strings can be typed on a decimal pad, so do not merge with `coercePortion`.
- Canonical home: new `frontend/components/2_MacroTracking/portionInput.js` exporting `parsePortion` (moved verbatim, dedented) and C2's constant. Both modals import it.

C2. Quick portion choices `['1/4', '1/3', '1/2', '2/3', '3/4', '1']`: PortionPickerModal.js:40 and QuickAddModal.js:170, identical. Export as `PORTION_QUICK_CHOICES` from the same new module. (The chip JSX around them is not identical: haptic placement and styles differ; leave the JSX.)

C3. Barcode scanner, two implementations: FoodSearchOverlay.js:425-528 + 1009-1093 vs WorkoutBarcodeScannerModal.js (whole file).
- Identical: `SCAN_RETRY_DELAY_MS = 500` (FSO:312, WBSM:12); the `barcodeTypes` array (FSO:1026, WBSM:148); `refreshPermission` (FSO:479-489 == WBSM:21-31 apart from quote style); the AppState "refresh permission on active" effect (FSO:505-516 == WBSM:73-82).
- NOT identical: `openSystemSettings` (WBSM:33-43 adds `.catch(() => {})` to `requestPermission()`; FSO:491-503 does not); scan handler (FSO schedules the unlock retry before the lookup at :1033 and again on failure, shows `'No match found for this barcode'` / the raw error message, has the regex bug E1, no success haptic; WBSM locks until the result, shows `'No match found'` / `'Lookup failed'`, fires a haptic); all visual styles (header offset, title size/weight, hint pill, permission screen).
- Recommendation: do NOT merge the two scanners (visible behaviour differs). Optional, safe: a tiny `barcodeScannerConstants.js` exporting `SCAN_RETRY_DELAY_MS` and `BARCODE_TYPES`. Low value; skip if in doubt.

C4. CTA press animation (two `Animated.Value` refs + spring in/out + chevron pulse + interpolation): MacroGoalsSheet.js:279-284 and PersonalInfoSheet.js:35-43. Semantically identical (same spring config, same timing; only line wrapping differs). Canonical home: new hook `frontend/components/2_MacroTracking/useCtaPressAnimation.js` returning `{ ctaScale, chevronTranslate, onCtaPressIn, onCtaPressOut, pulseChevron }`, called at the position of the first `useRef` in each component so hook order is unchanged. Optional, low risk.

C5. "Auto-calc" action row JSX: MacroGoalsSheet.js:423-435 and PersonalInfoSheet.js:206-218 differ only in the `onPress` handler and the label. Styles `autoCalcRow/Left/IconWrap/Text`: MacroGoalsSheet.js:562-586 vs PersonalInfoSheet.js:332-356 are identical except `marginTop` 24 vs 16. Could become one `<AutoCalcRow styles label onPress ... />`; because each sheet has its own `styles`, the gain is small. Optional; if done keep each sheet's own style object.

C6. Style keys shared by MacroGoalsSheet and PersonalInfoSheet (live in both, values identical): `inputLabel`, `input`, `placeholder`, `accent`, `inputSuffix`, `row`, `sheetTitle`, `autoCalcLeft`, `autoCalcIconWrap`, `autoCalcText`; palette prologue (`text`, `subtext`, `card`, `hairline`, `accent`: MacroGoalsSheet.js:491-497 == PersonalInfoSheet.js:274-279). Different: `sheetBackground`, `sheetHandle`, `scrollContent`, `headerRow` (marginBottom 12 vs 8), `inputBox` (PersonalInfo's equals MacroGoals' `inputBox` + `editableInputBox` merged), `autoCalcRow`. Recommendation: leave both style sheets separate (merging risks visual drift for little gain); just delete the dead keys (B2).

C7. `renderBackdrop`: MacroGoalsSheet.js:125-128 == MacroGoalsSheet.js:344 (inline) == PersonalInfoSheet.js:231-234. FoodSearchOverlay.js:343-354 differs (`opacity={0.45}`). Many other sheets in the repo define their own with different props. No shared helper recommended; fix F1 only.

C8. `formatPortion`: SearchResultCard.js:20-26 vs exported `frontend/utils/nutrition.js:168-174`. Same for every string `unit`; they differ only for a null/undefined `unit` (local copy throws at `unit.trim()`, shared returns `"<qty> "`). In SearchResultCard `unit` is always a non-empty regex capture (42, 52), so importing the shared one is behaviour-identical there. Safe dedupe: delete 20-26, `import { formatPortion } from '../../utils/nutrition';`.
- `getSummary` (SearchResultCard.js:28-63) vs `summarizeFood` (`utils/nutrition.js:183-225`): same structure but NOT identical even at quantity 1 (calorie regex without decimals, no `toNumberString`/fraction normalisation). Keep both.

C9. `foodKey` (FoodSearchOverlay.js:47-54) vs `recentFoodKey` (288-295): different field precedence (`food_id ?? foodId ?? id` vs `foodId ?? id ?? food_id`, likewise name/brand). Keep both. `prioritizeFavorites` (273-286) vs `prioritizeRecentFoods` (297-310) are identical except for which key function they call; leave as is (parametrising would be a rewrite for 14 lines).

C10. Swipe "Delete" action: MealItemCard.js:34-45 + styles 114-132 vs FoodSearchOverlay.js:1134-1145 + styles 1274-1291. JSX shape identical, styles differ (`minHeight` 32 vs 36, `paddingHorizontal` 16 vs 14, `borderRadius: 0`). Not identical; leave.

C11. `scaledSize`: MacroStreakBadge.js:6 imports it from `../2_Competition/UserStats/UserStatsStyles` (definition there, line 5: `const scaledSize = (n) => scaleSize(n)`), used once (112). It is exactly the default `scaleSize` this file already imports (line 5). Replace `scaledSize(16)` with `scaleSize(16)` and delete the import: identical output, and it removes a cross-feature dependency on a styles module. Repo-wide the same forwarding alias is redefined about 19 times (e.g. `frontend/components/5_Profile/ProfileTop/ProfileInfo.js:11`, `.../4_Explore/UserCard.js:9`, `.../3_Workout/NewWorkout/RestTimerModal.js:21`, `.../2_Competition/UserStats/HexagonalStats.js:10`): all `(size) => scaleSize(size)`.

C12. `withAlpha`: MacroStreakBadge.js:22-27 (append a 2-hex-digit alpha to a `#RRGGBB`, else null) vs `1_Feed/Notifications/NotificationCard.js:108`, `2_Competition/rankBadgeLevelHelpers.js:60`, `2_Competition/sections/ExercisesSection.js:90`: four different signatures/semantics. Keep local; only hoist (F6).

C13. `getMacroCalories` (MacroGoalsSheet.js:32-42: multiply, then round each macro) vs `macroCalories` (`frontend/utils/macroRecommendations.js:54-58`: round grams, then multiply). Differ for fractional grams (10.3 g protein -> 41 vs 40). Keep both.

C14. Same-file repeated blocks
- FoodSearchOverlay.js:1013-1018 and 1066-1071: identical "close scanner" bodies (`setScannerVisible(false); setScanBusy(false); setScanLocked(false); clearScanRetry();`). One `closeScanner` function, used twice.
- FoodSearchOverlay.js:691-698, 705-711, 728-735: "reset search state" blocks; NOT identical (token bump / `setQuery` differ). Leave.
- PersonalInfoSheet.js:69-81, 170-181, 191-202: three pill-toggle maps (differ in option list and form key); 88-102 / 104-119 / 127-141 / 143-157: four near-identical input boxes (differ in `maxLength`, slicing). MacroGoalsSheet.js:365-379 / 382-396 / 399-413: three macro columns. QuickAddModal.js: six labelled inputs. All optional local extractions; not required, moderate churn.

C15. Repo-wide patterns seen here (no action in this partition)
- `global?.userData?.uid || global?.userData?.id`: FoodSearchOverlay.js:590, 599, 776, 836 (16 occurrences repo-wide: also MT.js:313, 525, 595, 708, 746, 768; FoodDetail.js:310, 376, 710; `frontend/utils/rankPromotionEvents.js:8`; PARKED LeaderboardsSection.js:1256; and inside the helper itself). A helper exists, `getViewerUid()` at `frontend/utils/userRefs.js:65-95`, but it is NOT equivalent: it trims/stringifies, writes `global.__lastKnownUid`, and falls back to the cached uid and to `auth.currentUser.uid` when `global.userData` is empty, where the inline expression yields `undefined` (which the four call sites here treat as "signed out": clear lists / return). Do not substitute.
- `try { haptic(); } catch {}`: 28 occurrences here. `strong()` already swallows errors (`frontend/utils/haptics.js:4-6`) and `withStrongPress` exists (:28-34), so the outer try is redundant, but the briefing classifies defensive try/catch around native calls as "not unnecessary". Leave.
- `const METRICS = getUnifiedHeaderMetrics();` DateHeader.js:10, MacroStreakBadge.js:10 (also ProfileHeader.js:13, ViewProfileHeader.js:13): already a cached shared helper; fine.

---------------------------------------------------------------------------------------------------

## D. Decomposition plans (files over ~500 lines)

### D1. FoodSearchOverlay.js (1326 lines)

Top-level layout today: imports 2-45; pure helpers and constants 47-310; `SCAN_RETRY_DELAY_MS` 312; component 314-1096; `RecentHistoryItem` 1098-1157; `makeStyles` 1159-1325.

Step 0 (before moving): apply B3 (auto-open removal) and B5 (stale comments) so less code moves.

Proposed modules (same folder), in execution order:

1. `foodSearchUtils.js`  (pure, no React) <- lines 47-310 moved as ONE contiguous block
   - `foodKey` 47-54, `mergeUniqueFoods` 56-76
   - constants `PER_100_REGEX` 78, `TINY_PRODUCE_PORTION_REGEX` 79, `PRODUCE_KEYWORDS` 80-85, `FLAVOR_PRODUCT_TERMS` 86-89, `BEVERAGE_BRAND_TERMS` 90-93, `LIQUID_SERVING_REGEX` 94, `PRODUCE_BYPRODUCT_TERMS` 95, `RESTAURANT_BRAND_TERMS` 96-100, `RESTAURANT_MENU_REGEX` 101, `RESTAURANT_QUERY_HINTS` 102-105
   - `normalize` 107, `singularizeToken` 108-114, `PRODUCE_LOOKUP` 115, `hasAnyTerm` 116, `isGenericBrand` 117-120, `getQueryTokens` 122, `isProduceIntentQuery` 123, `queryMentionsFlavorProduct` 124, `BRAND_STOP_TOKENS` 125-129, `getBrandIntentTokens` 130-137
   - `looksLikeProduce` 139-142, `queryHasRestaurantIntent` 144-148, `looksLikeRestaurantItem` 150-156, `shouldHidePer100Result` 158-170, `shouldHideTinyProduceServing` 172-178, `isFlavorProductResult` 180-185, `shouldHideFlavorProductForProduce` 187-190, `shouldHideBrandedLiquidProduce` 192-200, `shouldHideProduceByproductResult` 202-206, `scoreSearchResult` 208-235, `filterSearchResults` 237-261
   - `buildFavoriteMap` 263-271, `prioritizeFavorites` 273-286, `recentFoodKey` 288-295, `prioritizeRecentFoods` 297-310
   - Needs: `import { makeFoodFavoriteKey } from '../../utils/favoriteFoods';`
   - Exports (only what the component and RecentHistoryItem use): `foodKey`, `mergeUniqueFoods`, `filterSearchResults`, `buildFavoriteMap`, `prioritizeFavorites`, `prioritizeRecentFoods`. Everything else stays module-private.
   - Order inside the block must be kept (`PRODUCE_LOOKUP` at 115 calls `singularizeToken` at module load).
   - If two files are preferred for single responsibility: ranking/filtering 78-261 -> `foodSearchFilter.js` (export `filterSearchResults`; zero imports) and keys/favourites 47-76 + 263-310 -> `foodSearchKeys.js`. Either is fine; one contiguous `sed -n '47,310p'` is the lowest-risk move.
   - Blockers: none (no closures, no mutable module state). Note `normalize` here lower-cases; `utils/favoriteFoods.js` has its own private `normalize` that only trims: do not unify.

2. `FoodSearchOverlay.styles.js` <- `makeStyles` 1159-1325 verbatim (minus the stale comment 1293). Needs `StyleSheet` and `scaleSize`. Export `makeStyles`. Blockers: none (depends only on its `COLORS` argument).

3. `RecentHistoryItem.js` <- 1098-1157 verbatim, default export. Needs: `React, { useRef, useMemo, useCallback }`, `View, Text, Pressable`, `Ionicons`, `Swipeable`, `SearchResultCard`, `strong as haptic`, `foodKey` (from module 1). It already receives `styles` and all callbacks via props. After the move `Swipeable` (line 20) is no longer used in FoodSearchOverlay.js: drop that import. Blockers: none.

4. (optional, medium-low risk) `useFoodBarcodeScanner.js` <- the contiguous scanner block, after B3: state 426-431, `clearScanRetry` 436-441, `scheduleScanRetry` 443-449, `openScanner` 451-477, `refreshPermission` 479-489, `openSystemSettings` 491-503, AppState effect 505-516, reset effect 518-528, plus `SCAN_RETRY_DELAY_MS` (312). It is contiguous and only talks to the rest of the component through: `setScannerVisible(false)` in the `!visible` effect (762), `openScanner` on the barcode button (935), and the modal JSX. Called at the same position, the relative order of all effects is preserved. Returns `{ scannerVisible, setScannerVisible, permission, scanBusy, setScanBusy, scanError, setScanError, scanLocked, setScanLocked, clearScanRetry, scheduleScanRetry, openScanner, openSystemSettings }`.
   Blocker to note: the wide return surface (the inline `onBarcodeScanned` handler at 1028-1063 uses most setters). That is why this step is optional.

5. (optional, goes with 4) `FoodBarcodeScannerModal.js` <- JSX 1009-1093 verbatim, with the hook's return values plus `goToDetails` and `styles` destructured from props under the same names so the JSX does not change. Takes `Modal`, `CameraView`, `lookupBarcode` imports with it (then unused in FoodSearchOverlay.js, as are `Camera`, `AppState`, `Linking` after step 4). Apply C14 (`closeScanner`) and E1 here.

What stays in FoodSearchOverlay.js: the component (sheet lifecycle 324-408, search state and paging 410-423 + 588-744, portion/quick-add state 746-763, renderers 765-874, JSX 878-1007). Expected size: about 775 lines after steps 1-3 and B3 (1326 - 264 helpers - 167 styles - 60 RecentHistoryItem - ~62 auto-open); about 590 after steps 4-5.

Do not split the search/paging logic further: `performSearch`, `handleLoadMore`, the debounce effect and the visibility-reset effect share `searchTokenRef`, `latestQueryRef`, `favoriteFoodsMapRef` and seven state setters (H3).

### D2. MacroGoalsSheet.js (611 lines)

1. `MacroGoalsSheet.styles.js` <- `makeStyles` 489-610 (after B2 pruning, about 100 lines). Needs `StyleSheet`, `scaleSize`, `theme` (mfpDark default). Export `makeStyles`. Blockers: none.
2. `macroGoalsUtils.js` <- module-level `parseMacroNumber` 26-30 and `getMacroCalories` 32-42 (verbatim), plus the pure helpers currently re-created on every render inside the component: `sanitizeDecimalInput` 175-186, `roundDisplayMacro` 196-202, `caloriesFromMacros` 203-205 (move verbatim, dedent one level). None of them closes over component state. Blockers: none. (`markManual` 187 and `handleMacroChange` 206-214 use `manualRef`/setters: they stay.)
3. Optional: C4 hook.

What stays: the component (44-487). Expected size: about 430 lines after B1/B2/B4 and steps 1-2. Do not split the component body further: `fadeToInfo`/`fadeToGoals`, the keyboard-expand effect and the auto-calc effects share `sheetRef`, `modeAnim`, `showInfo`, `suppressKeyboardExpandRef`, `manualRef` (H4).

### D3. Not over the threshold
PersonalInfoSheet.js (359), MacroStreakBadge.js (260), QuickAddModal.js (247), WorkoutBarcodeScannerModal.js (240): no split needed. Their style blocks could move to `<Name>.styles.js` for consistency, but it is not required.

---------------------------------------------------------------------------------------------------

## E. Latent bugs

E1. FoodSearchOverlay.js:1037: `const digits = data.replace(/\\D/g, '');`
- In a regex literal `\\D` is "a backslash followed by D", not "non-digit". So nothing is stripped, `digits === data`, and the `if (!digits)` branch (1038-1044, "Invalid barcode") is unreachable. The sibling scanner has the intended form: WorkoutBarcodeScannerModal.js:103 `raw.replace(/\D/g, "")`.
- Minimal fix: `/\D/g`.
- Effect of the fix: the server already strips non-digits (`functions/index.js:2623-2632` `toGtin13`), so numeric barcodes behave the same. Only a scan with no digits at all (possible for code39/code128) changes: today it makes a round trip and shows the server message ("Invalid or missing barcode"); fixed, it shows "Invalid barcode" locally without the call.
- Confidence: high that it is a bug and that this is the intended fix.

E2. MacroGoalsSheet.js:344: backdrop passed as an inline arrow while the memoised `renderBackdrop` (125-128) sits unused.
- `@gorhom/bottom-sheet` 4.6.4 renders `backdropComponent` as a component type (`BottomSheetBackdropContainer.tsx:10-16`). A new function per render means the backdrop is unmounted/remounted on every MacroGoalsSheet render; each fresh `BottomSheetBackdrop` starts with `pointerEvents: 'auto'` until its animated reaction runs (`BottomSheetBackdrop.tsx:68-70, 122-130`), i.e. an invisible full-screen touch target for a frame whenever the parent re-renders with the sheet closed.
- Minimal fix: `backdropComponent={renderBackdrop}` (the two bodies are character-identical).
- Confidence: high for the mechanism; medium that anyone has noticed. This is also the lint finding `no-unstable-nested-components` and resolves the unused `renderBackdrop`.

E3. FoodSearchOverlay.js:858-874 + 981: `HistoryFooter` is a component created during render and used as `<HistoryFooter />`.
- New type every render => the whole "Recent foods" nested FlatList (and every `RecentHistoryItem`/`Swipeable` in it) is destroyed and rebuilt on every render of the overlay: every keystroke, every loading flag flip, every favourite toggle. An open swipe row snaps shut on any re-render.
- Minimal fix: it uses no hooks, so rename to `renderHistoryFooter` and call it: `{renderHistoryFooter()}` at 981 (two-line change), or hoist to a module-level component with props `{ visible, recentFoods, styles, renderItem }`.
- Behaviour delta: rows are no longer remounted (swipe-open state now survives re-renders; less work per keystroke). Nothing else changes.
- Confidence: high for the mechanism. Treat as a best-practice fix with a known, benign delta; record it in the change log.

E4. SearchResultCard.js:90 and :105: `backgroundColor: '#rgba(255,255,255,0.1)'` is not a valid colour string (stray `#`). React Native drops invalid colours, so the favourite and plus circles currently have NO fill (only the hairline border). The "fix" (`'rgba(255,255,255,0.1)'`) would visibly add a fill, so do NOT fix; see I1. Confidence that the string is invalid: high.

E5. FoodSearchOverlay.js:917 + 754: "Quick Add" fires the haptic twice (once in the `onPress` wrapper, once inside `openQuick`). Almost certainly unintended, but removing one changes the feel; do not fix; see I2. Confidence: medium.

E6. MacroDayPage.js:77-89 and MealsSection.js:86-97: both `propsEqual` functions ignore the callback props (`deleteFood`/`onDelete`, `openSearchForMeal`/`onAddPress`, `openGoalsSheet`, `onToggleCalorieOffset`) and (MacroDayPage) `COLORS`. `deleteFood` depends on `focusedDate` (MT.js:524-559), so a memoised page can in principle keep a `deleteFood` bound to an older focused day. In practice the centred page re-renders because its `meals` prop identity changes when focus moves, so I could not construct a failing sequence. No fix proposed (adding comparisons changes re-render behaviour); see H2 and I3. Confidence that it is a real hazard: low-medium.

E7. FoodSearchOverlay.js:713: the 40 ms focus `setTimeout` created inside the `InteractionManager` task is not cancelled by the effect cleanup (715 only cancels the task). If the overlay is closed inside that window the input is focused while the sheet is closing; the `useAnimatedReaction` at 399-408 then dismisses the keyboard. Harmless today; no fix proposed. Confidence: low.

Checked and found clean: no reference to undefined names, no duplicate object keys, no hook called conditionally or after an early return (MealItemCard.js:81 returns after its only hook), every listener/timer effect has cleanup (FoodSearchOverlay.js:369-370, 388-392, 512-515, 525-527, 743; MacroGoalsSheet.js:66-68, 139, 290-295, 325-331; WorkoutBarcodeScannerModal.js:80-84). `setUsePlaceholderMacros`/`setPlaceholderMacros` are referenced at MacroGoalsSheet.js:115-116 above their declaration at 147-148; this is legal because the effect body runs after the whole render (and disappears with B4).

---------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Issue | Where | Fix | Risk |
|---|---|---|---|---|
| F1 | Component created during render (backdrop) | MacroGoalsSheet.js:344 | Pass `renderBackdrop` (E2). | Low |
| F2 | Component created during render (`HistoryFooter`) | FoodSearchOverlay.js:858-874, 981 | E3. | Low-medium (benign delta, documented in E3) |
| F3 | `StyleSheet.create` inside the component on every render of every list row | SearchResultCard.js:65-109 | Hoist to `const makeStyles = (theme) => StyleSheet.create({...})` (body verbatim) and `const styles = useMemo(() => makeStyles(theme), [theme]);`. `theme` is `COLORS || DEFAULT_COLORS`, both stable. Do not touch the invalid colour strings (E4). | Low |
| F4 | `makeStyles(COLORS)` called unmemoised on every render | MealCard.js:14 | `useMemo(() => makeStyles(COLORS), [COLORS])` like every sibling. | Low |
| F5 | Inline `require('../../theme/mfpDark').MFP_DARK` five times inside a style factory | QuickAddModal.js:210, 226, 230, 236, 239 | One top-level `import theme from '../../theme/mfpDark';` (the default export and `MFP_DARK` are the same object: `frontend/theme/mfpDark.js:47-48`) and `theme.surface` / `theme.fieldDeep`. Same convention as MacroGoalsSheet.js:22, PersonalInfoSheet.js:20, WorkoutBarcodeScannerModal.js:7. | Low |
| F6 | Pure helpers re-created on every render (or wrapped in a needless hook) | MacroStreakBadge.js:22-27 (`withAlpha` in `useCallback(..., [])`); MealItemCard.js:23-26 (`formatCals`), 28-32 (`pruneLeadingCalories`); PersonalInfoSheet.js:24 (`onlyDigits`), option arrays 164-170 and 187-191; QuickAddModal.js:32-35 (`num`); MacroBar.js:11 (`TRACK_H`); SearchResultCard.js:20-26 (`formatPortion`, or C8); MacroGoalsSheet helpers (D2 step 2); `parsePortion` (C1) | Move to module scope verbatim. For `withAlpha`, dropping the `useCallback` removes one hook from MacroStreakBadge consistently on every render, which is safe. `getSummary` (SearchResultCard.js:28-63) closes over `item`; leave it. | Low |
| F7 | Unstable callback defeats two `useCallback`s (lint: 749) | FoodSearchOverlay.js:749 `openPortion` -> deps at 827 and 856 | Optional: `useCallback((food) => {...}, [])` (it only uses state setters and the module-level `haptic`). Effect: `renderItem` identities become stable between renders, so fewer row re-renders; no visible change. Do not edit the two dependency arrays. | Low |
| F8 | Complex expression in a dependency array (lint: 716) | FoodSearchOverlay.js:716 | Leave as is. It deliberately re-runs the "fresh session" effect when `global.__loggedFoodsSig` (bumped at MT.js:548, 669 and FoodDetail.js:342, 408) changed by the time of the next render. Hoisting it to `const loggedFoodsSig = global?.__loggedFoodsSig || 0;` is equivalent, but the briefing says not to touch dependency arrays to silence warnings. | n/a |
| F9 | exhaustive-deps warnings (lint: 144, 256) | MacroGoalsSheet.js:132-144 (`[openSignal]` only), 237-261 (no `goalForm`) | Leave. Both are intentional: the first must fire only when the parent bumps the signal; the second would loop if `goalForm` were a dependency. | n/a |
| F10 | Cross-feature import of a styles module for a one-line alias | MacroStreakBadge.js:6 | C11. | Low |
| F11 | Import hygiene: third-party imports after local ones / interleaved | FoodSearchOverlay.js:29 (`useNavigation`), :45 (`useSafeAreaInsets`) after local imports; MealsSection.js:6 (`useNavigation`) after local imports; SearchResultCard.js:1 (`RNBounceable` before `react`); PersonalInfoSheet.js:20 and MacroGoalsSheet.js:22 missing semicolons are per-file style, leave | Regroup only in files that are being edited anyway. | Low |
| F12 | Constant masquerading as a variable | FoodSearchOverlay.js:333 `const headerPaddingTop = 0` feeding a `useMemo` (334-337) and an inline `{ paddingTop: 0 }` (901) | Optional: leave. If simplified, `headerTitleOffset` is just `scaleSize(6)`; `overlayHeader` has no `paddingTop`, so the inline override is a no-op. | Low, low value |
| F13 | Forwarding wrapper | QuickAddModal.js:77 `quickSet = (v) => setPortion(v)` (used :171); MacroGoalsSheet.js:168-171 `computeRecommendedMacros` (B4) | Inline. | Low |
| F14 | Redundant duplicate of a prop inside a style | DateHeader.js:159 `pointerEvents: 'box-none'` in the StyleSheet and again as a prop (66) | Leave (harmless; removing either is a judgement call on RN version behaviour). | n/a |

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

G1. macro-screens, `frontend/screens/MacroTracking.js`
- :1004 `onOpenPersonalInfo={() => setPersonalSheetIndex(1)}`: MacroGoalsSheet has no such prop (signature MacroGoalsSheet.js:44-54). Remove.
- Consequently `personalSheetIndex` (MT.js:394) can never leave `-1`: its only other writers are the sheet's own `onChange`, `onClose` and `onSave` (MT.js:1010, 1013, 1014). The `<PersonalInfoSheet>` at MT.js:1008-1016 is therefore mounted but can never open (personal info is edited inside MacroGoalsSheet via `PersonalInfoContent`). Remove the JSX block, the import (MT.js:19) and the state (MT.js:394). The component file itself stays (PARKED user).

G2. macro-screens, `frontend/screens/MacroTracking.js`
- :938-939 `collapsed={collapsedMeals}` / `toggleMeal={toggleMealCollapse}`, state :399, callback :429-433: dead once this partition stops accepting the props (B1). `LayoutAnimation` (import :3) is then unused. Do NOT remove the `UIManager.setLayoutAnimationEnabledExperimental(true)` block at MT.js:38-39: it is a process-wide Android switch other screens may rely on.
- :946 `isFocused={...}`: KEEP (H2).
- :986-993: FoodSearchOverlay no longer accepts `scannerAutoOpenKey` / `onScannerAutoOpenComplete` after B3; the caller never passed them, nothing to change, just do not add them back.

G3. macro-screens, `frontend/utils/nutrition.js`
- Keep `formatPortion` exported (:168); SearchResultCard may import it (C8).
- Do not replace the modals' `parsePortion` with `coercePortion` (:4-16): not equivalent (C1).

G4. app-shell, `frontend/components/UnderMealList.js`
- `compact` (:16 default, :30 forward) is constant false (B1). Drop the prop here when MealsSection.js:63 stops passing it; then MealItemCard's `compact` handling and `cardCompact` can go.

G5. user-stats, `frontend/components/2_Competition/UserStats/UserStatsStyles.js`
- After C11 this partition no longer imports `scaledSize`. The export must stay: PARKED `LeaderboardsSection.js:59` and three UserStats files import it.

G6. macro-screens, `frontend/screens/fatsecretClient.js` (seen while checking `lookupBarcode`)
- :33 `console.log(res.data)` in `getFoodById` is tracing output.
- :38 onward is a commented-out legacy client that contains what look like a FatSecret consumer key and secret in plain text (:39-40). It is commented-out code and should be deleted by that partition; the owner should be told the values are in git history.

---------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

H1. FoodSearchOverlay.js:324-408, 880-896: sheet mount/unmount choreography. `sheetMounted` + the 320 ms unmount timer (364-371), the rAF-scheduled `snapToIndex(0)`/`close()` (373-384), `index={visible ? 0 : -1}` (884), `animatedIndex` shared value + `useAnimatedReaction` worklet with `runOnJS(dismissKeyboardNow)` (399-408), platform-specific `keyboardBehavior` (894). Do not reorder these effects, do not "simplify" the double open path, do not touch the worklet or its dependency list.

H2. `propsEqual` in MacroDayPage.js:77-89 and MealsSection.js:86-97. They deliberately (or accidentally) skip callbacks and `COLORS`. Only the always-true `collapsed` comparison may be removed. Keep `prev.isFocused === next.isFocused` and the prop at MT.js:946 even though the component never reads `isFocused`: it forces a re-render when a page crosses the focus window, which refreshes otherwise-stale callbacks (E6). Do not add comparisons either.

H3. FoodSearchOverlay.js:588-744: search pipeline. `searchTokenRef` generation counter, `latestQueryRef`, `loadingMorePage`, the 250 ms debounce (739-743), the `InteractionManager` reset + 40 ms focus (701-714), the favourites cache-then-remote reconcile (605-615), optimistic favourite toggle with rollback (775-816), and the `global.__loggedFoodsSig` dependency (716). Order of state resets and the early `return`s inside `try/catch/finally` (647, 664, 670) are load-bearing. Move helpers out (D1 step 1) but leave these bodies byte-for-byte.

H4. MacroGoalsSheet.js:228-261: the two auto-calc effects. The first resets `manualRef` when personal info changes, the second writes recommended values into the form unless a field was edited manually; they rely on effect order and on the exact dependency lists (one carries an `eslint-disable`). Apart from the exact deletions in B4, do not edit. Likewise 132-144 (triple "robust open": immediate, rAF, 120 ms) and 87-108 / 287-332 (keyboard-expand suppression with a 320 ms timer and `preKeyboardIndexRef`).

H5. Scanner lock/busy/retry timing: FoodSearchOverlay.js:436-449, 1028-1063 and WorkoutBarcodeScannerModal.js:45-58, 94-126. The two differ on purpose or by accident (C3); keep each one's sequence of `setScanLocked` / `scheduleScanRetry` / `clearScanRetry` exactly, apart from E1.

H6. MacroStreakBadge.js:60-96: popover placement uses `measureInWindow` plus module-load `Dimensions.get('window')` (11) and `METRICS`; the spring/timing pair (73-83) resets by `setValue` on close. Leave the maths and the effect alone.

H7. Colour fallbacks. Many `COLORS?.x || literal` expressions always resolve to the literal for the live caller (MT.js:43-63 has no `primary`, `streak`, `placeholder`, `fieldDeep`, `primaryHairline`, `background`, `textPrimary`), and PARKED LeaderboardsSection.js:2066-2073 passes a different, smaller COLORS object to PersonalInfoSheet. Do not collapse, reorder or "correct" fallbacks; do not change `??` to `||` or vice versa.

H8. Navigation and data contracts used here: route `'FoodDetail'` with params `{ mode: 'add', food, mealName, dayKey }` (FoodSearchOverlay.js:767-772) and `{ entry, mealName, dayKey }` (MealsSection.js:60); the quick-add item shape (QuickAddModal.js:66-73: `food_id: custom-<ts>`, `source: 'custom'`, `__portionMultiplier`, and the exact `food_description` text at :65, which downstream parsers read); `__portionMultiplier` on portion confirm (FoodSearchOverlay.js:995); footer suppression key format (MacroGoalsSheet.js:57). Keep verbatim.

H9. MacroDayPage.js uses 2-space indentation and several files mix quote styles (`import scaleSize from "../../helper/scaleSize";`). No reformatting.

H10. PersonalInfoSheet.js default export and props are a PARKED dependency: same path, same name, same behaviour.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

I1. SearchResultCard.js:90, 105: `'#rgba(255,255,255,0.1)'` is invalid, so the two round buttons have no background today. Was a faint fill intended? Fixing it changes the look.

I2. FoodSearchOverlay.js:917 / 754: "Quick Add" triggers two haptic pulses. Intended?

I3. MacroDayPage / MealsSection memo comparators ignore callbacks (E6). Is the stale-closure risk known and accepted, or should the comparators include `deleteFood` / `onDelete`?

I4. MacroGoalsSheet.js:237-261: whenever personal info is complete and the user has not typed in a macro field during this mount, the form's calories/protein/carbs/fat are overwritten with the recommendation (including right after the parent seeds the form from saved goals). Pressing Save without editing therefore replaces custom goals with recommended ones. Intended "auto-calc", or a bug?

I5. The "placeholder macros" mode in MacroGoalsSheet (B4) can never turn on. Abandoned feature to delete (recommended), or something that should be wired up?

I6. `scannerAutoOpenKey` / `onScannerAutoOpenComplete` in FoodSearchOverlay (B3) are not passed by anyone. Was the floating barcode button meant to open the overlay's scanner instead of the separate `WorkoutBarcodeScannerModal`? If the separate modal is the final design, the auto-open code is deleted.

I7. Two barcode scanners with different error texts, styles and retry timing (C3). Should they converge on one? (Out of scope for a behaviour-preserving pass.)

I8. FoodSearchOverlay.js:605-615: the background favourites sync can overwrite an optimistic favourite toggle made between the cached load and the remote response. Accept?

I9. File names `WorkoutBarcodeScannerModal` and `MacroStreakBadge` no longer describe what the components do. Renames are forbidden in this pass; noted for later.

---------------------------------------------------------------------------------------------------

Housekeeping note: while collecting evidence a shell redirect accidentally created a scratch file `/tmp/claude-501/spx/audit/.a` (19 lines copied from MealItemCard.js styles). It is not part of the audit and can be removed by the owner of the work area; nothing inside the project was written.
