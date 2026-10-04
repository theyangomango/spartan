# Audit: partition `feed-screen` (15 files, 5034 lines)

All 15 files were read top to bottom. Line numbers are those of the working tree, which is byte-identical to `SPX/baseline` for every file of this partition (checked with `diff -q`).

Two facts that colour everything below:

1. **`const`/`let` are compiled to `var`.** `babel-preset-expo@10.0.2` uses the nested `@react-native/babel-preset@0.73.21`, whose default plugin list always includes `@babel/plugin-transform-block-scoping` (also under the `hermes-stable` profile). I transpiled a probe with that preset: a `const [q] = useState()` read *above* its declaration yields `undefined`, not a ReferenceError. So "used before defined" in a component body is silent, and two places in `1_Feed.js` and one in `useFilteredFeed.js` depend on it (E1, E2, E3).
2. **The Explore screen is registered but unreachable.** `App.js:1586` registers `<RootStack.Screen name="Explore">`; no code navigates to `'Explore'` (the only mention is the commented line `frontend/screens/4.1_ViewProfile.js:301`), there is no linking config. `4_Explore.js`, the four `components/4_Explore/*` files and (outside this partition) `components/1_Feed/Posts/Post.js` + `screens/feed/hooks/FeedFocusContext.js` are LIVE by import graph only. Route names are protected by hard rule 1, so this is an owner question (I3), not a deletion.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `frontend/screens/1_Feed.js` (1950) | Feed screen: post list, collapsing header, create-post FAB menu, calendar, comments/share/likes sheets, delete/edit post, open workout, rank snapshot card | `default Feed` | `frontend/screens/FeedScreen.js:1` (one-line re-export, partition app-shell) -> `frontend/screens/index.js:12` -> `App.js:46,1508` |
| `frontend/helper/useFilteredFeed.js` (858) | Hook: realtime `posts` first page + pagination, live-workout entries from `usersPublic/*`, optimistic posts, AsyncStorage cache | `default useFilteredFeed(followingUsers, pageSize)` | `screens/feed/hooks/usePersonalizedFeed.js:3` only |
| `frontend/screens/feed/hooks/usePersonalizedFeed.js` (186) | Mixes following feed with trending/explore candidates via feedRanking | `default usePersonalizedFeed(followingUsers)` | `1_Feed.js:42` only |
| `frontend/screens/feed/hooks/useFeedUserData.js` (112) | Registers feed setters, `usersPublic/{uid}` listener (writes `global.userData`), header timer, messages nav | `default useFeedUserData({UID, navigation, route, isScreenFocused})` | `1_Feed.js:43` only |
| `frontend/screens/feed/hooks/FeedFocusContext.js` (42) | React context for the old "focused post" feed | `default FeedFocusContext`, `FeedFocusProvider`, `useFeedFocus`, `usePostFocus` | default only: `components/1_Feed/Posts/Post.js:22` (feed-social). No Provider is ever rendered. |
| `frontend/helper/feedRanking.js` (232) | Pure ranking/mixing. **CommonJS** (`module.exports`) because `tests/feedRanking.test.js` `require`s it under plain node | `toMillisSafe, extractPostTopics, buildViewerTopicVector, scoreFeedCandidate, mixRankedFeeds` | `usePersonalizedFeed.js:6-11`, `tests/feedRanking.test.js:2-7` |
| `frontend/helper/feedSignals.js` (119) | Firestore `userSignals` logging/counters + `useFeedSignalStats` hook | `logFeedSignal, incrementUserSignalCounter, bumpAffinityForUser, useFeedSignalStats, default {…}` | `1_Feed.js:63`, `usePersonalizedFeed.js:5`, `components/1_Feed/PostListItem.js:3`, `components/1_Feed/Posts/hooks/usePostFooterInteractions.js:11` |
| `frontend/helper/feedCache.js` (19) | Evict the AsyncStorage feed cache for a uid | `invalidateFeedCacheForUser`, `default {…}` | `1_Feed.js:1949`, `screens/PastWorkoutScreen.js:34`, `components/1_Feed/SimpleFeedPost.js:40` |
| `frontend/screens/Notifications.js` (261) | "Activity" screen shell (filter dropdown) around `NotificationsModal` | `default Notifications` | `screens/index.js:23` -> `App.js:56,1591`; navigated from `1_Feed.js:1080`, `App.js:758,766` |
| `frontend/screens/SearchUsers.js` (272) | Full-screen people search (local filter + `usersPublic` prefix query) | `default SearchUsers` | `screens/index.js:25` -> `App.js:58,1619`; navigated from `components/1_Feed/FeedHeader.js:323` |
| `frontend/screens/4_Explore.js` (398) | Explore grid + expanded list (unreachable route, see top) | `default Explore` | `screens/index.js:16` -> `App.js:48,1586` |
| `frontend/components/4_Explore/ExpandedExploreList.js` (193) | Expanded post list for Explore, uses legacy `Posts/Post` | `default` | `4_Explore.js:17` only |
| `frontend/components/4_Explore/PostPreview.js` (55) | Grid thumbnail | `default memo(PostPreview)` | `4_Explore.js:12` only |
| `frontend/components/4_Explore/SearchBarComponent.js` (244) | Expanding search bar with dropdown | `default` | `4_Explore.js:13` only |
| `frontend/components/4_Explore/UserCard.js` (93) | Row in the search dropdown | `default` | `SearchBarComponent.js:15` only |

---

## B. Verified dead code

Every "unused export" below was grepped repo-wide (`*.js`, excluding node_modules/ios/.git), including PARKED files and `functions/`. Nothing in this partition is used by a PARKED file, so there are no KEEP items.

