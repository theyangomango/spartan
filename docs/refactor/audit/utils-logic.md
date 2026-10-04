# Audit: partition `utils-logic` (29 files, 2910 lines)

Read-only audit. Every file of the partition was read completely. All 29 files are byte-identical to
`SPX/baseline/<path>`, so line numbers below are valid for both. Paths are relative to the project root
`/Users/yangbai/Desktop/Projects/spartan`.

Headline numbers
- No file over ~500 lines (largest: `frontend/logic/communityStats.js`, 291 lines) -> no decomposition needed.
- About 470 lines are removable without behaviour change (dead exports, dead default-export objects, a superseded
  exercise catalog, dead helpers). Two files (`frontend/utils/friends.js`, `frontend/utils/scale.js`) become
  deletable once one import line each is redirected in another partition.
- No unambiguous latent bug. Five "looks wrong, intent unclear" items are in section I.
- One significant finding for the owner: `communityStats.js` computes a value that nothing in the app reads, yet it
  costs Firestore reads on every user-doc snapshot and gates app readiness in `App.js` (section I-1).

Housekeeping note: while comparing bodies I accidentally created one stray scratch file outside the allowed
directories: `/tmp/claude-501/spx/_tm_a.txt` (8 lines, a normalised copy of `toMillis`). It is harmless; I did not
delete it (no deletions). Nothing inside the project was written.

---------------------------------------------------------------------------------------------------------------

## A. Module map

