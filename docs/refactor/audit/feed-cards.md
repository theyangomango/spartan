# Audit: partition "feed-cards" (5 files, 2324 lines)

All line numbers are the files as they are now (identical to SPX/baseline for all five files; verified with `diff -q`).
Files read completely, top to bottom: 5 of 5.

Legend used below
- T1 = unconditionally dead (no input can reach it). Remove.
- T2 = unreachable only because every current call site passes a constant prop. Behaviour-preserving to remove, but it deletes a retired feature mode, so it is gated on an owner answer (section I). Default if no answer: KEEP T2, do T1.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `frontend/components/1_Feed/FeedHeader.js` (974) | Feed top bar: search + streak-calendar buttons (left), feed-scope dropdown (centre), notifications + messages buttons with unread badges (right). Also contains a retired full-screen search overlay (never opens) and private sub-components `Highlighted`, `ProfileCard` (inline), `FeedScopeSelector`, `SearchUsersBar`. | default `memo(FeedHeader)` (:716); named `FocusedFeedHeader` (:718, unused) | `frontend/screens/1_Feed.js:33` (default only; rendered at :1402-1418). Nothing imports `FocusedFeedHeader`. |
| `frontend/components/1_Feed/FeedHeader/ProfileCard.js` (78) | One row (avatar, verified handle, name, chevron) in the user-search results list. | default `memo(ProfileCard)` (:60) | `frontend/screens/SearchUsers.js:6` (rendered at :240). Not imported by FeedHeader.js (which has its own dead inline `ProfileCard`). Unrelated to `frontend/components/ProfileCard.js` (selection row used by ShareModal / CreateGroupChatModal / GroupModal). |
| `frontend/components/1_Feed/FeedLoadingSkeleton.js` (83) | Static grey placeholder cards shown while the feed loads. | default `FeedLoadingSkeleton` (:82) | `frontend/screens/1_Feed.js:61` (rendered at :1422, no props). |
| `frontend/components/1_Feed/FeedSnapshotCard.js` (1093) | Rank card (tier-tinted gradient, particle burst, pulsing emblem, OVR chip, "N quests to next rank" footer). Also holds the six rank tier theme objects, and a retired tab row / "Your Body" bodygraph card / placeholder card. | default `FeedSnapshotCard` (:269); named `RANK_TIER_THEMES` (:238) | default: `frontend/screens/1_Feed.js:58` (:1542), `frontend/components/2_Competition/LevelUpTransition.js:8` (:320, :347), `frontend/components/2_Competition/sections/ExercisesSection.js:10` (:435). `RANK_TIER_THEMES`: `frontend/components/5_Profile/ProfileTop/ProfileRankBadge.js:5`, `frontend/components/2_Competition/LevelUpTransition.js:7`, PARKED `frontend/components/2_Competition/Podium.js:9`, PARKED `frontend/components/2_Competition/LeaderboardCard.js:10`, DEAD `RankTierMiniBadge.js:5` (does not count). |
| `frontend/components/1_Feed/PostListItem.js` (96) | Memoised adapter between the Feed FlatList and `SimpleFeedPost`: turns index-based screen handlers into stable per-row callbacks, logs the `profile_tap` feed signal. | default `PostListItem` (:95) | `frontend/screens/1_Feed.js:32` (rendered at :1382-1398). |

Path note: `1_Feed/FeedHeader.js` and the directory `1_Feed/FeedHeader/` coexist. `import ".../1_Feed/FeedHeader"` resolves to the file. Never add `FeedHeader/index.js` (it would make the specifier ambiguous for tools; knip already mis-analysed this file: it did not report `FocusedFeedHeader`).

---

## B. Verified dead code

### B.1 FeedHeader.js: T1 (unconditional)

