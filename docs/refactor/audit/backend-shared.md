# Audit: partition `backend-shared` (39 files, 3510 lines)

Read-only audit. All 39 files were read top to bottom. Line numbers are as in the working tree now (identical to the baseline; no file of this partition is modified in git).
Abbreviations used below: **D** = `backend/workouts/deleteCompletedWorkout.js`, **U** = `backend/workouts/updateCompletedWorkout.js`, **FN** = `functions/shared/rebuildHexagonStats.js` (TOOLING, outside the partition), **CORE** = `shared/hexagon/computeHexagonCore.js`.

Machine findings: every ESLint item, every knip "unused export" and every jscpd clone listed in `findings/backend-shared.md` was checked against the code and by repo-wide grep (imports, re-exports, `require()`, dynamic `import()`, string uses). All are confirmed; verdicts are in sections B, C and E. No PARKED file imports anything from `backend/` or `shared/` (grep over the 16 PARKED files: no hit), so nothing here is "KEEP because of PARKED".

---

## A. Module map

| File | Purpose | Exports | Importers (outside the partition named explicitly) |
|---|---|---|---|
| `backend/getUserFeed.js` (247) | Builds the signed-in user's chat-thread list; back-fills missing `messages/{cid}` docs | `getUserPosts` (named, DEAD), `getUserMessages` (named, live), default `getUserFeed` (DEAD) | `frontend/logic/messagesPreloader.js:4`, `frontend/helper/initUserFeed.js:1` (both `{ getUserMessages }`) |
| `backend/helper/firebase/arrayAppend.js` (10) | `updateDoc(..., {[arr]: arrayUnion(v)})` | default | `frontend/screens/1.1_Messages.js:9`, `frontend/screens/4.1_ViewProfile.js:13`, `frontend/components/1_Feed/Posts/hooks/usePostFooterInteractions.js:6`, `frontend/components/5_Profile/MakePost/PostUploadOptionsScreen.js:15`, `.../ClipBuilderScreen.js:19` (+ DEAD `backend/posts/appendComment.js`) |
| `backend/helper/firebase/arrayErase.js` (19) | `arrayRemove` wrapper; returns `false` on `not-found` | default | `usePostFooterInteractions.js:7`, `backend/posts/deletePost.js:2` (+ DEAD `eraseComment.js`) |
| `backend/helper/firebase/createDoc.js` (6) | `setDoc(doc(db,col,did), data)` | default | `backend/messages/createChat.js:1` (LIVE, other partition), `backend/posts/createPost.js:1` (+ DEAD `initUser.js`, `initWorkout.js`) |
| `backend/helper/firebase/eraseDoc.js` (6) | `deleteDoc` wrapper | default | `backend/posts/deletePost.js:1` |
| `backend/helper/firebase/incrementDocValue.js` (26) | `increment()` with create-fallback except for `users*` collections | default | `frontend/components/1_Feed/Comments/CommentsBottomSheet.js:8`, `backend/posts/deletePost.js:3` (+ DEAD `appendComment.js`) |
| `backend/helper/firebase/readDoc.js` (8) | `getDoc(...).data()` | default | frontend: `logic/messagesPreloader.js:3`, `screens/1_Feed.js:56`, `screens/ProfileLoggedFoodsScreen.js:18`, `screens/UserStatsScreen.js:5`, `screens/ProfileWorkoutsAndPostsScreen.js:24`, `screens/4.1_ViewProfile.js:9`, `components/5_Profile/MakePost/PostUploadOptionsScreen.js:17`, `components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:16`, `helper/initUserFeed.js:3`; backend: `retrieveUserExploreFeed.js:1`, `posts/retrievePosts.js:1`, `retrieveAllUsers.js:1`, `getUserFeed.js:2`, `helper/firebase/readUserProfiles.js:1` (+ 3 DEAD files) |
| `backend/helper/firebase/readDocsByIds.js` (23) | Chunked `documentId() in` query, order-preserving | default | `frontend/screens/ProfileWorkoutsAndPostsScreen.js:25` |
| `backend/helper/firebase/readUserProfiles.js` (12) | Reads `usersPublic` + `usersPrivate` for a uid | default | `backend/user/approveAllFollowRequests.js:3` |
| `backend/helper/firebase/updateDoc.js` (29) | `updateDoc` with `setDoc(merge)` fallback on `not-found`/`permission-denied` (never creates `users*` docs) | default | `App.js:488,1009,1025,1307` (inline `require(...).default`), frontend: `logic/useWorkoutManager.js:21`, `utils/pickAndUploadProfilePhoto.js:7`, `screens/WeightMeasurementsScreen.js:25`, `screens/1.1_Messages.js:14` (as `updateDocMerge`), `components/1_Feed/Comments/CommentsModal.js:19`, `.../CommentsBottomSheet.js:9`, `.../Posts/hooks/usePostFooterInteractions.js:5`, `.../ViewWorkout/FeedWorkoutViewerSheet.js:10`, `components/5_Profile/EditProfile/EditProfileModal.js:5`, `.../MakePost/PostUploadOptionsScreen.js:16`, `components/2_Competition/sections/ProgressSection.js:27`, `hooks/useUserDoc.js:5`; backend: U:5, D:5, `user/approveAllFollowRequests.js:2`, `getUserFeed.js:7` (+ DEAD `frontend/hooks/useTemplates.js`) |
| `backend/helper/getReverse.js` (12) | Non-mutating array reverse (`[]` for non-arrays) | default | `backend/retrieveUserExploreFeed.js:2`, `backend/getUserFeed.js:3` (the latter only from dead code, see B1) |
| `backend/helper/makeID.js` (5) | `uuid.v4()` | default | frontend: `logic/useWorkoutManager.js:25`, `utils/friends.js:2`, `screens/WeightMeasurementsScreen.js:24`, `screens/1.1_Messages.js:8`, `screens/4.1_ViewProfile.js:12`, `components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:11`, `components/5_Profile/MakePost/PostUploadOptionsScreen.js:9`, `.../ClipBuilderScreen.js:16`, `components/2_Competition/sections/ProgressSection.js:26` (+ 4 DEAD files) |
| `backend/helper/userRefs.js` (74) | uid coercion helpers for backend code | `coerceUid`, `ensureUidArray` (live); `normalizeUserRef`, `mergeUidSets`, default object (DEAD) | `backend/messages/sendMessageV2.js:3` (LIVE, other partition), `backend/user/blockUser.js:3`, `backend/user/unblockUser.js:3`, `backend/getUserFeed.js:6` |
| `backend/posts/createPost.js` (68) | Writes `posts/{pid}` | default | `PostUploadOptionsScreen.js:14` (call :1221), `ClipBuilderScreen.js:18` (call :434) |
| `backend/posts/deletePost.js` (55) | Deletes post doc + pid from user/global arrays + decrements counts | default | `frontend/screens/1_Feed.js:45` (call :911), `frontend/components/1_Feed/SimpleFeedPost.js:28` (call :1314) |
| `backend/posts/retrievePosts.js` (11) | Serial `readDoc('posts', pid)` | default | `backend/retrieveUserExploreFeed.js:3`, `backend/retrieveTrendingPosts.js:3`, `backend/getUserFeed.js:4` (dead use) |
| `backend/retrieveAllUsers.js` (6) | Returns `global/users.all` | default (`retreiveAllUsers` [sic]) | `frontend/screens/4_Explore.js:15` |
| `backend/retrieveTrendingPosts.js` (48) | Top `globalTrendingPosts` + their posts | default | `frontend/screens/feed/hooks/usePersonalizedFeed.js:4` (call :62) |
| `backend/retrieveUserExploreFeed.js` (14) | Posts listed in `global/explorePosts.PIDs`, newest first | default | `frontend/screens/4_Explore.js:14` (call :85), `frontend/helper/initUserFeed.js:2` (call :137) |
| `backend/sendNotification.js` (32) | Calls the `sendUserNotification` callable; swallows permission errors | default | `frontend/logic/useWorkoutManager.js:22`, `frontend/components/1_Feed/Comments/CommentsBottomSheet.js:10`, `frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js:35` |
| `backend/storage/getPFP.js` (9) | Download URL of `pfps/{uid}.png` | default | `frontend/utils/pickAndUploadProfilePhoto.js:6` (+ DEAD `backend/storage/getPFPs.js`) |
| `backend/storage/uploadMediaAssets.js` (304) | Chat attachments: resolve asset, HEIC->JPEG / resize, upload to `messages/{cid}/{uid}/...` | default | `frontend/screens/1.2_Chat.js:31` (call :299) |
| `backend/storage/uploadResumableNative.js` (134) | Post media upload via Storage REST (simple, then resumable) using expo-file-system | default | `PostUploadOptionsScreen.js:13` (calls :1109, :1140), `ClipBuilderScreen.js:17` (call :411) |
| `backend/user/acceptFollowRequest.js` (27) | Callable `respondFollowRequestAction` (accept) | default | `frontend/components/1_Feed/Notifications/NotificationsModal.js:9` (call :102), `backend/user/approveAllFollowRequests.js:1` |
| `backend/user/approveAllFollowRequests.js` (37) | Accepts every pending request, then clears `followRequestsIn` | default | `frontend/screens/PrivateProfileInfo.js:9` (call :48) |
| `backend/user/blockUser.js` (31) | Callable `blockUserAction` | default | `frontend/screens/4.1_ViewProfile.js:18` (call :503) |
| `backend/user/cancelFollowRequest.js` (27) | Callable `cancelFollowRequestAction` | default | `frontend/components/ViewProfile/ViewProfileRowButtons.js:6` (call :113), `.../Notifications/NotificationCard.js:14` (call :239) |
| `backend/user/declineFollowRequest.js` (27) | Callable `respondFollowRequestAction` (decline) | default | `NotificationsModal.js:10` (call :154) |
| `backend/user/followUser.js` (29) | Callable `followUserAction` | default | `ViewProfileRowButtons.js:4` (call :117), `NotificationCard.js:12` (call :242) |
| `backend/user/unblockUser.js` (31) | Callable `unblockUserAction` | default | `4.1_ViewProfile.js:19` (call :535) |
| `backend/user/unfollowUser.js` (26) | Callable `unfollowUserAction` | default | `ViewProfileRowButtons.js:5` (call :110), `NotificationCard.js:13` (call :236) |
| `backend/workouts/deleteCompletedWorkout.js` (453) | Transaction: remove one completed workout, rebuild all stats/hexagon/rank, write `users`/`usersPublic`/`usersPrivate`; then null out the linked post's workout | default | `frontend/screens/1_Feed.js:46` (call :885), `frontend/components/1_Feed/SimpleFeedPost.js:29` (call :1288), `frontend/screens/PastWorkoutScreen.js:25` (its only call, :774, is inside a commented-out block :758-815) |
| `backend/workouts/updateCompletedWorkout.js` (621) | Transaction: merge an edited workout, recompute metrics/calories, rebuild stats/hexagon/rank, write the 3 user docs; then update the linked post | default | `frontend/screens/PastWorkoutScreen.js:26` (call :834) |
| `shared/computeHexagon.js` (41) | Entry point: hexagon core + catalog-backed meta resolver | default `computeHexagonDefault`; named `computeHexagonFromStats`, `resolveMetaWithCatalog` + 8 re-exports (all named exports unused, B6-B8) | `frontend/logic/computeHexagonStats.js:5` (default), D:3, U:3 (default), `functions/shared/computeHexagon.js:4-5` (`export *` + default; only the default is consumed, by FN:1) |
| `shared/hexagon/computeHexagonCore.js` (400) | The hexagon score algorithm and its constants | default + named `computeHexagonCore`, `GROUP_KEYS`, `FULL_BODY_DIST`, `FAMILY_ANCHORS`, `GROUP_WR`, `normalizeEquipment`, `familyAnchorFor`, `defaultResolveMeta` | `shared/computeHexagon.js:4-13` only |
| `shared/hexagon/exerciseCatalogMeta.js` (79) | name -> {group, equipment} map built at module load from `frontend/.../SelectExercise/EXERCISES.js` | `resolveMetaUsingCatalog` (live); `lookupCatalogMeta` (internal only); `hasCatalogMeta`, `catalogEntryCount` (DEAD) | `shared/computeHexagon.js:14` only |
| `shared/rankLevelTasks.js` (268) | Frozen table of promotion requirements (the labels are parsed by regex in rankProgress) | default | `frontend/components/2_Competition/sections/ExercisesSection.js:11`, `shared/rankProgress.js:1` |
| `shared/rankProgress.js` (250) | Rank ladder, requirement parsing/evaluation, current-rank computation | live: `buildLevelKey`, `parseRequirementTask`, `evaluateRequirementProgress`, `computeRankProgressFromData`, `DISPLAY_TITLES`, `LADDER_LEVELS`; internal-only: `normalizeStatsHexagon`, `computeTotalLiftedVolume`, `buildRequirementMetrics`, `computeRankProgress`, `LADDER_LEVELS_ASC`, `LADDER_LEVELS_DESC` | `frontend/utils/userDataEvents.js:1`, `frontend/screens/1_Feed.js:66`, `frontend/components/2_Competition/sections/ExercisesSection.js:12-18`, `frontend/components/2_Competition/LevelUpTransition.js:9`, D:4, U:4, `scripts/backfillRanks.js:53-58` (dynamic `import()`, reads `.computeRankProgressFromData`) |
| `shared/rebuildHexagonStats.js` (5) | TOOLING shim re-exporting FN | `export *` + default (default unused) | `functions/scripts/recomputeHexagonByHandle.js:3-7`, `functions/scripts/recomputeHexagonStandalone.js:3-7` (named imports only) |