Legend: (L) live importer, (P) parked importer, (D) dead importer (does not count).

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `frontend/logic/communityStats.js` (291) | Module-singleton that sums this week's reps/volume/PBs for the viewer + mutual friends (Firestore `users` docs in chunks of 10) | `initCommunityStats`, `refreshCommunityStats` (used); `getCommunityStatsSnapshot`, `subscribeCommunityStats`, `forceRefreshCommunityStats`, `useCommunityStats` (unused) | (L) `App.js:30` only (`:984` refresh, `:1203` init) |
| `frontend/logic/computeHexagonStats.js` (14) | Client wrapper around `shared/computeHexagon.js` injecting `calculate1RM` | default `computeHexagonStats` | (L) `frontend/logic/useWorkoutManager.js:27`, `frontend/hooks/useUserDoc.js:6` |
| `frontend/logic/exerciseCatalog.js` (257) | Exercise name -> {group, equipment} inference, plus an unused family/anchor catalog | used: `inferMetaByName`, `buildMetaFromDefs`; unused: `GROUP_KEYS`, `GROUP_WR`, `FULL_BODY_DIST`, `normalizeEquipment`, `FAMILIES`, `familyForExerciseName`, `familyAnchorFor`, `auditExerciseDefs` | (L) `frontend/screens/MuscleGroupExercises.js:18` only |
| `frontend/logic/messagesPreloader.js` (151) | Preloads chat list into `state/messagesCache`, keeps one `onSnapshot` per chat for the latest message | `syncMessageListeners`, `ensureMessageListener`, `preloadMessagesForUid`, `resetMessagesState`, `teardownMessageListeners` (internal use only) | (L) `App.js:82`, `frontend/screens/1.1_Messages.js:23` |
| `frontend/utils/authBackground.js` (27) | Preload + resolve the auth background image asset | `getAuthBackgroundSource`, `ensureAuthBackgroundAsync` | (L) `App.js:31`, `frontend/hooks/useAuthBackgroundSource.js:2` |
| `frontend/utils/bodyweight.js` (187) | Bodyweight resolution from user record; bodyweight/assisted classification of exercises | used: `BODYWEIGHT_DEFAULT_LB`, `resolveUserBodyweight`, `resolveExerciseWeighting`; internal-only: `inferBodyweightMode`; unused: `getCurrentUserBodyweight`, `isBodyweightMode`, `isBodyweightAssistedMode` | (L) `frontend/logic/useWorkoutManager.js:34`, `frontend/components/1_Feed/PastWorkoutExerciseLog.js:9`, `frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js:58`, `frontend/components/3_Workout/NewWorkout/Tracking/ExerciseLog.js:15`, `frontend/helper/estimateWorkoutCalories.js:1`, `backend/workouts/updateCompletedWorkout.js:7` (imports with explicit `.js`) |
| `frontend/utils/competitionTabEvents.js` (84) | `global`-backed pub/sub for "focus tab X on the Competition screen" + pending tab | `LADDER_SCROLL_TARGET_KEY`, `requestCompetitionTabFocus`, `consumePendingCompetitionTab`, `clearPendingCompetitionTab`, `subscribeCompetitionTabRequests`; default object (unused) | (L) `frontend/screens/1_Feed.js:54` and `:55` (two import statements), `frontend/screens/2_Competition.js:29-33`, `frontend/components/2_Competition/sections/ExercisesSection.js:31` |
| `frontend/utils/date.js` (40) | Day key, timestamp -> millis, workout timestamp formatting | `toDayKey`, `toMillis`, `formatWorkoutTimestamp` | (L) `frontend/logic/macroLogsIndexer.js:5`, `frontend/utils/loggedFoods.js:1`, `frontend/screens/MacroTracking.js:29`, `frontend/components/3_Workout/NewWorkout/SpectatingWorkoutModal.js:21`, `frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js:59`, `frontend/components/2_MacroTracking/MacroDayPage.js:7`; (D) `frontend/hooks/useFoodLogs.js` |
| `frontend/utils/favoriteFoods.js` (254) | Favourite foods: Firestore `usersPrivate/{uid}/favoriteFoods` + AsyncStorage/memory cache | `makeFoodFavoriteKey`, `getCachedFavoriteStatus`, `syncFavoriteFoodsFromBackend`, `fetchFavoriteFoods`, `upsertFavoriteFood`, `removeFavoriteFood`, `isFavoriteFood` (all used) | (L) `frontend/screens/FoodDetail.js:12`, `frontend/components/2_MacroTracking/FoodSearchOverlay.js:31-37` |
| `frontend/utils/foodCache.js` (27) | AsyncStorage cache of per-serving nutrition extras | `getFoodExtrasPS`, `setFoodExtrasPS` | (L) `frontend/screens/FoodDetail.js:10` |
| `frontend/utils/formatHexStat.js` (10) | One-decimal formatting of hexagon stats | named + default `formatHexStat` (only default is imported) | (L) `frontend/screens/1_Feed.js:59`, `frontend/components/1_Feed/FeedSnapshotCard.js:9`, `frontend/components/2_Competition/sections/ProgressSection.js:37`, `.../sections/ExercisesSection.js:32`, `.../UserStats/UserStatsProgressPreview.js:13`, `.../UserStats/UserStatsModal.js:18`, `.../UserStats/HexagonalStats.js:5` |
| `frontend/utils/friends.js` (84) | Leftovers of a friends-feed normaliser | used: `toMillis`; unused: `extractFollowingUids`, `chunk10`, `normalizeFriendWorkout`, `normalizeFriendLive` | (L) `frontend/screens/1_Feed.js:44` (`toMillis as toMillisSafe`); (D) `frontend/helper/useWorkoutFeed.js` |
| `frontend/utils/haptics.js` (57) | Thin wrappers over `expo-haptics` | used: `strong`, `deep`, `withStrongPress`; unused: `heavy`, `burst`, `success`, `warning`, `error`, default object | ~70 importers (L) across screens/components; (P) 10 Compete files (all use only `withStrongPress` / `strong`); `deep` only in `frontend/components/Footer.js:10` |
| `frontend/utils/hexagonEvents.js` (16) | Module-level pub/sub "hexagon changed" | `onHexagonUpdate`, `emitHexagonUpdate`; default object (unused) | (L) `frontend/logic/useWorkoutManager.js:29`, `frontend/screens/5_Profile.js:23` (inline `require`), `frontend/screens/1_Feed.js:47`, `frontend/screens/PastWorkoutScreen.js:27`, `frontend/screens/UserStatsScreen.js:10`, `frontend/components/1_Feed/SimpleFeedPost.js:30`, `frontend/components/2_Competition/UserStats/UserStatsBottomSheet.js:10`, `frontend/components/3_Workout/WorkoutExperiencePortal.js:8`, `frontend/hooks/useUserDoc.js:7` |
| `frontend/utils/livePostMeta.js` (125) | Builds metadata for a `workout:live*` post (likes/comments on live workouts) | used: `buildLivePostMetadata`; internal-only: `deriveWorkoutIdentityKey`; default object (unused) | (L) `frontend/components/1_Feed/Comments/CommentsBottomSheet.js:14`, `frontend/components/1_Feed/Posts/hooks/usePostFooterInteractions.js:12` |
| `frontend/utils/muscleTierColors.js` (88) | Hexagon score -> tier colour, muscle SVG fill map | used: `buildMuscleFillMap`, `DEFAULT_MUSCLE_SEGMENTS`; internal-only: `HEX_TIER_COLORS`, `resolveHexTierColor`; unused: `hexToRgba` | (L) `frontend/components/1_Feed/FeedSnapshotCard.js:15`, `.../sections/ProgressSection.js:48-51`, `.../sections/ExercisesSection.js:29`, `.../UserStats/UserStatsProgressPreview.js:14` |
| `frontend/utils/optimisticFeedPosts.js` (111) | In-memory store of posts being uploaded, with listeners + expiry timer | used: `addOptimisticFeedPost`, `removeOptimisticFeedPost`, `getOptimisticFeedPostsSnapshot`, `subscribeOptimisticFeedPosts`; unused: `updateOptimisticFeedPost`, default object | (L) `frontend/components/5_Profile/MakePost/PostUploadOptionsScreen.js:25`, `.../MakePost/ClipBuilderScreen.js:15`, `frontend/helper/useFilteredFeed.js:15-19` |
| `frontend/utils/pickAndUploadProfilePhoto.js` (96) | Pick -> compress -> upload `pfps/{uid}.png` -> update `usersPublic` | named + default `pickAndUploadProfilePhoto` (both forms imported) | (L) `frontend/screens/5_Profile.js:17` (default), `frontend/components/5_Profile/EditProfile/ProfilePicture.js:7` (named) |
| `frontend/utils/postTypes.js` (29) | Post type predicates | used: `isClipPost`; unused: `getPrimaryVideoEntry`, default object | (L) `frontend/screens/1_Feed.js:64`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:31`, `frontend/components/1_Feed/SimpleFeedPost.js:41`, `frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:17` |
| `frontend/utils/profilePhoto.js` (50) | Resolve a photo URL from the many legacy field names; back-fill legacy fields | `resolvePhotoURL`, `withLegacyPhotoFields` | (L) `App.js:33` (`withLegacyPhotoFields`) and 22 screens/components (`resolvePhotoURL`) |
| `frontend/utils/rankPromotionEvents.js` (65) | De-dupe key for rank promotions, stored on `global` per user | used: `buildRankPromotionKey`, `registerRankPromotionKey`; unused: `getLastRankPromotionKey`, default object | (L) `frontend/utils/userDataEvents.js:2` only (inside this partition) |
| `frontend/utils/resolveRankTierKey.js` (96) | Rank tier key / label resolution with viewer override from `global.userData` | default + named `resolveRankTierKey` (only default imported), `resolveRankLabel` | (L) `frontend/components/1.1_Messages/MessageCard.js:14`, `frontend/components/5_Profile/ProfileTop/ProfileRankBadge.js:4`, `frontend/components/1.2_Chat/ChatHeader.js:13`; (P) `frontend/components/2_Competition/Podium.js:10`, `.../LeaderboardCard.js:11` |
| `frontend/utils/scale.js` (2) | Forwarding barrel for `frontend/helper/scaleSize.js` | re-exports `ss, rs, hs, vs, ms, BASE_HEIGHT, BASE_WIDTH, scaleFactors` (only `ss` imported through this path) | (L) `frontend/components/3_Workout/NewWorkout/SpectatingWorkoutModal.js:15`, `.../NewWorkout/components/ConfirmWorkoutModal.js:7`; (D) `WorkoutReminderModal.js` |
| `frontend/utils/userDataEvents.js` (207) | `global`-backed pub/sub for `global.userData` changes + rank-promotion detection and queue | `emitUserDataUpdate`, `subscribeUserData`, `subscribeRankPromotions`, `dequeueRankPromotion`; default object (unused) | (L) `App.js:32`, `frontend/logic/useWorkoutManager.js:31`, `frontend/services/userProfileService.js:4`, `frontend/helper/feedSignals.js:15`, `frontend/hooks/useUserDoc.js:8`, `frontend/hooks/useSyncSavedExercises.js:4`, 20 screens/components (2 of them via inline `require`: `frontend/screens/ProfileLoggedFoodsScreen.js:142`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:377`); (P) `.../sections/LeaderboardsSection.js:36` |
| `frontend/utils/userRefs.js` (103) | uid coercion from heterogeneous user refs; viewer uid | used: `coerceUid`, `normalizeUserRef`, `ensureUidArray`, `getViewerUid`; unused: `mergeUidSets`, default object | (L) `frontend/screens/1.2_Chat.js:40`, `frontend/screens/1.1_Messages.js:25`, `frontend/screens/4.1_ViewProfile.js:26`, `frontend/components/1_Feed/FeedHeader.js:31`, `.../Posts/hooks/usePostFooterInteractions.js:9`, `frontend/components/1_Feed/SimpleFeedPost.js:38`, `.../MakePost/PostUploadOptionsScreen.js:23`, `.../MakePost/ClipBuilderScreen.js:20`, `frontend/hooks/useSuggestedUsersList.js:4`, `frontend/hooks/useSyncSavedExercises.js:5`, `frontend/hooks/useHeaderSearchUsers.js:5`, `frontend/helper/useFilteredFeed.js:14`, `frontend/helper/feedSignals.js:14`; (P) `.../sections/LeaderboardsSection.js:40` |
| `frontend/utils/usernameRegistration.js` (16) | Handle sanitising/validation + claim | `USERNAME_REGEX`, `sanitizeHandle`, `claimHandle` | (L) `frontend/screens/0.4_CreateUsername.js:19`, `frontend/screens/ChangeUsername.js:19`, `frontend/screens/0.2_NewUserCreation.js:17` |
| `frontend/utils/weightEntries.js` (63) | Derive the public weight fields from weight entries | used: `derivePublicWeightFields`; internal-only: `selectLatestWeightEntry`; default object (unused) | (L) `frontend/screens/WeightMeasurementsScreen.js:27`, `.../sections/ProgressSection.js:30` |
| `frontend/utils/workoutPrivacy.js` (214) | Profile/workout visibility rules | used: `coercePrivacyMode`, `canViewerAccessProfile`, `canViewWorkout`, `filterViewableWorkouts`, `sanitizeStatsForViewer`; internal-only: `resolveWorkoutOwnerUid`, `isViewerFriend`; unused: `PRIVACY`, default object | (L) `frontend/logic/communityStats.js:4`, `frontend/logic/useWorkoutManager.js:30`, `frontend/screens/ProfileLoggedFoodsScreen.js:19`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:26`, `frontend/screens/4.1_ViewProfile.js:6`, `frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js:13`, `.../UserStats/effectiveStatsUser.js:1`, `.../UserStats/UserStatsWorkoutViewerScreen.js:5`, `.../UserStats/UserStatsModal.js:13`; (P) `.../sections/LeaderboardsSection.js:37` |
| `frontend/utils/workoutSummary.js` (117) | "N x Exercise / best set" summaries for feed cards | named + default `buildExerciseSummaries` (only named imported) | (L) `frontend/components/1_Feed/SimpleFeedPost.js:27` |

Internal dependencies inside the partition: `communityStats -> workoutPrivacy`; `userDataEvents -> rankPromotionEvents`
(+ `shared/rankProgress.js`); `usernameRegistration -> frontend/services/userProfileService.js` (which itself imports
`userDataEvents`); `scale -> frontend/helper/scaleSize.js`; `computeHexagonStats -> frontend/helper/calculate1RM.js`,
`shared/computeHexagon.js`; `bodyweight -> components/3_Workout/NewWorkout/SelectExercise/EXERCISES`;
`friends -> backend/helper/makeID` (only for dead code).

---------------------------------------------------------------------------------------------------------------

## B. Verified dead code

Every item was verified with a whole-repo grep (`App.js frontend backend shared functions scripts tests`, plus
`docs/`, `prompts/`), including default imports, namespace imports, `require()` and string uses. No item below is used
by a PARKED file (the PARKED files import from this partition only: `haptics.withStrongPress`, `haptics.strong`,
`resolveRankTierKey` default, `userDataEvents.subscribeUserData/emitUserDataUpdate`,
`workoutPrivacy.canViewerAccessProfile`, `userRefs.coerceUid/ensureUidArray/getViewerUid` -> all KEEP, all also used
by LIVE code).

No module in the partition is default-imported except `computeHexagonStats`, `formatHexStat`, `resolveRankTierKey`,
`pickAndUploadProfilePhoto`; therefore every `export default { ... }` aggregate object is dead.

### B1. Dead default-export aggregate objects (delete the statement)
| File:lines | Evidence |
|---|---|
| `frontend/utils/competitionTabEvents.js:79-84` | all 4 importers use named imports |
| `frontend/utils/haptics.js:48-57` | ~80 importers, all named |
| `frontend/utils/hexagonEvents.js:15` (and blank line 16) | named imports / destructured `require` only |
| `frontend/utils/livePostMeta.js:122-125` | 2 importers, named |
| `frontend/utils/optimisticFeedPosts.js:105-111` | 3 importers, named |
| `frontend/utils/postTypes.js:26-29` | 4 importers, named |
| `frontend/utils/rankPromotionEvents.js:61-65` | 1 importer, named |
| `frontend/utils/userDataEvents.js:202-207` | 27 importers, named or destructured `require` |
| `frontend/utils/userRefs.js:97-103` | 14 importers, named |
| `frontend/utils/weightEntries.js:60-63` | 2 importers, named |
| `frontend/utils/workoutPrivacy.js:205-214` | 10 importers, named |
| `frontend/utils/workoutSummary.js:117` (`export default buildExerciseSummaries;`) | only importer uses the named form (`SimpleFeedPost.js:27`) |

### B2. Dead functions / constants (delete the declaration)
| Identifier | Kind | File:lines | Evidence |
|---|---|---|---|
| `useCommunityStats` | hook | `frontend/logic/communityStats.js:287-291` | 0 references outside its definition |
| `forceRefreshCommunityStats` | function | `communityStats.js:283-285` | 0 references |
| `subscribeCommunityStats` | function | `communityStats.js:176-181` | only caller is `useCommunityStats` (dead) |
| `getCommunityStatsSnapshot` | function | `communityStats.js:172-174` | only callers are the two dead functions above |
| `listeners`, `emit` and the 5 `emit()` calls | module state / function | `communityStats.js:11`, `:26-31`, calls at `:198`, `:204`, `:241`, `:253`, `:275` | once `subscribeCommunityStats` is gone nothing can ever add to `listeners`, so `emit()` is a no-op (it copies `snapshot` and iterates an empty Set) |
| `import { useEffect, useState } from "react"` | import | `communityStats.js:1` | only used by `useCommunityStats` |
| `ownerId`, `isViewerOwner` | locals | `communityStats.js:129-130` | ESLint `no-unused-vars`; `ownerId` is only read by `isViewerOwner` |
| `GROUP_KEYS` | const | `frontend/logic/exerciseCatalog.js:31` | no importer (the live copies are `shared/hexagon/computeHexagonCore.js:4` and a local one in `UserStatsAfterWorkoutSheet.js:14`) |
| `GROUP_WR` | const | `exerciseCatalog.js:33-35` | only read by dead `familyAnchorFor` |
| `FULL_BODY_DIST` | const | `exerciseCatalog.js:37-38` | only read by dead `FAMILIES` |
| `normalizeEquipment` (+ JSDoc) | function | `exerciseCatalog.js:40-71` | no importer; `shared/hexagon/computeHexagonCore.js:81` is the live one (different body) |
| `D` | helper | `exerciseCatalog.js:75-76` | only used by dead `FAMILIES` / `familyAnchorFor` |
| `FAMILIES` | const | `exerciseCatalog.js:73-137` | only read by dead `familyForExerciseName` |
| `familyForExerciseName` | function | `exerciseCatalog.js:139-147` | only called by dead `familyAnchorFor` / `auditExerciseDefs` |
| `familyAnchorFor` | function | `exerciseCatalog.js:149-154` | no importer (live one: `computeHexagonCore.js:101`) |
| `auditExerciseDefs` (+ JSDoc) | function | `exerciseCatalog.js:221-256` | 0 references (only its own header comment at `:22`) |
| header comment | stale notes | `exerciseCatalog.js:1-29` | describes anchors / families / equipment normalisation / audit flow, all of which are removed above. Replace with a 2-line header describing what remains (`inferMetaByName`, `buildMetaFromDefs`) |
| (summary for `exerciseCatalog.js`) | - | delete `:31-154` and `:221-257`; keep `:156-219` verbatim | the kept code (`inferMetaByName` `:156-189`, `buildMetaFromDefs` `:191-219`) references nothing in the deleted ranges |
| `getCurrentUserBodyweight` | function | `frontend/utils/bodyweight.js:170-172` | 0 references |
| `isBodyweightMode`, `isBodyweightAssistedMode` | functions | `bodyweight.js:174-175` | 0 references |
| `preferMeasurements` option | never-passed option | `bodyweight.js:125` (destructure) and `:142-144` | all 4 call sites pass exactly `(x, null, { measurementsOnly: true })`: `useWorkoutManager.js:1045`, `ActiveWorkoutModal.js:254`, `estimateWorkoutCalories.js:245`, `backend/workouts/updateCompletedWorkout.js:461` |
| `extractFollowingUids` | function | `frontend/utils/friends.js:13-20` | 0 references |
| `chunk10` | function | `friends.js:22-26` | 0 references (`useCommunityActivity.js:46` has its own local copy) |
| `normalizeFriendWorkout` | function | `friends.js:28-62` | 0 references |
| `normalizeFriendLive` | function | `friends.js:64-84` | 0 references |
| `import makeID` | import | `friends.js:2` | only used by the two dead normalisers |
| `// screens/Workout/utils/friends.js` | stale path comment | `friends.js:1` | the file does not live there |
| `heavy` | function | `frontend/utils/haptics.js:8-10` | 0 references |
| `burst` | function | `haptics.js:17-26` | 0 references |
| `success`, `warning`, `error` | functions | `haptics.js:36-38`, `:40-42`, `:44-46` | 0 references (only the dead default object) |
| `hexToRgba` | function | `frontend/utils/muscleTierColors.js:34-50` and export line `:86` | 0 references (`NotificationCard.js:79` defines its own, different, `hexToRgba`) |
| `updateOptimisticFeedPost` | function | `frontend/utils/optimisticFeedPosts.js:72-78` | 0 references |
| `getPrimaryVideoEntry` | function | `frontend/utils/postTypes.js:14-24` | 0 references |
| `getLastRankPromotionKey` | function | `frontend/utils/rankPromotionEvents.js:49-59` | 0 references |
| `mergeUidSets` | function | `frontend/utils/userRefs.js:59-63` | 0 references to the frontend copy (the backend copy in `backend/helper/userRefs.js:61` is a different module, also unused -> other partition) |
| `PRIVACY` | const alias | `frontend/utils/workoutPrivacy.js:185` | 0 references. Keep `PRIVACY_MODES` (`:1-5`): `coercePrivacyMode` reads `.GLOBAL` |
| `extraCandidates` parameter | never-passed param | `frontend/utils/resolveRankTierKey.js:32` and `:47-49` | all 5 call sites pass one argument (`MessageCard.js:98`, `ChatHeader.js:41`, `ProfileRankBadge.js:11`, (P) `Podium.js:116`, (P) `LeaderboardCard.js:63`) and `resolveRankLabel` calls it with one (`:88`). Safe to drop; low value, optional |