Root fact: inside `SearchUsersBar`, `setVisible` is called exactly once, with `false` (:333). Nothing ever sets `visible` to true (`open()` at :317-330 navigates to the `SearchUsers` route instead). RN 0.73 `Modal.render` returns `null` unless `visible === true` (`node_modules/react-native/Libraries/Modal/Modal.js:222`), so the overlay's children never mount. Everything reachable only through that overlay is dead. Second root fact: `ref={iconRef}` (:446) is attached to `RNBounceable`, a class component (`node_modules/@freakycoder/react-native-bounceable/build/dist/RNBounceable.js`) with no `measureInWindow`, so `measureAnchor` (:309-315) is a no-op and `anchor` never changes.

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `FocusedFeedHeader` | named export (component) | :718-728 | `grep -rn FocusedFeedHeader` over the whole repo (all file types, excluding node_modules/ios): only the definition. Not used by PARKED/TOOLING/functions. |
| `BASE_BACK_HEADER_HEIGHT`, `FOCUSED_HEADER_OFFSET`, `FOCUSED_BACK_HEADER_HEIGHT` | module consts | :61-63 | Only used by styles `back_header`/`focused_header` (:752, :758, :759), which only `FocusedFeedHeader` uses. |
| styles `back_header`, `focused_header` | StyleSheet keys | :744-755, :757-760 | Only :720-721 (`FocusedFeedHeader`). |
| `useDebounce` | hook | :65-72 | Only caller is `doSearch` (:397), dead. |
| `Highlighted` | component | :74-107 | Only used by inline `ProfileCard` (:139, :146), dead. |
| `ProfileCard` (inline, `React.memo`) | component | :109-158 | Only rendered at :535 and :556, both inside the never-visible Modal. |
| `insets` | hook result | :248 | Only read at :568 (inside Modal). |
| `visible` / `setVisible` | state | :249 | Constant `false`. Reads: :290, :419, :446 (x2), :461. |
| `modalKey` / `setModalKey` | state | :250 | Setter never called (ESLint). Read only at :460 (Modal key). |
| `qStr` / `setQStr` | state | :251 | Setters only at :334, :504, :513 (all inside Modal / `close`). Constant `""`. |
| `results` / `setResults` | state | :252 | Setters only in `close`/`doSearch`/Modal. Constant `[]`. |
| `navigating` / `setNavigating` | state | :253 | Setter never called (ESLint). Constant `false`; read only in Modal (:467, :469, :477). |
| `usersCacheTick` / `setUsersCacheTick` | state | :254 | Only incremented at :436 inside the prime effect, which returns at :419 because `visible` is false. Constant `0`. Its only read is the dep array at :287: replace `[usersCacheTick]` with `[]` (same memo lifetime: computed once per mount). |
| `isSearchActive` | derived const | :290 | Read only at :484 (Modal). |
| `navigateToUser` | useCallback | :292-305 | Used only at :535, :556 (Modal). |
| `iconRef`, `anchor`/`setAnchor`, `measureAnchor` | ref, state, callback | :307-315 | `measureAnchor` is a no-op (see root fact 2); `anchor` read only at :490-491, :568 (Modal). |
| `close` | useCallback | :332-336 | Used only at :465, :468, :516 (Modal). |
| `localFilter` | function | :338-356 | Called only by `doSearch` (:402). |
| `remotePrefixQuery` | function | :358-395 | Called only by `doSearch` (:408). (This is the jscpd clone of `SearchUsers.js:138-144`; see C.2.) |
| `doSearch` | debounced fn | :397-415 | Called only at :505 (Modal input). |
| "prime" effect | useEffect | :417-440 | First statement `if (!visible) return;` always returns. |
| `disabled` prop of `SearchUsersBar` | prop | :247, :318, :330 (dep), :442 | `SearchUsersBar` is module-private; its only call site (:640) never passes `disabled`. `if (disabled) return;` (:318) and the early return (:442) cannot run. |
| style `left_placeholder` | StyleSheet key | :885 | Only :442. |
| Search overlay `<Modal>` | JSX | :459-574 (plus blank :458) | `visible` is constant false. |
| On the search button (:446): `visible && { opacity: 0 }`, `ref={iconRef}`, `onLayout={measureAnchor}`, `pointerEvents={visible ? 'none' : 'auto'}` | props | :446 | Reduce to `style={styles.searchIconBtn}` and drop the other three. `[styles.searchIconBtn, false]` flattens to the same style; `pointerEvents="auto"` is the View default; the ref/onLayout pair does nothing. |
| styles `modalContainer`, `canvasFill`, `modalContent`, `overlayBar`, `overlayBarSearching`, `overlayInputWrap`, `overlayInput`, `clearBtn`, `resultsWrap`, `listContent`, `separatorFull`, `sectionTitle`, `noResultsWrap`, `noResultsText`, `profileCard`, `profileLeft`, `avatarRing`, `cardHandle`, `cardHandleHighlight`, `cardName`, `cardNameHighlight` | StyleSheet keys | :887, :888, :891, :895, :896, :902-923, :924, :925, :927, :928, :929, :931, :933-943, :944, :946, :947, :949, :951, :952, :953, :954 | Each is referenced only inside the Modal (:467-572) or the inline `ProfileCard` (:117-150). Verified with a defined-vs-used script over the file. Remove the attached comments too (:889-890, :893-894, :897-899, :948). |
| `METRICS.iconTop`, `METRICS.iconBox` | object fields + locals | :55, :56, :58 | Read only at :492, :568, :895 (all dead). Drop the two locals and the two names in the returned object. |
| `workout: _workout`, `openCurrentWorkout: _openCurrentWorkout`, `timerRef: _timerRef` | ignored props of `FeedHeader` | :589-592 | Destructured and never used (ESLint); there is no rest spread, so the destructuring has no effect. Delete lines :589-592. The caller still passes `workout` and `timerRef` (G.1); React ignores unknown props on a function component, so this file can be cleaned independently. |
| Imports that become unused after the above | imports | `useRef` (:2), `FlatList` (:9), `KeyboardAvoidingView` (:12), `SafeAreaView` (:15), `usePfp` (:18), `resolvePhotoURL` (:19), `getDocs`, `orderBy`, `limit` (:24), `useSafeAreaInsets` (:25), `DismissableTextInput` (:29), `isThisUser` (:30) | Each has no remaining reference once the items above go. Still needed: `memo, useEffect, useState, useCallback, useMemo`, `StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal, TouchableWithoutFeedback, Platform`, `FastImage`, `Ionicons, MaterialIcons, FontAwesome6`, `RNBounceable`, `Svg, Path`, `getFeedHeaderStyles`, `db`, `collection, query, where, onSnapshot, doc`, `theme`, `scaleSize, ts`, `withStrongPress, hapticStrong`, `coerceUid, ensureUidArray`, `useSuggestedUsersList`. Run lint to confirm. |
| Stale comments | comments | :1 (`// components/1_Feed/FeedHeader.jsx`, wrong extension), :33 (`// Single root navigator; ...`) | Stale notes (rule 7). |

What stays in `SearchUsersBar` after T1 (for orientation): signature without `disabled` (:247), `useSuggestedUsersList()` (:255), `curatedSuggestions` (:257-271), `fallbackSuggestions` (:273-287, deps `[]`), `suggestions` (:289), `open` (:317-330 minus :318, deps `[navigation, suggestions, allUsersRef]`), and the fragment with the two buttons (:444-457, :575-577).

Approximate removal: 475 lines (974 -> about 500).

### B.2 FeedHeader.js: T2 (unreachable with the only caller, `1_Feed.js:1402-1418`)

The caller passes `centerVariant="text"` and `onChangeFeedScope={setFeedScope}` (a `useState` setter, `1_Feed.js:345`, always a function).

| Identifier | Location | Evidence |
|---|---|---|
| Logo branch of the centre slot | :645-658 | Needs `centerVariant === "logo"`; caller passes `"text"`. |
| Plain-title branch | :661-668 | Needs falsy `onChangeFeedScope`; caller always passes a setter. |
| `centerVariant`, `centerTitle`, `centerTextPreset` props; `computedCenterTitle`, `centerTextStyle` | :595-597, :629-630 | Only feed the two branches above. |
| styles `logoWrap`, `titleWrap`, `logo_image_ctnr`, `logo_image`, `logo_text`, `center_title_text_feed`, `center_title_text_workout` (+ comment :781) | :782-806 | Only the two branches. |
| `METRICS.logoPadTop` | :57, :58 | Only `logoWrap` (:782). |
| `FastImage`, `Platform` imports | :16, :13 | After T1, only the logo branch / `logo_text` use them. |
| `frontend/assets/logo_feed_black.png` | asset | Only `require`d at :652. Would become an orphan file (list for owner; do not delete). |