---

## B. Verified dead code

"REMOVE" = safe to delete now. "DROP export" = keep the binding, remove the `export` keyword. "KEEP" = looks dead but must stay (reason given).

| # | Identifier | Kind | Location | Evidence | Action |
|---|---|---|---|---|---|
| B1 | `getUserPosts` | exported async fn | `backend/getUserFeed.js:111-120` (comment :111) | Only reference repo-wide is `getUserFeed.js:242` (inside B2). | REMOVE |
| B2 | default `getUserFeed` | default export | `backend/getUserFeed.js:240-246` | Both importers take `{ getUserMessages }` only (`messagesPreloader.js:4`, `initUserFeed.js:1`); no default import, no `require`. | REMOVE. Then imports `getReverse` (:3) and `retrievePosts` (:4) are unused in this file: remove both lines. `readDoc` (:2) stays (used :164). The numbering in comment :122 ("// 2. ...") becomes stale: reword to "// Get user's message threads". |
| B3 | `normalizeUserRef` | exported const | `backend/helper/userRefs.js:37-46` | Every `normalizeUserRef` use in the repo resolves to `frontend/utils/userRefs.js` or to the local one in `NotificationCard.js:126`. | REMOVE |
| B4 | `mergeUidSets` | exported const | `backend/helper/userRefs.js:61-66` | No reference outside the default object (B5). | REMOVE |
| B5 | default export object | default export | `backend/helper/userRefs.js:68-73` | All 4 importers use named imports. | REMOVE |
| B6 | re-export block (`computeHexagonAlgorithm`, `defaultResolveMeta`, `FAMILY_ANCHORS`, `familyAnchorFor`, `FULL_BODY_DIST`, `GROUP_KEYS`, `GROUP_WR`, `normalizeEquipment`) | named re-exports | `shared/computeHexagon.js:16-25` (import list :4-13) | No named importer anywhere. `functions/shared/computeHexagon.js:4` forwards them with `export *`, but its only consumer (FN:1) takes the default; `functions/computeHexagon.js` has no importer at all. | REMOVE the block; shrink the import to `import computeHexagonCore, { defaultResolveMeta } from "./hexagon/computeHexagonCore.js";`. Exception: if the orchestrator makes `GROUP_KEYS` the canonical constant for other partitions (C11), keep that one export. |
| B7 | `resolveMetaWithCatalog` | export | `shared/computeHexagon.js:27` | Used only at :30. | DROP export |
| B8 | `computeHexagonFromStats` named export + `computeHexagonDefault` forwarding wrapper | export / wrapper | `shared/computeHexagon.js:29` and `:38-40` | All consumers import the default and call it `computeHexagonFromStats`; the wrapper only forwards with the same defaults. | Make :29 `export default function computeHexagonFromStats(...)` and delete :38-40. Resulting file: header comment, 2 imports, private `resolveMetaWithCatalog`, the default function. |
| B9 | `export` on `GROUP_KEYS` (:4), `FULL_BODY_DIST` (:6), `FAMILY_ANCHORS` (:15), `GROUP_WR` (:67), `normalizeEquipment` (:81), `familyAnchorFor` (:101) | exports | CORE | After B6 nothing imports them (the only importer of CORE is `shared/computeHexagon.js`). | DROP export (keep `defaultResolveMeta` :109 exported: used by `shared/computeHexagon.js:27`). |
| B9b | `computeHexagonCore` exported twice | duplicate export | CORE:205 (`export function`) and :399 (`export default`) | Callers use the default (the named import was only the dead alias `computeHexagonAlgorithm`). | DROP `export` at :205, keep :399. |
| B10 | `hasCatalogMeta`, `catalogEntryCount` | exported consts | `shared/hexagon/exerciseCatalogMeta.js:63`, `:65` | Zero references repo-wide. | REMOVE both. `lookupCatalogMeta` (:56) is used only at :69: DROP export. |
| B11 | `normalizeStatsHexagon` (:84), `computeTotalLiftedVolume` (:112), `buildRequirementMetrics` (:175), `computeRankProgress` (:181), `LADDER_LEVELS_ASC` (:247), `LADDER_LEVELS_DESC` (:248) | exports | `shared/rankProgress.js` | Used only inside the file. `scripts/backfillRanks.js` reads only `mod.computeRankProgressFromData`. | DROP export on the four functions; remove the two names from the export list at :244-249 (list becomes `{ DISPLAY_TITLES, LADDER_LEVELS }`). |
| B12 | default re-export | export | `shared/rebuildHexagonStats.js:3` | Both consumers use named imports. (`backend/admin/recomputeAllHexagonStats.js:131-135` reads `mod.default` of FN directly, not of this shim.) | REMOVE (TOOLING, low value; `fn-check.sh` covers it). Acceptable to leave. |
| B13 | param `weight = 1` | unused parameter | D:69 | ESLint 69:40; the only call (D:271) passes 2 args. | REMOVE param (makes D:69-78 byte-identical to U:78-87). |
| B14 | param `userData` | unused parameter | `backend/retrieveUserExploreFeed.js:5` | ESLint 5:55. Callers pass an argument that is ignored (`4_Explore.js:85`, `initUserFeed.js:137`). | REMOVE param here (JS ignores the extra argument, so callers keep working); see G2 for the call sites. |
| B15 | `{ merge: true }` third argument | no-op argument | `backend/helper/firebase/arrayAppend.js:7-9`, `arrayErase.js:8-10` | Firestore `updateDoc(ref, data, ...)` ignores a third argument when the second is an object (verified in installed SDK: `node_modules/@firebase/firestore/dist/index.rn.js:21252-21261`, firebase 10.14.1). | REMOVE the argument (behaviour identical). |
| B16 | `options` / `allowCreate` | parameter no caller passes | `backend/helper/firebase/updateDoc.js:6-7`, `incrementDocValue.js:4,6` | All 29 call sites of the backend `updateDoc` pass exactly 3 args (counted with a paren-matching script over every importing file); the 3 `incrementDocValue` calls pass 3 or 4 args, never 5; `allowCreate` appears nowhere else. | Optional: replace with `const allowCreate = !skipCreateCollections.has(col);` and drop the parameter. Low value, zero risk. |
| B17 | `sanitizeWorkoutForClient` | duplicate function | U:373-385 (use :480) | Semantically identical to `ensureExercisesAreArrays` U:137-149 (same statements, only line breaks differ). | REMOVE and call `ensureExercisesAreArrays(mergedWorkout)` at :480 (or keep the better name and delete the other; one function either way). |
| B18 | unreachable guard | dead branch | `backend/storage/uploadMediaAssets.js:134` | `shouldResizeImage` (:123-128) already returned `false` for non-finite inputs, and :131 returned. | REMOVE line :134 (optional, trivial). `maxDimension` param (:123) is never passed either. |
| B19 | `thumbnailUrl?` in JSDoc | stale doc | `uploadMediaAssets.js:283` | No code path returns it (return object :268-276). | Fix the comment. |
| B20 | `this_user` first parameter | unused parameter | `backend/user/acceptFollowRequest.js:15`, `blockUser.js:7`, `cancelFollowRequest.js:15`, `declineFollowRequest.js:15`, `followUser.js:15`, `unblockUser.js:7`, `unfollowUser.js:15` | Never read in any of the 7 bodies (leftover from the pre-callable implementation). | KEEP unless G1 is executed atomically: it is the FIRST positional parameter, and a missed call site would silently target the wrong uid. |
| B21 | `selfPayload` (and the `publicProfile` read feeding it) | value passed to an ignored parameter | `backend/user/approveAllFollowRequests.js:13-19`, used :24 | `acceptFollowRequest` ignores its first argument (B20). | KEEP with B20; if G1 is done, delete :13-19 and call `acceptFollowRequest(entry)`. Keep the `readUserProfiles` call (it also yields `privateProfile`). |
| B22 | `allowVideos` | constant flag | `uploadMediaAssets.js:209,216,286,299` | The only caller (`1.2_Chat.js:299-303`) never passes it, so it is always `false`; the video paths after :216-220 (`:224` videoExt, `safeContentType` :200-202, `DEFAULTS.videoExt/videoMime`) cannot run. | KEEP: deliberate product gate with a user-facing message (`1.2_Chat.js:53` "Videos can't be shared in chat yet"). |
| B23 | `workout` parameter of `createPost` | parameter always `null` | `backend/posts/createPost.js:5`, branches :15-21 (truthy arm) and :61-64 | Both callers pass `null` (`PostUploadOptionsScreen.js:1228`, `ClipBuilderScreen.js:434`). | KEEP (positional signature; `workout: null` is part of the stored post shape). Open question I7. |
| B24 | `debug` result + `includeDebug` option | output nobody reads | CORE:210, :385-395 (and the maps `strengthScores`/`workScores`/`consistencyScores` :323-325 that only feed it); `shared/computeHexagon.js:30,33`; `frontend/logic/computeHexagonStats.js:10` | grep for `.debug` on a hexagon result: no reader anywhere. | KEEP pending owner (I5): diagnostic seam of the canonical algorithm. |
| B25 | `now`, `fallbackSetLimit`, `clampLegacy` options | options no caller overrides | CORE:211-213 | Only `clampLegacy: true` is ever passed (= default), `frontend/logic/computeHexagonStats.js:11`. | KEEP (test seams of the algorithm; removing them is a rewrite of CORE). |
| B26 | `FAMILY_ANCHORS` entry `shrug_back` | unreachable data | CORE:40 | Same regex `/shrug/i` as the earlier `shrug` entry (:29); `familyAnchorFor` (:101-107) returns the first match. | KEEP, open question I6 (intent unclear). |
| B27 | `removedWorkout` in the result | returned, never read | D:411 | No reader (`1_Feed.js`, `SimpleFeedPost.js` read other fields only). | KEEP (return shape). |
| B28 | redundant fallbacks | no-op expressions | `shared/rankProgress.js:52` (`normalizedLevel` always equals `levelToken`), `:13,:15,:31` (`[...x].slice()` double copy) | By inspection. | Optional trivial simplification; fine to leave. |
| B29 | `GLOBAL_OBJ` fallback chain | defensive | `uploadMediaAssets.js:8-15` | `globalThis` always exists on Hermes. | KEEP (defensive, harmless). |
| B30 | stale `// eslint-disable-next-line import/no-relative-packages` | stale directive | `shared/hexagon/exerciseCatalogMeta.js:3` | Repo has no linter. | Optional removal. |