### B3. Exports that are only used inside their own file (drop the `export` keyword, keep the code)
| Identifier | File:line |
|---|---|
| `teardownMessageListeners` | `frontend/logic/messagesPreloader.js:69` (used at `:148`) |
| `inferBodyweightMode` | `frontend/utils/bodyweight.js:46` (used at `:183`) |
| `deriveWorkoutIdentityKey` | `frontend/utils/livePostMeta.js:29` (used at `:88`) |
| `HEX_TIER_COLORS`, `resolveHexTierColor` | `frontend/utils/muscleTierColors.js:83`, `:84` in the export list (used at `:57`, `:73`) |
| `selectLatestWeightEntry` | `frontend/utils/weightEntries.js:17` (used at `:42`) |
| `resolveWorkoutOwnerUid`, `isViewerFriend` | `frontend/utils/workoutPrivacy.js:84`, `:97` (used at `:167`, `:155`) |

### B4. Same binding exported twice (keep the form callers use)
| File | Keep | Drop |
|---|---|---|
| `frontend/utils/formatHexStat.js` | `export default formatHexStat;` (`:10`) - all 7 importers use default | the `export` keyword on `:2` |
| `frontend/utils/resolveRankTierKey.js` | `export default resolveRankTierKey;` (`:96`) - all 5 importers (2 PARKED) use default | the `export` keyword on `:32` |
| `frontend/utils/workoutSummary.js` | named export (`:92`) | default (`:117`), listed in B1 |
| `frontend/utils/pickAndUploadProfilePhoto.js` | BOTH forms are imported today (`5_Profile.js:17` default, `ProfilePicture.js:7` named). Needs a one-line change in another partition first -> see G4 |