If T2 is done, the centre slot becomes just `<FeedScopeSelector value={feedScope} onSelect={onChangeFeedScope} onScrollToTop={scrollToTop} />`, and `1_Feed.js:1412-1414` should stop passing the three props (G.3). About 45 lines.

### B.3 FeedSnapshotCard.js: T1 (unconditional)

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| Commented-out "leagues" tab config | commented-out code + stale note | :28-34 | Rule 7. |
| `placeholderTitle`, `placeholderSubtitle` on the bodygraph tab | config fields | :25-26 | Read only by `placeholderCopy` (:347-348), which is always null (next row). |
| `placeholderCopy` | derived const | :344-350 | `activeRankTabConfig.key` can only be `"rank"` or `"bodygraph"` (`sanitizeTabKey` :252-256 and `handleRankTabPress` only produce keys present in `RANK_TAB_CONFIG`, which has exactly those two entries), so `!isRankTabActive && !isBodygraphTabActive` is always false. |
| Placeholder card JSX | JSX branch | :663-671 | The `else` of `isBodygraphTabActive ? ... : ...` under `!isRankTabActive`; unreachable for the same reason. Minimal edit: replace `) : ( <View ...>...</View> ))}` (:663-672) with `) : null)}`. |
| styles `rankPlaceholderCard`, `rankPlaceholderTitle`, `rankPlaceholderSubtitle` | StyleSheet keys | :881-885, :886-892, :893-900 | Only :664-668. |
| `NEXT_RANK_TARGET_SCORE` | const | :249 (+ blank :250-251) | Only used by `pointsToNextRank`. |
| `pointsToNextRank` | useMemo | :312-317 | Assigned, never read (ESLint). The footer uses `pointsToNextRankCopy` (:319-323), which stays. |
| `onPressOverall` | prop | :279 | Never read; its only mention is inside the commented-out JSX (:697, :703). `1_Feed.js:1543` still passes it (G.2). |
| Commented-out "Weekly Snapshot" card | commented-out JSX | :674-729 | References names that do not exist in the file (`snapshot`, `metrics`, `RNBounceable`). Rule 7. |
| styles `card`, `headerRow`, `headerLeft`, `headerRight`, `title`, `subtitle`, `workoutCountText`, `metricsRow`, `metricItem`, `metricStandard`, `metricAccent`, `metricDivider`, `metricValue`, `metricValueAccent`, `metricLabel`, `metricLabelAccent` | StyleSheet keys | :1001-1091 | ESLint `no-unused-styles`; confirmed: referenced only from the commented-out block :674-729. |
| `scaled` | forwarding wrapper | :37 | `(value) => scaleSize(value)`; identical to `scaleSize` for every input (single-argument forward). 41 call sites (`scaled(`): 4 live in the component (:389, :395, :593, :607), 1 in the commented block (:684), the rest in styles. Replace mechanically with `scaleSize(` and delete :37. Do this before extracting the styles (section D). |

Approximate removal: 200 lines.

Optional, low value (data fields in the six theme objects :88-236 that nothing live or parked reads; grep over the repo):
- `gradientLocations` (:93, :118, :143, :168, :193, :218): defined only, never read anywhere (the card hard-codes `locations={[0, 0.5, 1]}` at :521).
- `badgeInnerGradient` (:102, :127, :152, :177, :202, :227) and `badgeGemInnerBorderColor` (:108, :133, :158, :183, :208, :233): read only by DEAD `RankTierMiniBadge.js`.
No dynamic access to theme objects exists (no spread / `Object.keys` on them; consumers `RankBadgeEmblem.js:56-64`, `rankBadgeLevelHelpers.js:66-80`, `LevelUpTransition.js:50-51`, `resolveRankTierKey.js:93` read named fields). Safe to delete, but they are design data: I recommend leaving them unless the owner wants the themes trimmed.

### B.4 FeedSnapshotCard.js: T2 (unreachable with all four call sites)

Every call site passes `showRankTabs={false}` and `forceTabKey="rank"` and none passes `onPressBodyCard`, `initialTabKey` or `statsHexagon`:
`1_Feed.js:1542-1554`, `LevelUpTransition.js:320-330` and `:347-357`, `ExercisesSection.js:435-446`.
History: the "Your Rank / Your Body" tab row was live on the Feed until commit 066bcf77 (2026-10-03, "Redesign rank, ladder and profile UI on dark inset cards"), which added `showRankTabs={false} forceTabKey="rank"` and removed `onPressBodyCard={handleOpenProgress}` in `1_Feed.js`. The component-side code was left in place.

Consequences today: `forcedTabKey === "rank"`, `isRankTabActive === true`, `isBodygraphTabActive === false`, `shouldSubscribeToStats === false`.

| Identifier | Location |
|---|---|
| `RANK_TAB_CONFIG` | :17-35 |
| `BODYGRAPH_OUTLINE_COLOR` | :60 |
| `getInitialStatsHexagon`, `shallowEqualHex` | :62-72, :74-86 |
| `sanitizeTabKey` | :252-256 |
| props `showRankTabs`, `onPressBodyCard`, `initialTabKey`, `forceTabKey`, `statsHexagon` | :277, :281-284 |
| `activeRankTab` state, `forcedTabKey`, `resolvedActiveRankTabKey`, `handleRankTabPress`, `activeRankTabConfig`, `isRankTabActive`, `isBodygraphTabActive` | :325-343 |
| `viewerStatsHexagon` state, `statsHexagon`, `shouldSubscribeToStats`, subscribe effect, `overallStatNumber`, `hasOverallStat`, `overallStatDisplay`, `bodygraphFills` | :352-374 |
| `isBodyCardPressable`, `BodyCardWrapper`, `bodyCardWrapperProps` | :474-484 |
| Tab row JSX | :489-514 |
| `!isRankTabActive && styles.rankCardHidden` | :516 |
| Bodygraph card JSX | :612-662 (and :663-672 from T1) |
| styles `rankTabsRow` ... `rankTabTextInactive`, `rankCardHidden`, `bodygraphCard` ... `bodygraphFigureBack` | :742-778, :849-851, :916-1000 |
| imports `useCallback`, `useState` (:1), `subscribeUserData` (:8), `formatHexStat` (:9), `triggerStrongHaptic` (:10), `HumanMuscleOutline` (:11), `HumanMuscleBackOutline` (:12), `buildMuscleFillMap`/`MUSCLE_SEGMENTS` (:15) | become unused |