### frontend/screens/1_Feed.js
| # | Identifier | Kind | Lines | Evidence / action |
|---|---|---|---|---|
| B1 | `handleOpenProgress` | callback never called | 1496-1508, dep entry 1564 | Only other occurrence is inside the dep array of `renderSnapshotCard`. Remove the callback and the dep entry together. Identity impact is nil: it only changes with `navigation`, which `handleOpenLadder` (same dep array) already depends on. |
| B2 | `shareBottomSheetCloseFlag` / `setShareBottomSheetCloseFlag` | state whose setter is never called | 445, prop at 1783 | Constant `false`. `ShareBottomSheet.js:44-48` runs `close()` in an effect keyed on the flag: `[false]` and `[undefined]` are both constant, so dropping the state and the prop keeps the mount-time `close()`. `ExpandedExploreList.js:158` already omits the prop. |
| B3 | `workoutResult` | assigned, never read | 881, 886 | ESLint confirmed. Delete both lines. |
| B4 | `_options = {}` | unused parameter | 962 | `PostListItem.js:65` passes a third argument which Feed ignores. Drop the parameter only. |
| B5 | `styles.createPostMenuIconBadge` | unused StyleSheet key | 1904-1910 | Only `createPostMenuIconBadgeDark` is used (1688, 1716). |
| B6 | duplicate import of `../utils/competitionTabEvents` | duplicate import | 54-55 | Merge into one statement. |
| B7 | `import { invalidateFeedCacheForUser }` at the bottom of the file | misplaced import | 1949 | Used at 887, 912. Works by hoisting; move into the import block. |
| B8 | `workout={activeWorkout}`, `timerRef={headerTimerRef}` | props the receiver ignores | 1408-1409 (+ deps 1419, destructuring 358, 360) | `FeedHeader.js:589-592` destructures them as `_workout`/`_timerRef` with the comment "workout props intentionally ignored" and never reads them. FeedHeader has no other caller. See useFeedUserData below and H7 before removing. |
| B9 | module-level imports listed as hook deps | unnecessary deps | 960 (`deletePost, deleteCompletedWorkout, emitHexagonUpdate, emitUserDataUpdate`) | Harmless. Remove only if the array is being edited anyway. |
| B10 | catch blocks that repeat the try body verbatim | unnecessary code | 1477-1481 (`navigate('NewClip')`), 1493 (`setIsUserStatsBottomSheetVisible(true)`), 1512-1516 (`requestCompetitionTabFocus("exercises")`) | The catch re-runs the same call, so on failure it throws anyway. `requestCompetitionTabFocus` (competitionTabEvents.js:44-53) cannot throw. Optional simplification to a single call; do not touch 1468-1472 (`handleSharePost`), whose catch is a different fallback. |
| B11 | rank-promotion plumbing: effect 406-411, `activeRankPromotion` 417, `handleDismissRankPromotion` 427-430, state 493, `<LevelUpTransition>` 1571-1577, imports 49/51/67 | effectively dead because of bug E1 | - | `activeRankPromotion` is always `null`, so the modal is never visible and the dismiss handler never runs. **Do not remove and do not fix without the owner (I1).** |

Verified as used (do not remove): every import in the file; `toNumber` (1155, 1158, 1211); `getInitialStatsHex` (476); `dayKeyToTimestamp` (1290); all other StyleSheet keys.

### frontend/helper/useFilteredFeed.js
| Identifier | Lines | Evidence / action |
|---|---|---|
| `toStringUid` | 26 | Wrapper that only forwards to `coerceUid`. Used at 97, 145, 388, 544 (`.map(toStringUid)`), 720, 817. Replacing with `coerceUid` is identical (`coerceUid` takes one parameter, so `.map(coerceUid)` is safe). Optional. |
| removal branch of `syncLiveSubscriptions` | 626-647, 700-702; `liveUnsubRef.current.has(uid)` at 653 | Unreachable: `syncLiveSubscriptions()` is called exactly once (705), and `cleanupLiveSubscriptions()` (562) has just emptied `liveUnsubRef` synchronously; nothing between 562 and 705 repopulates it. So `toRemove` is always empty and `changed` is always false. Not "obviously" unreachable: leave it unless the implementer wants the 25 lines; if removed, remove `changed` too. |
| `if (unsubscribeRef.current) {…}` | 557-560 | Never true (the previous cleanup at 764-767 already nulled it). Defensive; leave. |
| `pageSize` parameter | 156 | The only caller passes one argument. Keep (cheap, documents intent). |
| unused callback parameter `value` | 359 | Cosmetic. |

### frontend/screens/feed/hooks/useFeedUserData.js
| Identifier | Lines | Evidence / action |
|---|---|---|
| header timer: `headerTimerRef`, `headerTimerIdRef`, `toMillis`, the interval effect, `millisToHoursMinutesSeconds` import, return field | 15, 16, 18-24, 58-83, 5, 108 | The interval writes a string into a ref every second; the ref is handed to `FeedHeader`, which ignores it (B8). No reader anywhere. Removable with zero observable effect, together with B8. |
| `activeWorkout` state | 12, 49-52, 106 | Consumed only by the ignored `workout` prop and by the timer effect. Removing it also removes a Feed re-render on each `usersPublic` snapshot while a workout is active: see H7. Lines 46-47 (`global.userData = …`) must stay. |

### frontend/screens/feed/hooks/usePersonalizedFeed.js
| Identifier | Lines | Evidence / action |
|---|---|---|
| `trendingLoading` state | 30, 60, 67, 182 | Returned but `1_Feed.js:346-355` does not destructure it; no other reader. Removing it drops two inert re-renders per trending fetch. |
| `suggestedPosts` return field | 181 | No reader; computed on every render. |
| `refreshTrending` return field | 183 | No reader (`fetchTrending` itself is still used by the effect at 71-83). |
| `Array.isArray(filteredFeed?.posts) ? … : []` | 27 | `useFilteredFeed` always returns an array (`useState([])`), so the `[]` branch never runs; this is also what triggers the three exhaustive-deps warnings. Optional: `const followingPosts = filteredFeed.posts;`. |

### frontend/screens/feed/hooks/FeedFocusContext.js
| Identifier | Lines | Evidence |
|---|---|---|
| `FeedFocusProvider` | 17-19 | Zero references outside the file (grep over the whole repo, all file types). |
| `usePostFocus` | 29-39 | Zero references outside the file. |
| `useFeedFocus` | 21-27 | Only used by `usePostFocus`. |
After removing the three, `React` and `useContext` in the import at line 1 become unused. `defaultValue` (3-13) and the default export stay: `Post.js:296` reads the context and, since no Provider exists, always gets `defaultValue`.