### B5. Forwarding-only module
`frontend/utils/scale.js:2` re-exports 8 names from `../helper/scaleSize`; only `ss` is imported through this path, by 2
LIVE files that ALSO import `helper/scaleSize` directly (`SpectatingWorkoutModal.js:15`+`:20`,
`ConfirmWorkoutModal.js:6`+`:7`). About 158 import statements reach `helper/scaleSize` directly. See G3; after that redirect the file
has no importers -> add to "files that can now be deleted". If G3 is not done, at least reduce the re-export list to
`ss`.

### B6. Unreachable by current callers but NOT recommended for removal (API surface / defensive)
Recorded so the implementer does not rediscover them; leave unless the owner wants a deeper cut.
- `bodyweight.js:146-167` (direct-field candidates + fallback): unreachable because every caller passes
  `measurementsOnly: true`. Removing it would also make the `fallback` default and `BODYWEIGHT_DEFAULT_LB`'s use at
  `:120` pointless. It is the documented general behaviour of the helper; leave (see I-7).
- `bodyweight.js:51-53`: when reached through its only caller `resolveExerciseWeighting` (`:177-187`) the same map
  lookup has already returned at `:180-181`, so these two `if`s can never be true. Harmless; leave.
- `communityStats.js:213-216` (`options.reset`): `App.js:1203` calls `initCommunityStats()` with no argument.
- `communityStats.js:245-250` (staleness short-circuit, `STALE_AFTER_MS` at `:6`): both live callers pass `force: true`
  (`App.js:984`, internal `:207`), so the `!force` path never runs.
- `favoriteFoods.js:167-169` (`refreshRemote` true branch): the only caller passes `refreshRemote: false`
  (`FoodSearchOverlay.js:605`).
- `pickAndUploadProfilePhoto.js:28-30`: options `compressQuality`, `alertOnPermissionDenied`, `imagePickerOptions`
  are passed by no caller (both callers pass only `onPreview`/`onUploaded`).
- `rankPromotionEvents.js:41-43` (no-user fallback key): the only caller (`userDataEvents.js:137`) runs after
  `detectAndQueuePromotion` has already returned for a payload without uid (`userDataEvents.js:120-128`).
- `workoutPrivacy.js:75` and `:77`: after `hasOwnProperty(targetUid)` failed at `:73` these can never be true.
- `workoutPrivacy.js:101-103`: the only caller (`:155`) always passes a truthy `viewerData`.
- `muscleTierColors.js:56`: `threshold` is always found (the last entry has `min: 0` and `value > 0`).
- `workoutSummary.js:92` default `limit = 3`: the only caller passes `Number.MAX_SAFE_INTEGER`.

---------------------------------------------------------------------------------------------------------------

## C. Duplication

### C1. Timestamp -> milliseconds (`toMillis` family). About 30 definitions repo-wide; almost none are identical.
Definitions inside this partition:
- (a) `frontend/utils/date.js:6-18` `toMillis` (exported)
- (b) `frontend/utils/friends.js:4-11` `toMillis` (exported; imported by `1_Feed.js:44` as `toMillisSafe`)
- (c) `frontend/logic/communityStats.js:60-67` `toMillis` (local)
- (d) `frontend/utils/favoriteFoods.js:32-52` `toMillis` (local)
- (e) `frontend/utils/livePostMeta.js:1-27` `toMillisSafe` (local)

