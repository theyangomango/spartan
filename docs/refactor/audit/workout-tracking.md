# Audit: partition "workout-tracking" (12 files, 3658 lines)

Scope: `frontend/components/3_Workout/NewWorkout/Group/*` (5 files), `.../Tracking/*` (6 files), `.../components/ConfirmWorkoutModal.js`.
All 12 files were read top to bottom. All 12 are byte-identical to `SPX/baseline` (checked with `diff -q`), so every line number below is valid for both the working tree and the baseline.
`SPX/tools/lint.sh` on the partition reproduces exactly the 21 machine findings (0 errors, 21 warnings). knip reported no unused exports; confirmed (every export has a LIVE importer, see A).

Abbreviations: AWM = `frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js`, SWM = `.../NewWorkout/SpectatingWorkoutModal.js`, EWM = `.../NewWorkout/EditingWorkoutModal.js`, PWEL = `frontend/components/1_Feed/PastWorkoutExerciseLog.js`.

---

## A. Module map

| File | Purpose | Exports | Imported by |
|---|---|---|---|
| `Group/GroupHeader.js` (317) | Header row of the workout sheet: rest-timer pill or back chevron (+ optional friend PFP), centred `TimerDisplay`, Invite/Switch pill, Cheer / Copy Template button. | default `memo(GroupHeader)` | **outside:** AWM:45 (render at 1547), SWM:19 (render at 275) |
| `Group/GroupMenu.js` (191) | Transparent `Modal` popover: "Invite people" + participant list with selection tick. | default `GroupMenu` | **outside:** AWM:46 (render at 1715) |
| `Group/GroupModal.js` (290) | Body of the invite sheet: searchable list of followed users sorted by recency/live, multi-select, "Invite (n)" button. | default `GroupModal` | in-partition only: `GroupModalBottomSheet.js:5` |
| `Group/GroupModalBottomSheet.js` (88) | `@gorhom/bottom-sheet` wrapper (93% snap) driven by a boolean flag; hosts `GroupModal`. | default `GroupModalBottomSheet` | **outside:** `frontend/components/3_Workout/WorkoutExperiencePortal.js:2` (render at 254) |
| `Group/useGroupViewing.js` (489) | Hook: subscribes to `workouts/{wid}` (members), `workouts/{wid}/live/*` (presence), `usersPublic/{uid}` (viewed user's `currentWorkout`); optional auto-join + presence publish; "snap back to me" guards; menu open state. | named `useGroupViewing` | **outside:** AWM:44 (call at 508), SWM:18 (call at 68) |
| `Tracking/EditableStat.js` (329) | Numeric stat input (weight/reps): sanitising, step +/-, registration with the custom keypad context, iOS accessory fallback when no provider. | default `EditableStat` | in-partition only: `SetRow.js:5` |
| `Tracking/ExerciseLog.js` (527) | One exercise card: header (avatar + name, opens options panel), column labels, `SetRow` list, "Add Set"; local draft of sets with debounced / next-frame sync to parent; previous-set prefill. | default `memo(ExerciseLog, areEqual)` | **outside:** AWM:30 (render at 1065 and 1589), SWM:12 (render at 259), EWM:22 (render at 256) |
| `Tracking/ExerciseOptionsPanel.js` (185) | Anchored popover `Modal`: View / Replace / Remove exercise. | default `ExerciseOptionsPanel` | in-partition only: `ExerciseLog.js:9` |
| `Tracking/SetRow.js` (396) | One set row: set-type pill (opens `SetTypePanel`), previous display, two `EditableStat`s, done checkmark, swipe underlay with delete pill. | default `memo(SetRow, rowEqual)` | in-partition only: `ExerciseLog.js:7` |
| `Tracking/SetTypePanel.js` (171, 2-space indent) | Anchored popover `Modal` to pick set type (W/D/F/L/R). | default `memo(SetTypePanel, areEqual)` | in-partition only: `SetRow.js:6` |
| `Tracking/StatKeyboardContext.js` (446) | Custom numeric keypad: context + provider (input registry, active input, focus-next, collapse), overlay keypad UI, module-level escape hatches. | named `StatKeyboardProvider`, `useStatKeyboard`, `dismissStatKeyboard`, `isStatKeyboardActive` | `useStatKeyboard`: `EditableStat.js:8`. **outside:** `StatKeyboardProvider` AWM:31 (1519/1785), EWM:21 (280/357); `dismissStatKeyboard` + `isStatKeyboardActive` `NewWorkout/ActiveWorkoutBottomSheet.js:20` (used 122-123) |
| `components/ConfirmWorkoutModal.js` (229) | Fade `Modal` confirm dialog with `cancel` / `finish` variants. | default `memo(ConfirmWorkoutModal)` | **outside:** AWM:60 (render at 1649 and 1660) |

No PARKED, TOOLING or functions/ file imports anything from this partition. No DEAD file is imported by this partition.

---

## B. Verified dead code

Legend: SAFE = removal cannot change behaviour. CARE = dead, but read the note before removing.

### B1. Group/GroupHeader.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `// components/Tracking/Group/GroupHeader.jsx` | stale path comment | 1 | File lives at `components/3_Workout/NewWorkout/Group/GroupHeader.js`. SAFE. |
| `scaledSize` | forwarding wrapper | 14 (32 call sites) | `(size) => scaleSize(size)`. See C6 (app-wide decision). |
| `onFinish` | prop no caller passes | 28; branch 151-156 | `grep -rn "onFinish" frontend/components/3_Workout` hits only this file. AWM:1547-1569 and SWM:275-288 list their props explicitly (no spread) and neither passes it. In the self layout the right-hand action slot therefore always renders `null`. SAFE: drop the prop and replace lines 152-156 with `null`. |
| `styles.finish_btn`, `styles.finish_btn_text` | StyleSheet keys used only by the dead branch | 256-269 (incl. comment 256) | Die with `onFinish`. SAFE. |

Everything else in the file is used (all 20 other style keys referenced; all other props passed by at least one caller).

### B2. Group/GroupMenu.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| stale path comment | comment | 1 | as above. SAFE. |
| `screenHeight` | unused const | 12 | ESLint; no reference. Removing it makes the `Dimensions` import (line 3) unused: remove from the import list. SAFE. |
| `scaledSize` | forwarding wrapper | 13 (26 call sites) | See C6. |
| `participant.pfp / .photoURL / .avatar / .name / .isVerified` | fields the only data source never provides | 16, 17, 40-44 | The only caller (AWM:1718) passes `participants` from `useGroupViewing`, whose rows are built by `sanitizeParticipant` (`useGroupViewing.js:18-24`): keys are exactly `uid, handle, image, pfpVersion, updatedAt`. So line 16 always resolves to `participant.image`, the name sub-line (40-44) never renders, and the initial verified flag is always `false`. KEEP (component-level defensive fallbacks; data-shape dependent, not code-dead). Listed for information, see I8. |

### B3. Group/GroupModal.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| stale path comment | comment | 1 | SAFE. |
| `scaledSize` | forwarding wrapper | 14 (20 call sites) | See C6. |
| `closeGroupModal` | unused prop | 16 | ESLint; never referenced in the body. Passed at `GroupModalBottomSheet.js:53`. SAFE: remove from the signature and from the JSX at `GroupModalBottomSheet.js:53` (the sheet itself still uses `closeGroupModal` for `onClose`, line 51). |
| `key` | unused local | 38 | The same expression is recomputed inline in the dependency array (line 51). Delete line 38 only; leave the dependency array and its `eslint-disable` comment untouched. SAFE. |
| `Array.isArray(followingUsers) ? followingUsers : []` | always-true condition | 38, 44, 51 | `followingUsers` is already normalised to an array on line 17. Cosmetic; may be left (line 51 is a dependency expression: if simplified, the value is identical). |

### B4. Group/GroupModalBottomSheet.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| stale path comment | comment | 1 | SAFE. |
| `closeGroupModal={closeGroupModal}` on `<GroupModal>` | prop pass to a component that ignores it | 53 | see B3. SAFE. |

### B5. Group/useGroupViewing.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `import { deleteDoc } from "firebase/firestore"` | duplicate import of the same module | 2 (vs 3-14) | ESLint `no-duplicate-imports`. Merge `deleteDoc` into the list at 3-14. SAFE. |
| `friendDoneDerived` | constant `useMemo(() => 0, [activeWorkout])` + return field | 456, 483 | `grep -rn friendDoneDerived` hits only these two lines; AWM:496-508 and SWM:62-68 do not destructure it. SAFE: delete both lines (removes one hook consistently on every render; `useMemo` import is still needed for `viewing`, line 466). |
| `norm &&` | always-truthy operand | 128 | `norm` is `arr.map(String)`, always an array. Cosmetic. |
| `try { ... } catch {}` around `Date.now() + 2000` | pointless try | 459-461 | Cannot throw. Cosmetic; leave unless touching the line. |
| self-stream path: `isSelf ? (data?.statsExercises || {}) : {}` | ternary whose true arm is unreachable for current callers | 325-326, 408 | Both callers pass `suppressSelfStream: true` (AWM:516, SWM:76). With that, line 313 returns for self in prefetch and line 401 returns for self in the snapshot effect, so `isSelf` is always false at 326 and 408 and `activeStats` is always a (fresh) `{}`. CARE: do NOT simplify; the default of the parameter is `false`, and every `setActiveStats({})` creates a new object identity that downstream memos in AWM (930-965) react to. Recorded as open question I6. |
| `console.log` at 152, 180, 417 | failure-path logs | 152, 180, 417 | All three are inside `catch` blocks on real Firestore failures. KEEP (not tracing). |

All other imports, helpers, parameters and return fields are used (`members`, `participants`, `menuVisible`, `openMenu`, `closeMenu`, `overlayPfp`, `activeStats`, `waitingFriend`, `setViewing`, `viewing`, `viewingSelf`, `activeWorkout` are consumed by AWM; SWM uses five of them).

### B6. Tracking/EditableStat.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `console.log("[EditableStat] onFocus", inputId)` | tracing log | 250 | SAFE to delete (`inputId` stays in the deps: still used at 254). |
| `console.log("[EditableStat] onBlur", inputId)` | tracing log | 260 | SAFE to delete (`inputId` still used at 267). |
| `placeholder` | prop no caller passes | 95, 287 (+ `placeholderTextColor` 288) | Only caller is `SetRow.js:211-218` and `222-229`; neither passes `placeholder`, so it is always `""`. SAFE to drop the prop; if dropped, drop 287-288 together (an empty placeholder renders nothing). Optional. |
| `!hasCustomKeyboard` in `if (!keyboard || !hasCustomKeyboard) return;` | redundant condition | 186 | `hasCustomKeyboard` is `!!keyboard` (104). Cosmetic. CARE: do not touch the dependency array on 234 (see H1). |
| `enableNativeKeyboard`, `enableCustomKeyboard` | no-op handlers never invoked | 230-231 | The provider only ever calls `appendChar, addDecimal, backspace, increment, decrement, copyPrevious` (via `callActive`), `focus`, `blur`, `forceBlur`, `onCustomKeyboardDismissed` (`StatKeyboardContext.js:200-206, 239, 248, 324-332`). `grep -rn "enableNativeKeyboard\|enableCustomKeyboard"` hits only these two lines. SAFE. |
| `hasPrevious`, `copyPrevious` handlers; `sanitizedPrevious`; prop `previousValue` | plumbing for a keypad key that does not exist | 218-225, 116, 100; passed at `SetRow.js:216, 227` | `hasPrevious` is called nowhere. `copyPrevious` is reachable only through the overlay prop `onCopyPrevious` (`StatKeyboardContext.js:329`), which the overlay destructures and never uses (line 40). CARE: `sanitizedPrevious` is in the registration effect's dependency array (234). Removing the chain removes one cause of re-registration (when the previous value changes, that one input unregisters/re-registers and moves to the END of the provider's `orderRef`, which determines "Next" order until the next full re-registration). Removing it is therefore not strictly timing-identical. Recommended: remove the overlay-side dead props (B10) now; remove this chain only together with an owner decision (I2). |
| `onSubmitEditing={() => {}}` | no-op prop | 297 | Equivalent to omitting. Cosmetic. |
| `if (result === "") return ""; return result;` | redundant branch | 42-43 | Both paths return `result`. Cosmetic. |
| `stepInt > 0 &&` | always-true operand | 141 | Guarded by line 134. Cosmetic. |

