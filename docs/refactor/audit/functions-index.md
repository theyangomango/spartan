# Audit: partition `functions-index`

Files: `functions/index.js` (4410 lines), `functions/computeHexagon.js` (4 lines). Both read completely.
Working tree == baseline for both files at audit time. Line numbers below are current.
Class: TOOLING (Cloud Functions; deployed separately; cannot be run here). Conservative changes only.

Verification run during the audit (read-only): `SPX/tools/lint.sh functions/index.js functions/computeHexagon.js`
-> exactly the 4 machine findings (1 error, 3 warnings), nothing else.

---

## A. Module map

### `functions/index.js`
Purpose: Cloud Functions entry point (`functions/package.json` -> `"main": "index.js"`, `"type": "module"`). Defines 25 exported functions plus ~80 private helpers/constants and 4 module-level caches.
Imports (local): `./shared/deleteUserAndContent.js` (`deleteUserAndContentByUid`), `./shared/handlePropagation.js` (`propagateHandleChange`), `./shared/namePropagation.js` (`propagateNameChange`, `buildOldNamesSet`, `normaliseName as normalizeDisplayName`). Nothing from outside `functions/`.
Imported by: nothing in the repo (loaded by the Firebase runtime/CLI; `SPX/tools/fn-check.sh` loads it). No script under `functions/scripts`, `backend/admin`, `scripts/` or `tests/` imports it (grep for `functions/index`, `../index.js`: no hits).

Exports (name, line, trigger + options, in-repo caller):

| Export | Line | Trigger / options | Caller (string name) |
|---|---|---|---|
| `sendUserNotification` | 564 | onCall `{region:"us-central1"}` | backend/sendNotification.js:8 |
| `onPostEngagementUpdated` | 610 | onDocumentWritten `"posts/{pid}"` (no explicit options: region + vpc come from global options) | Firestore trigger |
| `ensureUserProfile` | 756 | onCall `{region}` | frontend/services/userProfileService.js:8 |
| `followUserAction` | 964 | onCall `{region}` | backend/user/followUser.js:4 |
| `cancelFollowRequestAction` | 1075 | onCall `{region}` | backend/user/cancelFollowRequest.js:4 |
| `respondFollowRequestAction` | 1094 | onCall `{region}` | backend/user/acceptFollowRequest.js:4, declineFollowRequest.js:4 |
| `unfollowUserAction` | 1158 | onCall `{region}` | backend/user/unfollowUser.js:4 |
| `blockUserAction` | 1363 | onCall `{region}` | backend/user/blockUser.js:5 |
| `unblockUserAction` | 1441 | onCall `{region}` | backend/user/unblockUser.js:5 |
| `registerChatParticipantsAction` | 1467 | onCall `{region}` | backend/messages/registerChatParticipants.js:4 |
| `setUserHandle` | 1582 | onCall `{region}` | frontend/services/userProfileService.js:9 |
| `setUserDisplayName` | 1668 | onCall `{region}` | frontend/services/userProfileService.js:10 |
| `resolveLoginIdentifier` | 1755 | onCall `{region}` | frontend/screens/0.3_UserLogInCredentials.js:71 |
| `computeHexagonStats` | 1827 | onCall `{region}` | NONE in repo (stub that returns zeros) |
| `fatsecretMethod` | 1937 | onCall `{region, secrets:[FATSECRET_KEY, FATSECRET_SECRET]}` | frontend/screens/fatsecretClient.js:7 |
| `fatsecretGetFood` | 1952 | onCall `{region, secrets}` | frontend/screens/fatsecretClient.js:10 |
| `fatsecretSearchFood` | 1982 | onCall `{region, secrets}` | frontend/screens/fatsecretClient.js:5 |
| `fatsecretLookupBarcode` | 2634 | onCall `{region, secrets}` | frontend/screens/fatsecretClient.js:9 |
| `refreshLeaderboardLastRanks` | 2985 | onSchedule `{schedule:'0 0 * * 0', timeZone:'UTC', region, timeoutSeconds:540, memory:'1GiB'}` | scheduler |
| `getTribeComparisonScores` | 3312 | onCall `{region, timeoutSeconds:120, memory:'512MiB'}` | NONE in repo (not even PARKED Compete code) |
| `onCompletedWorkoutAutoPost` | 3727 | onDocumentWritten `"users/{uid}"` | Firestore trigger |
| `onChatMessageCreated` | 4057 | onDocumentCreated `"messages/{cid}/content/{mid}"` | Firestore trigger |
| `appendWorkoutSets` | 4236 | onCall `{region}` | NONE in repo (and it always throws, see E1) |
| `submitModerationReport` | 4295 | onCall `{region}` | frontend/helper/reportContent.js:20 |
| `deleteOwnAccount` | 4356 | onCall `{region}` | frontend/screens/DeleteAccount.js:48, Settings.js:114 |

All `httpsCallable(` sites in App.js/frontend/backend use literal names (20 sites checked); there is no generic wrapper that builds a function name dynamically.

Baseline endpoint facts (dumped from the fn-baseline scratch copy, top-level load only): all 25 endpoints carry `vpc = {connector:"projects/spartan-8a55f/locations/us-central1/connectors/serverless-conn", egressSettings:"ALL_TRAFFIC"}` and `region = ["us-central1"]`. These come from `setGlobalOptions` at index.js:14-18. See H1: this is the single most important thing not to break.

Module-level mutable state: `tokenCacheByScope` (30), `fatsecretSearchCache` (32), `userRefCache` (245), `userPrivateCache` (246).

File style: 4-space indent throughout; double quotes everywhere except the leaderboard region 2686-3550, which uses single quotes. Keep each region's style.

### `functions/computeHexagon.js`
Purpose: 3-line re-export shim (`export * / export { default } from "./shared/computeHexagon.js"`), header comment says "Legacy entry point retained for Cloud Functions code that imports from this path."
Exports: everything `shared/computeHexagon.js` exports.
Imported by: NOTHING. Verified: the only `./computeHexagon.js` import in the repo is `functions/shared/rebuildHexagonStats.js:1`, which resolves to `functions/shared/computeHexagon.js`, not this file. `functions/index.js` imported it in the past (`git log -S'from "./computeHexagon.js"' -- functions/index.js` finds commits 15f5b79e / b220c10d) but no longer does. No dynamic import, no string reference, no doc reference.