Outside the partition (for reference): `frontend/logic/useWorkoutManager.js:37-44`,
`frontend/hooks/useCommunityActivity.js:5-12`, `frontend/hooks/useLiveFollowing.js:6-12`,
`frontend/screens/feed/hooks/useFeedUserData.js:18-24`, `frontend/helper/feedRanking.js:1-15`,
`frontend/helper/estimateWorkoutCalories.js:66-85`, `frontend/components/1_Feed/SimpleFeedPost.js:61-73` and `:992-1008`,
`frontend/components/1.1_Messages/MessageCard.js:36-47`, `frontend/components/1.2_Chat/MessageItem.js:104-112`,
`frontend/screens/1.2_Chat.js:604-612`, `frontend/components/1_Feed/Notifications/NotificationsModal.js:224-230`,
`frontend/components/3_Workout/NewWorkout/Group/GroupModal.js:24-30`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:39-45`,
`frontend/screens/PastWorkoutScreen.js:51-80`, `frontend/components/2_Competition/UserStats/userStatsUtils.js:53-66`,
`.../UserStats/UserStatsProgressPreview.js:63`, `.../sections/ProgressSection.js:219`, `frontend/screens/ExerciseDetail.js:199`,
`frontend/screens/MuscleGroupExercises.js:223`, `backend/workouts/updateCompletedWorkout.js:21-40`,
`backend/workouts/deleteCompletedWorkout.js:20-32`, plus functions/ copies.

Verdicts:
- **(b) == (c) == `useWorkoutManager.js:37-44` == `useCommunityActivity.js:5-12`: IDENTICAL** (verified by a normalised
  text comparison: same six statements in the same order; only parameter/local names and `const` vs `function`
  differ). number -> as is (NaN included); Date -> `getTime()`; truthy `.toMillis` -> call it; numeric `.seconds` ->
  `*1000`; else `new Date(v).getTime()` or 0.
- **(a) vs (b): identical for every input that does not throw.** (a) adds `value == null -> 0` (same result as (b):
  `new Date(null).getTime()` is 0, `new Date(undefined)` is NaN -> 0), requires `typeof toMillis === 'function'` and wraps
  the call in try/catch. The only differing inputs are an object whose `toMillis` property is truthy but not a function
  ((b) throws a TypeError, (a) falls through) and a `toMillis()` that throws ((b) propagates, (a) falls through to
  `.seconds`/Date parsing). Firestore `Timestamp`, `{seconds,nanoseconds}`, numbers, strings, Dates, null all give the
  same number.
- (d) is NOT identical to any other: number -> 0 when not finite; no `instanceof Date` branch, so a Date goes through
  `Date.parse(String(date))` and loses its milliseconds; reads `_seconds`/`nanoseconds`. Keep local.
- (e) is NOT identical: returns `null` (not 0) on failure, reads `nanoseconds ?? nanos`. Keep local.
- `useLiveFollowing.js:6-12` lacks the `.seconds` branch; `useFeedUserData.js:18-24` lacks `instanceof Date` (differs
  only for an invalid Date: NaN vs 0); `feedRanking.js`, chat/message variants (seconds->ms heuristics `t < 1e12`),
  `GroupModal`/`ProfileWorkoutsAndPosts` (return `undefined`) all differ. Leave them.

Recommended canonical home: `frontend/utils/date.js` `toMillis`.
Recommended action (strictly safe subset): make (c) import the shared helper instead of redefining it, and ask the
owning partitions to do the same for `useWorkoutManager.js:37-44` and `useCommunityActivity.js:5-12` (G2). If the
implementer wants zero semantic delta, point all four at `friends.js` `toMillis` (byte-equivalent) - but `friends.js`
is otherwise dead and misnamed, so the better end state is: move the four onto `date.js` `toMillis` (difference only
on inputs that used to throw) and retire `friends.js` (G1). State which option was taken in the report.

### C2. `KG_TO_LB = 2.2046226218488`
- `frontend/utils/bodyweight.js:83`
- `frontend/utils/weightEntries.js:1`
- (P) `frontend/components/2_Competition/sections/LeaderboardsSection.js:113` (cannot be edited)
- `functions/index.js:2738` (cannot import from the app)
Identical literal. Canonical home: export it from `frontend/utils/weightEntries.js` and import it in `bodyweight.js`
(`bodyweight.js` is also loaded by `backend/workouts/updateCompletedWorkout.js`; `weightEntries.js` has no imports, so
that stays safe). Related but different constant: `KG_PER_LB = 0.45359237` in `frontend/helper/estimateWorkoutCalories.js:5`
and `frontend/utils/macroRecommendations.js:10` (other partitions; identical to each other, not the reciprocal to full
precision - do not derive one from the other).

### C3. Global-backed listener Set getters
- `frontend/utils/userDataEvents.js:8-22` `getSet`
- `frontend/utils/userDataEvents.js:24-38` `getPromotionSubscribers`
- `frontend/utils/competitionTabEvents.js:5-19` `getListenerSet`
Identical bodies apart from the key constant (`Object.defineProperty(global, KEY, { value: new Set(), configurable: true,
enumerable: false, writable: false })` inside try, `null` on failure). Semantically identical. Optional: one
parameterised `getGlobalSet(key)`; the two copies inside `userDataEvents.js` are the natural first step. Low value,
low risk; because rule 3 prefers moving over rewriting, I would only do the in-file merge, or leave as is.

### C4. `frontend/utils/userRefs.js` vs `backend/helper/userRefs.js`
- `coerceUid`: `frontend/utils/userRefs.js:19-33` vs `backend/helper/userRefs.js:21-35`. Same algorithm, but the frontend
  `UID_KEYS` (`:3-17`) has three extra keys: `"docId"`, `"_id"`, `"objectID"`. NOT identical: for an object that only
  carries one of those keys the frontend returns the id, the backend returns `""`.
- `normalizeUserRef` (`:35-44` vs `:37-46`) and `ensureUidArray` (`:46-57` vs `:48-59`, `forEach` vs `for..of`; both
  skip holes/undefined) and `mergeUidSets` (`:59-63` vs `:61-66`) are identical modulo `coerceUid`.
- The frontend file additionally has `getViewerUid` (`:65-95`) and imports `auth`.
Do not merge (backend importers `sendMessageV2.js`, `getUserFeed.js`, `blockUser.js`, `unblockUser.js` would start
accepting `docId/_id/objectID`). Five more private `coerceUid` copies exist in `backend/user/{followUser,unfollowUser,
acceptFollowRequest,cancelFollowRequest,declineFollowRequest}.js:6-13` (identical to each other, different from both
files above: only `uid/id/userUid/profileUid`, and `value.uid || ...` instead of own-property checks) -> backend partition.

### C5. Workout identity key
- `frontend/utils/livePostMeta.js:29-64` `deriveWorkoutIdentityKey`
- `frontend/helper/useFilteredFeed.js:65-92` `workoutIdentityKey` (jscpd clone)
NOT identical: the first line differs. livePostMeta derives `createdMs` from `toMillisSafe(created ?? createdAt ??
finishedAt ?? completedAt)`; useFilteredFeed uses its own `resolveTimestamp(workout)` (`sortKey`, `created`,
`createdAt`, `updatedAt`, nested `workout.*`, first truthy parseable). The produced keys differ for workouts that have
`sortKey`/`updatedAt`, or a `finishedAt` earlier in priority. Leave both.

### C6. Rank snapshot
- `frontend/utils/userDataEvents.js:86-101` `buildRankSnapshot` -> `{ entry, index }`
- `frontend/screens/1_Feed.js:257-272` `buildRankSnapshot` -> `{ entry, index, progress }` (jscpd clone)
The feed version is a strict superset (it also returns `progress`, which the feed reads at `1_Feed.js:390`).
`userDataEvents` reads only `.entry`/`.index`. Could be unified by exporting the superset from `userDataEvents.js`
(only effect: the module keeps a reference to `progress` in `lastRankSnapshot`). Optional; not required. Note that
the rank progress is computed twice per `emitUserDataUpdate()` today (once here, once in the feed subscriber).

### C7. Exercise catalog vs shared hexagon core
- `frontend/logic/exerciseCatalog.js:159-189` `inferMetaByName` vs `shared/hexagon/computeHexagonCore.js:108-148`
  `defaultResolveMeta` (jscpd clone of the equipment ternary, 167-184 vs 126-143). NOT identical: group regexes differ
  (`push[- ]?up` vs `push-up|push up`; `calf|thrust` vs `calf`; `trap|face pull` vs `trap`;
  `...|v[- ]?up|rollout|wheel` vs `...|v[- ]?up`), the last equipment condition differs (regex
  `/push[- ]?up|pull[- ]?up|chin[- ]?up|dip/` vs four `includes`), and the shared one short-circuits on an empty name.
  Leave both.
- `GROUP_KEYS`, `GROUP_WR`, `FULL_BODY_DIST`, `normalizeEquipment`, `familyAnchorFor`, `FAMILIES` in `exerciseCatalog.js`
  are older, different variants of the shared core's (`computeHexagonCore.js:4-106`). They are dead (B2); delete, do
  not merge.
- `buildMetaFromDefs` (`exerciseCatalog.js:195-219`) vs `shared/hexagon/exerciseCatalogMeta.js` `normalizeGroup`/`register`:
  different group mapping (no `delt`/`pec`/`bicep`/`glute`/`lats` synonyms, different key normalisation). Leave both.

### C8. Day key (`YYYY-MM-DD`)
`frontend/utils/date.js:3-4` `toDayKey(d)` takes a `Date` and has no guards. Other formatters:
`frontend/logic/useWorkoutManager.js:80-87`, `frontend/screens/1_Feed.js:93`, `frontend/components/common/HistoryCalendarModal.js:12-18`,
`backend/workouts/updateCompletedWorkout.js:43-50`, `backend/workouts/deleteCompletedWorkout.js:34-41`,
`shared/hexagon/computeHexagonCore.js:150-156`, `frontend/components/2_Competition/UserStats/effectiveStatsUser.js:3-9`.
All produce the same string format but each has different input coercion/guards (millis vs Date, `""`/`null`/now
fallbacks, `setHours(0,0,0,0)`). NOT identical as functions. No action in this partition.

### C9. Handle validation
- `frontend/utils/usernameRegistration.js:3` `USERNAME_REGEX` == `frontend/services/userProfileService.js:13` `HANDLE_REGEX`
  (identical regex, no `g` flag) == `functions/index.js:34`.
- `usernameRegistration.js:5-8` `sanitizeHandle` vs the inline expression at `userProfileService.js:357` (same replace /
  lowercase / slice, applied to an already-trimmed non-empty string -> same result for those inputs).
`usernameRegistration.js` already imports `userProfileService.js`, so importing the other way would create a cycle.
Clean option: `userProfileService.js` exports `HANDLE_REGEX`, `usernameRegistration.js` does
`export const USERNAME_REGEX = HANDLE_REGEX` - or leave. Low value; see G6.

### C10. Small same-shape helpers that are NOT identical (leave)
- "current user from global": `bodyweight.js:70-76` (`null` fallback), `communityStats.js:40-42` (`{}` fallback),
  `workoutPrivacy.js:9-12` (argument first). `workoutPrivacy.js:101-103` is an inline duplicate of `getViewerData`
  (`:9-12`) and could call it (identical behaviour) - optional.
- trimmers: `optimisticFeedPosts.js:8-12`, `resolveRankTierKey.js:1-5`, `favoriteFoods.js:15`, `bodyweight.js:44`,
  `profilePhoto.js:14-18` differ in how `0`, non-strings and case are treated.
- uid extractors: `workoutPrivacy.js:14-31` `extractUid`, `communityStats.js:44-51` `normalizeUid`,
  `userRefs.js:19-33` `coerceUid` use different key lists and trimming.
- latest weight entry: `bodyweight.js:94-118` `pickLatestEntry` (requires positive weight, reads `value`, `updatedAt`,
  `units`) vs `weightEntries.js:17-32` `selectLatestWeightEntry` (keeps the whole entry, no weight check).
- chunking: `communityStats.js:53-58` `chunkArray(arr, size)` (guards non-arrays) vs dead `friends.js:22-26` `chunk10`
  vs `useCommunityActivity.js:46-50` `chunk10`.
- `hexToRgba`: dead copy in `muscleTierColors.js:34-50` vs live `NotificationCard.js:79` (different signature).

---------------------------------------------------------------------------------------------------------------

## D. Decomposition plans for files over ~500 lines

None. The largest files are `communityStats.js` (291), `exerciseCatalog.js` (257; ~65 after B2),
`favoriteFoods.js` (254), `workoutPrivacy.js` (214), `userDataEvents.js` (207). Each has one responsibility; do not
split.

---------------------------------------------------------------------------------------------------------------

## E. Latent bugs with minimal fixes

No unambiguous latent bug (no undefined names, duplicate keys, conditional hooks; ESLint reports only the unused
variable in B2). Candidates where the right fix is NOT obvious are recorded as open questions (section I), not fixes:

| # | File:line | Observation | Confidence it is a bug | Action |
|---|---|---|---|---|
| E1 | `frontend/utils/optimisticFeedPosts.js:25-41` | The expiry timer is one-shot: it fires 2 min after the first add, removes entries older than 2 min, and is only re-armed by the next `addOptimisticFeedPost`. An entry added shortly before it fires is never expired by the "fallback cleanup" unless another post is added. | medium | Do not fix (re-arming changes timer behaviour). I-5 |
| E2 | `frontend/utils/userDataEvents.js:156` and `:194` | `try { listener(x); } catch { listener(fallback); }`: if the listener itself throws, it is called a second time with `[]`/`null`, unguarded (a second throw escapes `subscribe`). | low-medium | Do not fix. I-4 |
| E3 | `frontend/logic/communityStats.js:186-199` + `:276-278` | On uid change `refreshPromise` is nulled while an older refresh may still be in flight; when the old one settles it overwrites `snapshot` and its `finally` nulls a newer `refreshPromise`. Unobservable today because nothing reads the snapshot. | low | Leave |
| E4 | `frontend/logic/messagesPreloader.js:134-144` | If a preload for uid A is in flight and one for uid B starts, A's completion writes `{ promise: null, uid: A }` over B's state. Only reachable on a fast account switch; `resetMessagesState()` is called on sign-out. | low | Leave |
| E5 | `frontend/utils/userDataEvents.js:51-53` | `getPromotionQueue` returns a throw-away `[]` if `defineProperty` fails, so pushes would be lost. Purely defensive path. | low | Leave |

---------------------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Issue | Where | Risk | Recommendation |
|---|---|---|---|---|
| F1 | Dead exports / dead default objects widen every module's public surface | section B | none | remove |
| F2 | Same binding exported as default and named | `formatHexStat.js:2/10`, `resolveRankTierKey.js:32/96`, `workoutSummary.js:92/117`, `pickAndUploadProfilePhoto.js:25/96` | none for the first three; the fourth needs G4 | keep the form callers use |
| F3 | A module reached through two paths | `utils/scale.js` -> `helper/scaleSize.js` | none | G3, then list `scale.js` as deletable |
| F4 | Unused React import + hook in a non-UI logic module | `communityStats.js:1`, `:287-291` | none | remove with B2 |
| F5 | Error-path logging uses `console.log` | `communityStats.js:29`, `:164`, `:209`, `:267` | changing to `console.warn` would surface LogBox warnings in dev | keep as is (these are failure logs, not tracing; `:29` disappears with `emit`) |
| F6 | Repeated bound expression `Math.max(1, Math.min(MAX_FAVORITES, Number(max) \|\| 200))` | `favoriteFoods.js:138`, `:153`, `:156`, `:163` | low | optional: one local `boundMax(max)` helper; pure, same result |
| F7 | Two identical getters in one file | `userDataEvents.js:8-22` / `:24-38` (C3) | low | optional in-file parameterisation |
| F8 | Inline duplicate of an existing helper | `workoutPrivacy.js:101-103` duplicates `getViewerData` (`:9-12`) | low | optional: `const viewer = getViewerData(viewerData);` |
| F9 | Redundant guard | `userDataEvents.js:83` `Array.isArray(steps) &&` (`steps` is always an array); `messagesPreloader.js:81` `...(docData \|\| {})` (`docData` is already defaulted at `:78`); `haptics.js:31` `try { strong(); } catch {}` (`strong` never throws) | none | leave (not worth a diff) or drop while touching the line |
| F10 | Stale / wrong header comment | `friends.js:1` (wrong path), `exerciseCatalog.js:1-29` (describes removed code) | none | fix with B2 |
| F11 | Import grouping: local `firebase.config` before third-party imports | `favoriteFoods.js:1-13` | reordering an import of a side-effect module changes evaluation order in principle (in practice `firebase.config` is already evaluated by `App.js`) | leave the order |
| F12 | Mixed quote styles inside one file | `workoutPrivacy.js` (double quotes at `:1-31`, `:61-127`; single at `:33-59`, `:129-203`), `friends.js:60`, `:82` | - | do not normalise (rule 6) |
| F13 | Wrapper passes options equal to the callee's defaults | `computeHexagonStats.js:11` `clampLegacy: true` equals the core default (`computeHexagonCore.js:211`); `includeDebug: true` (`:10`) makes the core build a `debug` object that no client code reads (grep for `.debug` finds only the producer) | changing `includeDebug` changes the returned object's shape | leave; I-6 |

No components, StyleSheets, animation worklets or JSX exist in this partition; the only hook is the dead
`useCommunityStats`. No effect/cleanup issues inside the partition.

---------------------------------------------------------------------------------------------------------------

## G. Cross-partition requests

| # | Target file(s) (partition) | Request | Why |
|---|---|---|---|
| G1 | `frontend/screens/1_Feed.js:44` (feed-screen) | Change `import { toMillis as toMillisSafe } from "../utils/friends";` to import from `"../utils/date"`. | After B2, `friends.js` contains only `toMillis`; with this redirect it has no live importer and can be listed as deletable. `date.js` `toMillis` returns the same number for every non-throwing input (C1); the call site (`1_Feed.js:856`) passes `created/createdAt/finishedAt/completedAt/startedAt` values. |
| G2 | `frontend/logic/useWorkoutManager.js:37-44` (workout-active), `frontend/hooks/useCommunityActivity.js:5-12` (helpers-hooks) | Replace the local `toMillis` with an import of the shared one (same choice as G1). | Bodies are identical to `friends.js:4-11` / `communityStats.js:60-67` (C1). |
| G3 | `frontend/components/3_Workout/NewWorkout/SpectatingWorkoutModal.js:15` (workout-active), `frontend/components/3_Workout/NewWorkout/components/ConfirmWorkoutModal.js:7` (workout-tracking) | Import `ss` from `helper/scaleSize` (both files already import the default from it: `:20` / `:6`), e.g. `import scaleSize, { ss as scaledSize } from ".../helper/scaleSize";`. | Removes the second path to the same module; `frontend/utils/scale.js` then has no importer (deletable). |
| G4 | `frontend/components/5_Profile/EditProfile/ProfilePicture.js:7` (profile) | Use the default import: `import pickAndUploadProfilePhoto from "../../../utils/pickAndUploadProfilePhoto";` (the form `frontend/screens/5_Profile.js:17` uses). | Then the `export` keyword on `pickAndUploadProfilePhoto.js:25` can be dropped (single export form). |
| G5 | `frontend/screens/1_Feed.js:54-55` (feed-screen) | Merge the two imports from `"../utils/competitionTabEvents"` into one statement. | Duplicate import of the same module. |
| G6 | `frontend/services/userProfileService.js:13`, `:357` (app-shell) | Optional: export `HANDLE_REGEX` and let `usernameRegistration.js` alias it; do not import `usernameRegistration` from the service (cycle). | C9. |
| G7 | `frontend/screens/5_Profile.js:23`, `frontend/screens/ProfileLoggedFoodsScreen.js:142`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:377` (profile; `ProfileLoggedFoodsScreen.js` is in macro-screens) | Replace the inline `require('../utils/hexagonEvents')` / `require('../utils/userDataEvents')` with static imports (`5_Profile.js` already statically imports `userDataEvents` at `:14`). | Neither module has an import cycle with a screen (`hexagonEvents` has no imports; `userDataEvents` imports only `shared/rankProgress.js` and `rankPromotionEvents`), and both are already evaluated at startup via `App.js` / `useWorkoutManager`. The named exports they destructure stay. |
| G8 | `App.js:30`, `:152`, `:983-988`, `:1192-1209`, `:1349` (app-shell) | No change now. If the owner answers I-1 with "remove", these are the lines to delete together with `frontend/logic/communityStats.js`. | I-1. |
| G9 | `frontend/screens/1_Feed.js:257-272` (feed-screen) | Optional: import a shared `buildRankSnapshot` (superset version) from `userDataEvents.js` instead of redefining it. | C6. Only if the implementer of `userDataEvents.js` exports it. |
| G10 | `backend/helper/userRefs.js` and `backend/user/*.js` (backend-shared) | Be aware `coerceUid` exists in 3 behaviourally different variants (C4); do not fold them into `frontend/utils/userRefs.js` without an owner decision. | C4. |