About 310 lines. Hidden cost of keeping it: on every mount the card still reads `global.userData.statsHexagon` (:352) and runs `buildMuscleFillMap` (:371-374) for a card that is never shown. If T2 is done, the four call sites should drop `showRankTabs`/`forceTabKey` (G.4). See I.1.

### B.5 FeedHeader/ProfileCard.js

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `query` | unused prop | :17 | Never read (ESLint). `SearchUsers.js:240` passes `query={qStr}` (G.5). Remove from the destructuring. |
| `scale` and `s` | no-op helpers | :15, :18 | `scale(375)` is `375/375 === 1`, so `s(n) === Math.round(n)` and `s(44) === 44`. Replace :18-19 with `const avatarSize = 44;` and delete :15. Rendered sizes unchanged (`scaleSize(44 / 2)`, `scaleSize(40)` etc. see the same number). |

All six style keys are used. Nothing else dead.

### B.6 FeedLoadingSkeleton.js

| Identifier | Kind | Location | Evidence |
|---|---|---|---|
| `|| '#262930'`, `|| '#17171c'` | always-truthy fallbacks | :7-8 | `theme.fieldDeep` is `'#262930'` and `theme.surface` is `'#17171cff'` in `frontend/theme/mfpDark.js:8,11` (static object). Optional simplification to `theme.fieldDeep` / `theme.surface`; harmless as is. |
| `count` prop | prop no caller passes | :10 | Only caller (`1_Feed.js:1422`) passes nothing; default 3. Harmless default; keep. |

### B.7 PostListItem.js

No dead code. All 15 props are passed by `1_Feed.js:1382-1398` and all are consumed; every forwarded prop is read by `SimpleFeedPost` (`SimpleFeedPost.js:235-250`). The `typeof x === "function"` guards are defensive and cheap; keep.

### B.8 KEEP (looks removable, is not)

- `RANK_TIER_THEMES` export from `FeedSnapshotCard.js` (:238): PARKED `Podium.js:9` and `LeaderboardCard.js:10` import it from this exact path. KEEP the name importable from `../1_Feed/FeedSnapshotCard` even if the data moves (re-export).
- `sapphire: rubyTheme, saphire: rubyTheme` (:244-245): aliases looked up dynamically by tier key string; KEEP.
- Theme `displayName` / `overallRating` (:90-91 etc.): used as fallbacks (:288, :291; `ProfileRankBadge.js:13`; `resolveRankTierKey.js:93`). KEEP.

---

## C. Duplication

C.1 Inline `ProfileCard` (`FeedHeader.js:109-158`) vs `FeedHeader/ProfileCard.js:17-58`.
Same skeleton (avatar via `resolvePhotoURL` + `usePfp`, chevron), NOT identical: inline uses `Highlighted` + Nunito fonts + `s()` width scaling; the file version uses `VerifiedHandle` + `useUserVerified` + Outfit fonts. The inline one is dead (B.1): delete it, nothing to merge.

C.2 User search logic: `FeedHeader.js:338-415` (`localFilter`, `remotePrefixQuery`, `doSearch`) vs `frontend/screens/SearchUsers.js:77-94, 132-156, 158-191` (jscpd: FeedHeader :375-384 == SearchUsers :138-144).
NOT identical: FeedHeader queries collection `"users"` with `limit(15)` and filters users who blocked the viewer (:341-347, :384, :392), slices 30; SearchUsers queries `"usersPublic"` with `limit(20)`, no blocked-by filter, adds `photoURL`, caps 50. FeedHeader's copy is dead: delete it; SearchUsers.js is the canonical (and only live) implementation. See I.4 about the dropped blocked-by filter.

C.3 Suggestion builders inside `FeedHeader.js`: `curatedSuggestions` (:257-271) and `fallbackSuggestions` (:273-287) are the same 12-line loop over a different source list (variable name `list` vs `source` is the only textual difference). Related but NOT identical: `SearchUsers.js:30-47` and `:49-69` (no blocked-by filter, cap 50, field remap).
Optional: hoist one module-level function in FeedHeader.js and call it from both memos. That is new code rather than a move; low risk, low value. Fine to leave.

C.4 Blocked-by set idiom `new Set(ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy))`:
`FeedHeader.js:258, :274` (live), `:341, :384` (dead); `frontend/screens/1.2_Chat.js:154`; `frontend/screens/1.1_Messages.js:310`; `frontend/screens/4.1_ViewProfile.js:202` (array, no Set); `frontend/helper/useFilteredFeed.js:550` (array); PARKED `LeaderboardsSection.js:1331`; `backend/getUserFeed.js:129` (takes a `userData` parameter, not the global).
Identical expression wherever the source is `global.userData`. Canonical home if deduplicated: `frontend/utils/userRefs.js` (already exports `ensureUidArray`, `getViewerUid`), e.g. a `getViewerBlockedByUids()` returning the array. Cross-partition; only worth doing if the utils owner agrees.

C.5 Width-375 scaler `scale = SCREEN_WIDTH / 375; s = (n) => Math.round(n * scale)`:
`FeedHeader.js:37-38` and `frontend/theme/headerMetrics.js:11-12` are identical. `FeedHeader/ProfileCard.js:15,18` is the degenerate no-op form (B.5). Seven more files define only `scale = screenWidth / 375` (`0.0_SignUp.js:22`, `0.1_LogIn.js:22`, `0.3_UserLogInCredentials.js:12`, `ViewProfileRowButtons.js:13`, `EditProfileModal.js:13`, `PostUploadOptionsScreen.js:30`, `ClipBuilderScreen.js:23`; usage not checked). `scaleSize.js` has no 375-based helper (`hs` is 390-based), so this is NOT the same as any exported helper. Leave, unless a shared `scaleFrom375` is introduced app-wide.

C.6 `METRICS` (`FeedHeader.js:47-59`) vs `buildMetrics` (`frontend/theme/headerMetrics.js:8-46`): same field names, DIFFERENT values (`paddingTop` `s(0)` vs `scaleSize(4)`; `paddingBottom` `s(4)` vs `s(0)`; `centerH` `s(46)` vs `s(40)`). Do not merge. The dead trio `BASE_BACK_HEADER_HEIGHT` etc. (:61-63) mirrors `baseHeaderHeight`/`focusedHeaderOffset`/`focusedHeaderHeight` there (:24-29) and is removed by B.1.