### frontend/helper/feedCache.js, feedRanking.js, feedSignals.js
| Identifier | Lines | Evidence / action |
|---|---|---|
| `feedCache.js` default export | 16-18 | All three importers use the named import. Remove. |
| `feedRanking.js` `toMillisSafe` in `module.exports` | 226 | Not imported by `usePersonalizedFeed.js` nor by the test. Remove the export entry only; the function is used at line 78. |
| `feedSignals.js` `export` on `incrementUserSignalCounter` | 41 | Only used at line 61 in the same file. Drop the `export` keyword. |
| `feedSignals.js` default export | 113-118 | All four importers use named imports. Remove. |
| `uidOverride` parameters | feedSignals.js 23, 41 | No caller passes them (6 `logFeedSignal` call sites, 1 internal `incrementUserSignalCounter` call). Optional. |
| `scoreFeedCandidate` options `noveltyPenalty`, `isRecentlyFollowed` | feedRanking.js 122, 129, 137-139 | Passed by no caller (usePersonalizedFeed.js:123-131, 147-152; test 33-43). Leave: ranking formula, see I6. |
| diversity penalty in `mixRankedFeeds` | feedRanking.js 159-160, 179-182, 193-194 | `adjustedScore` is written on a clone and never read; `usedAuthors`/`usedTopics` only feed it. No observable effect on the output. Reads as an unfinished feature: leave, see I6. |

### frontend/screens/4_Explore.js and components/4_Explore/*
| Identifier | File:lines | Evidence / action |
|---|---|---|
| `style={styles.searchBar}` + `styles.searchBar` | 4_Explore.js 246, 332-335 | `SearchBarComponent` (line 26) accepts only `navigation, allUsers, onSearchExpandChange`. |
| `large` parameter/prop, `styles.large` | 4_Explore.js 156, 159; PostPreview.js 8, 13, 47-49 | `renderPostPreview` is always called with two arguments, so `large` is always `false`; the style is an empty object. |
| `if (posts.length < 6) return null;` | 4_Explore.js 165 | The only call site (290) already requires `chunk.length === 6`. |
| `userData` | 4_Explore.js 26, 85 | Passed to `retrieveUserExploreFeed`, which ignores its parameter (`backend/retrieveUserExploreFeed.js:5`). |
| `onSwipeUnfocus={handleBackPress}` | ExpandedExploreList.js 99 | `Post` (Post.js:263-287) has no such prop; grep finds no other occurrence. |
| noise comments | ExpandedExploreList.js 17, 19, 101; SearchBarComponent.js 15, 16, 23 | "Import X", "Ensure this path is correct", "Install lodash if not already installed". |
| `Text` import | SearchBarComponent.js 12 | ESLint confirmed. |
| stale note | SearchBarComponent.js 240 | "Removed noResults… styles as they are no longer used". |
| `scaledSize` wrapper | SearchBarComponent.js 24, UserCard.js 9 | `(size) => scaleSize(size)`; both files also call `scaleSize` directly. Replace usages with `scaleSize` (identical). |
| `screenHeight`, `Dimensions` import | UserCard.js 8, 2 | ESLint confirmed; `Dimensions` then has no user. |
| `styles.iconOutline`, `styles.selectedIcon`, `styles.filledIcon` | UserCard.js 71-80, 81-83, 84-89 | No reference in the file. |

### frontend/screens/Notifications.js
| Identifier | Lines | Action |
|---|---|---|
| second `react-native` import (`TouchableOpacity`) | 16 | Merge into line 2. |
| `styles.headerSpacer` | 189-192 | Unused. |

No tracing `console.log` and no commented-out code exist in this partition (grepped). All `console.warn`/`console.error` calls sit on real failure paths: keep.

---

## C. Duplication

**C1. `sanitizeWorkoutForRoute(workout)`: five definitions, two behaviours.**
- Group A (identical; they differ only in quote style and one blank line, verified with `diff -B`): `frontend/screens/1_Feed.js:274-313`, `frontend/components/2_Competition/UserStats/UserStatsModal.js:35-72`, `frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:101-140`.
- Group B (identical to each other): `frontend/components/2_Competition/sections/ProgressSection.js:462-487`, `frontend/screens/ExerciseDetail.js:873-898`.
- A vs B differ only in the `catch` fallback (when `JSON.stringify` throws): A rebuilds each set (`weight`, `reps`, `unit`, `prev`); B shallow-copies each set and deletes `onComplete`/`onDelete`. Do not merge A with B.
- Canonical home for A: new `frontend/utils/sanitizeWorkoutForRoute.js` (move the `1_Feed.js` body verbatim), imported by the three A files.