Requests INTO this partition from others must keep these names/paths working: everything marked "used" in section A.

---------------------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

1. `frontend/utils/userDataEvents.js`
   - Listener Sets and the promotion queue live on `global` under `__userDataSubscribers`, `__rankPromotionSubscribers`,
     `__rankPromotionQueue` (`:4-6`), created with `Object.defineProperty` (`writable: false` for the Sets,
     `writable: true` for the queue because `:122` and `:169` re-assign it). This is what keeps subscriptions alive
     across Fast Refresh. Do not turn them into module variables and do not rename the keys.
   - Order inside `emitUserDataUpdate` (`:177-187`): promotion detection runs BEFORE listeners are notified, on the
     live `global.userData` object (not a copy). `lastRankSnapshot` / `lastRankUserKey` (`:112-113`) are module state;
     the first emit after sign-in only seeds them (no promotion). Do not reorder.
   - `subscribeUserData` / `subscribeRankPromotions` call the listener synchronously during subscribe (`:194`, `:156`);
     ~25 screens depend on that initial call.
2. `frontend/utils/competitionTabEvents.js`: `global` keys `__competitionTabListeners`, `__competitionPendingTab`,
   `__ladderScrollTarget` (`:1-3`); `requestCompetitionTabFocus` both stores the pending tab and notifies (`:44-53`) -
   the Competition screen relies on consuming the pending value when it mounts later. Only delete the default export.