### B7. Tracking/ExerciseLog.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `ENABLE_LAYOUT_ANIM` | constant-false feature flag | 16; used 211 | Never reassigned. The `if` on 211 can never run. SAFE. |
| `withLayout` | wrapper that only forwards once the flag is gone | 210-213; used 217, 329 | After removing 211 it is `(fn) => (...args) => fn(...args)`. Unwrap: `const addSet = () => {...}` and `const deleteSetById = (sid) => {...}`. SAFE (both are already recreated on every render today). |
| `LayoutAnimation`, `Platform`, `UIManager` | imports that become unused | 3 | After removing 211 and 60-62 (next row). |
| in-render `UIManager.setLayoutAnimationEnabledExperimental(true)` | side effect during render, redundant | 59-62 | `SetRow.js:55-57` performs the identical idempotent call at module load, and `ExerciseLog.js:7` imports `SetRow`, so it has always run before any `ExerciseLog` render. Android-only (the repo has no `android/` directory). SAFE; but see G6 before also deleting the SetRow copy. |
| `muscle` | prop never read in the body | 46 | ESLint. Still compared in `areEqual` (469) and passed by AWM:1067/1592, SWM:261, EWM:259. Step 1 (SAFE, in-partition): drop from the destructuring. Step 2 (needs G1): callers stop passing, then drop 469. |
| `showOptionsTriggerIcon` | prop never read in the body | 53 | ESLint. Compared in `areEqual` (471); callers pass the literal `true` (AWM:1075, 1600; EWM:266) or omit it (SWM). Same two steps as `muscle`. |
| `styles.optionsButton` | unused StyleSheet key (also contains the invalid key `mart`, 503) | 494-505 | ESLint + grep: no `styles.optionsButton`. SAFE. |
| `fadeAnim` | `Animated.Value(1)` that is never animated | 161; used 398, 410, 429, 454 | No `Animated.timing/spring` or `setValue` on it anywhere. The four `Animated.View`s render with a constant opacity of 1. OPTIONAL: replace with plain `View` (and drop `{ opacity: fadeAnim }` and the `Animated` import). Visual result identical; if in doubt leave as is (I10). |
| `itemKey={sid}` on `<SetRow>` | prop that ends in a no-op | 435 | `SetRow` forwards it to `SwipeableItem`, which has no `itemKey` prop (B8). SAFE to remove together with B8. |
| comment `// components/3_Workout/NewWorkout/Tracking/ExerciseLog.js` | path comment (correct) | 1 | Harmless; keep or drop. |