Answer to the machine-findings note ("how does the deployed bundle resolve `../../shared/computeHexagon.js`?"): it never has to. The import closure of `functions/index.js` is `index.js -> shared/deleteUserAndContent.js, shared/handlePropagation.js, shared/namePropagation.js` and those three import only `firebase-admin/*` and each other. `functions/shared/computeHexagon.js` (which points at `../../shared/computeHexagon.js`, outside the deploy bundle) and `functions/shared/rebuildHexagonStats.js` are reachable only from operator scripts (`functions/scripts/recompute*.js`, `backend/admin/recomputeAllHexagonStats.js` via dynamic import) and from the root shim `shared/rebuildHexagonStats.js`, all of which run from a full repo checkout. See H2.

---

## B. Verified dead code

Apply edits bottom-up (line numbers shift).

| # | Identifier | Kind | Location | Evidence | Action |
|---|---|---|---|---|---|
| B1 | `pickFirstWeightFromObject` | function | index.js:2844-2882 (+ blank 2883) | ESLint no-unused-vars. Only reference is its own recursive call at 2877. Repo-wide grep: defined only here. | DELETE |
| B2 | `liveWorkoutKey` | local `let` | index.js:3768 (decl), 3773-3782 (assignment), 3917 (reset) | ESLint: assigned, never read. The assigned expression only calls `workoutIdentityKey`/`toMillisSafe` (pure, exception-safe, and inside a try/catch that only logs). | DELETE the three sites; the `if (liveSnap.exists)` block keeps `livePostMeta = liveSnap.data() || {};` |
| B3 | `_` | unused destructured param | index.js:1910 | ESLint. | `.filter(([, v]) => ...)` (identical behaviour) |
| B4 | `ranks` / `computeGlobalRanks` | dead computation | function index.js:2962-2983; calls 3126, 3139; stored at 3127, 3140 | `exerciseMaps`/`hexMaps` entries are only ever read as `config.valueMap` (3150-3151, 3158-3159, 3178-3179, 3188-3189, 3206-3207, 3217-3218). `.ranks` is never read (grep `ranks` -> only the lines above). The function is pure (copies the map, sorts the copy). | OPTIONAL but safe: delete 3126 and 3139, change 3127/3140 to `{ valueMap }`, delete 2962-2984. Saves an O(n log n) sort per exercise in the weekly job. The operator scripts keep their own copies. |
| B5 | `functions/computeHexagon.js` | whole file | 4 lines | No importer (see A). | Cannot delete (rule 8). List under "files that can now be deleted". Do not edit. |
| B6 | unread return fields | object properties | `getUserDocs` -> `publicSnap`, `privateSnap` (234-235), `legacyData` (238); `resolveCallableUser` -> `source`, `decoded` (860, 872); `getFoodsFromSearchResponse` -> `pageNumber`, `maxResults`, `totalResults` (2227-2229); `cacheValue.variantsConsidered` (2587, written into the cache, never read back) | grep: no `.publicSnap`/`.privateSnap`/`.legacyData`/`.source`/`.decoded` reads on those results; `extracted.list` (2457) is the only field read. | LEAVE (shape-only; removing `legacyData` would tempt removing `legacyRef.get()` at 227, which changes read timing). |
| B7 | unreachable / always-same branches | branches | 356-358 and 362 (`composePushMessage` default: the only caller passes a `sanitizeNotificationEvent` result, which never carries `message` and always has a non-empty `type`); 540 (`!title && !body` can never hold); 372-377 (legacy cache-entry shapes: entries are only ever stored as `{data, fetchedAt}` at 391/394); 1597 (`sanitized.toLowerCase()` on an already-lowercase string); 2095 (`maxLen === 0` after the two guards above it); 3167 and 3199 (`Set` already contains `uid`); 3695 (`!fallback.privacyMode` always true); 3802-3804 else-branch and 3821-3823 (`sanitizeWorkoutSnapshot` always returns a non-empty string `privacyMode`); 4164-4168 (`toDayKey` catch: nothing in the try throws); 1856-1860 (`computeHexagonStats` catch: only the HttpsError above can be thrown) | traced by hand | LEAVE. They are defensive, harmless, several are mirrored verbatim in the operator scripts, and this code cannot be exercised here. |
| B8 | callables with no client caller | exported functions | `computeHexagonStats` 1827-1861; `getTribeComparisonScores` 3312-3550 with its exclusive helpers `KG_TO_LB`, `ALLOWED_METRICS`, `sanitizeMetricKey`, `toPounds`, `toNumeric`, `normalizeTimestamp`, `extractLatestWeight`, `resolveBodyweightForNormalization` (2738-2842, 2884-2960); `appendWorkoutSets` 4236-4293 with `toDayKey` 4159-4169 | repo-wide grep by name (quoted and bare) finds no caller | KEEP. Removing an export deletes a deployed function (rule 1; `fn-check.sh` would report DIFFERS; shipped app builds may still call them). Recorded as open question I1. |
| B9 | stale comment | comment | index.js:32 says the cache key is `normalizedQuery|max|page`; the real key is `${qNorm}|${pageSize}` (2347) | read | Fix the comment text only (optional). |
| B10 | `http-errors` | dependency | functions/package.json | not imported anywhere under functions/ | Cannot touch package.json (rule 5). Open question I9. |

Not found (checked explicitly): no `console.*` calls, no commented-out code, no TODO/FIXME, no constant feature flags, no unused imports (all 12 import lines are used), no unused top-level declaration other than B1. `logger.*` calls are operational Cloud Logging, not tracing leftovers: keep (the `logger.debug('missing weight detail', ...)` block at 3509-3530 is diagnostic-only but is server logging the owner may rely on; leave).

Machine findings, verified:
- ESLint 1910 `_` -> B3. 2844 `pickFirstWeightFromObject` -> B1. 3773 `liveWorkoutKey` -> B2. 4292 `patch` not defined -> E1 (real bug).
- knip: no unused exports reported; correct (all 25 exports are the deployed surface).
- jscpd clones: all verified, see C.

---

## C. Duplication

Deploy boundary first: `functions/` is deployed on its own. Code reachable from `functions/index.js` may import only from inside `functions/` (and must not reach `functions/shared/computeHexagon.js` / `rebuildHexagonStats.js`, see H2). So duplicates between `functions/index.js` and client code (`frontend/`, `backend/`) are STRUCTURAL and cannot be merged. They are listed so other partitions do not try to "unify" them, and because some are cross-runtime contracts.

### C1. Inside `functions/index.js` (mergeable)