3. `frontend/utils/rankPromotionEvents.js`: `global.__spartan_last_rank_promotion_key/_map` (`:1-2`) de-dupe promotions per
   user for the JS runtime's lifetime; `registerRankPromotionKey` returns `true` on error on purpose (`:44-46`).
4. `frontend/logic/communityStats.js`: `App.js:1203-1207` flips `communityStatsReady` when `initCommunityStats()` settles and
   `App.js:1349` gates `baseAppReady` on it (with the 4.5 s `appForceReady` escape). Removing dead exports/`emit` is
   safe; do NOT change when the two exported promises resolve, the chunked `getDocs` loop (`:155-166`), or the
   `refreshPromise` de-dupe (`:221-223`, `:276-278`).
5. `frontend/logic/messagesPreloader.js`: `activeListeners` Map (`:25`) + preload state machine (`:92-110`, `:134-144`) +
   `resetMessagesState` order (`:147-151`: listeners, cache, state). Firestore path `messages/{cid}/content`,
   `orderBy("timestamp","desc"), limit(1)`. Only drop the `export` on `:69`.
6. `frontend/utils/optimisticFeedPosts.js`: timer semantics (`:25-41`), `emit()` snapshot array identity, `normalizePost`
   field defaults (`pendingUpload !== false`, `isOptimistic: true`, `sortKey`). `useFilteredFeed` de-dupes against these.