C.7 `scaleSize` pass-through wrappers: `FeedSnapshotCard.js:37` (`scaled`) plus 20 other files (`const scaledSize = (size) => scaleSize(size)` or `const s = (n) => scaleSize(n)`): `components/ProfileCard.js:17`, `5_Profile/ProfileTop/ProfileInfo.js:11`, `ProfileRowButtons.js:9`, `WorkoutStats.js:6`, `5_Profile/MakePost/SelectPhotosScreen.js:15`, `2_Competition/UserStats/UserStatsStyles.js:5`, `HexagonalStats.js:10`, PARKED `2_Competition/SelectExercise/SelectExerciseModal.js:11`, `4_Explore/SearchBarComponent.js:24`, `4_Explore/UserCard.js:9`, PARKED `SelectExerciseModal/styles.js:17`, `3_Workout/NewWorkout/TimerDisplay.js:7`, `SelectExercise/SelectExerciseModal.js:33`, `RestTimerModal.js:21`, `SelectExercise/AnimatedButton.js:6`, `Group/GroupModal.js:14`, `SelectExercise/selectExerciseModalStyles.js:18`, `SelectExercise/ExerciseCard.js:10`, `Group/GroupHeader.js:14`, `Group/GroupMenu.js:13`. All behave identically to `scaleSize`. Repo-wide policy call; within this partition, remove `scaled` (B.3).

C.8 `BODYGRAPH_OUTLINE_COLOR = "#40485c"`: `FeedSnapshotCard.js:60`, `SimpleFeedPost.js:45`, `PastWorkoutScreen.js:39`, `ProgressSection.js:102`. Identical constant. Canonical home: export from `frontend/utils/muscleTierColors.js`. (In this file it is T2.)

C.9 Rank level token extraction: `extractLevelFromLabel` (`FeedSnapshotCard.js:258-267`) vs `extractLevelToken` (`LevelUpTransition.js:21-28`) vs inline `String(rankLabel || "").trim().split(/\s+/).pop()` (`ProfileRankBadge.js:14`).
First two differ only for an empty or whitespace-only string: FeedSnapshotCard returns `null`, LevelUpTransition returns `""`. Both call sites treat the two the same (`||` chain at `LevelUpTransition.js:42-47`; `resolveLevelStage("")` and `resolveLevelStage(null)` both give 1). The third does no roman filtering (but `resolveLevelStage` strips non-`iv` characters itself). Strictly "partly identical": per rule 4 leave both, or, if the ladder owner wants one, make FeedSnapshotCard's version the canonical one in `2_Competition/rankBadgeLevelHelpers.js` (it is safe at LevelUpTransition's call sites).

C.10 Two pressable-wrapper prop objects in `FeedSnapshotCard.js`: `cardWrapperProps` (:465-473) and `bodyCardWrapperProps` (:476-484) differ only in `onPress` and `accessibilityLabel`. The second is T2. Leave.

C.11 Unread badge JSX twice in `FeedHeader.js`: :688-692 and :705-709 (identical except the count variable). Could be a 6-line local `UnreadBadge` component; optional, new code, low value. Leave unless the file is being decomposed anyway.

C.12 Bodygraph front/back figure JSX (`FeedSnapshotCard.js:638-659`) resembles `SimpleFeedPost.js:1536-1556`, `UserStatsProgressPreview.js:1306-1323`, `PastWorkoutScreen.js:1063-1073`, ProgressSection: NOT identical (`width`/`height`/`preserveAspectRatio` and styles differ per site). Do not merge.

C.13 Unread-notifications query (`collection usersPrivate/{uid}/notifications where read == false`): `FeedHeader.js:607-608`, `App.js:1276`, `frontend/helper/resetNewNotifications.js:9`. Three different purposes (badge listener, app-level listener, batch reset). Not a helper candidate; noted only.

---

## D. Decomposition plans

Order of work for both big files: (1) T1 dead-code removal, (2) wrapper removal where listed, (3) extraction by moving line ranges, (4) lint. Line numbers below are for the current file; after step 1 they shift, so extract by identifier, not by number.

### D.1 FeedSnapshotCard.js (1093 lines)

New module `frontend/components/1_Feed/rankTierThemes.js` (pure data, no imports)
- `bronzeTheme` :88-111, `silverTheme` :113-136, `goldTheme` :138-161, `emeraldTheme` :163-186, `rubyTheme` :188-211, `diamondTheme` :213-236, `RANK_TIER_THEMES` :238-247 (already `export const`). Move :88-247 verbatim.
- Add one export for `goldTheme` (the component uses it as a fallback at :295, :301, :302, :379, :595). `RANK_TIER_THEMES.gold` is the same object, but exporting `goldTheme` avoids touching those five lines.
- In FeedSnapshotCard.js: `import { RANK_TIER_THEMES, goldTheme } from "./rankTierThemes";` and `export { RANK_TIER_THEMES };` so PARKED `Podium.js:9` / `LeaderboardCard.js:10` keep working unchanged.
- LIVE importers `ProfileRankBadge.js:5` and `LevelUpTransition.js:7` should then import from the new module (G.6); `ProfileRankBadge` would stop loading the whole card module for a data lookup.