| Cluster | Locations | Identical? | Recommendation |
|---|---|---|---|
| food_description fallback | 1964-1976 (`fatsecretGetFood`) == 2667-2679 (`fatsecretLookupBarcode`) | Byte-identical 13-line `try { if (!food.food_description) {...} } catch { }` blocks. | Extract verbatim into one top-level `function ensureFoodDescription(food) { ...block... }` placed next to `toGtin13`; both sites call it. Low risk. NOT the same as `getDefaultServing` + `buildDescriptionFromServing` inside `fatsecretSearchFood` (2149-2163): those return null/"" for an empty servings list, whereas the two blocks above synthesize "Per 1 serving - Calories: 0 kcal ..." from `{}`. Do not merge those. |
| attach `postPid` transaction | 3929-3956 (on `users/{uid}`) == 3966-3993 (on `usersPublic/{uid}`) | Identical except the ref identifier (`userRefLink` / `publicRefLink`); the surrounding try/catch log messages differ (3958 vs 3995). | OPTIONAL: helper `attachPostPidToCompletedWorkouts(docRef, postIdByWorkoutKey, linkedAt)` holding the `runTransaction` body; keep both try/catch wrappers and their distinct warn messages at the call sites. Low risk, but it is a one-identifier rewrite, not a pure move; skip if in doubt. |
| follow/unfollow preamble | 965-970 == 1159-1164 | Identical 5 statements. | LEAVE (tiny; a helper would hide the auth check). |
| block/unblock preamble + blocked-uid set | 1364-1374 vs 1442-1452; `new Set([...ensureUidArray(x?.blockedUidList), ...ensureUidArray(x?.blocked)])` at 978-981, 984-987, 1371-1374, 1449-1452 | Preambles differ in one check (1369 requires `targetDocs.publicData`, 1447 only `targetDocs`). The Set construction is identical 4 times. | LEAVE (optional micro-helper; no line savings worth the risk). |
| transaction preamble | 1182-1190 (`removeMapEntryByUid`) vs 1199-1207 (`pruneMessagesByUid`) vs 202-209 (`removeArrayEntriesByUid`) | First two identical 8 lines; the third uses `String(uid||"").trim()` and no `.catch` on `tx.get`. | LEAVE. |
| actor payload | 596-603, 733-740, 1013-1020, 1062-1069, 1146-1153 | Same 5-field object from different sources. | LEAVE. |
| doc refs | `userRefLink` 3926 == `userRef` 4002 (`users/${uid}`); `publicRefLink` 3964 == `userPublicRef` 4003 | Same refs created twice. | LEAVE. |
| `toMillisSafe` 3553-3587 vs `normalizeTimestamp` 2799-2842 | NOT identical: `normalizeTimestamp` returns 0 instead of null, multiplies values <= 1e11 by 1000 (seconds heuristic), and honours `toMillis()`. | LEAVE both. |
| `normalizeHandle` (inner fn, 4367-4373) vs `normaliseHandle` exported by functions/shared/handlePropagation.js:19 | index version == `normaliseHandle(v).toLowerCase()` for every input. | LEAVE (optional; would add an import for 6 lines). |

### C2. `functions/index.js` vs other files inside `functions/` (mergeable only via a new side-effect-free module; scripts cannot import index.js because it runs `setGlobalOptions`/`initializeApp` and defines functions at load)

| Cluster | Locations | Identical? |
|---|---|---|
| leaderboard rank helpers: `EPSILON`, `HEX_RANK_KEYS`, `toUid`, `safeNumber`, `computeGlobalRanks`, `ensureMembersInValueMap`, `buildEntriesForMembers` | index.js:2687-2736, 2962-2983; functions/scripts/simulateLeaderboardLastRanksRefresh.js:4-5, 16-85; functions/scripts/initializeLeaderboardZeroSnapshot.js:4, 15-23 (`HEX_RANK_KEYS`, `toUid` only); functions/scripts/setAllLastRanksToOne.js:14 (`toUid`); backend/admin/simulateLeaderboardLastRanksRefresh.js:4, 15-56; backend/admin/resetLeaderboardLastRanks.js:14 (`toUid`) | index.js == functions/scripts/simulate... for all seven (same logic, only formatting/quotes differ). backend/admin/simulate...: `toUid`, `safeNumber`, `ensureMembersInValueMap` identical, but `computeGlobalRanks` and `buildEntriesForMembers` are NOT tie-aware there (rank = index + 1, no EPSILON) -> different output for tied values. Do not merge the backend/admin copy. |
| handler-body mirrors (jscpd 2997-3012, 3029-3038, 3061-3106, 3163-3269) | `refreshLeaderboardLastRanks` body vs the two simulate scripts and `initializeLeaderboardZeroSnapshot.js:73-82` | Intentional dry-run mirrors of the scheduled job, with differences (the function also treats `data.isPrivate === true` as private at 3015; scripts log with console). Not mergeable without restructuring the job. LEAVE. |
| `toDayKey` | index.js:4159-4169 vs functions/shared/rebuildHexagonStats.js:37-44 | NOT identical: index falls back to "now" for falsy/invalid input; rebuildHexagonStats returns "" and accepts Firestore timestamps. LEAVE. |
| `chunk` | index.js:4051-4055 vs functions/scripts/clearStaleCurrentWorkouts.js:7 | Same behaviour; trivial; scripts cannot import index.js. LEAVE. |
| uid extraction | `coerceUidValue` index.js:137-151 vs `getUidFromEntry` functions/shared/deleteUserAndContent.js:40-63 | NOT identical (different key list, no trim, no recursion). LEAVE. |

### C3. `functions/index.js` vs client code (structural; cannot merge; documented contracts)