No commented-out code exists in this partition. No tracing `console.log`: all 12 `console.log` calls are inside `catch` blocks (failure-path logging): `backend/getUserFeed.js:102`; `backend/user/acceptFollowRequest.js:23`, `approveAllFollowRequests.js:27`, `blockUser.js:18,27`, `cancelFollowRequest.js:23`, `declineFollowRequest.js:23`, `followUser.js:25`, `unblockUser.js:18,27`, `unfollowUser.js:22`. Keep them, and do NOT convert them to `console.warn` (that would surface LogBox warnings in dev builds).

---

## C. Duplication

### C1. Stats-rebuild helpers: D vs U (vs FN, which cannot be shared with)
| Helper | D | U | FN | Verdict |
|---|---|---|---|---|
| `toNumber` | 7-10 | 9-12 | 3-6 | Identical in all three. Also identical: `frontend/components/1_Feed/SimpleFeedPost.js:56`, `frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:87`, `frontend/screens/1_Feed.js:230`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:62`. |
| `calculate1RM` | 12-18 | 14-19 | 8-13 | Identical (D has one extra comment line :16). CORE:73-79 `defaultCalculate1RM` is also identical. `frontend/helper/calculate1RM.js` is NOT (no guards: returns NaN/negative for non-positive input). |
| `toMillis` | 20-32 | 21-41 | 15-35 | **D differs from U/FN**: U/FN also decode plain `{seconds,nanoseconds}` / `{_seconds,_nanoseconds}` objects (U:31-38); D returns 0 for them. Reachable: a JSON-serialised Firestore Timestamp is exactly such an object. D's variant is identical to `SimpleFeedPost.js:61-72`. |
| `toDayKey` | 34-41 | 43-50 | 37-44 | Text identical, but each closes over its own `toMillis`, so behaviour differs D vs U. |
| `parseDayKey` | 43-54 | 52-63 | 46-57 | Identical. CORE:158-168 is NOT identical (no `Number.isFinite` guard: returns NaN for malformed keys). |
| `inferGroup` | 56-67 | 65-76 | 102-113 | D == U. FN differs (chest tested before shoulders; "press" excluded when "bench"). |
| `distributeFullBody` | 69-78 | 78-87 | 115-124 | Identical except D's unused `weight = 1` (B13). |
| `deriveBestTimestamp` | 80-90 | 89-99 | inline 135-145 | Text identical D/U; behaviour differs through `toMillis`. |
| `normalizeIdentifier` | 92-108 | 101-117 | - | Differ: U:109 also falls back to `input?.completedAt`. |
| `rebuildStatsFromWorkouts` | 145-299 | 217-371 | 126-287 | D vs U differ in ONE statement plus `toMillis`: D:187 `const setDay = dayKey || toDayKey(workout?.created);` vs U:259 `const setDay = toDayKey(set?.date) || dayKey || toDayKey(Date.now());` (and cosmetic parentheses D:295/U:367). FN differs more (`normalizeSet`, cloned exercises, no hexagon in the result). |

Recommendation: share ONLY the byte-identical, dependency-free ones (`toNumber`, `calculate1RM`, `parseDayKey`, `inferGroup`, `distributeFullBody`) in a new `backend/workouts/workoutStatsPrimitives.js` (see D). Do not unify `toMillis`/`toDayKey`/`deriveBestTimestamp`/`normalizeIdentifier`/`rebuildStatsFromWorkouts` (rule 4): open question I1. FN lives in `functions/` and is loaded by Node operator scripts; leave it alone.

### C2. Rank-fields block
D:323-349 and U:491-517 are identical except for the `completedWorkouts` argument (D:324 `sanitizedWorkouts`, U:492 `nextWorkoutsForClient`). `rankProgress`, `currentRankEntry`, `currentRankData` are not used after the block in either file (grep), only `rankFields` (D:363,378,393,423; U:531,546,561,591).
Canonical home: new `backend/workouts/buildRankFields.js` exporting `buildRankFields(completedWorkouts, statsHexagon)` whose body is D:323-349 verbatim plus `return rankFields;`.
Related, other partition, NOT identical: `frontend/logic/useWorkoutManager.js:159-184` `buildRankPayload` (same field shape but returns `null` instead of null-valued fields; see E7), `buildRankSnapshot` in `frontend/screens/1_Feed.js:257-271` and `frontend/utils/userDataEvents.js:86-100`.

### C3. Update payloads inside each transaction
D: `publicUpdatePayload` (366-379) and `privateUpdatePayload` (381-394) are identical; `userUpdatePayload` (351-364) differs only in `completedWorkouts`. U: same pattern at 519-532 / 534-547 / 549-562. The returned object (D:410-425, U:578-593) repeats the same stats fields with `updatedAt: Date.now()`.
Recommendation (optional, low-medium risk, do it identically in both files or not at all): build `const statsFields = { statsExercises: ..., statsHexagon: ..., statsHexagonMeta: { lastTrainedByGroup: ..., updatedAt: serverTimestamp() }, statsTotalVolume: ..., statsTotalHours: ..., statsTotalWorkouts: ..., workoutsByDate: ..., ...rankFields }` once and spread it into the three payloads. Sharing one `serverTimestamp()` sentinel across writes is valid. This is a rewrite, not a move: if the implementer is not fully comfortable, leave as is (the written documents are the user's core data).

### C4. `coerceUid` local copies in `backend/user`
Byte-identical 8-line copies at `acceptFollowRequest.js:6-13`, `cancelFollowRequest.js:6-13`, `declineFollowRequest.js:6-13`, `followUser.js:6-13`, `unfollowUser.js:6-13` (verified with diff).
They are NOT equivalent to `coerceUid` in `backend/helper/userRefs.js:21-35` (used by `blockUser.js`/`unblockUser.js`):
- keys: local reads `uid || id || userUid || profileUid` (truthiness, inherited props included); userRefs walks 10 own keys in the order uid, id, userUid, memberUid, profileUid, followUid, followerUid, ownerUid, creatorUid, creatorUID. An object carrying only `followerUid`/`memberUid`/`ownerUid`/`creatorUid` gives `""` locally and the uid in userRefs. `approveAllFollowRequests.js:22-24` feeds raw `followRequestsIn` entries (arbitrary stored shapes) into the local variant, so this difference is reachable.
- whitespace-only `uid` with a valid `id`: local returns `""`, userRefs falls through to `id`.
- `uid: 0`: local skips it, userRefs returns `"0"`; `NaN`: local `""`, userRefs `"NaN"`.
Recommendation: move the local body verbatim into ONE new module `backend/user/coerceTargetUid.js` (`const coerceUid = ...; export default coerceUid;` keeping the inner recursive name) and `import coerceUid from "./coerceTargetUid";` in the five files. Do not switch them to `helper/userRefs`.

### C5. `backend/helper/userRefs.js` vs `frontend/utils/userRefs.js` vs `functions/index.js:124-161`
- `coerceUid`: backend :21-35 == `functions/index.js:137-150` (`coerceUidValue`); frontend (`frontend/utils/userRefs.js:19-33`) has the same body but its `UID_KEYS` (:3-17) has three extra keys (`docId`, `_id`, `objectID`). Not identical: an object carrying only one of those keys resolves in frontend and not in backend.
- `ensureUidArray` (backend :48-59, frontend :46-57), `normalizeUserRef` (backend :37-46, frontend :35-44), `mergeUidSets` (backend :61-66, frontend :59-63): same logic, differing only through `coerceUid`.
Recommendation: keep both modules; after B3-B5 the backend one exports only `coerceUid` and `ensureUidArray`. Whether backend may adopt the frontend key list is an owner decision (I2). `functions/` cannot import either.
- Related: `normalizeParticipantRef` (`backend/getUserFeed.js:10-28`) is a superset of `normalizeUserRef` (adds `image`, `photoURL`, `displayName`): not identical, leave.

### C6. Near-identical callable wrappers
- `blockUser.js` vs `unblockUser.js`: identical except callable name and log labels (diff: 5 lines).
- `acceptFollowRequest.js` vs `declineFollowRequest.js`: identical except `decision` and the fallback status (diff: 4 lines).
A factory would be a rewrite for ~20 lines saved; leave. Only C4 is worth doing.

### C7. Download-URL resolution in `uploadResumableNative.js`
Lines 62-70 and 122-131 are the same statements (`respToken`, `url` ternary, `getDownloadURL` fallback). Recommendation: one module-local `async function resolveDownloadUrl(meta, path)` containing lines 122-131 verbatim and returning `url`; both sites become `const url = await resolveDownloadUrl(meta, path);`. Low risk (the helper swallows its own errors exactly like today, so the simple-upload `try` at :60-75 sees the same outcomes).

### C8. `skipCreateCollections`
`updateDoc.js:4` (module level) and `incrementDocValue.js:5` (re-created per call) hold the same Set. Minimal: hoist the one in `incrementDocValue.js` to module level; or export it from `updateDoc.js` and import it. Either is fine.

### C9. Inside CORE
`rawSets` assembly CORE:263-265 == :298-300; volume accumulation :288-294 == :311-317. Leave (closure over `vol30`/`daysSet`/`lastTs`; touching the algorithm is not worth 10 lines, see H).

### C10. Other same-name helpers that are NOT interchangeable (leave)
- `toMillis`: more than 20 definitions repo-wide with different null/Date/seconds handling, e.g. `frontend/utils/date.js:6-18` (returns raw non-finite numbers, handles `Date`, ignores nanoseconds), `frontend/utils/friends.js:4-11`, `frontend/helper/estimateWorkoutCalories.js:66-85` (U's logic without the `== null` early return; same results), `frontend/components/2_Competition/UserStats/userStatsUtils.js:53-66`, `frontend/screens/PastWorkoutScreen.js:51` (returns `null`), `frontend/screens/ProfileWorkoutsAndPostsScreen.js:39` (returns `undefined`).
- `toDayKey`: CORE:150-156 takes a ms timestamp; D:34/U:43 go through `toMillis`; `frontend/utils/date.js:3` takes a `Date`.
- `defaultResolveMeta` (CORE:109-148) vs `inferMetaByName` (`frontend/logic/exerciseCatalog.js:159-190`): different regexes (jscpd only matched the equipment ternary chain).
- `normalizeEquipment` / `familyAnchorFor`: CORE:81-107 vs `frontend/logic/exerciseCatalog.js:46`, `:149`: different signatures and return shapes.
- `normalizeId`: `backend/posts/deletePost.js:5-9` (falsy except 0 -> "") vs `frontend/utils/resolveRankTierKey.js:1-5` (only null/undefined -> "").
- `getUserPosts` (`getUserFeed.js:112-120`) vs `retrieveUserExploreFeed.js:5-13`: same shape, different doc id; resolved by B1.

### C11. Constants defined more than once (identical values)
- `GROUP_KEYS`: CORE:4, `frontend/logic/exerciseCatalog.js:31`, `frontend/components/2_Competition/UserStats/UserStatsAfterWorkoutSheet.js:14`.
- `GROUP_WR`: CORE:67, `frontend/logic/exerciseCatalog.js:35`.
- `FULL_BODY_DIST`: CORE:6-13, `frontend/logic/exerciseCatalog.js:38`, and inline as `dist` in D:70, U:79, FN:116.
- Tier titles: `DISPLAY_TITLES` (`shared/rankProgress.js:3-10`) == `RANK_TITLE_MAP` (`frontend/utils/resolveRankTierKey.js:18-25`).
Canonical home if the orchestrator wants one: `shared/` (CORE via `shared/computeHexagon.js`; `shared/rankProgress.js`). This decides B6 for `GROUP_KEYS`.

---

## D. Decomposition plans

### D1. `backend/workouts/updateCompletedWorkout.js` (621 lines)
Top-level declarations: imports 1-7; `toNumber` 9-12; `calculate1RM` 14-19; `toMillis` 21-41; `toDayKey` 43-50; `parseDayKey` 52-63; `inferGroup` 65-76; `distributeFullBody` 78-87; `deriveBestTimestamp` 89-99; `normalizeIdentifier` 101-117; `findWorkoutInList` 119-135; `ensureExercisesAreArrays` 137-149; `getPreviousOneRm` 151-163; `deriveWorkoutMetrics` 165-215; `rebuildStatsFromWorkouts` 217-371; `sanitizeWorkoutForClient` 373-385; default export 387-620 (transaction callback 402-594).

All helpers are pure module-level `const` arrows with no shared mutable state, so they move with `sed -n 'A,Bp'`.

1. NEW `backend/workouts/workoutStatsPrimitives.js` (shared by U and D): U:9-12 `toNumber`, U:14-19 `calculate1RM` (carry over D's explanatory comment D:16), U:52-63 `parseDayKey`, U:65-76 `inferGroup`, U:78-87 `distributeFullBody`. Add one `export { ... }` list. No imports.
2. NEW `backend/workouts/updateCompletedWorkoutStats.js`: U:21-41 `toMillis`, U:43-50 `toDayKey`, U:89-99 `deriveBestTimestamp`, U:217-371 `rebuildStatsFromWorkouts`, in that order. Imports: `computeHexagonFromStats` from `"../../shared/computeHexagon.js"` (the import moves out of the main file, which no longer uses it) and the five primitives from `"./workoutStatsPrimitives.js"`. Exports: `toMillis`, `deriveBestTimestamp`, `rebuildStatsFromWorkouts`.
3. NEW `backend/workouts/updateCompletedWorkoutUtils.js`: U:101-117 `normalizeIdentifier`, U:119-135 `findWorkoutInList`, U:137-149 `ensureExercisesAreArrays`, U:151-163 `getPreviousOneRm`, U:165-215 `deriveWorkoutMetrics`. Imports `toMillis`, `deriveBestTimestamp` from (2) and `calculate1RM` from (1). Exports `normalizeIdentifier`, `findWorkoutInList`, `ensureExercisesAreArrays`, `deriveWorkoutMetrics`.
4. NEW `backend/workouts/buildRankFields.js` (C2), used by U and D.
5. Delete U:373-385 (B17).
What stays in `updateCompletedWorkout.js`: imports (`doc, runTransaction, serverTimestamp`, `db`, `updateDoc`, `estimateWorkoutCalories`, `resolveUserBodyweight`, the new helpers) and the default export: about 225 lines.
Blockers / cautions: (a) keep the explicit `.js` extension style these two files use; (b) the transaction callback closes over `normalizedUid`, `identifier`, `preparedWorkout` and the three refs and mutates `mergedWorkout` step by step (U:424-470): do not split it; (c) `const` arrows are not hoisted: keep the relative order inside each new module; (d) do NOT import D's `toMillis` or `rebuildStatsFromWorkouts` here or vice versa (C1).
Acceptable alternative with fewer files: (2)+(3) merged into one `updateCompletedWorkoutHelpers.js`.

### D2. `backend/workouts/deleteCompletedWorkout.js` (453 lines; companion, not mandatory)
Replace D:7-18 and D:43-78 by an import from `workoutStatsPrimitives.js` (after B13 they are identical to U's), and D:323-349 by `buildRankFields` (C2): about 370 lines remain. D's own `toMillis` (20-32), `toDayKey` (34-41), `deriveBestTimestamp` (80-90), `normalizeIdentifier` (92-108), `removeWorkoutFromList` (110-134), `sanitizeWorkoutForPublic` (136-143), `rebuildStatsFromWorkouts` (145-299) stay in place unless the owner answers I1. If symmetry is wanted, they can move verbatim to `deleteCompletedWorkoutStats.js`.

No other file of the partition exceeds 500 lines (CORE is 400 lines of one algorithm plus its tables: leave whole; `shared/rankLevelTasks.js` is pure data).

---

## E. Latent bugs

| # | Location | Bug | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | `backend/posts/retrievePosts.js:5` | `for (pid of pids)`: `pid` is never declared. It works only because Metro modules are sloppy-mode (`@react-native/babel-preset` sets `strictMode: false`), so it assigns an implicit global `pid`. Nothing reads `global.pid` (grep). | `for (const pid of pids) {` | High. Behaviour-neutral apart from no longer leaking the global. |
| E2 | `arrayAppend.js:7-9`, `arrayErase.js:8-10` | `{ merge: true }` passed to `updateDoc`, which has no options argument: silently ignored; the code suggests upsert semantics it does not have (a missing doc still throws `not-found`). | Remove the argument (B15). | High that it is a no-op. |
| E3 | D:192, U:264 (`wid: widStr || undefined`) | The client Firestore instance is created without `ignoreUndefinedProperties` (`firebase.config.js:22`; only admin scripts enable it). If any remaining workout has no `wid`/`id`/`workoutId`/`pid` and at least one valid set, `tx.update` throws "Unsupported field value: undefined" and the whole delete/update fails. Workouts created by the app always carry `wid` (`useWorkoutManager.js:816`), so this needs legacy data to trigger. | `...(widStr ? { wid: widStr } : {})`. NOT strictly behaviour-preserving (turns a thrown error into a successful write): do not apply without the owner (I3). | Medium (mechanism certain, reachability unknown). |
| E4 | U:89-99 with U:472-490 (same pattern D:80-90, FN:135-145) | `deriveBestTimestamp` includes `updatedAt`, and an edit stamps `updatedAt = Date.now()` before the rebuild. After editing an old workout, its `dayKey` (U:226), its `workoutsByDate` entry (U:227) and the `date` of all its sets (U:259-263) move to the edit day, shifting the calendar, the 1RM timeline and the 30-day hexagon window. | None in this refactor: product logic. Open question I4. | Medium-high that it is unintended. |
| E5 | U:259 | `toDayKey(set?.date)` parses a `"YYYY-MM-DD"` key with `new Date(string)` (UTC midnight) and formats it in local time: one day early in negative-UTC zones. Completed-workout sets normally have no `date` (the field exists on `statsExercises[*].sets`, `useWorkoutManager.js:1260`), so it is mostly latent. | None now (would be `set?.date` used as-is when it already is a day key). Open question. | Low. |
| E6 | D:56-67 / U:65-76 `inferGroup` | Order of tests misclassifies: "Bench Press" -> shoulders ("press" tested first), "Leg Extension"/"Leg Curl" -> arms, "Leg Press" -> shoulders. FN already reorders this. Only affects `statsHexagonMeta.lastTrainedByGroup`, which no client code reads (grep: written at D:356, U:524, `useWorkoutManager.js:1184`, `useUserDoc.js:140`; never read). | None (stored field shape). Open question I8. | High that the heuristic is wrong; impact nil today. |
| E7 | `frontend/logic/useWorkoutManager.js:161` (OTHER partition) | `computeRankProgressFromData` is used but never imported in that file; the ReferenceError is caught at :180-183, so `buildRankPayload` always returns `null` and the rank fields are never written at workout finish. | Adding `import { computeRankProgressFromData } from "../../shared/rankProgress.js";` matches evident intent but CHANGES behaviour (rank starts being written). Must go to the owner. | High that the import is missing. |
| E8 | `shared/rankLevelTasks.js:258-263` | `"diamond-iv"` lists two workout-count tasks ("Log 22 Workouts" and "Log 100 Workouts"). Also non-monotonic thresholds: shoulders 57.0 (gold-ii :106) then 56.0 (gold-iii :115); 66.0 (ruby-i :142) then 64.0 (ruby-ii :151). | None: data; open question I9. | Low (may be intended). |
| E9 | D:126 / U:129 | `createdMatch` compares the caller's `created` (start time, or first non-null of several fields) with `deriveBestTimestamp` (max of finish/update/start...) within 2 s. For any workout with a duration, or any edited workout, this cannot match; matching effectively relies on `wid`. | None; note only. | Medium. |

---

## F. Best-practice issues worth fixing

| # | Location | Issue | Fix | Risk |
|---|---|---|---|---|
| F1 | `backend/storage/uploadResumableNative.js:6,8` | Same module loaded twice, once by `import { storage }` and once by `const app = require('../../firebase.config').app;` | `import { storage, app } from '../../firebase.config';` (`app` is exported at `firebase.config.js:21`) and delete :8. | None (module is already evaluated by the import at :6). |
| F2 | `backend/helper/firebase/incrementDocValue.js:5` | Constant Set rebuilt on every call, duplicated from `updateDoc.js:4` | C8. | None. |
| F3 | `backend/getUserFeed.js:1-8` | Third-party import (`firebase/firestore`, :5) sits between local imports | Regroup when the file is edited for B1/B2 (third-party first, then `../firebase.config`, then local). | None. |
| F4 | D:351-394, U:519-562 | Three copy-pasted payload literals per transaction | C3 (optional). | Low-medium. |
| F5 | `backend/storage/uploadMediaAssets.js:183` | `catch (error)` binding unused (the code deliberately falls back to FileSystem) | `catch {` | None. |
| F6 | `backend/user/*.js` (5 files) | Recursive helper copy-pasted | C4. | Low. |
| F7 | `backend/storage/uploadResumableNative.js:62-70,122-131` | Duplicated block | C7. | Low. |
| F8 | `shared/computeHexagon.js`, CORE, `exerciseCatalogMeta.js`, `rankProgress.js` | Unused exports and a duplicate default+named export | B6-B11. | Low; run `fn-check.sh` afterwards because `functions/shared/computeHexagon.js` re-exports this module. |
| F9 | `backend/retrieveAllUsers.js:3` | Function name typo `retreiveAllUsers` (the importer `4_Explore.js:15` copies the typo; default export so the name is cosmetic) | Leave, or fix both spellings together with the screens partition. | None. |
| F10 | `updateDoc.js:19,25`, `getUserFeed.js:106,170`, `retrieveTrendingPosts.js:44` | `console.warn?.(...)` optional call on a function that always exists | Cosmetic; leave (rule 6). | - |

Not issues: the module-scope `httpsCallable(...)` in `backend/user/*.js` vs the lazy one in `sendNotification.js:4-11` (both fine); the 2-space indentation of `readDocsByIds.js`, `uploadResumableNative.js`, `shared/computeHexagon.js`, CORE, `exerciseCatalogMeta.js` (keep each file's style); the serial loop in `retrievePosts.js` (changing it to parallel reads would change timing).

---

## G. Cross-partition requests

1. **`this_user` removal (only if done atomically, otherwise skip).** If B20/B21 are executed, these call sites must drop their first argument in the same change: `frontend/components/ViewProfile/ViewProfileRowButtons.js:110,113,117`; `frontend/components/1_Feed/Notifications/NotificationCard.js:236,239,242`; `frontend/components/1_Feed/Notifications/NotificationsModal.js:102,154` (the `currentUser` locals at :93 and :145 then become unused); `frontend/screens/4.1_ViewProfile.js:503,535`; plus in-partition `backend/user/approveAllFollowRequests.js:24`. A missed site would pass the viewer as the target. Recommendation: leave the signatures alone unless one implementer owns all 5 files.
2. **`retrieveUserExploreFeed` argument.** After B14, `frontend/screens/4_Explore.js:85` and `frontend/helper/initUserFeed.js:137` can call it without `userData` (optional; harmless if left).
3. **`frontend/logic/useWorkoutManager.js:161`**: missing import of `computeRankProgressFromData` (E7). Report to the owner; do not silently add it.
4. **`frontend/screens/PastWorkoutScreen.js:25`**: `deleteCompletedWorkout` is imported but only referenced inside the commented-out block :758-815. When that block is deleted (rule 7), the import goes too. The backend module stays (2 other live importers).
5. **`frontend/logic/computeHexagonStats.js:10-11`**: passes `includeDebug: true, clampLegacy: true`; nobody reads `.debug` and `clampLegacy: true` is the default. Only relevant if the owner approves I5.
6. **Constants (C11)**: `frontend/utils/resolveRankTierKey.js:18-25` could import `DISPLAY_TITLES` from `shared/rankProgress.js`; `frontend/logic/exerciseCatalog.js:31` and `frontend/components/2_Competition/UserStats/UserStatsAfterWorkoutSheet.js:14` could import `GROUP_KEYS` from `shared/computeHexagon.js` (then keep that re-export, B6). Orchestrator decision.
7. **`frontend/components/3_Workout/NewWorkout/SelectExercise/EXERCISES.js`** must stay at this path, export `exercises`, and stay free of imports (it is pure data today): `shared/hexagon/exerciseCatalogMeta.js:4` imports it and that chain is loaded under plain Node by operator scripts.
8. **`App.js:488,1009,1025,1307`** use `require('./backend/helper/firebase/updateDoc').default`: the default export and path of `updateDoc.js` must not change.
9. **`functions/computeHexagon.js`** ("legacy entry point") has no importer anywhere (FN imports `./computeHexagon.js` relative to `functions/shared/`). Candidate for the functions partition's "can be deleted" list.
10. **`frontend/screens/1_Feed.js:881,886`** and **`frontend/components/1_Feed/SimpleFeedPost.js:1284,1289`**: `workoutResult` is assigned and never read (their partitions).
11. `backend/messages/sendMessageV2.js:3` (messages partition) imports `coerceUid` from `backend/helper/userRefs.js`: that export stays.

---

## H. Fragile areas (leave alone or handle with care)

1. **`shared/` must stay loadable by plain Node ESM.** `functions/scripts/recompute*.js`, `backend/admin/recomputeAllHexagonStats.js:130-135` and `scripts/backfillRanks.js:52-58` load `shared/rankProgress.js`, `shared/computeHexagon.js`, CORE, `exerciseCatalogMeta.js` (and through it `EXERCISES.js`) outside Metro. Keep the explicit `.js` extensions in every import specifier under `shared/` (and in `backend/workouts/*.js`, which follow the same style), no React Native / Expo imports, no JSX.
2. **CORE is the scoring algorithm.** Its constants (`FAMILY_ANCHORS` order, `GROUP_WR`, `NORM_VOL_30D`, `DIFFICULTY_MULTIPLIER`, decay curve, 0.7/0.2/0.1 weights) and statement order determine stored `statsHexagon` values and therefore ranks. Only remove `export` keywords; do not restructure (C9), do not touch options (B25).
3. **`shared/rankLevelTasks.js` labels are data.** `parseRequirementTask` (`rankProgress.js:57-82`) extracts numbers and body parts from the label text by regex, and the same strings are rendered in `ExercisesSection.js`. Do not reword, reformat or "normalise" them (including the arrow character in titles).
4. **Ladder order.** `LADDER_LEVELS` is the DESC ladder (`rankProgress.js:30-33`); `currentRankIndexDesc` is stored in Firestore as `currentRank.index` (D:334, U:502) and consumers index into `LADDER_LEVELS` (`userDataEvents.js:67-78`, `ExercisesSection.js:232-235,383-387`).
5. **The two workout transactions (D:311-426, U:402-594).** All three `tx.get` calls precede every write (Firestore requirement); `users` uses `tx.update`, public/private use update-or-set-merge depending on `exists()`; Firestore payloads use `serverTimestamp()` while the returned object uses `Date.now()` (D:417, U:585) because callers copy it onto `global.userData`. The returned field names are consumed by `1_Feed.js:887-898`, `SimpleFeedPost.js:1290-1300`, `PastWorkoutScreen.js:860-885`. Field shapes written here must not change.
6. **D vs U differences are real (C1).** Do not "fix" one from the other.
7. **`backend/helper/firebase/updateDoc.js`.** The fallback also triggers on `permission-denied` and deliberately never creates `users`/`usersPublic`/`usersPrivate` docs (returns `false`). 29 call sites depend on these semantics.
8. **`backend/getUserFeed.js` `getUserMessages` (:123-238).** Chats are read serially on purpose (comment :159), missing chat docs are re-created with a specific payload (:73-95) and participants re-registered (:100); hidden/blocked filtering and the final sort feed the Messages UI directly.
9. **`backend/storage/uploadMediaAssets.js`.** Module state `mediaPermissionsEnsured` (:43-56); storage path format (:206-207); error `code` strings (`UNRESOLVED_ASSET_URI`, `ASSET_READ_FAILED`, `ASSET_EMPTY`, `VIDEO_NOT_ALLOWED`) are mapped to user messages in `frontend/screens/1.2_Chat.js:50-53`; the fetch-then-FileSystem fallback (:173-196) is intentional.
10. **`backend/storage/uploadResumableNative.js`.** REST URLs, headers, the hard-coded bucket fallback (:9), `getAuth()` (not the exported `auth`), and the fall-through from simple to resumable upload on ANY error (:72-75). C7 must keep the helper call inside that `try`.
11. **Callable names and payload keys** in `backend/user/*.js` and `sendNotification.js` (`followUserAction`, `unfollowUserAction`, `cancelFollowRequestAction`, `respondFollowRequestAction`, `blockUserAction`, `unblockUserAction`, `sendUserNotification`; keys `targetUid`, `requesterUid`, `decision`, `idToken`, `event`) and the distinct return/throw contracts (`cancelFollowRequest` returns booleans and never throws; `followUser` returns `{status}`; others rethrow).
12. **`createPost.js` payload** (:36-52) and **`deletePost.js`** sequence (post doc first, then the four user-array/count updates via `allSettled`, then `global/posts.PIDs`; every failure is logged and swallowed).
13. **`exerciseCatalogMeta.js`** builds its Map at module load with first-registration-wins semantics (:37-41): the order of `EXERCISES` matters.

---

## I. Open questions for the owner

1. **D vs U stats rebuild.** Which is intended: `toMillis` with or without plain `{seconds,nanoseconds}` support (D:20-32 vs U:21-41), `setDay` (D:187 vs U:259), `normalizeIdentifier` with or without `completedAt` (D:100 vs U:109)? If U is the reference, D can import U's helpers and about 190 more lines disappear.
2. **uid key lists.** Should `backend/helper/userRefs.js` adopt the frontend's three extra keys (`docId`, `_id`, `objectID`) so one `userRefs` module can serve both, and should the five `backend/user` actions use it instead of their 4-key local `coerceUid` (C4, C5)?
3. **E3**: may `wid: undefined` be omitted so id-less legacy workouts no longer make delete/update throw?
4. **E4**: is it intended that editing a past workout re-dates it (calendar day, set dates, 30-day window) to the day of the edit?
5. **Hexagon debug output** (B24): keep `includeDebug`/`debug` as a diagnostic seam or remove it (nobody reads it)?
6. **`FAMILY_ANCHORS` `shrug_back`** (CORE:40) can never match, and `familyAnchorFor(name, group)` ignores `group` while matching. Was group-aware matching intended?
7. **`createPost(..., workout, ...)`** is always called with `null` (B23). Is the workout-post path through this function obsolete?
8. **`statsHexagonMeta.lastTrainedByGroup`** is written by four code paths with two different derivations (regex `inferGroup` in D/U vs CORE's `lastTrained` in `useWorkoutManager.js:1184`/`useUserDoc.js:140`) and read by none. Keep writing it?
9. **Rank table oddities** (E8): two "Log N Workouts" tasks on `diamond-iv`; shoulder thresholds that go down between consecutive levels.
10. **`this_user`** (B20/G1): approve the coordinated signature change, or keep the dead first parameter?
11. **`deriveWorkoutMetrics`** counts sets without an `isDone` field as done (U:190), the calorie path excludes them (U:437), and `rebuildStatsFromWorkouts` ignores `isDone` entirely (U:255-258). Intended?
12. **File name**: after B1/B2 `backend/getUserFeed.js` only exports `getUserMessages`. Renaming needs sign-off (rule 8); otherwise it stays.
13. **`useWorkoutManager.js:161`** (E7): add the missing import (rank would start being written when a workout is finished)?