New module `frontend/components/1_Feed/FeedSnapshotCard.styles.js`
- `styles` :734-1092, minus the T1 keys (:881-900, :1001-1091). Imports: `StyleSheet`, `theme`, `scaleSize`. Export `default styles` (the repo's existing convention: `UserStatsStyles.js:539`, `selectExerciseModalStyles.js:262`).
- Precondition: replace `scaled(` with `scaleSize(` first (B.3), otherwise the styles module needs its own copy of the wrapper.

Stays in FeedSnapshotCard.js: `RANK_TAB_CONFIG` :17-35 (T2), animation constants and easing helpers :39-59, `getInitialStatsHexagon` / `shallowEqualHex` :62-86 (T2), `sanitizeTabKey` :252-256 (T2), `extractLevelFromLabel` :258-267, the component :269-732.

Resulting size: about 480 lines with T1 only, about 330 with T2.

Blockers / cautions
- None for the two extractions: themes are plain data, `styles` is referenced only at render time.
- Do NOT extract the animation block (:376-461) into a custom hook unless needed: it is a clean seam on paper (inputs `enableRankAnimations`, `rankTheme`; outputs `particles`, `particleAnimatedValues`, `badgePulseScale`), but it is the fragile part of the file (H.1) and the file is already under the size target without it.
- `RANK_TAB_CONFIG[0].key` is a default parameter value (:282); keep `RANK_TAB_CONFIG` defined in the same module as the component.

### D.2 FeedHeader.js (974 lines; about 500 after T1)

The three components share one `styles` object and three module constants (`dynamicStyles`, `METRICS`, `s`). That is the only coupling; no shared closures or mutable module state.

New module `frontend/components/1_Feed/FeedHeader.styles.js`
- :35-38 (`SCREEN_WIDTH`/`SCREEN_HEIGHT`, `dynamicStyles`, `scale`, `s`), :46-59 (`METRICS`), :730-973 (`styles`, minus dead keys). Keep the declaration order (each constant depends on the previous one and all are evaluated at import).
- Imports: `StyleSheet, Dimensions, Platform`, `getFeedHeaderStyles`, `theme`, `scaleSize, { ts }`.
- Exports: `export { METRICS, dynamicStyles }; export default styles;` (`s` is only used by the styles and by `METRICS` once the dead code is gone.)

New module `frontend/components/1_Feed/FeedHeader/FeedScopeSelector.js`
- `FEED_SCOPE_OPTIONS` :40-44 and `FeedScopeSelector` :160-244.
- Imports: `React, { memo, useCallback, useMemo, useState }`; `View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback`; `Ionicons`; `RNBounceable`; `theme`; `scaleSize`; `withStrongPress, strong as hapticStrong`; `styles` from `"../FeedHeader.styles"`. Relative paths gain one `../`.

New module `frontend/components/1_Feed/FeedHeader/SearchUsersBar.js`
- `SearchUsersBar` :246-577 as pruned by B.1 (about 60 lines).
- Imports: `React, { useCallback, useMemo }`; `Ionicons, FontAwesome6`; `RNBounceable`; `withStrongPress`; `coerceUid, ensureUidArray`; `useSuggestedUsersList`; `styles, { dynamicStyles }` from `"../FeedHeader.styles"`.

Stays in FeedHeader.js: the `FeedHeader` component (:581-714) and `export default memo(FeedHeader)` (:716). Importer `1_Feed.js:33` unchanged.

Blockers / cautions
- Do not create `FeedHeader/index.js` (path ambiguity with `FeedHeader.js`).
- Splitting the single StyleSheet per component (scope* keys :807-869 into the selector file, `searchIconBtn`/`feedFlame*` :956-972 into the search bar file) is possible but means three `StyleSheet.create` calls and an exported `s`; the shared styles module is the lower-risk option.
- The extraction is optional: after T1 the file is about 500 lines, about 330 after T2. If time is short, do B.1 and stop.

---

## E. Latent bugs

E.1 `styles.fixedSearchIcon` is referenced (`FeedHeader.js:568`) but not defined in the StyleSheet (:731-973). Confidence: high (script cross-check of defined vs used keys). It sits inside the never-rendered overlay, so it has no runtime effect. Minimal fix: none needed; it disappears with B.1. Do not invent a style for it.

E.2 The search overlay in `SearchUsersBar` can never open (`FeedHeader.js:249`, `:333`, `:459-574`): there is no `setVisible(true)`. Evident intent: the overlay was replaced by the `SearchUsers` screen (`open()` navigates there, :323). Confidence: high. Fix: delete the overlay (B.1), not re-enable it.

E.3 `measureAnchor` never measures (`FeedHeader.js:307-315`, `:446`): the ref is a class-component instance (`RNBounceable`) with no `measureInWindow`. Confidence: high (library source read). No effect today because `anchor` is only read in the dead overlay. Fix: delete with B.1.

E.4 `fallbackSuggestions` (`FeedHeader.js:273-287`) reads `allUsersRef.current` once per mount (its only dep, `usersCacheTick`, never changes). `allUsersRef` starts as `[]` (`useHeaderSearchUsers.js:14`) and is filled asynchronously by a snapshot listener, so when the header mounts with the screen this memo is `[]` for the life of the header, and `open()` passes `initialSuggestions: []` whenever the curated list is empty. Confidence that this is unintended: medium. NOT a safe fix: recomputing at press time would change what the SearchUsers screen shows on first paint (it has its own fallback chain, `SearchUsers.js:71-75`). Leave as is; see I.3.

E.5 Side effect inside a state updater (`FeedSnapshotCard.js:330-334`): `triggerStrongHaptic()` runs inside the `setActiveRankTab` updater function. Updaters should be pure (React may invoke them twice in StrictMode development). Unreachable today (tab row is never rendered, B.4). No fix; it disappears with T2, otherwise leave.

E.6 Prime effect has no unmount guard and no cleanup (`FeedHeader.js:418-440`), and `useDebounce` (:66-72) never clears its timer on unmount. Both are dead (B.1); delete, do not fix.

E.7 Not a bug, recorded so nobody "fixes" it: `resolvedShowOverall` (`FeedSnapshotCard.js:292`) contains `resolvedOverallRating != null`, which is always true because every theme has `overallRating` (so the chain at :290-291 never yields null). All callers pass `showOverallRating` explicitly, so the theme's sample rating is never displayed. Leave.

No hooks are called conditionally in any of the five files (the early return at `FeedHeader.js:442` comes after all hooks). No duplicate object keys. No references to undefined variables (`no-undef` clean).

---

## F. Best-practice issues

| # | Issue | Location | Risk of fixing |
|---|---|---|---|
| F.1 | Same module imported twice (`react-native-safe-area-context`) | `FeedHeader.js:15`, `:25` | None: both imports are removed by B.1. |
| F.2 | Components defined during render (`ItemSeparatorComponent={() => ...}`) | `FeedHeader.js:537`, `:558` | None: inside the dead overlay, removed by B.1. |
| F.3 | Imports not grouped (third-party and local interleaved) | `FeedHeader.js:15-32` | Low. Regroup when the import block is rewritten for B.1: react, react-native, third-party (`react-native-fast-image`, `@expo/vector-icons`, `@freakycoder/react-native-bounceable`, `react-native-svg`, `firebase/firestore`), then local. Keep `firebase.config` import (it is a real binding here, `db`). |
| F.4 | Anonymous memo components (`memo(({ ... }) => ...)`) have no display name | `FeedHeader.js:161` (`FeedScopeSelector`), `:110` (dead), `:718` (dead) | Low; cosmetic (DevTools name). Optional: `memo(function FeedScopeSelector(...) { ... })` is a pure rename of the function expression. Not required. |
| F.5 | Odd asset path `require("../../../frontend/assets/logo_feed_black.png")` climbs to the repo root and back | `FeedHeader.js:652` | Low. `"../../assets/logo_feed_black.png"` resolves to the same file. Only relevant if the logo branch survives (T2). |
| F.6 | Unnecessary deps `[setActiveRankTab, triggerStrongHaptic]` | `FeedSnapshotCard.js:336` | Do not touch the array just for the warning; it vanishes with T2. |
| F.7 | `exhaustive-deps` warnings: missing `allUsersRef` (`FeedHeader.js:287`), missing `rankTheme.particleColors` (`FeedSnapshotCard.js:407`) | | Leave both. :287 becomes `[]` only because the constant state it listed is deleted (B.1). :407 is intentional: particles are regenerated per tier key, and adding the dep would not change behaviour but is not needed. |
| F.8 | A component file also exports data (`RANK_TIER_THEMES`), which makes four other modules import a 1000-line component module for a constant and defeats Fast Refresh for this file | `FeedSnapshotCard.js:238` | Low; fixed by D.1 with a re-export kept for PARKED importers. |
| F.9 | Forwarding wrapper `scaled`; file mixes `scaled(` and `scaleSize(` | `FeedSnapshotCard.js:37` | Low; mechanical replace (B.3). |
| F.10 | Unused parameter and no-op scale helpers | `FeedHeader/ProfileCard.js:15-19` | None (B.5). |
| F.11 | Mixed quote style on one import line (double quotes in a single-quote file) and a stray blank line | `FeedHeader/ProfileCard.js:8-9` | Leave (rule 6) unless the import block is otherwise edited. |
| F.12 | Redundant `try { hapticStrong(); } catch { }` (the helper already swallows errors, `utils/haptics.js:4-6`) | `FeedHeader.js:174`, `:186` | Leave: defensive try/catch around a native call is explicitly "not unnecessary". |
| F.13 | Snapshot listeners without an error callback | `FeedHeader.js:609`, `:618` | Leave: adding a handler changes logging behaviour on permission errors. Both effects do clean up (:610, :624). |
| F.14 | `memo(ProfileCard)` is defeated by the caller's inline `onPress` and by the unused `query` prop changing per keystroke | `FeedHeader/ProfileCard.js:60`; `SearchUsers.js:240` | Dropping `query` at the call site is safe (G.5). Stabilising `onPress` is a behaviour-neutral optimisation in another partition; not required. |

PostListItem.js and FeedLoadingSkeleton.js: nothing to fix. PostListItem keeps its own 2-space indent and double quotes; ProfileCard.js keeps 2-space indent and single quotes.

---

## G. Cross-partition requests

G.1 `frontend/screens/1_Feed.js` (feed-screen): stop passing `workout={activeWorkout}` (:1408) and `timerRef={headerTimerRef}` (:1409) to `FeedHeader` (the header ignores them, `FeedHeader.js:589-592`), and drop `activeWorkout, headerTimerRef` from the `useMemo` deps at :1419 (they are listed only because of those props). `activeWorkout` and `headerTimerRef` then have no other reference in 1_Feed.js (grep: only :358, :360, :1408-1409, :1419), so they can leave the destructuring at :357-362. Effect: the header element is no longer rebuilt when the active workout changes; rendered output identical.

G.2 `frontend/screens/1_Feed.js` (feed-screen): stop passing `onPressOverall={handleOpenUserStats}` (:1543; the card never reads it) and remove `handleOpenProgress, handleOpenUserStats` from the deps at :1564-1565. `handleOpenUserStats` (:1490-1494) and `handleOpenProgress` (:1496 onward) then have no remaining use in that file (grep: definition plus those lines only). `setIsUserStatsBottomSheetVisible` is still used at :1798.

G.3 Only if T2 for FeedHeader is approved: `frontend/screens/1_Feed.js:1412-1414` drop `centerVariant="text"`, `centerTitle="Feed"`, `centerTextPreset="feed"`.

G.4 Only if T2 for FeedSnapshotCard is approved: drop `showRankTabs={false}` and `forceTabKey="rank"` at `1_Feed.js:1552-1553` (feed-screen), `LevelUpTransition.js:326-327` and `:353-354`, `ExercisesSection.js:439-440` (ladder-and-weight).

G.5 `frontend/screens/SearchUsers.js:240` (feed-screen): drop `query={qStr}` (ProfileCard ignores it; today it only forces every row to re-render per keystroke).

G.6 After D.1: `frontend/components/5_Profile/ProfileTop/ProfileRankBadge.js:5` (profile) and `frontend/components/2_Competition/LevelUpTransition.js:7` (ladder-and-weight) import `RANK_TIER_THEMES` from the new `1_Feed/rankTierThemes` module. LevelUpTransition also has two import lines for the same module (:7-8); after the change only the default import of `FeedSnapshotCard` remains there. PARKED `Podium.js:9` / `LeaderboardCard.js:10` are not edited and keep using the re-export.

G.7 `frontend/utils/muscleTierColors.js` (utils-logic): export `BODYGRAPH_OUTLINE_COLOR = "#40485c"` once; consumers `SimpleFeedPost.js:45` (feed-post), `PastWorkoutScreen.js:39`, `ProgressSection.js:102`, and `FeedSnapshotCard.js:60` if T2 is kept (C.8).

G.8 `frontend/helper/getFeedHeaderStyles.js` (helpers-hooks): the `logoTextFontSize` field (:6, :12, :18, :24) is read nowhere in the repo. Its three consumers read only `iconSize` and `paddingHorizontal` (verified: `FeedHeader.js:48, :54` and later `dynamicStyles.iconSize` uses; `ExpandedExploreList.js:116, :171`; `headerMetrics.js:14, :19`).

G.9 `frontend/hooks/useHeaderSearchUsers.js:8` (helpers-hooks): doc comment says "shared by Feed and Workout screens"; the only user is `1_Feed.js:364`. Stale note.

G.10 Optional, app-wide: a `getViewerBlockedByUids()` in `frontend/utils/userRefs.js` for the idiom in C.4; and a decision on the 21 `scaleSize` pass-through wrappers (C.7).

Files that can be deleted after this partition's cleanup (owner approval needed): none for T1. With T2 on FeedHeader: `frontend/assets/logo_feed_black.png` (no other `require`).

---

## H. Fragile areas

H.1 `FeedSnapshotCard.js:376-461` (particles and badge pulse). Leave byte-for-byte.
- `particles` is built with `Math.random()` inside a `useMemo` keyed on `[enableRankAnimations, rankTheme.key]`; `particleAnimatedValues` is keyed on `particles`; the loop effect is keyed on both. Changing any dep array re-rolls the particles or restarts the loops.
- Each loop is a single `Animated.timing` with a custom easing (`badgePulseEasing` :47, `makeParticleCycleEasing` :51-59) so the native driver runs the whole cycle; the comment at :39-41 explains why. Do not convert to `Animated.sequence`, do not change `useNativeDriver`.
- `badgePulseValue.setValue(0)` runs before the `enableRankAnimations` check (:417-418): order matters for `LevelUpTransition`'s static "previous" card.
- `particles[index]` and `particleAnimatedValues[index]` are parallel arrays.

H.2 `FeedSnapshotCard.js:515-518`: the rank card stays mounted and is hidden with `display: "none"` when another tab is active. If T2 is not done, keep this exactly (it preserves animation state across tab switches).

H.3 `FeedSnapshotCard.js:464`, `:475`: `CardWrapper` / `BodyCardWrapper` pick `TouchableOpacity` or `View` per render from a prop. A caller toggling `onPressCard` between function and undefined would remount the subtree; no caller does. Do not "hoist" these.

H.4 `FeedHeader.js:35-63`: module-level metrics computed once at import from `Dimensions.get("window")`, in dependency order. Many styles apply `scaleSize(s(n))` (two scalers composed, e.g. :779, :785, :811-816, :831-843). That double scaling is the current visual result; do not simplify it.

H.5 `FeedHeader.js:604-625`: two Firestore listeners keyed on `global.userData.uid` read once at mount (`[]` deps). Do not add deps or move them; do not merge with the App.js listener.

H.6 `FeedHeader.js:160-244` (`FeedScopeSelector`): the nested `TouchableWithoutFeedback` without `onPress` (:216) is what stops taps on the card from closing the modal. `handleSelect` calls `closeVisible()` first, then haptic, `onSelect`, `onScrollToTop` in that order (:180-189); keep the order.

H.7 `FeedHeader.js:317-330` (`open`): route name `'SearchUsers'` and params `{ transition: 'fade', initialSuggestions, initialUsers, startedAt }` are a navigation contract read by `SearchUsers.js:18-20`. Keep names, the 50-item slice and the array copy.

H.8 `FeedHeader.js:446`: when pruning the dead props, keep `onPress={withStrongPress(open)}`, `bounceEffectIn={0.5}`, `style` and `accessibilityLabel` exactly.

H.9 `PostListItem.js:22-72`: callback identities and dep arrays are what let `React.memo(SimpleFeedPost)` skip re-renders. `handleEditPost` (:61-66) deliberately accepts `(forcedIndex, forcedItem, options)` because `SimpleFeedPost.js:1371` calls it with `(index, data, { isClip })`. `onPressEditPost` / `onPressEditWorkout` are passed as `undefined` when the screen handler is missing (:86-87) and `SimpleFeedPost.js:1165` uses that to hide the edit entry; do not make them unconditional.

H.10 `FeedSnapshotCard.js:238-247`: `RANK_TIER_THEMES` is indexed with tier strings from Firestore; keep every key, including the `sapphire` / `saphire` aliases, and keep the export reachable from this path (PARKED importers).

---

## I. Open questions for the owner

I.1 FeedSnapshotCard tab row and "Your Body" bodygraph card (B.4, about 310 lines). Hidden by props at all four call sites since commit 066bcf77; the bodygraph now lives in ProgressSection / UserStatsProgressPreview. Delete the mode from the card (and the `showRankTabs` / `forceTabKey` / `onPressBodyCard` / `initialTabKey` / `statsHexagon` props), or keep it for a possible return? Default without an answer: keep.

I.2 FeedHeader logo variant and plain-title variant (B.2, about 45 lines, plus the `logo_feed_black.png` asset). The only caller always uses the feed-scope dropdown. Delete or keep? Default: keep.

I.3 `fallbackSuggestions` in the header (E.4) is effectively always empty. Was it meant to refresh from the users cache when the search button is pressed? The SearchUsers screen has its own fallback, so users see no gap; confirm it can stay as is (or be dropped together with the `initialSuggestions` fallback path).

I.4 The retired overlay filtered out users who have blocked the viewer (`FeedHeader.js:341-347`, `:384-392`); the live `SearchUsers` screen does not (`SearchUsers.js:77-94`, `:132-156`). The header still filters the suggestion list it hands over (:258, :265). Is the missing filter on search results intended? (Belongs to the feed-screen partition; no change proposed here.)

I.5 `RANK_TIER_THEMES.sapphire` and `.saphire` both map to the ruby theme (`FeedSnapshotCard.js:244-245`). Intentional legacy aliases? Kept either way.

I.6 `FeedHeader/ProfileCard.js` accepts `query` but no longer highlights matches (the dead inline card did, via `Highlighted`). Is match highlighting meant to come back? If not, B.5 and G.5 remove the leftover prop.

I.7 Unused theme data fields `gradientLocations`, `badgeInnerGradient`, `badgeGemInnerBorderColor` (B.3, 18 lines): trim, or keep as design reference? Default: keep.

I.8 `PostListItem` always passes `onPressDeletePost` (:85), so `SimpleFeedPost`'s built-in delete fallback (`runDefaultDelete`, `SimpleFeedPost.js:1379-1387`) can never run from the feed. Fine today because `1_Feed.js:1392` always supplies `onDeletePost`; confirm no change wanted.