| Cluster | Locations | Identical? |
|---|---|---|
| `UID_KEYS` + `coerceUidValue` / `coerceUid` | index.js:124-151; backend/helper/userRefs.js:8-35; frontend/utils/userRefs.js:3-33 | index == backend/helper (same 10 keys, same body). frontend/utils adds 3 keys (`docId`, `_id`, `objectID`) -> differs for objects carrying only those keys. |
| `ensureUidArray` | index.js:155-162; backend/helper/userRefs.js:48-59; frontend/utils/userRefs.js:46-56 | Same output (insertion-ordered unique uids, `[]` for non-arrays) given the same `coerceUid`; so index == backend/helper, frontend differs via its key list. |
| `HANDLE_REGEX` | index.js:34; frontend/services/userProfileService.js:13 | Identical regex `/^[a-z0-9_.]{6,20}$/`. Client/server validation contract: keep both in sync, do not change either. |
| `buildSearchTokens` | index.js:88-105; backend/admin/changeHandle.js:56-71; backend/admin/changeName.js:54-69 | Identical for string/nullish input (all the server ever passes). Admin copies also guard `typeof token !== "string"`. |
| `coerceBoolean` | index.js:78-86; backend/admin/verifyUser.js:48; frontend/hooks/useUserVerified.js:14; functions/scripts/toggleUserVerification.js:61 | All four differ (string parsing, number handling, fallback). LEAVE all. |
| `KG_TO_LB` | index.js:2738; frontend/utils/bodyweight.js:83; frontend/utils/weightEntries.js:1; frontend/components/2_Competition/sections/LeaderboardsSection.js:113 (PARKED) | Same literal `2.2046226218488`. Client copies are another partition's business. |
| `toMillisSafe` | index.js:3553-3587; frontend/utils/livePostMeta.js:1-27; also frontend/helper/feedRanking.js:1, screens/ExerciseDetail.js:199, screens/MuscleGroupExercises.js:223, sections/ProgressSection.js:219, UserStats/UserStatsProgressPreview.js:63 (not compared here) | index vs livePostMeta: NOT identical (index parses numeric strings with `Number()` first and uses `toDate()`; livePostMeta uses `Date.parse` only and `toMillis()`). |
| `workoutIdentityKey` | index.js:3589-3624; frontend/utils/livePostMeta.js:29-64 (`deriveWorkoutIdentityKey`); frontend/helper/useFilteredFeed.js:63-92 | NOT identical, and this one matters: server returns `wid:<id>`; both client versions return `wid:<id>:<createdMs>` when a created time exists; id precedence differs (`wid, id, workoutId, sessionId, workoutUid` vs `wid, workoutId, id, widRef, workoutUid`); server has a `json:` fallback and returns null, client returns "". See I4. Do not touch either side. |

---

## D. Decomposition plan for `functions/index.js` (4410 lines)

Extraction risk: MEDIUM. The seams are clean (dependency graph is a DAG, helpers are grouped by feature already), but (a) the code cannot be run or deployed here, (b) there is an ES-module evaluation-order trap that silently drops the VPC connector (H1) and that `fn-check.sh` does not detect, (c) the deploy bundle boundary (H2). If the lead does not want to accept that, use Plan B.

Do section B/E edits first (in place, bottom-up), run `fn-check.sh`, then decompose. Ranges below are CURRENT line numbers; recompute them after the B/E edits (or do the moves from `SPX/baseline/functions/index.js` with `sed -n 'A,Bp'` and re-apply the small B/E edits in the new files).

### Plan A: full split (index.js becomes a ~40-line entry)

Mandatory rules for Plan A
1. `setGlobalOptions(...)` must execute before ANY module that calls `onCall` / `onSchedule` / `onDocumentWritten` / `onDocumentCreated` is evaluated. firebase-functions 6.4.0 snapshots global options into `__endpoint` at definition time (lib/v2/providers/https.js:200-214, firestore.js:304/320, scheduler.js:78-94). ES imports are hoisted, so leaving `setGlobalOptions` in the body of index.js while importing handler modules would define every moved function with EMPTY global options. Therefore: put it in `core/bootstrap.js`; every handler module imports bootstrap (directly: `import "../core/bootstrap.js";` as its first import, even when it also gets it transitively); index.js's first statement is `import "./core/bootstrap.js";`.
2. index.js must export exactly the 25 names with NAMED re-exports (`export { a, b } from "./handlers/x.js";`). Never `export *`: several handler modules also export helpers, and any extra export changes the surface that `fn-check.sh` compares.
3. Each mutable cache lives in exactly one module (singletons): `tokenCacheByScope`, `fatsecretSearchCache`, `userRefCache`, `userPrivateCache`.
4. `FATSECRET_KEY` / `FATSECRET_SECRET` are defined once (`defineSecret`) and the same objects are used both in `secrets: [...]` and in `.value()`.
5. No new module may import from outside `functions/`, nor from `functions/shared/computeHexagon.js`, `functions/shared/rebuildHexagonStats.js`, `functions/computeHexagon.js` (H2).
6. Pure helper modules (`fatsecret/searchText.js`, `leaderboard/rankUtils.js`, `leaderboard/bodyweight.js`) must NOT import bootstrap, so operator scripts can import them without side effects.
7. Copy option objects, trigger paths and handler bodies verbatim. Keep the single-quote style of 2686-3550.
8. All relative imports need the explicit `.js` extension (Node ESM).