### B8. Tracking/SetRow.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `ENABLE_LAYOUT_ANIM` | constant-false flag | 52; used 93 | Same as B7. SAFE; `LayoutAnimation` import (2) becomes unused. |
| `updateSet` | prop no caller passes; unreachable fallbacks | 63; 148, 214, 225 | The only caller (`ExerciseLog.js:433-448`) always passes `onUpdateSetById` and a truthy `sid` (`item?.id || \`${name}-${index}\``), and never `updateSet`. If a fallback were reached it would throw (`updateSet` is `undefined`). SAFE: reduce to `onUpdateSetById(sid, ...)`. |
| `handleDelete` | prop no caller passes; unreachable fallback | 66; 95, deps 97 | Same evidence. SAFE: `onDeleteSetById(sid)`; drop `handleDelete` and `index` from the deps only if they are no longer referenced in the callback (`index` then is not). |
| `itemKey` prop and `itemKey={...}` on `SwipeableItem` | prop the library does not have | 71, 159 | `node_modules/react-native-swipeable-item` 2.0.9 `Props<T>` (src/index.tsx:70-87): `item, children, renderOverlay, renderUnderlayLeft, renderUnderlayRight, onChange, overSwipe, animationConfig, activationThreshold, swipeEnabled, snapPointsLeft, snapPointsRight, swipeDamping`. No `itemKey`. No patch for this package in `patches/`. SAFE to remove (with `ExerciseLog.js:435`). |
| `onSwipeableLeftOpen={...}` | prop the library does not have | 166 | Same evidence (the library's only callback is `onChange`). It never fires; deleting a set happens only by tapping the trash pill. SAFE to remove; do NOT wire it to `onChange` (behaviour change). See I1. |
| `swipeRef` / `params?.ref` | value that is always `undefined` | 99-106, 163 | `UnderlayParams` (src/index.tsx:42-49) is `{ item, open, close, percentOpen, isGestureActive, direction }`; there is no `ref`. So `swipeRef?.current?.close?.()` (102) never does anything. SAFE simplification: `renderUnderlayLeft={readOnly ? undefined : renderUnderlayLeft}` with `renderUnderlayLeft = useCallback(() => <UnderlayLeft onDelete={handleDeleteSwipe} />, [handleDeleteSwipe])`. Do NOT replace it by `params.close()` (behaviour change). If the implementer prefers zero structural change, leave as is and note it. |
| `current={set?.type || null}` on `<SetTypePanel>` | prop the receiver ignores | 258 | see B9. SAFE. |
| default branches of `typePillBg` / `typePillText` | unreachable from this file | 379-380, 392-393 | Called only when `hasType` (174, 177), and `normalizeSetType` returns one of the five keys or `null`. KEEP (switch defaults). |
| `displayWeight == null ? "" : ...`, `displayReps == null ? ...` | always-false null checks | 213, 224 | `rawWeight`/`rawReps` are `?? ""` (76-77). Cosmetic. |

### B9. Tracking/SetTypePanel.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `current` | unused prop | 24 (compared in `areEqual` 121; passed at `SetRow.js:258`) | ESLint. The panel never highlights the current type. SAFE to remove all three places: `onClose`/`onSelect` are inline arrows in `SetRow` (256, 259 / 145), so `areEqual` is already false whenever `SetRow` re-renders; dropping the `current` comparison cannot remove a re-render that happens today. |
| `styles.separator` | unused StyleSheet key | 169 | ESLint + grep. SAFE. |

### B10. Tracking/StatKeyboardContext.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| overlay props `activeId`, `onCopyPrevious`, `canCopyPrevious` | destructured, never used | 33, 40, 42 | ESLint. `canCopyPrevious` is not even passed. SAFE: remove the three from the destructuring and the two passes at 322 and 329. |
| `if (!id) { return; }` | useless trailing return | 189-191 | ESLint `no-useless-return`. SAFE. |
| `callActive` in deps of `setActiveInput` | unnecessary dependency | 192 | `callActive` is a `useCallback(..., [])`, so removing it cannot change the identity of `setActiveInput`. SAFE (optional; this is the removal of a dependency on a stable value, not a silencing of a missing one). |
| `handlers.onCustomKeyboardDismissed` branch | handler no input registers | 205-207 | The only registrant is `EditableStat.js:187-232`; it registers `focus, appendChar, addDecimal, backspace, increment, decrement, hasPrevious, copyPrevious, forceBlur, enableNativeKeyboard, enableCustomKeyboard`. No `onCustomKeyboardDismissed`. SAFE. |
| `handler.blur` branch in `focusNext` | handler no input registers | 238-241 | Inputs register `forceBlur`, not `blur`. The branch never runs. SAFE to delete the 4 lines (keep `clearActiveInput(id)`, which calls `forceBlur`). See I3. |
| `handlers` local and `handlers.blur` branch in `onNext` | same | 315, 331-333 | After removal `onNext={focusNext}` (keep the identity semantics: today it is an inline arrow; `onNext={() => focusNext()}` or `onNext={focusNext}` are both fine since `focusNext` ignores arguments). SAFE. |
| context fields `getHandlers`, `clearActiveInput`, `focusNext`, `collapseKeyboard`, `activeId` | fields no consumer reads | 283-288 | The only consumer (`EditableStat.js`) reads `registerInput` (187), `setActiveInput` (243, 254), `requestClearActiveInput` (267). CARE: `activeId` MUST stay in the memo's dependency list, because the resulting change of context identity is what makes every input re-register (H1). Recommended: leave the context value exactly as it is, or at most drop `getHandlers` (285). |
| `styles.collapseButton` | style with no effect | 407-409; used 127 | Same `backgroundColor` as `actionButton` (402). OPTIONAL. |
| `styles.incrementRight` | empty style | 427; used 142 | `{}`. OPTIONAL. |
| `pointerEvents: "box-none"` in `styles.overlay` | duplicates the prop on the same View | 352 vs 91 | Leave (both are honoured in RN 0.73; removing either is a no-op but not worth the risk). |

### B11. components/ConfirmWorkoutModal.js
| Identifier | Kind | Line | Evidence |
|---|---|---|---|
| `iconName`, `iconColor` | props no caller passes | 136-137; used 142-143, deps 151 | Callers AWM:1649-1659 and 1660-1672 pass neither (`grep "iconName=\|iconColor=" AWM` is empty). SAFE: remove both props; `config` becomes `VARIANT_CONFIG[variant] || VARIANT_CONFIG.finish` (the memo 139-151 only copies the base fields), and the `useMemo` import becomes unused. |
| second scale import | two names for the same function | 6-7 | `scaleSize` (default of `helper/scaleSize`) and `ss` (re-exported by `utils/scale`) both compute `Math.round(n * SCALE_MIN)`. `scaleSize` is used once (188). OPTIONAL: use `scaledSize(26)` there and drop line 6. |

`handlePrimaryPress` / `handleSecondaryPress` / `renderBody` (161-172) are NOT pure forwarders (they add null guards and keep the haptic firing even without a handler): keep.

### B12. Nothing dead
`Tracking/ExerciseOptionsPanel.js`: every import, prop, constant and style key is used.

### B13. Nothing in this partition is used only by PARKED files
(No PARKED file imports this partition, so there are no KEEP-for-PARKED items.)

---

## C. Duplication

**C1. `normalizePrev` (returns `null` when weight and reps are both 0)**
- `Tracking/SetRow.js:14-20`
- `frontend/components/1_Feed/PastWorkoutExerciseLog.js:11-17`
Identical for every input (same statements; only indentation differs).
Canonical home: a new RN-free module `frontend/components/3_Workout/shared/previousSetUtils.js` exporting `normalizePrev`; both files import it. (Do not put it in a file that imports `react-native`; see C3.)

**C2. `normalizePrevCandidate` / `normalizePrev` (keeps `{weight: 0, reps: 0}`)**
- `Tracking/ExerciseLog.js:37-42` (`normalizePrevCandidate`)
- `frontend/components/3_Workout/NewWorkout/hooks/useWorkoutEditing.js:8-14` (`normalizePrev`)
Identical for every input: both return `null` for falsy / non-object, else `{ weight: Number(x?.weight) || 0, reps: Number(x?.reps) || 0 }`.
NOT identical to C1 (C1 returns `null` when both numbers are 0). Keep the two semantics under two names, e.g. `normalizePrev` (C1) and `normalizePrevKeepZero` (C2) in the same `previousSetUtils.js`. `useWorkoutEditing.js` is outside this partition (G3).

**C3. `typePillText` and `typePillBg`**
- `Tracking/SetRow.js:367-382` (`typePillBg`), `384-395` (`typePillText`)
- `PWEL:363-378` (`typePillBg`), `379-390` (`typePillText`)
`typePillText`: identical.
`typePillBg`: the five type cases are identical; the `default` differs (SetRow: `{ backgroundColor: theme.field }`; PWEL: adds `borderWidth: scaleSize(1), borderColor: "rgba(255,255,255,0.30)"`). The default is unreachable from both call sites (SetRow:174 only when `hasType`; PWEL:148 only when `normalizedType` is truthy; `normalizeSetType` returns one of the five keys or `null`). So for every input they can receive they behave identically.
Canonical home: a new `frontend/components/3_Workout/shared/setTypePillStyles.js` (imports `StyleSheet`, `theme`, `normalizeSetType`). Do NOT add them to `shared/setTypeUtils.js`: that file is RN-free today and is imported by `frontend/helper/estimateWorkoutCalories.js`. If merged, keep either default (say which in the report). Cross-partition (G2). If the 1_Feed owner does not take it, leave both.

**C4. `buildPreviousDisplay`: NOT identical, leave both**
- `Tracking/SetRow.js:29-50` formats with `formatCount` (22-27): integers via `String`, otherwise `toFixed(2)` with trailing zeros trimmed.
- `PWEL:54-75` formats with `formatNumber` (`toLocaleString`): thousands separators ("1,000" vs "1000"), locale decimals, up to 3 fraction digits ("2.125" vs "2.13").
Same structure, different output for values >= 1000 and for non-integers.

**C5. `formatCount`: three unrelated functions with the same name, leave**
- `Tracking/SetRow.js:22-27` (see C4)
- `frontend/utils/workoutSummary.js:11-15` (rounds to 1 decimal, returns `'0'` for falsy)
- `frontend/components/5_Profile/ProfileBottom/ProfileContentCards.js:7` (takes `(value, singular)`)

**C6. `scaledSize` forwarding wrapper** (`const scaledSize = (size) => scaleSize(size);`)
- In this partition: `GroupHeader.js:14`, `GroupMenu.js:13`, `GroupModal.js:14` (78 call sites in total).
- Elsewhere (16 more): `5_Profile/ProfileTop/WorkoutStats.js:6`, `ProfileInfo.js:11`, `ProfileRowButtons.js:9`, `5_Profile/MakePost/SelectPhotosScreen.js:15`, `2_Competition/UserStats/UserStatsStyles.js:5`, `2_Competition/UserStats/HexagonalStats.js:10`, `4_Explore/SearchBarComponent.js:24`, `4_Explore/UserCard.js:9`, `3_Workout/NewWorkout/RestTimerModal.js:21`, `TimerDisplay.js:7`, `SelectExercise/selectExerciseModalStyles.js:18`, `SelectExercise/ExerciseCard.js:10`, `SelectExercise/AnimatedButton.js:6`, `SelectExercise/SelectExerciseModal.js:33`, and two PARKED files (`2_Competition/SelectExercise/SelectExerciseModal.js:11`, `components/SelectExerciseModal/styles.js:17`: do not edit).
- Related alias: `import { ss as scaledSize } from ".../utils/scale"` in `ConfirmWorkoutModal.js:7`, SWM:15 (and DEAD `WorkoutReminderModal.js:5`).
All are behaviourally identical to `scaleSize` (`Math.round(n * SCALE_MIN)`).
Recommendation: one app-wide decision in the plan. Lowest-churn option that still removes the wrapper: replace the definition line with `const scaledSize = scaleSize;` (one line per file, no call-site churn). Full option: `sed 's/\bscaledSize(/scaleSize(/g'` per file and delete the definition (mechanical, but touches 78 lines in this partition). Either is behaviour-preserving.

**C7. `ensureString` == `toUidString`**
- `Group/useGroupViewing.js:17` `(value) => (value == null ? "" : String(value))`
- AWM:83 `(uid) => (uid == null ? "" : String(uid))`
Identical. Low value; if a home is wanted, export `ensureString` from the proposed `Group/groupParticipantUtils.js` (D2) and import it in AWM (G4).

**C8. `toMillis` (returns `undefined` for empty / unparsable)**
- `Group/GroupModal.js:24-30` (defined inside the component)
- `frontend/screens/ProfileWorkoutsAndPostsScreen.js:39-45`
Identical bodies.
NOT identical to the exported ones: `frontend/utils/date.js:6-17` and `frontend/utils/friends.js:4-11` return `0` instead of `undefined`, handle `Date` instances explicitly and `{seconds}` plain objects (GroupModal's returns `undefined` for a plain `{seconds, nanoseconds}` object, e.g. a timestamp restored from a JSON cache), and return `NaN` for a `NaN` number (GroupModal's returns `undefined`). Because GroupModal always uses `?? 0`, the `undefined`/`0` difference is invisible, but the `{seconds}` and `NaN` cases are not. Do not switch to `utils/date.toMillis`.
Recommendation: in this partition only hoist `toMillis` and `bestTimestamp` (24-36) to module scope (F3). Sharing with `ProfileWorkoutsAndPostsScreen` is optional (G5).
There are 20+ other `toMillis` definitions repo-wide (list from `grep -rnE "(const|function) toMillis\b"`): each needs its own diff by its owning partition.

**C9. `bestTimestamp`: NOT a duplicate**
`GroupModal.js:31-36` uses `created, startedAt, finishedAt`; `ProfileWorkoutsAndPostsScreen.js:47-53` uses five fields. Leave.

**C10. `ENABLE_LAYOUT_ANIM = false`**: `ExerciseLog.js:16`, `SetRow.js:52`. Both dead (B7, B8); remove both rather than share.

**C11. Android `setLayoutAnimationEnabledExperimental(true)`** appears 7 times repo-wide: `ExerciseLog.js:60-61` (in render), `SetRow.js:55-56` (module), AWM:342-343 (render), SWM:37-38 (render), `screens/MacroTracking.js:38-39`, `2_Competition/UserStats/UserStatsModal.js:31-32`, `UserStatsAfterWorkoutSheet.js:10-11` (module). See G6.

**C12. Popover constants and open animation**: `PANEL_WIDTH = 260` in `ExerciseOptionsPanel.js:11` and `SetTypePanel.js:10`; the open-animation effects (`ExerciseOptionsPanel.js:17-27` vs `SetTypePanel.js:31-41`) differ in start scale (0.95 vs 0.96) and duration (120 vs 110 ms); positioning logic differs (module-level `Dimensions` vs `useWindowDimensions` + insets + open-above). Not identical. Leave.

**C13. Anchor measurement**: `ExerciseLog.js:176-207` (`togglePanel`) vs `SetRow.js:111-144` (`openTypePanel`): same shape, different outputs (offsets, fields). Leave.

**C14. Haptic wrapper**: `GroupHeader.js:84` `withHaptics` vs `frontend/utils/haptics.js:28-34` `withStrongPress`. NOT identical: `withHaptics` drops the press-event argument (calls `fn()`), swallows exceptions thrown by the handler, and returns nothing; `withStrongPress` forwards `...args`, lets exceptions propagate and returns the handler's result. Handlers such as AWM's `handleOpenMenu`/`openRestModal` would start receiving the event object. Leave; hoisting `withHaptics` to module scope is safe (F6).

**C15. PFP field fallback chains**: `useGroupViewing.js:219` (`pfp || photoURL || image`), `:321` and `:409` (`pfp || photoURL || image || avatar`), `GroupMenu.js:16` (`pfp || image || photoURL || avatar`) vs `frontend/utils/profilePhoto.js:20-33` `resolvePhotoURL` (order `photoURL, photoUrl, image, pfp, ...`, trims, own-property check). Different precedence; NOT identical. Leave.

**C16. Countdown text**: `GroupHeader.js:96` prints the same text as `RestTimerModal.js:41-45` `formatTime`, but as three JSX children. Leave.

**C17. Inside one file**
- `ExerciseLog.js:240-251` vs `335-347` (jscpd): the shared prologue of two different effects (auto-prefill vs attach `prev`). Leave (H4).
- `SetRow.js:186, 199, 205`: the same style ternary three times. Optional local const; not required.
- `ExerciseOptionsPanel.js:65-77, 81-93, 97-108`: three near-identical rows (different icon family, colours, no chevron on the last). Leave (extracting would be a rewrite).
- `useGroupViewing.js:319-331` vs `406-414`: usersPublic doc -> `{workout, stats, pfp}` in prefetch and snapshot; stats handling differs. Leave.

**C18. `useDebounced` (`ExerciseLog.js:21-35`) vs `useDebounce` (`1_Feed/FeedHeader.js:66-72`)**: NOT identical (FeedHeader's has no latest-fn ref, no `flush`, no unmount cleanup, returns a bare function). Leave.

**C19. jscpd `PWEL:51-62 == SetRow.js:26-37`**: this is the `buildPreviousDisplay` prologue (C4): not mergeable. `PWEL:359-376 == SetRow.js:363-380` is `typePillBg` (C3).

---

## D. Decomposition plans

Only `ExerciseLog.js` (527) exceeds 500 lines. `useGroupViewing.js` (489) and `StatKeyboardContext.js` (446) are close; optional plans are given because their seams are clean.

### D1. Tracking/ExerciseLog.js (527 lines) — required

Top-level declarations today: imports 2-15; `ENABLE_LAYOUT_ANIM` 16; `SYNC_DEBOUNCE_MS` 17; `RAF_FALLBACK_MS` 18; `useDebounced` 20-35; `normalizePrevCandidate` 37-42; `ExerciseLog` 44-462; `areEqual` 464-477; `export default` 479; `styles` 481-526.

Step 0 (dead code, B7): remove 16, 59-62, 211 + unwrap `withLayout`, 494-505, destructured `muscle`/`showOptionsTriggerIcon`, `itemKey` at 435. About -25 lines.

Step 1 (low risk) `Tracking/ExerciseLog.styles.js`
- Moves: `styles` 481-526 (without `optionsButton`).
- New file imports: `StyleSheet` (react-native), `scaleSize`, `theme` (needed for `theme.addSetBg`, line 520). `export default styles`.
- `ExerciseLog.js` then: `import styles from "./ExerciseLog.styles";`, drop `StyleSheet` from the RN import; keep `theme` (used at 419) and `scaleSize` (180-192, 405, 418).

Step 2 (low risk) `Tracking/useDebounced.js`
- Moves: 20-35 verbatim (including the `// simple debounce` comment). Imports `useRef, useEffect, useCallback`. Export the hook (default or named).
- Single user: `ExerciseLog.js:85`.

After steps 0-2 the file is about 430 lines: component + `areEqual` + two constants + `normalizePrevCandidate` (or its shared import, C2).

Step 3 (OPTIONAL, medium risk) `Tracking/useExerciseSetsDraft.js` — custom hook owning the draft and its mutations
- Signature: `useExerciseSetsDraft({ name, sets, readOnly, exerciseIndex, updateSets, syncColumnOnEdit, fallbackPreviousSets })` returning `{ draft, previousSets, addSet, updateSetById, deleteSetById, toggleIsDoneById }`.
- Moves (in this order, verbatim): constants 17-18; `normalizePrevCandidate` 37-42; 64-116 (draft state, `setsRef`, parent refresh effect, debounced sync, rAF flush, unmount flush); 130-156 (`normalizedFallbackPrev`, `previousSets`); 163 (`autoPrefilledIdsRef`); 172-174 (reset effect); 215 (`genLocalId`); 217-240 (`addSet`); 242-291 (auto-prefill effect); 293-327 (`updateSetById`); 329-335 (`deleteSetById`); 337-363 (attach-prev effect); 365-381 (`toggleIsDoneById`). `Haptics` import moves with `addSet`/`toggleIsDoneById`.
- Stays: `handleReplaceExercise` / `handleDeleteExercise` / `handleViewExercise` 118-128; panel state 159-162 and `togglePanel` 176-207; `exerciseWeighting` / `weightIcon` 165-170; `displayNumbers` 383; JSX 385-461; `areEqual`.
- Blockers: the ranges are not contiguous (six `sed -n` slices must be concatenated in source order); the relative ORDER of the seven effects must be preserved exactly (67, 70-82, the two inside `useDebounced`, 112-116, 172-174, 242-291, 337-363): in particular the reset effect (172) must stay before the auto-prefill effect (242), and the unmount flush (112) must stay registered after `useDebounced`'s own cleanup effect; `previousSets` is needed both by the moved effects and by the JSX (437). No mutable module state. Recommendation: skip unless the plan wants ExerciseLog well under 300 lines; steps 0-2 already satisfy the size goal.

### D2. Group/useGroupViewing.js (489 lines) — optional
- `Group/groupParticipantUtils.js` <- 17-62 verbatim: `ensureString` (17), `sanitizeParticipant` (18-24), `mergeParticipants` (26-46), `areParticipantListsEqual` (48-62). Pure, no closures, no imports. Clean.
- The hook body (72-488) must NOT be split: every effect shares `wid/meUid/viewingUid/enabled`, four refs and five pieces of state, and the declaration order of state (299-303 come after earlier effects) and effects is load-bearing (H8).

### D3. Tracking/StatKeyboardContext.js (446 lines) — optional
- `Tracking/StatKeyboardOverlay.js` <- `StatKeyboardOverlay` 32-154 and the whole `styles` object 343-445 (the provider uses no key of `styles`; its only style is the inline `{ flex: 1 }` at 319). New file imports: `React, { useEffect, useRef, useState }`, `View, StyleSheet, TouchableOpacity, Text, Animated, Easing`, `MaterialCommunityIcons`, `scaleSize`, `theme`, `useStableSafeAreaInsets`. Default export the overlay.
- Stays in `StatKeyboardContext.js`: context creation (9), the module-level `externalCollapseKeyboard` / `externalIsKeyboardActive` and the two exported functions (11-26), `useStatKeyboard` (28), `MAX_REGISTERED` (30), `StatKeyboardProvider` (156-341). Remaining imports: react hooks + `View`.
- Blockers: none (the overlay has no access to the context or the module state). The module-level mutable state must stay in the same module as the provider.

### D4. Other files (all under 400 lines) — optional seams, only if wanted
- `EditableStat.js`: pure helpers 10-92 (`MAX_DIGITS`, `MAX_DECIMAL_PLACES`, `MAX_WHOLE_VALUE`, `sanitizeValue`, `genInputId`, `getDecimalPlaces`, `computeStepMeta`, `formatValueFromInt`) -> `Tracking/editableStatUtils.js`. Clean, pure.
- `SetRow.js`: helpers 14-50 and 367-395 move only as part of C1/C3.
- `ConfirmWorkoutModal.js`, `GroupHeader.js`, `GroupMenu.js`, `GroupModal.js`: leave as single files.

---

## E. Latent bugs with minimal fixes

**E1. `useGroupViewing.js:189` — unhandled promise rejection in presence clean-up.** `try { deleteDoc(...); } catch { }` cannot catch the asynchronous rejection (permission denied, offline). The comment says "best-effort clean-up". Minimal fix: `deleteDoc(doc(...)).catch(() => {});` inside the same `try`. Compare `frontend/logic/useWorkoutManager.js:776`, which awaits inside try/catch. Confidence: medium (intent is explicit; effect of the fix is only that an unhandled-rejection warning disappears).

**E2. `ExerciseLog.js:464-477` — `areEqual` ignores `exerciseIndex`.** `exerciseIndex` is captured by the debounced sync (86), `handleReplaceExercise` (119), `handleDeleteExercise` (123), `handleViewExercise` (127) and `onFocusInput` (445). In the FlashList paths (AWM:1610-1624, SWM:310) the key extractor is `${name}-${index}`, so after an exercise above is deleted the surviving items get new keys and a retained/recycled `ExerciseLog` instance can receive the same `name` and the same `sets` reference with a different `exerciseIndex`; `areEqual` returns true, the component does not re-render, and the next edit calls `updateSets(oldIndex, ...)` (writes the sets into the wrong exercise) or replace/delete acts on the wrong row. Minimal fix: add `prev.exerciseIndex === next.exerciseIndex &&` to `areEqual`. Confidence: medium that it is reachable (depends on recycler key reuse); high that the comparison is missing. The fix only adds re-renders. If the implementer does not want to take it under rule 2, record it as an open question.

**E3. `ExerciseLog.js:503` — invalid style key `mart: scaleSize(4)`** (typo for a margin) inside the unused `styles.optionsButton`. Fix: delete the unused style (B7). Confidence: high.

**E4. `SetRow.js:159, 166, 102` — props/params that do not exist in react-native-swipeable-item 2.0.9** (`itemKey`, `onSwipeableLeftOpen`, `params.ref`). They are silent no-ops; "swipe fully to delete" does not work and the row is not closed before deletion. Do NOT make them work (behaviour change). Remove as dead (B8) and ask (I1). Confidence: high (library source checked, no patch).

**E5. `StatKeyboardContext.js:238-241, 331-333` — looks for a `blur` handler that inputs never register** (they register `forceBlur`). The calls never happen. Do not rename (calling `forceBlur` there would change the blur/clear handshake). Remove as dead (B10) or ask (I3). Confidence: high that it is a no-op.

**E6. `useGroupViewing.js:103` — `joinedOnceRef` is never reset when `wid` changes**, unlike the three caches reset at 108-112. If the same hook instance is re-used for another workout id, auto-join is not attempted again. Intent unclear (the ref may deliberately prevent re-joining after leaving). No fix; open question I7. Confidence: low.

**E7. `GroupMenu.js:40` — `{!!participant?.name && participant?.handle && (...)}`** evaluates to `""` when `name` is set and `handle` is empty; under React 18.2 an empty string child is ignored (no "text outside <Text>" error), and `name` is never set by the data source (B2). No fix needed. Confidence: high that it is harmless.

**E8. `SetRow.js:238-241` with `ExerciseLog.js:370`** — the optimistic `setDoneLocal(nextState)` is not rolled back if `toggleIsDoneById` returns early for a NaN weight/reps. Unreachable in practice: `EditableStat.sanitizeValue` only produces `""` or numeric strings. No fix.

No conditional hooks, no references to undefined names, no duplicate object keys were found in the partition (the lint run reports 0 errors).

---

## F. Best-practice issues worth fixing

| # | Where | Issue | Fix | Risk |
|---|---|---|---|---|
| F1 | `ExerciseLog.js:59-62` | Side effect (`UIManager` call) in the render body, on every render. | Delete (redundant with `SetRow.js:55-57`, B7). | Low. |
| F2 | `GroupMenu.js:89` | Component defined during render: `ItemSeparatorComponent={() => <View .../>}` gives FlatList a new component type on each render (separators remount). | Hoist `const ParticipantSeparator = () => <View style={styles.menuHairline} />;` to module scope (it reads `styles` at call time, so the later `const styles` is fine) and pass the reference. | Low. |
| F3 | `GroupModal.js:24-36` | Pure helpers `toMillis` / `bestTimestamp` re-created on every render; causes the exhaustive-deps warning at 103. | Move lines 24-36 verbatim to module scope (above the component; keep the "Recency helper" comment). Do not touch the dependency array. | Low. |
| F4 | `useGroupViewing.js:2-14` | Two imports from `firebase/firestore`. | Merge (B5). | None. |
| F5 | `StatKeyboardContext.js:189-192` | Useless return; unnecessary stable dependency. | B10. | None / low. |
| F6 | `GroupHeader.js:84` | `withHaptics` is a pure function re-created per render inside the component. | Optional: move the line verbatim to module scope. | Low. |
| F7 | `ExerciseOptionsPanel.js:27`, `SetTypePanel.js:41` | exhaustive-deps warnings for `opacity` / `scale` (stable `useRef(...).current` values). | Leave (rule: never change a dependency array to silence a warning). | n/a |
| F8 | `useGroupViewing.js:456` | exhaustive-deps "unnecessary dependency". | Disappears with the removal of `friendDoneDerived` (B5). | None. |
| F9 | Import hygiene | `ExerciseLog.js:2-15`: constants start on the line after the last import with no blank line; local imports interleaved with third-party (7-9 vs 11-15). `GroupModalBottomSheet.js:6-8`, `ExerciseOptionsPanel.js:6-8`, `SetTypePanel.js:6-8`, `ConfirmWorkoutModal.js:6-7`: fine but ungrouped. After B-removals drop: `Dimensions` (`GroupMenu.js:3`), `LayoutAnimation, Platform, UIManager` (`ExerciseLog.js:3`), `LayoutAnimation` (`SetRow.js:2`), `useMemo` (`ConfirmWorkoutModal.js:1`), possibly `Animated` (`ExerciseLog.js:3`) and `StyleSheet` (if styles move). | Only edit import lines that change anyway (rule 6). | None. |
| F10 | `StatKeyboardContext.js:213` | The 40 ms `pendingClearTimeoutRef` timer is not cleared on provider unmount. | Leave: children's unmount cleanups run after the provider's and re-arm the timer anyway; after unmount the callback is a harmless no-op (`setActiveId(null)` on an unmounted component). | n/a |
| F11 | `StatKeyboardContext.js:49-60` | The `Animated.timing` is not stopped in a cleanup. | Leave: the completion callback checks `finished`; stopping would alter timing. | n/a |
| F12 | `useGroupViewing.js:118, 250` | `onSnapshot` without an error callback. | Leave (adding one changes logging behaviour). Mention to owner if wanted. | n/a |
| F13 | Stale header comments | `GroupHeader.js:1`, `GroupMenu.js:1`, `GroupModal.js:1`, `GroupModalBottomSheet.js:1` name a path/extension that does not exist. | Delete the four lines. | None. |

---

## G. Cross-partition requests

**G1. Callers of `ExerciseLog` (AWM, SWM, EWM).** Stop passing the two props the component ignores, so they can also leave `areEqual` (469, 471):
- `muscle={...}`: AWM:1067, AWM:1592, SWM:261, EWM:259.
- `showOptionsTriggerIcon`: AWM:1075, AWM:1600, EWM:266.
- SWM:265-266, 268 pass `deleteExercise={undefined} replaceExercise={undefined} onStatFocus={undefined}`: explicit `undefined` props, removable.
If the callers are not changed, this partition only removes the two names from the destructuring (still behaviour-preserving) and leaves `areEqual` alone.

**G2. `frontend/components/1_Feed/PastWorkoutExerciseLog.js`.** Import `normalizePrev` (C1) and `typePillBg` / `typePillText` (C3) from the new shared modules instead of its local copies at 11-17 and 363-390. Its `buildPreviousDisplay` stays local (C4).

**G3. `frontend/components/3_Workout/NewWorkout/hooks/useWorkoutEditing.js:8-14`.** Its `normalizePrev` is identical to `ExerciseLog.normalizePrevCandidate` (C2); import the shared keep-zero variant.

**G4. AWM:83 `toUidString`.** Identical to `ensureString` (C7); optional import from `Group/groupParticipantUtils.js` if D2 is done.

**G5. `frontend/screens/ProfileWorkoutsAndPostsScreen.js:39-45`.** `toMillis` identical to `GroupModal.js:24-30` (C8); optional shared `toMillisOrUndefined` (e.g. in `frontend/utils/date.js` next to the 0-returning `toMillis`).

**G6. Android LayoutAnimation enable (C11).** Seven scattered idempotent calls. This partition will drop the in-render copy in `ExerciseLog.js`. The `SetRow.js:55-57` module-level copy should be removed only as part of one coordinated decision (e.g. a single call at app bootstrap), not partition by partition: the three LIVE `LayoutAnimation.configureNext` users (AWM:731/739/1327, `MacroTracking.js:431`, `UserStatsModal.js:125`) each enable it themselves today, but if every partition deletes "its redundant copy" independently, none may remain.

**G7. `scaledSize` forwarder policy (C6).** Decide once for all 17 editable files (plus the `ss as scaledSize` alias) so partitions do not diverge.

**G8. SWM:278-279, 284 -> `GroupHeader`.** With `viewingSelf={false}` and no `forceSelfHeader`, `countdown`, `timerRef` and `inActiveGroup` are never read (the timer pill, `TimerDisplay` and the invite label are all on branches SWM disables). Optional clean-up for the SWM owner.

**G9. AWM:1635 `userWorkoutStats={activeStats}` and AWM:930.** `activeStats` from `useGroupViewing` is always `{}` because both callers pass `suppressSelfStream: true` (B5, I6). The AWM owner should know that `SelectExerciseModal` receives an empty object there.

**G10. AWM:1614 / SWM:310 key extractors and E2.** If E2 is not fixed in `areEqual`, the list owners should be aware that index-bearing keys plus the comparator can leave a stale `exerciseIndex`.

**G11. Nothing to request from PARKED or functions/ files.**

---

## H. Fragile areas (leave alone or handle with care)

**H1. Keypad registration order (`EditableStat.js:185-234` + `StatKeyboardContext.js:253-297`).** The context value is re-created whenever `activeId` changes (deps 289-297). That changes `keyboard` for every `EditableStat`, so every registration effect (deps at 234) is torn down and re-run, in React tree order, which rebuilds `orderRef` (260) and thereby the "Next" order. Do not: remove `activeId` from the context value or its deps, split the context into "actions" and "state", change the dependency array at `EditableStat.js:234`, or memoise `keyboard` differently. Removing `sanitizedPrevious` from that array (B6) also changes when a single input re-registers.

**H2. Blur / clear handshake (`StatKeyboardContext.js:165-227`, `EditableStat.js:226-229, 259-269`).** `requestClearActiveInput` defers the clear by 40 ms so that a focus on another input (which calls `setActiveInput` -> `cancelPendingClear`) wins; `forcingBlurRef` suppresses the echo of a programmatic blur. Do not change the delay, the order of `forceBlur` vs `setActiveId(null)`, or the unregister path at 261-267.

**H3. Module-level singletons (`StatKeyboardContext.js:11-26, 299-312`).** Two providers exist (AWM and EWM) and may be mounted at the same time; the last mounted one owns `dismissStatKeyboard` / `isStatKeyboardActive`, and the cleanup resets only if it still owns them. Keep in the provider's module; do not convert to refs or context.

**H4. ExerciseLog draft pipeline (`ExerciseLog.js:64-116, 217-381`).** `setsRef` is updated both synchronously in every mutation and by the effect at 67; edits go through `scheduleSync` (80 ms debounce) while add/delete/toggle/prefill go through `flushNextFrame` (rAF, cancelling a pending one); the unmount effect (112-116) flushes synchronously. The two prefill effects (242-291 and 337-363) both run after the same render and both call `flushNextFrame`; only the later one's payload is flushed, which is correct only because both read and write `setsRef.current`. Do not merge the effects, reorder them, change their deps, or replace the ref writes by state reads.

**H5. Custom comparators (`ExerciseLog.js:464-477`, `SetRow.js:265-281`, `SetTypePanel.js:118-130`).** They deliberately ignore callback identities. `SetRow` therefore keeps stale `onUpdateSetById` / `onDeleteSetById` / `onFocusInput` closures and a possibly stale `set` object (e.g. `set.prev` changes are not compared), and it is correct only because the parent callbacks read `setsRef` and merge by key (`updateSetById`, 293-327: `rowChanged` is computed from the keys of the patch, and `SetRow` sends the whole `{...set, weight}` object as the patch). Do not "simplify" the patches to partial objects, do not wrap `addSet` / `deleteSetById` in `useCallback` with state deps, do not remove the comparators. E2 is the only proposed change.

**H6. Unmount flush in read-only mode (`ExerciseLog.js:112-116`).** It calls `updateSets(exerciseIndex, draft)` even when `readOnly` (the draft then holds a friend's sets). Safety relies on the parent's guard `if (!viewingSelfRef.current) return;` in `useWorkoutEditing.js:65` and on SWM passing a no-op. Do not add or remove a `readOnly` guard here.

**H7. FlashList recycling of `ExerciseLog`.** Local state (`draft`, panel visibility, `autoPrefilledIdsRef`) survives when a cell is re-bound; the refresh rule at 77-81 compares length and ids with an index fallback for id-less sets. Leave the rule as is.

**H8. `useGroupViewing` effect graph (`useGroupViewing.js:96-454`).** Load-bearing details: the members subscription lists `viewingUid` in its deps on purpose (comment 158); the presence publisher's cleanup deletes the live doc on EVERY dependency change and re-publishes after 250 ms; `joinedOnceRef`; the 2 s `blockSnapBackUntilRef` grace plus `waitingFriend` gate both snap-back guards (429-454); `activeCacheRef` + `prefetchParticipantWorkout` (whose identity changes with `viewingUid`); the overlay-PFP effect at 355-361 can overwrite the snapshot's value depending on effect order; state hooks are declared at 299-303 after earlier effects. Do not reorder hooks, change deps, merge the two `usersPublic` readers, or stabilise the `{}` passed to `setActiveStats`.

**H9. `GroupHeader.js:49-74` last-good PFP.** Refs are mutated in effects and read during render (`pfpToShow`), plus `onError` sets a ref without re-rendering. It works because the parent re-renders; do not convert to state or merge the two effects.

**H10. `SetRow.js:285-303` `UnderlayLeft`.** Uses a reanimated worklet (`useAnimatedStyle` over `percentOpen.value`) and `useSwipeableItemParams`, so it must be rendered inside `SwipeableItem`'s underlay. Keep the worklet body byte-for-byte; if the file is ever split, the new file must import `react-native-reanimated` the same way.

**H11. `GroupModalBottomSheet.js:18-24, 42-52`.** Open/close is driven imperatively from an effect; `index={-1}`, `onClose={closeGroupModal}` and the patched `@gorhom/bottom-sheet` (patches/) interact. Leave.

**H12. Popover animations (`ExerciseOptionsPanel.js:17-27`, `SetTypePanel.js:31-41`)**: deps intentionally `[visible]`; `SetTypePanel.onPanelLayout` (43-47) feeds `panelHeight` back into positioning with a 1 px hysteresis. Leave.

**H13. `EditableStat.js` input semantics**: `replaceOnNextInputRef` (first key after focus replaces the value), `valueRef` mirrored by effect 181-183 and written synchronously in `commitValue`, `showSoftInputOnFocus={false}`, `caretHidden`, `selectTextOnFocus`. The no-provider path (`keyboard === null`) is LIVE: SWM renders `ExerciseLog` without a `StatKeyboardProvider`, so `shouldShowAccessory` and `KeyboardDismissAccessory` must stay.

**H14. `ConfirmWorkoutModal.js:183`**: the inner `Pressable` with `onPress={(e) => e.stopPropagation()}` is what stops backdrop presses from closing the dialog when tapping the card. Keep.

**H15. Style values computed at module load**: `GroupHeader.js:217, 220` call `activeWorkoutHighlight()` inside `StyleSheet.create`; `ExerciseOptionsPanel.js:10` reads `Dimensions` once. Moving styles to another file keeps this timing; do not turn them into render-time values.

---

## I. Open questions for the owner

I1. **Swipe-to-delete on a set row.** `SetRow` passes `onSwipeableLeftOpen`, `itemKey` and reads `params.ref`, none of which exist in react-native-swipeable-item 2.0.9. Today a set is deleted only by tapping the trash pill. Was "swipe fully open to delete" intended (it would need the library's `onChange`)? The refactor will remove the no-op props and keep current behaviour.

I2. **"Copy previous" on the custom keypad.** `EditableStat` registers `hasPrevious` / `copyPrevious` and the provider passes `onCopyPrevious`, but the keypad has no such key. Planned feature (keep the plumbing) or abandoned (remove `previousValue`, `sanitizedPrevious`, both handlers and the `SetRow` passes)?

I3. **Keypad "Next".** `focusNext` / `onNext` call `handlers.blur`, but inputs only expose `forceBlur`, so nothing is blurred before focusing the next input. Intended?

I4. **`showOptionsTriggerIcon` / `styles.optionsButton` in `ExerciseLog`.** The options trigger icon no longer exists (the name row is the trigger). Confirm the prop and style can go (callers still pass the prop).

I5. **"View exercise" in the edit screen.** EWM does not pass `viewExercise`, yet `ExerciseOptionsPanel` always shows the "View exercise" row; in the editing modal it only closes the panel.

I6. **`suppressSelfStream` is `true` at both call sites**, so `useGroupViewing` never streams the user's own `statsExercises` and `activeStats` is always `{}` (and AWM:1635 passes that to `SelectExerciseModal`). Is the self-stream path obsolete, or is one caller supposed to pass `false`?

I7. **`joinedOnceRef` is not reset on `wid` change** (`useGroupViewing.js:103`). Deliberate (never re-join after leaving) or an omission next to the cache resets at 108-112?

I8. **`GroupMenu` participant rows** read `name`, `pfp`, `photoURL`, `avatar`, `isVerified`, but the hook only supplies `uid, handle, image, pfpVersion, updatedAt`. Should the hook supply more, or should the menu be trimmed?

I9. **`GroupHeader.onFinish`.** No caller passes it, so the header never shows "Finish" (finishing happens elsewhere in AWM). Confirm the prop, branch and two styles can be removed.

I10. **`ExerciseLog.fadeAnim`** is an `Animated.Value(1)` that nothing animates. Remnant of a removed fade? OK to replace the four `Animated.View`s with `View`?

I11. **Failure logs in `useGroupViewing` (152, 180, 417) use `console.log`.** Keep as is, or switch to `console.warn`?

I12. **Android-only code** (`setLayoutAnimationEnabledExperimental`, `returnKeyType` for android in `EditableStat.js:296`): the repo has no `android/` directory. Keep these branches for a future Android build?