**C2. `toNumber(value, fallback = 0)`**: byte-identical bodies at `1_Feed.js:230-233`, `frontend/components/1_Feed/SimpleFeedPost.js:56-59`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:62-65`, `UserStatsExerciseDetailScreen.js:87-90`, `backend/workouts/updateCompletedWorkout.js:9-12`, `backend/workouts/deleteCompletedWorkout.js:7-10` (`functions/shared/rebuildHexagonStats.js:3` is the same but cannot import from outside `functions/`). The single-argument `toNumber` in `utils/workoutSummary.js:1`, `utils/macroRecommendations.js:44`, `helper/countCompletedWorkoutsWithExercise.js:25` are different functions. Canonical home: a small shared util (for example `frontend/utils/number.js`).

**C3. `ensureAtHandle`**: `1_Feed.js:315-320` and `ProfileWorkoutsAndPostsScreen.js:33-37` behave identically for every input. `UserStatsExerciseDetailScreen.js:71-74` strips a leading `@` first and therefore returns `''` for the input `"@"` where the other two return `"@"`: leave that one. (`ensureHandle` in `useFilteredFeed.js:429-446` is unrelated: it takes `(profile, uid)`.)

**C4. `sanitizeEntry`** (JSON round-trip dropping functions, falling back to a shallow copy): inline in `1_Feed.js:1160-1167`, module-level in `ProfileWorkoutsAndPostsScreen.js:67-74` and `UserStatsExerciseDetailScreen.js:92-99`. Identical semantics (only the replacer's parameter name differs). Canonical home: next to C1.

**C5. Rank snapshot.**
- `buildRankSnapshot`: `1_Feed.js:257-272` returns `{entry, index, progress}`; `frontend/utils/userDataEvents.js:86-100` returns `{entry, index}`. Same computation; the Feed version is a superset. userDataEvents could export the superset and Feed import it (its internal callers only read `entry`/`index`).
- `deriveRankFromUserData` (`1_Feed.js:235-255`) repeats lines 237-242 of the same computation and adds the `tier/label/level` aliases; the same alias mapping is inlined again at 379-384.
- "pending quests" count: `1_Feed.js:390-401` (subscriber) and `477-492` (initial state) produce the same value for every input (the initial-state version reaches `null` through its `catch` when `promotionStatuses` is not a Map); `frontend/components/2_Competition/sections/ExercisesSection.js:240-246` has a third copy. Low-priority in-file dedupe.

**C6. `workoutIdentityKey` (`useFilteredFeed.js:63-92`) vs `deriveWorkoutIdentityKey` (`frontend/utils/livePostMeta.js:29-64`): NOT identical, do not merge.** The key-building tail (lines 66-91 vs 37-63) is the same, but `createdMs` differs: useFilteredFeed uses `resolveTimestamp(workout)` (first *truthy, parseable* of `sortKey, created, createdAt, updatedAt, workout.created, …`; ignores plain `{seconds, nanoseconds}` objects); livePostMeta uses `toMillisSafe(created ?? createdAt ?? finishedAt ?? completedAt)` (first *non-nullish* only; understands `{seconds}`; no `sortKey`/`updatedAt`). The two keys are compared with each other at `useFilteredFeed.js:476-477` (`meta.workoutKey`), so the mismatch matters: see I5.

**C7. `FEED_CACHE_PREFIX = 'feed-cache:v2:'`**: `feedCache.js:3` and `useFilteredFeed.js:22`. Identical constant, and the two must stay in sync (one writes the AsyncStorage key, the other removes it). Canonical home: export it from `feedCache.js` and import it in `useFilteredFeed.js`. The value must not change.

**C8. timestamp-to-millis helpers (all differ; leave unless noted).**
- `useFeedUserData.js:18-24` (`toMillis`, pointlessly wrapped in `useCallback`): number / `.toMillis()` / `.seconds` / `new Date()`, fallback 0.
- `frontend/utils/friends.js:4-11` (imported by Feed as `toMillisSafe`, `1_Feed.js:44`): same plus an explicit `Date` branch; returns `NaN` for an invalid `Date` or a `NaN` number.
- `frontend/utils/date.js:6-18`: null to 0, `toMillis` guarded by `typeof === 'function'` and try/catch.
- `feedRanking.js:1-16`: non-finite number to 0, `Date.parse` (not `new Date`). Must stay local anyway: the file is CommonJS and loaded by plain node.
- `SimpleFeedPost.js:61-73`: no `.seconds` branch.
- `livePostMeta.js:1-27`: returns `null`, not 0.
- For the single call in `useFeedUserData.js:66` (input is a number or a Firestore Timestamp, result only tested for truthiness) `utils/date.js` `toMillis` is equivalent; but that code is dead (B, header timer), so prefer deleting it.

**C9. Delete-post flow: `1_Feed.js:803-960` (`handleDeletePost`) vs `SimpleFeedPost.js:1270-1363` (`runDefaultDelete`).** Near-copies, not identical:
- `workoutDeleteIdentifier` (`1_Feed.js:827-864` vs `SimpleFeedPost.js:1124-1160`): same structure but different millis helper (friends `toMillis` understands `{seconds}`, SimpleFeedPost's does not).
- The eight-assignment patch of `global.userData` after `deleteCompletedWorkout` is identical in `1_Feed.js:890-897`, `SimpleFeedPost.js:1292-1299` and `frontend/screens/PastWorkoutScreen.js:778-787`. A helper holding exactly those eight assignments would be semantically identical for all three (the surrounding guards and the emit calls differ and must stay at the call sites).
- The `posts`/`postCount` patch is identical in `1_Feed.js:915-922` and `SimpleFeedPost.js:1318-1325`.
- Alert copy differs ("The workout could not be removed from your history…" vs "The post was deleted, but the workout is still in your history…"): keep both.
- From the Feed, `runDefaultDelete` never runs (`PostListItem.js:85` always passes `onPressDeletePost`).

**C10. PastWorkout route params: `1_Feed.js:1112-1223` (`openViewWorkoutModal`) vs `UserStatsExerciseDetailScreen.js:428-508` (`handleOpenWorkout`).** Lines 1123-1158 match 432-472 apart from `post`/`item`, but the params differ: Feed's `owner.rankTier` chain is shorter (1198 vs 484), `postMeta.pid` falls back to `index` vs `''` (1203 vs 489), Feed adds `isLiveWorkout` (1215), and navigation differs (`navigation.navigate` vs `navigateOneWay`). Not mergeable as is.

**C11. "open a user's profile" idiom** (`rootNav = navigation?.getParent?.('ROOT')`, own profile to `Profile {transition:'slide-from-right'}`, otherwise `ViewProfile {user}`): in this partition `1_Feed.js:1084-1097`, `1_Feed.js:1099-1110`, `SearchBarComponent.js:85-96`, `SearchUsers.js:194-205`; elsewhere `FeedHeader.js:293-305` (adds `transition` to ViewProfile), `FollowListBottomSheet.js:78-90` (Profile without params), `CommentCard.js:73-88`, `PastWorkoutScreen.js:657-…`, `1.2_Chat.js:185-…`, `ProfileWorkoutsAndPostsScreen.js:898-…` (Profile without params), `UserStatsBottomSheet.js:84-…`, `FeedWorkoutViewerSheet.js:251-263`, `5_Profile.js:123,142`. The four in-partition sites are equivalent to each other; the others vary in params. The only piece identical everywhere is the two-line "navigate on ROOT, else on `navigation`" step.

**C12. `remotePrefixQuery`**: `SearchUsers.js:132-156` vs `FeedHeader.js:358-395`. Different: collection `usersPublic` vs `users`, `limit(20)` vs `limit(15)`, FeedHeader filters `blockedByUidList`, SearchUsers swallows errors. Leave. (FeedHeader's copy looks dead: `SearchUsersBar` never sets `visible` to true; see G.)

**C13. In-file JSX duplication.**
- `4_Explore.js:184-194` == `213-223` (bottom row of three) and `172-182` mirrors `201-211`. Leave (unreachable screen).
- `1_Feed.js:1669-1696` vs `1697-1724`: the two create-menu buttons differ only in handler, a11y label, title, subtitle and icon name. If the menu is extracted (D), a local `CreateMenuOption` would remove about 25 lines; optional.
- `1_Feed.js` index guard `!Array.isArray(listData) || index == null || index < 0 || index >= listData.length` repeated at 733, 756, 794, 804, 1113.
- `1_Feed.js:745-753` (`dismissCommentsModal`) and the inline `onDismiss` at 1785-1793 are the same reducer with `"comments"`/`"share"`.

**C14. Day-key helpers (all differ).** `1_Feed.js:111-152` `toDayKeyString` accepts Timestamp-like values (`toDate`, `toMillis`, `{seconds}`); `frontend/screens/MacroTracking.js:104-131` returns `null` for those. `1_Feed.js:87-94` `dateToDayKey` returns `null` for a non-Date; `utils/date.js:3` `toDayKey` throws; `HistoryCalendarModal.js:12-18` `dayKey` returns `''`; `effectiveStatsUser.js:3` falls back to today. Leave all.

---

## D. Decomposition plans

### D1. `frontend/screens/1_Feed.js` (1950 lines)

Top-level layout today: imports 5-67 (+1949); constants 69-77; pure helpers 79-320; component 322-1808; styles 1810-1948.

Proposed modules, in the order they should be extracted (each is a verbatim move plus imports/exports):

1. **`frontend/screens/feed/feedDayKeys.js`** (pure, no imports): `dateToDayKey` 87-94, `dayKeyToTimestamp` 96-109, `toDayKeyString` 111-152, `deriveWorkoutDayKey` 154-184, `buildWorkoutDaySet` 186-207, `getWorkoutDayKeyFromPost` 209-228. Export the four the component uses (`toDayKeyString`, `dayKeyToTimestamp`, `buildWorkoutDaySet`, `getWorkoutDayKeyFromPost`).
2. **`frontend/screens/feed/feedRankUtils.js`** (imports `computeRankProgressFromData` from `shared/rankProgress.js`): `getInitialStatsHex` 79-85, `deriveRankFromUserData` 235-255, `buildRankSnapshot` 257-272.
3. **Shared route helpers** (see C1, C2, C3, C4): `toNumber` 230-233, `sanitizeWorkoutForRoute` 274-313, `ensureAtHandle` 315-320, and the inline `sanitizeEntry` 1160-1167.
4. **`frontend/screens/feed/Feed.styles.js`**: `styles` 1810-1948 together with `SCREEN_WIDTH` 72 and `CREATE_POST_MENU_WIDTH` 73-77 (used only by `styles.createPostMenu`, line 1862). Needs `StyleSheet`, `Dimensions`, `theme`, `scaleSize`. Drop B5 while moving.
5. **`frontend/components/1_Feed/FeedCreatePostMenu.js`** (self-contained component): state 452-453, `createMenuAnim` 461, animation effect 503-524, `closeCreateMenu`/`toggleCreateMenu` 1458-1464, `handleSharePost`/`handleShareClip` 1466-1482, JSX 1628-1754, styles `createPost*` (1833-1920). Props: `navigation`, `bottomInset` (`insets.bottom`). It must return a Fragment containing the backdrop (1628-1637) and the actions wrapper (1639-1754) so both stay direct children of the `SafeAreaView`, in the same sibling position (after the `FlatList`, before `HistoryCalendarModal`), keeping z-order (`zIndex` 2 and 3). Nothing else in Feed reads this state. Side benefit: toggling the menu no longer re-renders the list.
6. **`frontend/screens/feed/hooks/useFeedPostActions.js`** (`{ listData, navigation }` -> `{ handleDeletePost, handleEditPost, openViewWorkoutModal, handleEditWorkout }`): `deletingPostPid` state 449, `handleDeletePost` 803-960, `handleEditPost` 962-1076, `openViewWorkoutModal` 1112-1223, `handleEditWorkout` 1225-1227. No effects inside, so no ordering hazard. Imports: `Alert`, `deletePost`, `deleteCompletedWorkout`, `emitHexagonUpdate`, `emitUserDataUpdate`, `invalidateFeedCacheForUser`, `readDoc`, `isClipPost`, `toMillis as toMillisSafe` from friends, plus the helpers of step 3.
7. **`frontend/screens/feed/hooks/useCollapsibleFeedHeader.js`** (-> `{ headerAnimatedStyle, headerPointerEvents, handleHeaderLayout, showHeader, hideHeader }`): `headerVisibility`/`headerPointerEvents`/`headerMeasuredHeight` 495-497, `isHeaderHiddenRef`/`isAnimatingHeaderRef` 500-501, `animateHeaderVisibility` 567-589, `showHeader`/`hideHeader` 591-601, `handleHeaderLayout` 603-614, `headerHeightForAnimation` 616, `headerAnimatedStyle` 618-635, constant `MIN_HEADER_MEASURE` 71. No effects. `handleListScroll` (637-665) stays in the screen with `lastScrollOffsetRef`/`lastScrollTimeRef` (498-499) because it also writes `persistedFeedOffsetRef` and `global.__feedLastOffset`.
8. **`frontend/screens/feed/hooks/useFeedViewerSnapshot.js`** (-> `{ calendarMarkedDays, currentRank, userStatsHexagon, pendingQuestsCount }`): state 468-492 and the `subscribeUserData` effect 373-404. These four setters are used nowhere else. Call the hook where the effect is today (before line 406) so effect order is unchanged.
9. Optional **`useFeedSheets(listData)`**: state 441-448 (minus B2), 732-801, 1484-1488, the inline `onDismiss` 1785-1793. No effects.

What stays in `1_Feed.js` (about 850 lines): viewer/uid derivation 323-367, mute state and `toggleFeedVideosMuted`, rank-promotion block (B11, untouched), calendar visibility and `handleSelectCalendarDate` 1263-1299, `listData`/`workoutPostIndexByDay` 527-553, the whole scroll controller (`persistedFeedOffsetRef`, `handleListScroll`, effects 667-706, `scrollToTop` 1229-1247, `scrollToPid` 1249-1261, effects 1301-1346), `renderPost`, `headerComponent`, `renderEmptyList`, `renderSnapshotCard`, the JSX.

What blocks cleaner extraction:
- **Hook order hides two bugs (E1, E2).** Any extraction or reordering that places `rankPromotionQueue` or `areFeedVideosMuted` above their first use changes behaviour. Leave lines 406-436 and 454-460/493 where they are unless the owner decides I1/I2.
- **Effect order.** Effects run in declaration order (369, 373, 406, 432, 503, 560, 667, 674, 700, 1238, 1301, 1310, 1329, 1335, 1348). A custom hook's effects run at the hook's call position; call new hooks where their first effect sits today. The scroll effects (667, 674, 1301, 1310, 1329, focus effect 1335) interact through `flatListRef` and timers: do not extract them.
- The cleanup at 700-706 mixes two concerns (persisted offset and `refreshTimeoutRef`): keep as is.
- `renderEmptyList` (1425) calls `renderSnapshotCard()` (declared at 1539) and both are used as FlatList component props: see F3 before touching.
- Lines 465-493 and the JSX children 1580-1805 are mis-indented. Rule 6: do not re-indent in place; indentation may be corrected only for blocks that are moved to a new file.

Extraction risk: **medium** for steps 1-5 and 7 (pure/self-contained), **medium-high** for 6, 8, 9 (dependency arrays must be carried over exactly).

### D2. `frontend/helper/useFilteredFeed.js` (858 lines)

Top-level layout: imports 1-19; constants 21-24; pure helpers 26-154; hook 156-857.

1. **`frontend/helper/filteredFeedUtils.js`** (pure; imports `coerceUid`): `toStringUid` 26, `toStringPid` 28-32, `resolveTimestamp` 34-61, `workoutIdentityKey` 63-92, `normalizePost` 94-122, `cacheReplacer` 124-135, `parseCachedPosts` 137-154. Constants `PAGE_SIZE_DEFAULT`, `FEED_CACHE_LIMIT`, `CACHE_WRITE_DELAY` stay with the hook (used at 156, 211, 231); `FEED_CACHE_PREFIX` comes from `feedCache.js` (C7).
2. **Hoist `ensureHandle` (429-446) and `buildLiveFeedEntry` (448-538)** into the same utils file as plain functions. Both are pure (`buildLiveFeedEntry` only uses `resolveTimestamp`, `workoutIdentityKey`, `ensureHandle`, `Date.now()`), and both are `useCallback`s that never change identity (`ensureHandle` deps `[]`, `buildLiveFeedEntry` deps `[ensureHandle]`). The edit is limited to the first and last line of each (`useCallback((…) => {` -> `(…) => {`, `}, […]);` -> `};`). The body 449-537 is already at module-level indentation.
3. **Reorder inside the hook**: move `recomputeFeed` (302-379) above `updateLiveEntryForUid` (245-279); this fixes E3 with no behaviour change.

What stays: the hook itself, about 590 lines. It is one unit: 20 refs (168-187) are shared between `recomputeFeed`, the optimistic-posts effect (381-411), the live-subscription callbacks (234-300, 413-427), the main effect (540-786) and `loadMore` (788-847). A `useLiveWorkoutEntries` split would need `liveMapRef`, `filtersRef` and `recomputeFeed` passed in both directions: not a clean seam, do not attempt.

Extraction risk: **low** for step 1, **low-medium** for steps 2-3.

---

## E. Latent bugs

| # | Where | Bug | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | `1_Feed.js:417` (state declared at 493) | `activeRankPromotion` reads `rankPromotionQueue` before the `useState` that defines it has run in that render, so it is always `null`. `<LevelUpTransition>` (1571-1577) is never visible on the Feed and `handleDismissRankPromotion` never runs. Verified by transpiling with the project's Babel preset. | Move line 417 below line 493 (or move 493 above 406). **Behaviour-visible**: a level-up modal would start appearing on the Feed, and `ExercisesSection.js:263-368` shows a modal for the same queue, so two modals could stack. Do not apply without the owner (I1). | Diagnosis: high. Fix: needs sign-off. |
| E2 | `1_Feed.js:432-436` (state declared at 454) | The dep array `[areFeedVideosMuted]` is evaluated before the state exists, so it is always `[undefined]`: the effect runs once on mount and `globalThis.__SPARTAN_FEED_GLOBAL_MUTE__` is never updated when the user toggles mute. The initial-state reader at 455-457 therefore always gets `true`. | Move the `useState` at 454-460 above line 413 (or the effect below 460). Behaviour change is limited to the mute choice surviving a Feed remount. Owner question I2. | Diagnosis: high. |
| E3 | `useFilteredFeed.js:279` (callbacks declared at 302 and 448) | Dep array `[buildLiveFeedEntry, recomputeFeed]` evaluates to `[undefined, undefined]`. Works only because both callbacks have a stable identity, so the first-render closure is always valid. | D2 steps 2-3 (declare before use). No behaviour change. | High; safe to apply. |
| E4 | `SearchUsers.js:20` + effect 96-130 | `navStartedAt` falls back to `Date.now()` on every render when `route.params.startedAt` is missing; it is the effect's only dep, so the effect would re-run after every render (refetch loop via `setAllUsers`). Latent: the only caller, `FeedHeader.js:323-328`, always passes `startedAt`. | `const [navStartedAt] = useState(() => Number(route?.params?.startedAt) || Date.now());`. Identical for the existing caller. | Medium-high; optional. |
| E5 | `SearchBarComponent.js:127-134` | `scaleSize(animation.interpolate(…))`: `scaleSize` is `Math.round(n * SCALE_MIN)` (scaleSize.js:21-23), so an Animated node becomes `NaN`; `width` and `marginLeft` are `NaN` instead of animated values. | Remove the outer `scaleSize(…)` (the output ranges are already scaled). Changes rendering of an unreachable screen: leave, I3. | Medium. |
| E6 | `SearchBarComponent.js:69-72` | `allUsers.current.filter` throws while `allUsers.current` is still `null` (before `retreiveAllUsers` resolves or if it fails); `user.handle.toLowerCase()` throws for a user without handle/name. Thrown inside a lodash debounce timer. | `(allUsers.current || [])`, `(user.handle || '')`, `(user.name || '')`. Unreachable screen: optional. | Medium. |
| E7 | `4_Explore.js:91-94` | `initGlobalUsers` has no catch; `backend/retrieveAllUsers.js:4-5` throws when the doc is missing. Unhandled rejection. | Wrap in try/catch. Unreachable screen: optional. | Medium. |
| E8 | `useFeedUserData.js:46-47` | Each `usersPublic/{uid}` snapshot replaces the whole `global.userData` with the public document (`undefined` if the document does not exist), dropping the private fields merged by `initUserFeed.js:88`, `App.js:976`, `useUserDoc.js:101`. | None here: `global.*` contract. Owner question I4. | Diagnosis: high; intent unclear. |

No duplicate object keys and no conditionally called hooks were found in this partition.

---

## F. Best-practice issues

| # | Where | Issue | Risk of fixing |
|---|---|---|---|
| F1 | `1_Feed.js:54-55`, `1949`; `Notifications.js:2,16` | Duplicate / misplaced imports. | None. |
| F2 | `1_Feed.js:417, 436`; `useFilteredFeed.js:279` | Values read before their declaration (see E1-E3). | E3 none; E1/E2 behaviour-visible. |
| F3 | `1_Feed.js:1425-1456` (`renderEmptyList`), `1539-1567` (`renderSnapshotCard`), used at 1594/1596 | Functions passed as `ListEmptyComponent` / `ListHeaderComponent` are rendered by FlatList as component *types*. `renderEmptyList` is re-created on every render, so the empty state (including `FeedSnapshotCard`, which holds state and subscriptions) is unmounted and remounted on every Feed render while the list is empty; the header remounts whenever a dep of `renderSnapshotCard` changes. Passing elements would be the correct form. | Medium: it stops remounts (visible if `FeedSnapshotCard` animates on mount). Leave unless explicitly accepted. |
| F4 | `SearchUsers.js:242` | `ItemSeparatorComponent={() => <View …/>}` defined during render. Hoist to a module-level component. | Very low (stateless view). |
| F5 | `useFeedUserData.js:18-24` | Pure function wrapped in `useCallback` and listed as an effect dep. Hoist to module scope, or delete with the timer (B). | None. |
| F6 | `1_Feed.js:1785-1793` | Inline `onDismiss` defeats `memo(ShareBottomSheet)`; mirror `dismissCommentsModal` with a `useCallback`. | Low. |
| F7 | `SearchBarComponent.js:34-38` | Debounced function never cancelled on unmount. | Low; unreachable screen. |
| F8 | `4_Explore.js:49`, `54-57`, `80-94` | `categories` array rebuilt per render; async initialisers set state without an unmount guard. | Low; unreachable screen. |
| F9 | `1_Feed.js:824` | Inner `const viewerUid` shadows the component-level `viewerUid` (337). Not a bug (both are the same uid, different null form). | Leave. |
| F10 | `usePersonalizedFeed.js:27` | Conditional initialisation feeding three `useMemo`s (lint warning); see B. | None. |
| F11 | `useFilteredFeed.js:772-786`, `4_Explore.js:57,75,151`, `SearchBarComponent.js:43` | exhaustive-deps warnings. Informational; **do not change these arrays**. | - |
| F12 | `1_Feed.js:465-493`, `1580-1805`; `useFilteredFeed.js:448-538` | Wrong indentation. Rule 6: only fix when the block is moved. | None. |
| F13 | `feedRanking.js:225` | CommonJS `module.exports` in an otherwise ESM codebase. Intentional (plain-node test): keep. | - |

---

## G. Cross-partition requests

1. **`frontend/components/1_Feed/FeedHeader.js`** (feed-cards): drop the ignored props `workout`, `openCurrentWorkout`, `timerRef` (589-592) so that Feed can stop passing them (B8) and `useFeedUserData` can drop the timer. Also: `SearchUsersBar` (247-…) never calls `setVisible(true)` (only `setVisible(false)` at 333), so its in-header modal with `localFilter`/`remotePrefixQuery`/`doSearch` (338-415) looks dead; `open()` navigates to `SearchUsers` instead. If that auditor confirms, `SearchUsers.js` holds the only live user search.
2. **`frontend/components/1_Feed/SharePost/ShareBottomSheet.js`** (feed-social): after B2 no caller passes `shareBottomSheetCloseFlag`. If the prop is removed there, the mount-time `bottomSheetRef.current.close()` (44-48) must be kept (deps `[]`).
3. **`frontend/components/1_Feed/Posts/Post.js`** (feed-social): sole importer of `FeedFocusContext`; no Provider exists, so `useContext` (Post.js:289-296) always yields the defaults. Post.js is itself imported only by `ExpandedExploreList.js:15`. Keep the default export of `FeedFocusContext.js` working.
4. **C1**: `UserStatsModal.js:35-72` and `UserStatsExerciseDetailScreen.js:101-140` (user-stats) should import the group-A `sanitizeWorkoutForRoute`; `ProgressSection.js:462` and `ExerciseDetail.js:873` share the group-B variant between themselves only.
5. **C2/C3/C4**: `SimpleFeedPost.js:56`, `ProfileWorkoutsAndPostsScreen.js:33,62,67`, `UserStatsExerciseDetailScreen.js:87,92`, `backend/workouts/updateCompletedWorkout.js:9`, `backend/workouts/deleteCompletedWorkout.js:7` should import the shared `toNumber` / `ensureAtHandle` / `sanitizeEntry`.
6. **C5**: `frontend/utils/userDataEvents.js:86-100` (utils-logic) could export `buildRankSnapshot` returning `{entry, index, progress}` for Feed to import.
7. **C9**: one helper for the eight-assignment `global.userData` patch, used by `1_Feed.js:890-897`, `SimpleFeedPost.js:1292-1299`, `PastWorkoutScreen.js:778-787`.
8. **`frontend/screens/FeedScreen.js`** (app-shell) is a one-line forwarder; `frontend/screens/index.js:12` (auth-onboarding) could import `./1_Feed` directly, after which `FeedScreen.js` can be listed for deletion.
9. **`frontend/helper/getScrollTargetPosition.js:8`** (helpers-hooks): `export default getScrollTargetPosition = (…) =>` assigns to an undeclared identifier (implicit global in sloppy mode). Only importer: `ExpandedExploreList.js:13`.
10. **`backend/retrieveUserExploreFeed.js:5`**: unused `userData` parameter (callers `4_Explore.js:85`, `initUserFeed.js:137`).
11. **`App.js:1586`**: the `Explore` route (I3).

---

## H. Fragile areas

1. **`useFilteredFeed.js` main effect (540-786) and its dep array (772-786).** Firestore listeners, cache hydration racing the first snapshot (`hydrateFromCache` 581-608 vs `recomputeFeed`), `filtersRef`, `serverSyncedRef`, the `JSON.stringify(following)` dep. Do not "fix" exhaustive-deps, do not reorder statements inside the effect, do not change the `setTimeout(…, 0)` at 365 or `CACHE_WRITE_DELAY`.
2. **`useFilteredFeed.js:245-279`** relies on `var` hoisting (E3). Reordering declarations is safe; adding real, changing deps is not (it would re-create `ensureLivePostSubscription` and re-run the main effect).
3. **AsyncStorage key `feed-cache:v2:<uid>`** (`feedCache.js:3,7`; `useFilteredFeed.js:22,190`) and the cached shape produced by `cacheReplacer` (comments cut to 3, likes to 8).
4. **`feedRanking.js`** must stay CommonJS and free of React Native imports (`tests/feedRanking.test.js` runs under plain node). Weights and thresholds are behaviour.
5. **`feedSignals.js`**: Firestore paths `userSignals/{uid}` and `userSignals/{uid}/events`, field path `${metric}.${uid}`, `global.__userSignals`.
6. **`1_Feed.js` FlatList wiring (1587-1626)**: `onViewableItemsChanged` must keep a stable identity (React Native throws if it changes; today `handleViewableItemsChanged` depends only on the stable `listKeyExtractor`), `viewabilityConfigRef`, `maintainVisibleContentPosition`, `extraData`, window sizes.
7. **`useFeedUserData.js:45-56`**: the snapshot overwrites `global.userData` (E8) and `setActiveWorkout` re-renders Feed on every snapshot while a workout is active; Feed re-reads `global.userData.following` during render (`1_Feed.js:336, 365`). Removing the dead `activeWorkout` state changes that re-render cadence. Removing only the timer (58-83) is risk-free.
8. **Scroll restore and scroll-to-top in `1_Feed.js`**: `global.__feedLastOffset` (327, 645, 701, 1232), `global.scrollFeedToTop` (1239-1243; called by `Footer.js:262` and `WorkoutExperiencePortal.js:237`), `global.scrollFeedToTopSignal/Handled` (1337-1340; written by `Footer.js:265-267`), route params `scrollToTop`/`focusPid`/`scrollPid`, the 0/30/50 ms timers.
9. **Header collapse (567-665)**: thresholds (12, 20, -28, 1.2 px/ms) and `useNativeDriver: false` (a `marginBottom` is animated).
10. **`usePersonalizedFeed.js`** intervals (15 s explore poll at 54, 5 min trending at 78) and `global.exploreFeedPosts`.
11. **`Notifications.js:42-52`**: marking notifications read happens in the focus-effect *cleanup* (on blur), on purpose.
12. **`SearchUsers.js`**: the 150 ms post-navigation delay (100) and the 180 ms debounce (185).
13. **`ExpandedExploreList.js:186-191`**: `maskContainer` is a function stored in `StyleSheet.create` and called at 126. Leave.
14. **Navigation contracts**: route names `Notifications`, `SearchUsers`, `Explore`, `PastWorkout`, `PostOptions`, `EditClip`, `NewClip`, `Competition`, `Profile`, `ViewProfile`, `Messages` and their param shapes (`1_Feed.js:1064-1075, 1190-1222`).

---

## I. Open questions for the owner

1. **Level-up modal on the Feed (E1).** It has never been able to show. Options: (a) fix the ordering so it shows (new UI on the Feed; check interplay with the same modal in the Rank tab), or (b) delete the dead plumbing (B11). The refactor leaves it untouched by default.
2. **Feed mute persistence (E2).** Should the mute choice survive a Feed remount (evident intent), or stay "always start muted"?
3. **Explore.** The route is registered but unreachable. Delete `4_Explore.js`, `components/4_Explore/*`, `Posts/Post.js` and its helpers, `FeedFocusContext.js`, `getScrollTargetPosition.js`, `backend/retrieveAllUsers.js`, or park them like Compete? Until then E5-E7 stay unfixed.
4. **`useFeedUserData.js:47`** replaces `global.userData` with the bare public document. Intended, or should it merge?
5. **Live-workout identity keys (C6).** `useFilteredFeed` and `livePostMeta` compute the key differently; when they disagree, likes/comments of a live workout post are dropped (`useFilteredFeed.js:476-498`). Which definition is authoritative?
6. **`feedRanking.js`**: the diversity penalty is computed but never applied, `noveltyPenalty`/`isRecentlyFollowed` are never passed, and `dmCountByUid`/`hidesByUid` are never written by any code in the repo. Unfinished feature to keep, or remove?
7. **`FeedHeader` ignores `workout`/`timerRef`** "so header layout stays static". May the one-second timer and `activeWorkout` state in `useFeedUserData` be deleted?
8. **`SearchUsers.js`** does not filter users who blocked the viewer (`blockedByUidList`), whereas the (apparently dead) search inside `FeedHeader` does. Intended?
9. **Pull-to-refresh (`1_Feed.js:719-730`)** only shows a spinner for 700 ms and reloads nothing (the feed is realtime). Intended?
10. **`handleEditPost` ignores the `{ isClip }` option** sent by `SimpleFeedPost.js:1371` and re-derives it with `isClipPost(latest)`. Intended?