| New module | Moves in (name: current lines) | Needs (imports) | Exports |
|---|---|---|---|
| `functions/core/bootstrap.js` | `setGlobalOptions` import (4), firebase-admin imports for app/auth/firestore (7-9, only `initializeApp`, `getAuth`, `getFirestore`), `setGlobalOptions({...})` 14-18, comment + `initializeApp` try/catch 20-21, `adminDb` 22, `adminAuth` 23 | firebase-functions/v2, firebase-admin/* | `adminDb`, `adminAuth` |
| `functions/core/userRefs.js` | `UID_KEYS` 124-135, `coerceUidValue` 137-151, `ensureArray` 153, `ensureUidArray` 155-162, `normalizeUserRefPayload` 164-200, `removeArrayEntriesByUid` 202-216, `getUserDocs` 218-240 | `adminDb` | all except `UID_KEYS` |
| `functions/core/notifications.js` | `LIKE_EVENT_TYPES` 242, `COMMENT_EVENT_TYPES` 243, `userRefCache` 245, `userPrivateCache` 246, `sanitizeNotificationEvent` 248-308, `counterUpdatesForType` 310-321, `composePushMessage` 323-364, `getUserPrivateDataCached` 366-397, `resolveUserDetails` 399-466, `createUserNotification` 512-562 | `logger`, `FieldValue`, `adminDb`, `getUserDocs`, `normalizeUserRefPayload` | `resolveUserDetails`, `createUserNotification` |
| `functions/handlers/notifications.js` | `deriveCommentKey` 468-491, `extractNewLikeEntries` 493-510, `sendUserNotification` 564-606, header 608 + `onPostEngagementUpdated` 610-754 | bootstrap, `onCall`, `HttpsError`, `onDocumentWritten`, `logger`, `coerceUidValue`, `ensureArray`, core/notifications | the 2 endpoints |
| `functions/handlers/profile.js` | `HANDLE_REGEX` 34, `sanitizeDisplayName` 36-41, `SAFE_PHOTO_DATA_PREFIX` 43, `SAFE_PHOTO_EXTRA_SCHEMES` 44, `sanitizePhotoUrl` 46-76, `coerceBoolean` 78-86, `buildSearchTokens` 88-105, `upsertSearchIndex` 107-122, `ensureUserProfile` 756-856, `setUserHandle` 1582-1666, `setUserDisplayName` 1668-1753, `resolveLoginIdentifier` 1755-1825 | bootstrap (`adminDb`, `adminAuth`), `onCall`, `HttpsError`, `logger`, `FieldValue`, `../shared/handlePropagation.js` (`propagateHandleChange`), `../shared/namePropagation.js` (`propagateNameChange`, `buildOldNamesSet`, `normaliseName as normalizeDisplayName`) | the 4 endpoints (~440 lines) |
| `functions/handlers/follow.js` | `validateFollowTarget` 879-887, `performUnfollow` 889-962, `followUserAction` 964-1073, `cancelFollowRequestAction` 1075-1092, `respondFollowRequestAction` 1094-1156, `unfollowUserAction` 1158-1169 | bootstrap (`adminDb`), `onCall`, `HttpsError`, `FieldValue`, core/userRefs, `createUserNotification` | 4 endpoints + `validateFollowTarget`, `performUnfollow` (~290 lines) |
| `functions/handlers/block.js` | `resolveCallableUser` 858-877 (only used at 1364 and 1442), `RELATIONSHIP_ARRAY_FIELDS` 1171-1178, `RELATIONSHIP_MAP_FIELDS` 1180, `removeMapEntryByUid` 1182-1197, `pruneMessagesByUid` 1199-1217, `hideChatsBetweenUsers` 1219-1257, `removeUsersFromCommonTribes` 1259-1314, `addBlockState` 1316-1342, `removeBlockState` 1344-1361, `blockUserAction` 1363-1439, `unblockUserAction` 1441-1465 | bootstrap (`adminDb`, `adminAuth`), `onCall`, `HttpsError`, `logger`, `FieldValue`, core/userRefs, `validateFollowTarget` + `performUnfollow` from ./follow.js | 2 endpoints (~320 lines) |
| `functions/handlers/chat.js` | `registerChatParticipantsAction` 1467-1580, header 4049, `chunk` 4051-4055, `onChatMessageCreated` 4057-4155 | bootstrap (`adminDb`), `onCall`, `HttpsError`, `onDocumentCreated`, `logger`, `FieldValue`, core/userRefs (`coerceUidValue`, `ensureArray`, `ensureUidArray`, `normalizeUserRefPayload`) | 2 endpoints (~225 lines) |
| `functions/fatsecret/client.js` | secrets comment + `FATSECRET_KEY`/`FATSECRET_SECRET` 25-27, `tokenCacheByScope` 29-30, `getAccessToken` 1863-1899, `fatSecretRequest` 1901-1932 | `defineSecret`, `HttpsError`, `logger` | `FATSECRET_KEY`, `FATSECRET_SECRET`, `fatSecretRequest` |
| `functions/fatsecret/searchText.js` | HOISTED out of the `fatsecretSearchFood` handler, dedented by 8 spaces: `normalize` 1998-2005, `toTokens` 2007, `SYNONYM_TABLE` 2009-2039, `expandTokensForMatch` 2041-2060, `charNGrams` 2062-2071, `jaccard` 2073-2078, `tokenOverlap` 2080-2087, `levenshteinSimilarity` 2089-2115, `similarityScore` 2117-2136, `buildDisplayName` 2138-2142, `toNum` 2144-2147, `getDefaultServing` 2149-2154, `buildDescriptionFromServing` 2156-2163, `normalizeSearchFoodItem` 2165-2210, `getFoodsFromSearchResponse` 2212-2231, `SEARCH_METHODS` 2233-2237, `STOP` 2298-2302 | none | `normalize`, `toTokens`, `SYNONYM_TABLE`, `similarityScore`, `buildDisplayName`, `normalizeSearchFoodItem`, `getFoodsFromSearchResponse`, `SEARCH_METHODS`, `STOP` (the 9 names the handler body references at 2239, 2241, 2255, 2271, 2283, 2305, 2317-2318, 2418, 2421-2422, 2443, 2456) |
| `functions/handlers/fatsecretSearch.js` | `SEARCH_CACHE_TTL_MS` 31, `fatsecretSearchCache` 32, `fatsecretSearchFood` 1982-2620 minus the hoisted ranges (~400 lines remain) | bootstrap, `onCall`, `HttpsError`, `logger`, fatsecret/client, fatsecret/searchText | 1 endpoint |
| `functions/handlers/fatsecret.js` | comment + `ALLOWED_METHODS` 1934-1935, `fatsecretMethod` 1937-1949, `fatsecretGetFood` 1951-1980, header 2622, `toGtin13` 2623-2632, `fatsecretLookupBarcode` 2634-2683 (+ `ensureFoodDescription` from C1) | bootstrap, `onCall`, `HttpsError`, fatsecret/client | 3 endpoints (~115 lines) |
| `functions/leaderboard/rankUtils.js` | `EPSILON` 2687, `HEX_RANK_KEYS` 2688, `ensureMembersInValueMap` 2690-2696, `buildEntriesForMembers` 2698-2721, `toUid` 2723-2731, `safeNumber` 2733-2736, (`computeGlobalRanks` 2962-2983 only if B4 is not applied) | none (function declarations hoist, so order inside the file does not matter) | all |
| `functions/leaderboard/bodyweight.js` | `KG_TO_LB` 2738, `ALLOWED_METRICS` 2739, `sanitizeMetricKey` 2741-2745, `toPounds` 2747-2756, `toNumeric` 2758-2797, `normalizeTimestamp` 2799-2842, `extractLatestWeight` 2884-2931, `resolveBodyweightForNormalization` 2933-2960 | none | `sanitizeMetricKey`, `resolveBodyweightForNormalization` |
| `functions/handlers/leaderboardRefresh.js` | `refreshLeaderboardLastRanks` 2985-3310 | bootstrap (`adminDb`), `onSchedule`, `logger`, `FieldValue`, rankUtils | 1 endpoint (~330 lines) |
| `functions/handlers/tribeComparison.js` | `getTribeComparisonScores` 3312-3550 | bootstrap (`adminDb`), `onCall`, `HttpsError`, `logger`, `coerceUidValue` (core/userRefs), `EPSILON` + `safeNumber` (rankUtils), bodyweight | 1 endpoint (~240 lines) |
| `functions/handlers/workoutAutoPost.js` | `toMillisSafe` 3553-3587, `workoutIdentityKey` 3589-3624, `normalizeWorkoutMedia` 3626-3666, `sanitizeWorkoutSnapshot` 3668-3701, `resolveUserHandle` 3703-3715, `resolveUserAvatar` 3717-3725, `onCompletedWorkoutAutoPost` 3727-4047 | bootstrap (`adminDb`), `onDocumentWritten`, `logger`, `FieldValue` | 1 endpoint (~495 lines) |
| `functions/handlers/workoutStats.js` | `computeHexagonStats` 1827-1861, header 4157, `toDayKey` 4159-4169, `appendWorkoutSets` 4236-4293 | bootstrap (`adminDb`), `onCall`, `HttpsError`, `logger`, `FieldValue` | 2 endpoints (~110 lines) |
| `functions/handlers/moderation.js` | `ALLOWED_REPORT_REASONS` 4171-4178, `REPORT_DETAILS_MAX_LENGTH` 4180, `REPORT_METADATA_VALUE_MAX` 4181, `sanitizeString` 4183-4189, `coerceReason` 4191-4196, `sanitizeMetadata` 4198-4221, `sanitizeClientInfo` 4223-4234, `submitModerationReport` 4295-4354 | bootstrap (`adminDb`), `onCall`, `HttpsError`, `logger`, `FieldValue` | 1 endpoint (~125 lines) |
| `functions/handlers/account.js` | `deleteOwnAccount` 4356-4409 | bootstrap (`adminDb`), `onCall`, `HttpsError`, `logger`, `../shared/deleteUserAndContent.js` (`deleteUserAndContentByUid`) | 1 endpoint |

What stays in `functions/index.js`: `import "./core/bootstrap.js";` followed by 13 named re-export lines covering the 25 endpoints. Nothing else.

What blocks a clean extraction
- H1 ordering trap (solved by rules 1-2 above).
- `fatsecretSearchFood` is one 638-line closure. Only the 17 declarations listed for `searchText.js` are pure (checked one by one: none reads `request`, `qRaw`, `qNorm`, `candidates`, counters or caches; `SEARCH_METHODS` and `STOP` are read-only). Everything else shares mutable closure state (`candidates`, `byId`, `successfulVariants`, `attemptedTasks`, `calls`, `scheduled`, `stopEarly`, `totalCallDurationMs`, `searchMethodStats`, `fallbackAttempts`) plus `qRaw`/`qNorm`/`qTokens` and MUST stay inside the handler in the same order: `addCandidate` 2244-2248, `addTokenVariants` 2250-2279, `rankVariants` 2314-2333, `handleResultList` 2415-2434, `executeTask` 2436-2486, `processQueue` 2488-2503, `runPageForVariants` 2505-2517. Hoisting changes "allocated per call" to "allocated once per instance", which is behaviour-neutral for pure functions and constant tables.
- `mergeDetails` (403-440) closes over `safeUid`: stays inside `resolveUserDetails`.
- `normalizeHandle` (4367-4373) is an inner function of `deleteOwnAccount`: moves with it.
- Module-evaluation order today: `shared/deleteUserAndContent.js` runs its own `initializeApp()` first, then index.js's try/catch swallows the duplicate. After the split bootstrap runs first and `deleteUserAndContent.js`'s own try/catch (lines 14-18 there) swallows the duplicate. Symmetric; no change needed in functions/shared.

Verification for Plan A (all read-only / top-level load only)
1. `SPX/tools/fn-check.sh` -> "IDENTICAL to baseline (25 exports)". This catches a lost region on the three Firestore triggers, but NOT a lost VPC connector.
2. Supplemental VPC check (fn-check leaves a fresh copy in `SPX/fn-current`); every line must show the connector and `["us-central1"]`:
   ```
   PATH=/opt/homebrew/opt/node@20/bin:$PATH GCLOUD_PROJECT=demo-surface-check \
   FIREBASE_CONFIG='{"projectId":"demo-surface-check","storageBucket":"demo-surface-check.appspot.com"}' \
   node --input-type=module -e "const m = await import('file:///tmp/claude-501/spx/fn-current/functions/index.js'); for (const [k, v] of Object.entries(m).sort()) console.log(k.padEnd(32), JSON.stringify(v.__endpoint?.vpc), JSON.stringify(v.__endpoint?.region));"
   ```
   Expected for all 25: `{"connector":"projects/spartan-8a55f/locations/us-central1/connectors/serverless-conn","egressSettings":"ALL_TRAFFIC"} ["us-central1"]`.
3. Bundle boundary: `grep -rnE "from ['\"](\.\./)+shared/|computeHexagon|rebuildHexagonStats" functions/index.js functions/core functions/handlers functions/fatsecret functions/leaderboard` must only show the `../shared/{deleteUserAndContent,handlePropagation,namePropagation}.js` imports and the `computeHexagonStats` endpoint name.
4. `SPX/tools/lint.sh functions` and `node SPX/tools/changes.cjs functions` (NEW lines should be only import/export lines plus the B/E edits; the tool compares trimmed lines, so the 8-space dedent of the hoisted helpers is not reported).

### Plan B: lower-risk partial split (if Plan A is judged too risky for undeployable code)
Extract only modules that define no Cloud Function, so the H1 trap cannot occur: `fatsecret/searchText.js`, `leaderboard/rankUtils.js`, `leaderboard/bodyweight.js`, plus (optionally) the moderation sanitizers 4171-4234 and the pure part of the user-ref helpers (`UID_KEYS`, `coerceUidValue`, `ensureArray`, `ensureUidArray`, `normalizeUserRefPayload`: 124-200). index.js keeps `setGlobalOptions`, all state, all handlers; it shrinks by roughly 600 lines. Same verification steps.

---

## E. Latent bugs

| # | Location | Bug | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | index.js:4292 | `return { ok: true, appended: Object.keys(patch.statsExercises).length };` references `patch`, which is not defined anywhere (ESLint no-undef). Every call that reaches this line has already written `statsExercises.<name>.sets` (4271) and zeroed `statsHexagon` (4286), then throws ReferenceError -> the client sees INTERNAL. | `Object.keys(updatePayload).length`. `updatePayload` has exactly one key per exercise that received sets (4263), which is what the old `patch.statsExercises` counted, and it matches the early return shape at 4268. | High that it is a bug; high on the fix. Note no in-repo client calls this function (I1). |
| E2 | index.js:2896 | `extractLatestWeight` normalises a non-array object into `list` (2886-2893) and then iterates `entries.forEach(...)`. For an object-shaped `weightEntries` map this throws TypeError (plain objects have no `forEach`), which bubbles to the catch at 3542 and turns the whole `getTribeComparisonScores` call into "internal". For arrays `list === entries`, so nothing changes. | `list.forEach((entry) => {`. | High that the intent is `list`; but the fix changes the result for object-shaped inputs (from throw to a value), so if the lead applies rule 2 strictly, record it as a recorded fix or defer to the owner. Only reachable through `getTribeComparisonScores`, which has no in-repo caller. |
| E3 | index.js:3865-3870 vs frontend/utils/livePostMeta.js:29-64 | `liveMatchesWorkout` compares the client-written `livePostMeta.workoutKey` (format `wid:<id>:<createdMs>`; `buildLivePostMetadata` always supplies a created time, falling back to `Date.now()` at livePostMeta.js:72-78) with the server-computed `snapshotWorkoutKey` (format `wid:<id>`, index.js:3598-3600). For any workout that has an id they can never be equal, so live likes/comments are never carried onto the auto-generated post (3872-3887 always take the empty path). | None in this refactor: the right side to change is not obvious and stored data depends on both formats. | Medium (traced statically; not observed). Open question I4. |
| E4 | index.js:3589-3624 with 3925-3999 | For a completed workout that has no id (`wid/id/workoutId/sessionId/workoutUid`) and no `completedAt/finishedAt/created`, the identity key is `json:<JSON of the entry>`. The function then patches `postPid/pid/postPidLinkedAt` into that entry on `users/{uid}`, which changes its JSON, re-triggers the function, and the entry looks "new" again -> another post, another patch, without end. | None minimal. | Low probability (needs a degenerate entry); recorded as I5. Do not change `workoutIdentityKey`. |

Not bugs but worth knowing: `followersCount` (785, 795) vs `followerCount` (923-950, 1031, 1043, 1129, 1137) are two different Firestore fields (I3).

---

## F. Best-practice issues

| # | Issue | Location | Risk of fixing |
|---|---|---|---|
| F1 | One 4410-line module mixing 12 features. | whole file | Medium: see D. |
| F2 | 17 pure helpers and 3 constant tables are re-created on every `fatsecretSearchFood` call. | 1998-2237, 2298-2302 | Low-medium: hoist as in D (`searchText.js`). |
| F3 | Dead private function / dead local / unused destructure / dead computation. | B1-B4 | Low. |
| F4 | Byte-identical 13-line block duplicated. | 1964-1976, 2667-2679 | Low (`ensureFoodDescription`). |
| F5 | Section header "Workouts: Append Per-Set History" (4157) is followed by the moderation constants/sanitizers (4171-4234) before `appendWorkoutSets` (4236); related code is interleaved. | 4157-4293 | None if resolved by the D split; do not reorder in place otherwise (pure churn). |
| F6 | `{ region: "us-central1" }` repeated on 21 callables although `setGlobalOptions` already sets it. | 16 + 4 + 1 sites | Do NOT change: option objects are part of the surface `fn-check` compares. |
| F7 | Mixed quote style (single quotes in 2686-3550). | - | Do NOT normalise (rule 6). |
| F8 | Empty `catch { }` blocks. | 21, 1976, 2679, 3578, 4109, 4264 | Leave: defensive around admin init, third-party payloads, per-item loops. |
| F9 | `userRefCache` is never evicted or refreshed, so an instance can serve a stale handle/name/pfp in notifications for its whole lifetime; `userPrivateCache` has a 10 s TTL. | 245-246, 366-466 | Behavioural: leave. Open question I8. |
| F10 | Returned-but-unread fields. | B6 | Leave. |
| F11 | Stale comment about the search cache key. | 32 | None (comment-only). |
| F12 | Inner helper `normalizeHandle` re-created per call and equal to `normaliseHandle(x).toLowerCase()` from functions/shared/handlePropagation.js. | 4367-4373 | Low; optional; leave by default. |

Imports are already grouped and free of duplicates; nothing to do there.

---

## G. Cross-partition requests

1. functions-scripts (`functions/scripts/simulateLeaderboardLastRanksRefresh.js:4-5, 16-85`): OPTIONAL, only if `functions/leaderboard/rankUtils.js` is created. Its `EPSILON`, `HEX_RANK_KEYS`, `toUid`, `safeNumber`, `computeGlobalRanks`, `ensureMembersInValueMap`, `buildEntriesForMembers` are semantically identical to index.js and could be imported from `../leaderboard/rankUtils.js` (that module must stay side-effect free; if B4 removes `computeGlobalRanks` from index.js, the script keeps its own copy or the function stays exported from rankUtils for the script). `initializeLeaderboardZeroSnapshot.js:4,15` and `setAllLastRanksToOne.js:14` could take `HEX_RANK_KEYS`/`toUid` from the same place. Do NOT point `backend/admin/simulateLeaderboardLastRanksRefresh.js` at it: its ranking is not tie-aware (C2).
2. functions-shared: keep these exports exactly as they are (index.js imports them): `deleteUserAndContentByUid` (deleteUserAndContent.js:1110), `propagateHandleChange` (handlePropagation.js:434), `propagateNameChange` (namePropagation.js:582), `buildOldNamesSet` (namePropagation.js:546), `normaliseName` (namePropagation.js:20). Keep `deleteUserAndContent.js`'s own `initializeApp()` try/catch (lines 14-18). Never let those three modules import `./computeHexagon.js` or `./rebuildHexagonStats.js` (H2).
3. Lead / tooling: `SPX/tools/fn-surface.mjs` does not record `__endpoint.vpc`, so `fn-check.sh` cannot see a lost VPC connector. Use the supplemental command in D (implementers may not edit SPX/tools).
4. Owner sign-off list ("files that can now be deleted"): `functions/computeHexagon.js`.
5. Feed partitions (`frontend/utils/livePostMeta.js`, `frontend/helper/useFilteredFeed.js`): do not change the `wid:<id>:<createdMs>` key format or try to unify `deriveWorkoutIdentityKey`/`workoutIdentityKey` with the server's version (C3, I4).
6. Client callers of the 20 `httpsCallable` names in A: the string names and argument shapes are the contract; no change is needed for this partition and none may be made there.
7. backend-shared / utils-logic (`backend/helper/userRefs.js`, `frontend/utils/userRefs.js`): if those two client copies get merged, that is their decision; the server copy in index.js stays as is (it equals the backend/helper one).

---

## H. Fragile areas

H1. Global options vs definition order (CRITICAL). `setGlobalOptions` (14-18) supplies `vpcConnector` + `vpcConnectorEgressSettings: "ALL_TRAFFIC"` to all 25 functions and `region` to the three Firestore triggers. Options are captured when each `onCall`/`onSchedule`/`onDocument*` runs. Today that is guaranteed because everything is in one module body after line 18. Any split must keep "setGlobalOptions first" (D rules 1-2). A mistake here is invisible to `fn-check.sh` for the callables, and would move FatSecret/Expo egress off the connector in production.

H2. Deploy bundle boundary. Only `functions/**` is uploaded (firebase.json `source: "functions"`). `functions/shared/computeHexagon.js` re-exports `../../shared/computeHexagon.js`, which does not exist in the deployed bundle; `functions/shared/rebuildHexagonStats.js` and `functions/computeHexagon.js` depend on it. Nothing reachable from index.js may import any of these three, or every function fails at cold start with ERR_MODULE_NOT_FOUND. `fn-check.sh` copies the repo-level `shared/` next to its scratch copy, so it would NOT catch this. In particular do not "restore" hexagon recomputation in `computeHexagonStats` / `appendWorkoutSets`.

H3. Export surface. Exactly 25 exports; names, option objects, schedule string, memory/timeouts, secrets and trigger document paths are deployment configuration. No renames, no extra exports, no removal (even of the three callables without callers).

H4. Module-level caches (30, 32, 245, 246): per-instance singletons with specific semantics (token expiry minus 60 s at 1866; search cache TTL refresh on hit at 2374-2378 and size-capped eviction loop at 2590-2597; private-data cache 10 s TTL plus forced refetch while `appForeground === true` at 379-381). Move as-is, never duplicate, never "simplify".

H5. `fatsecretSearchFood` (1982-2620): shared mutable counters (`calls`, `scheduled`, `stopEarly`) across concurrent `executeTask` promises, budget constants (2340-2345), the v4 -> v2 -> v1 fallback order of `SEARCH_METHODS`, and the variant ranking all determine which upstream calls are made and what is cached. Only the pure helpers listed in D may move.

H6. Follow/block writes (889-1465): deliberate dual writes to `usersPublic` / `usersPrivate` / legacy `users`, with `.catch(() => {})` on some legacy writes (1005-1010) and not on others (1040-1051, 1135-1142), `update` vs `set(..., {merge:true})` chosen per document, transaction read-before-write order in `performUnfollow`, and the `not-found` / code 5 fallback in `addBlockState`/`removeBlockState`. Do not normalise these differences.

H7. `createUserNotification` (512-562): order is "add notification doc -> increment counters -> best-effort push". Errors in the first two propagate to the caller; push errors are swallowed. Keep.

H8. `refreshLeaderboardLastRanks` (2985-3310): the per-exercise `valueMap`s are shared and mutated across users by `ensureMembersInValueMap`; entry order follows Map/Set insertion order and a stable sort; `lastRanksVersion: 4`, the 400-write batch size, and writing the snapshot doc before user updates are all load-bearing. If B4 is applied, touch only lines 3126-3127 and 3139-3140.

H9. `onCompletedWorkoutAutoPost` (3727-4047): triggered by writes to `users/{uid}` and itself writes to `users/{uid}` (3954, 4009). It terminates only because `workoutIdentityKey` is unchanged by the `postPid` patch for id- or time-keyed entries. The key format is also persisted indirectly (`postIdByWorkoutKey`). Do not alter `workoutIdentityKey`, `toMillisSafe`, `sanitizeWorkoutSnapshot`, or the order batch.commit -> link transactions -> posts arrays -> `global/posts`.

H10. Unauthenticated code paths that are evidently intentional and security-relevant: `resolveLoginIdentifier` (no auth), `deleteOwnAccount` payload-uid path (4377-4400), `submitModerationReport` payload `reporterUid` (4298), `blockUserAction`/`unblockUserAction` idToken fallback via `resolveCallableUser` (858-877). Leave exactly as they are; see I6.

H11. Cross-runtime contracts duplicated in client code: `HANDLE_REGEX` (34), the user-ref object shape from `normalizeUserRefPayload` (190-199), notification event field names (282-299) and push `data` keys (550-556, 4128), `workoutKey` format. Keep byte-for-byte.

---

## I. Open questions for the owner

I1. Three deployed callables have no caller in this repo: `computeHexagonStats` (a stub that returns zeros), `getTribeComparisonScores` (about 490 lines with its exclusive helpers), `appendWorkoutSets` (always ends in a ReferenceError after writing, and overwrites `users/{uid}.statsHexagon` with zeros at 4277-4286). Are they retired? If yes they (and `toDayKey`, the bodyweight helpers, `sanitizeMetricKey`) can be deleted in a deliberate deploy. If `appendWorkoutSets` is still wanted, is zeroing `statsHexagon` intended?
I2. E2: may `extractLatestWeight` be fixed to iterate `list` (changes object-shaped inputs from "throws" to "works")?
I3. `ensureUserProfile` initialises `followersCount` (785, 795) while follow/unfollow maintain `followerCount` (923-950, 1031, 1043, 1129, 1137). The client reads both names in different screens. Which one is canonical?
I4. E3: server `workoutIdentityKey` (`wid:<id>`) vs client `deriveWorkoutIdentityKey` (`wid:<id>:<createdMs>`): the "carry live likes/comments over to the completed-workout post" path appears never to match. Intended?
I5. E4: should `workoutIdentityKey`'s `json:` fallback exist at all, given it can loop the trigger for id-less, time-less entries?
I6. Security posture (not refactor work, flagged because it looks unintended): `deleteOwnAccount` accepts an unauthenticated `{uid, handle}` and deletes the account if the handle matches, or if the user doc has no handle (4397); `submitModerationReport` accepts an unauthenticated `reporterUid`; `resolveLoginIdentifier` returns the login e-mail for any handle without auth.
I7. `coerceReason` (4191-4196): the `ALLOWED_REPORT_REASONS` allow-list has no effect (both branches return the sanitized string). Should unknown reasons be rejected or mapped to "other"?
I8. `userRefCache` never expires (F9); `respondFollowRequestAction` clears follow requests only on `usersPrivate` (1114-1117) while `cancelFollowRequestAction` also clears the legacy `users` doc (1084-1089). Intended?
I9. `functions/package.json` lists `http-errors`, which nothing under `functions/` imports.
I10. `sendUserNotification`: `sanitizeNotificationEvent` drops any `message` field, so the "custom message" branch of `composePushMessage` (356-358) can never fire. Was `message` meant to be passed through?

---

## Summary for the implementer (recommended order)

1. In place, bottom-up: E1 (4292), B2 (3917, 3773-3782, 3768), [E2 (2896) if approved], B1 (2844-2883), [B4 optional], C1 `ensureFoodDescription` (2667-2679, 1964-1976), B3 (1910), B9 comment (32). Run `fn-check.sh` + lint.
2. Decide Plan A vs Plan B (D) and execute with the D rules and the supplemental VPC check.
3. Do not edit `functions/computeHexagon.js`; list it for deletion.

Estimated removable lines in this partition: about 110 (B1 40, B2 12, B4 25, C1 dedupes about 30, plus the orphan shim file).