7. `frontend/utils/favoriteFoods.js` / `frontend/utils/foodCache.js`: AsyncStorage keys `favoriteFoods:v1:{uid}` (`:16`) and
   `@foodExtrasPS:{foodId}` (`foodCache.js:5`), Firestore path `usersPrivate/{uid}/favoriteFoods/{encodeURIComponent(key)}`
   and field names (`favoritedAt`, `updatedAt`, `key`, ...). `upsertFavoriteFood` writes Firestore first, then the cache.
8. `frontend/utils/pickAndUploadProfilePhoto.js`: Storage path `pfps/{uid}.png` (`:73`), sequence delete -> upload -> `getPFP`
   -> `updateDoc('usersPublic', uid, { image, photoURL })` (`:74-87`), `onPreview` called up to twice. Do not reorder.
9. `frontend/utils/workoutPrivacy.js`: privacy decisions. `coercePrivacyMode` ignores its argument and always returns
   `"global"` (`:7`) while 8 call sites still pass one; keep the signature usage as is. Do not "simplify"
   `collectionHasUid` (`:61-82`) or the candidate lists.
10. `frontend/utils/bodyweight.js`: imported by client code AND by `backend/workouts/updateCompletedWorkout.js:7` (with an
    explicit `.js` extension) and `frontend/helper/estimateWorkoutCalories.js`; the three lookup tables (`:18-42`) are built at
    module load from the big `EXERCISES` list. Keep the path, the exports `BODYWEIGHT_DEFAULT_LB`,
    `resolveUserBodyweight`, `resolveExerciseWeighting`, and do not add imports that pull in React Native modules.
11. `frontend/logic/exerciseCatalog.js:159-189`: `inferMetaByName` is an ordered if/else chain of regexes (e.g. "press"
    resolves to shoulders before "bench" is tested). Move nothing, change nothing in the kept part.
12. `frontend/utils/resolveRankTierKey.js:36-45`: reads `global.userData` so the signed-in user's own rank overrides stale
    embedded snapshots; candidate order matters (viewer, then entry).
13. `frontend/utils/haptics.js`: every native call is wrapped in `try {}` with `?.(` - keep exactly; `withStrongPress(undefined)`
    must keep returning `undefined` (`:29`) because callers pass it straight to `onPress`.
14. `frontend/utils/scale.js` -> `helper/scaleSize.js`: `ss` carries a `'worklet'` directive; when redirecting imports (G3)
    import the same `ss`, do not substitute the default export.
15. `frontend/utils/usernameRegistration.js:3`: must stay in sync with `functions/index.js:34` and `userProfileService.js:13`.
16. `frontend/utils/muscleTierColors.js:2-18`: tier colours and thresholds are visual output; `silver` is an 8-digit hex
    (`#83a5cbff`) - leave it.
17. `frontend/utils/authBackground.js`: module-level `Asset.fromModule` + memoised `downloadAsync` promise; `App.js:385` gates
    the auth screen on it.
18. `frontend/utils/profilePhoto.js:1-12`: field priority order of `PHOTO_FIELDS` decides which URL wins.

---------------------------------------------------------------------------------------------------------------

## I. Open questions for the owner

1. **`frontend/logic/communityStats.js` has no reader.** `useCommunityStats`, `subscribeCommunityStats` and
   `getCommunityStatsSnapshot` are referenced nowhere, so the weekly reps/volume/PB totals are never displayed. Yet
   `App.js:984` calls `refreshCommunityStats({ force: true })` on every merged user-doc snapshot (one `getDocs` per 10
   mutual friends, each returning full `users` docs), and `App.js:1203/1349` hold the splash until
   `initCommunityStats()` settles (or 4.5 s). Should the whole module and its gate go? That would make the app ready
   sooner and remove those reads, which is a timing change, so the refactor only removes the dead exports and leaves
   the calls in place.
2. **Privacy is effectively switched off.** `coercePrivacyMode()` always returns `"global"` (`workoutPrivacy.js:7`);
   `sanitizeStatsForViewer` (`:192-203`) can never hide anything with its current callers (none passes `ownerDataInput`,
   so it builds `{ uid, settings: {} }`, which is never private); `canViewWorkout` (`:160-183`) only hides a workout
   that embeds an owner object with `settings.profilePrivate` defined. Intentional (privacy modes retired) or a
   regression? Nothing is changed.
3. **Who counts as a friend for a private profile?** `isViewerFriend` (`workoutPrivacy.js:109-120`) also accepts the
   viewer's `followers` lists, so a viewer can open a private profile when the private owner follows them, even if the
   owner never approved the viewer. Intended?
4. `userDataEvents.js:156` / `:194`: when a listener throws during subscribe it is invoked a second time with `[]` /
   `null`. Was the `catch` meant to guard reading `global` instead (in which case the listener should not be re-called)?
5. `optimisticFeedPosts.js:25-41`: should the 2-minute fallback cleanup re-arm itself while entries remain (E1)?
6. `computeHexagonStats.js:10`: `includeDebug: true` builds a `debug` payload nobody reads on the client. Keep for
   debugging, or switch off?
7. `bodyweight.js:120-168`: every caller asks for `measurementsOnly: true`, so the stored-field candidates
   (`bodyweight`, `weight`, `publicWeight`, ...) and the 150 lb default are never used. Keep the general path as API,
   or cut `resolveUserBodyweight` down to "latest measurement or null"?
8. `pickAndUploadProfilePhoto.js:9`: `DEFAULT_COMPRESS_QUALITY = 0.01` (1 % JPEG quality) and the JPEG is stored under a
   `.png` name (`:17`, `:73`). Intentional (tiny avatars), or should quality be higher? Not changed (Storage path is a
   contract).
9. `exerciseCatalog.js:79-137`: the hand-written `FAMILIES` regex/anchor catalog is unused and superseded by
   `shared/hexagon/computeHexagonCore.js` `FAMILY_ANCHORS`; the audit recommends deleting it (recoverable from git).
   Say so if it should be kept as reference data instead.
10. Files that can be deleted after the refactor (need sign-off): `frontend/utils/friends.js` (after G1),
    `frontend/utils/scale.js` (after G3).
