# Audit: partition `functions-scripts` (25 files, 4164 lines)

All 25 files were read completely. Paths are relative to the project root; line numbers are those of the working tree (identical to baseline for this partition).

Ground facts that shape every recommendation below:

- These are **operator CLI scripts** (`node functions/scripts/<name>.js ...`). None exports anything, none is imported by any module. They run against the live Firestore/Auth/Storage project and cannot be executed here. `SPX/tools/fn-check.sh` can only syntax-check them and resolve their static imports; `SPX/tools/lint.sh` covers unused vars and `import/named`.
- `functions/package.json` has `"type": "module"`: every file is an ES module. **Indent is 2 spaces and quotes are double** in every file of this partition (not the app's 4-space style). Keep that.
- `console.log` here is the scripts' user interface (progress and summaries), not debug tracing. **Do not strip any console output.**
- Two scripts are load-bearing for other tooling: `backend/admin/changeHandle.js:171` spawns `functions/scripts/switchUserHandle.js` and `backend/admin/changeName.js:178` spawns `functions/scripts/switchUserName.js` (by path, positional argv, exit code 0 = success, stdio inherited).
- No references to any of these scripts exist in README.md, docs/, package.json scripts, firebase.json or CI config (repo-wide grep per script name).

Recommended scope for the implementer (details in the sections): **three small, safe edits** (B1, B2, F1) and nothing else. Everything bigger is either not semantically identical (rule 4), a rewrite rather than a move (rule 3), or depends on an owner decision about which scripts are obsolete (section I).

---

## A. Module map

No file in this partition has exports. "Importers: none" means no static import, dynamic import, require or string reference anywhere in LIVE/TOOLING/PARKED/functions (verified by grep for each basename).

| File (lines) | Purpose | Imports from outside `firebase-admin` | Importers / callers |
|---|---|---|---|
| `functions/scripts/addFeaturedGlobalPost.js` (65) | Upserts `globalTrendingPosts/<pid with / replaced by _>` with `{pid, priority, boostScore, createdAt, expiresAt?}`. argv: `<pid> [priority=100] [boostScore=0] [expiresInMinutes]`. | none | none (collection is read by `backend/retrieveTrendingPosts.js:9`) |
| `functions/scripts/clearActiveWorkoutByHandle.js` (224) | Finds a user by handle in `users`; nulls `currentWorkout` on `users`, `usersPublic`, `usersPrivate`; removes the uid from `workouts/<wid>.members/users`, deletes `workouts/<wid>/live/<uid>` and matching `workoutInvites`. argv: `<handle>`. | none | none |
| `functions/scripts/clearAllBlocks.js` (90) | Pages all `users` docs (500/page) and deletes the six block fields. No argv. | none | none |
| `functions/scripts/clearAllUsersContent.js` (138) | Deletes collections `posts` and `workouts`, resets `global/posts`, resets post/workout/stat fields on every `users` doc. No argv. | none | none |
| `functions/scripts/clearStaleCurrentWorkouts.js` (193) | Pages `users`; nulls `currentWorkout` older than N hours (argv[2], default 6); then deactivates the referenced `workouts` docs and deletes `live/<uid>`. | none | none |
| `functions/scripts/clearUserContentByHandle.js` (384) | Keeps the account; deletes one user's `posts`/`workouts`, cleans `global/posts` and `global/explorePosts`, prunes post ids from every `users` doc, resets the user's stats. argv: `<handle>`. | none | none |
| `functions/scripts/clearUserMessages.js` (49) | Sets `messages: [], unreadMessagesCount: 0` on every `users` doc. | none | none |
| `functions/scripts/clearWorkoutData.js` (65) | Resets workout/stat fields on every `users` doc (does not delete `workouts`). | none | none |
| `functions/scripts/copyStatsHexagonToUsersPublic.js` (92) | One-off migration: copies `statsHexagon` and `statsExercises` from `users/<uid>` to `usersPublic/<uid>`. | none | none |
| `functions/scripts/deleteUserAndContentByHandle.js` (23) | Thin CLI over the shared account-deletion module. argv: `<handle>`. Does not call `initializeApp` itself (the shared module does at import). | `deleteUserAndContentByHandle` from `../shared/deleteUserAndContent.js` | none (`backend/admin/deleteUserAccount.js` loads the same shared module directly) |
| `functions/scripts/initializeLeaderboardZeroSnapshot.js` (274) | Reads `users` + `tribes`; writes a "everyone tied last" snapshot to `leaderboardSnapshots/<iso>`, `leaderboardMeta/currentSnapshot` and `lastRanks` (v4 shape) on each `users` doc. | none | none |
| `functions/scripts/purgeFakeUsers.js` (113) | Lists `users` docs missing any of `uid`, `name`, `handle`; with `--yes` deletes them (full account deletion when a uid exists). | `deleteUserAndContentByUid` from `../shared/deleteUserAndContent.js` | none |
| `functions/scripts/recomputeAllHexagonStats.js` (96) | Pages `users` (200/page) and rewrites stats/hexagon fields from `completedWorkouts`. | `computeHexagonFromUserData` from `../shared/rebuildHexagonStats.js` | none (`backend/admin/recomputeAllHexagonStats.js` is a separate, newer CLI) |
| `functions/scripts/recomputeHexagonByHandle.js` (85) | Same recompute for one user (exact match on `users.handle`), with verbose JSON logging. argv: `<handle>`. | `computeHexagonFromUserData`, `rebuildStatsFromWorkouts`, `combineStatsExercises` from `../../shared/rebuildHexagonStats.js` (the repo-root shim) | none |
| `functions/scripts/recomputeHexagonStandalone.js` (85) | Byte-identical to `recomputeHexagonByHandle.js` except the usage string on line 17. | same as above | none |
| `functions/scripts/removeSpartanAutoFollow.js` (220) | One-off migration: removes the Spartan account from every user's `following`, from `global/users.all[*].following`, and prunes Spartan's `followers`. | none | none |
| `functions/scripts/resetApp.js` (225) | Hard reset: deletes all Auth users, all top-level Firestore collections (recursive), all files in the Storage bucket. Requires `--confirm`; `--skip-auth`, `--skip-firestore`, `--skip-storage`, `--bucket=<name>`. | none | none |
| `functions/scripts/resetUserContentByHandle.js` (671) | Despite the name, **deletes the whole account** (posts, workouts, chats, tribes, references in other users, Auth user, user doc). An older fork of `functions/shared/deleteUserAndContent.js`. argv: `<handle>`. | none | none |
| `functions/scripts/resetUserWorkouts.js` (129) | Deletes collection `workouts` and resets workout/stat fields on every `users` doc. | none | none |
| `functions/scripts/seedSuggestedUsersFromVerified.js` (138) | Builds `global/suggestedUsers {list,total,updatedAt}` from `users` where `isVerified == true` or `verified == true`. | none | none (doc is read by `frontend/hooks/useSuggestedUsersList.js:7`) |
| `functions/scripts/setAllLastRanksToOne.js` (214) | Despite the name, sets each existing `lastRanks` scope to the participant count ("last place"), writing `lastRanksVersion: 3`. | none | none |
| `functions/scripts/simulateLeaderboardLastRanksRefresh.js` (377) | Manual run of the weekly `refreshLeaderboardLastRanks` Cloud Function logic (reads `usersPublic` + `tribes`, writes snapshot + `lastRanks` v4). | none | none |
| `functions/scripts/switchUserHandle.js` (54) | CLI over handle propagation. argv: `<oldHandle> <newHandle>`. | `normaliseHandle`, `findUserByHandle`, `ensureHandleAvailable`, `propagateHandleChange` from `../shared/handlePropagation.js` | **spawned by `backend/admin/changeHandle.js:171-181`** |
| `functions/scripts/switchUserName.js` (63) | CLI over name propagation. argv: `<uidOrHandle> <newName> [oldName...]`. | `normaliseName`, `resolveUserDoc`, `buildOldNamesSet`, `propagateNameChange` from `../shared/namePropagation.js` | **spawned by `backend/admin/changeName.js:177-190`** |
| `functions/scripts/toggleUserVerification.js` (97) | Flips `isVerified`/`verified` on `users/<uid>` (uid or handle). argv: `<uid-or-handle>`. | none | none (`backend/admin/verifyUser.js` is the newer CLI that writes `usersPublic` too) |

Exports of `functions/shared/*` that only this partition consumes from outside their own module (must stay exported; see G2): `resolveUserDoc`, `normaliseHandle` (handlePropagation), `rebuildStatsFromWorkouts`, `combineStatsExercises`.

---

## B. Verified dead code

### B1. `processed` counter, assigned but never read (ESLint finding: CONFIRMED) — REMOVE
- `functions/scripts/clearUserContentByHandle.js:226` (`let processed = 0;`) and `:309` (`processed += snapshot.size;`). Function `scrubPostReferences` returns `updated`; `processed` is not logged or returned.
- `functions/scripts/resetUserContentByHandle.js:360` (`let processed = 0;`) and `:484` (`processed += snapshot.size;`). Function `scrubUserReferences` returns `updatedDocs`.
- Fix: delete those four lines. Nothing else references the name in either file. (The findings file lists each of them twice; it is one finding per file.)

### B2. `computeGlobalRanks` is computed and never consumed — REMOVE (pure dead computation)
- `functions/scripts/simulateLeaderboardLastRanksRefresh.js:31-52` defines `computeGlobalRanks`. Its only calls are `:206` and `:217`; the results are stored as the `ranks` property of the objects put in `exerciseMaps` (`:207`) and `hexMaps` (`:218`). Every later read of those maps uses only `config.valueMap` (`:228-229`, `:236-237`, `:256-257`, `:264-265`, `:280-281`, `:289-290`). `grep -n "ranks\b"` in the file returns only lines 38, 49, 51, 206, 207, 217, 218.
- The function is pure (builds a new array and a new Map from `valueMap.entries()`; does not mutate `valueMap`), so removing it cannot change what is written.
- Fix: delete lines 31-52 (and one of the surrounding blank lines), delete lines 206 and 217, and change `{ valueMap, ranks }` to `{ valueMap }` on lines 207 and 218. `EPSILON` (line 4) stays: it is still used at `:75`. `safeNumber` stays (used at `:64`, `:69`, `:204`, `:215`).
- The same dead computation exists in the deployed function (`functions/index.js:2962-2983`, results stored at about `:3126-3127` and `:3139-3140`, never read) and in `backend/admin/simulateLeaderboardLastRanksRefresh.js:30-41,177-178,188-189`. See G3: keep the script and the function in step (remove in both or in neither).

### B3. Whole files that duplicate or are superseded by other code — KEEP ON DISK, list for owner-approved deletion
- `functions/scripts/recomputeHexagonStandalone.js` (85 lines): `diff` against `recomputeHexagonByHandle.js` shows one differing line (17, the usage string). One of the two is redundant.
- `functions/scripts/resetUserContentByHandle.js` (671 lines): 19 of its 23 functions are identical to module-private functions of `functions/shared/deleteUserAndContent.js` (table in C13); the remaining logic is an older variant of the same account deletion. The maintained entry points are `functions/scripts/deleteUserAndContentByHandle.js` and `backend/admin/deleteUserAccount.js`. See I2.

### B4. Things that look dead but must stay
- **All `console.log` calls**: CLI output, not tracing.
- **Defensive guards that current callers never trigger** (leave; removing them is not worth the risk in untestable scripts): `clearActiveWorkoutByHandle.js:42` (`filterOutUid` with empty uid; caller guards at `:131`), `:81`, `:100`; `clearStaleCurrentWorkouts.js:63-64` (entries are only queued when `wid` is truthy, `:158`); `seedSuggestedUsersFromVerified.js:84` (`uid` is a doc id, never empty); `clearUserContentByHandle.js:157` (`if (uid)`, always true from `main`).
- **Default-only parameters** (no caller passes them; harmless, leave): `batchSize` in `clearAllUsersContent.js:36,67`, `resetUserWorkouts.js:36,67`, `clearUserContentByHandle.js:72,96`, `resetUserContentByHandle.js:91,114,143,491`, `resetApp.js:100`, `setAllLastRanksToOne.js:120`.
- **Redundant but harmless expressions** (leave; rule 6): `purgeFakeUsers.js:37-39` (`|| ""` after a function that always returns a string); `clearStaleCurrentWorkouts.js:141` (`?? null`); `toggleUserVerification.js:63` (`value == null` before `Boolean(value)`); `if (!set.has(x)) set.add(x)` at `initializeLeaderboardZeroSnapshot.js:154,174` and `simulateLeaderboardLastRanksRefresh.js:245,273`; `clearAllUsersContent.js:127-129` (a `.catch` that retries the same `set`).

### B5. Checked and found clean
- knip: no exports in the partition (grep `^export|module.exports` in `functions/scripts/*.js` is empty), so no unused exports.
- No commented-out code, no TODO/FIXME, no unused imports (every imported binding is referenced; ESLint reports only B1).
- No PARKED file uses anything in this partition.

---

## C. Duplication

Legend: IDENTICAL = same result for every input the code can receive; DIFFERS = stated difference.

### C1. Firebase Admin bootstrap (`try { initializeApp(); } catch {}` + `getFirestore()`), 24 of 25 files
`addFeaturedGlobalPost.js:4-10`, `clearActiveWorkoutByHandle.js:4-10`, `clearAllBlocks.js:6-12`, `clearAllUsersContent.js:7-13`, `clearStaleCurrentWorkouts.js:44-50`, `clearUserContentByHandle.js:7-13`, `clearUserMessages.js:6-10`, `clearWorkoutData.js:6-10`, `copyStatsHexagonToUsersPublic.js:6-20`, `initializeLeaderboardZeroSnapshot.js:7-13`, `purgeFakeUsers.js:91-97` (inside `main`), `recomputeAllHexagonStats.js:9-20`, `recomputeHexagonByHandle.js:9-13`, `recomputeHexagonStandalone.js:9-13`, `removeSpartanAutoFollow.js:8-12`, `resetApp.js:48-57`, `resetUserContentByHandle.js:8-15`, `resetUserWorkouts.js:7-13`, `seedSuggestedUsersFromVerified.js:4-10`, `setAllLastRanksToOne.js:6-12`, `simulateLeaderboardLastRanksRefresh.js:8-14`, `switchUserHandle.js:9-13`, `switchUserName.js:9-13`, `toggleUserVerification.js:4-10`.
- Not uniform: two files also call `db.settings({ ignoreUndefinedProperties: true })` right after (`copyStatsHexagonToUsersPublic.js:13-20`, `recomputeAllHexagonStats.js:16-20`), one also needs `getAuth` (`resetUserContentByHandle.js:15`), one needs Auth + Storage + `getApp` (`resetApp.js:54-57`), two only initialise (switch scripts; the shared modules get Firestore lazily).
- Recommendation: **leave**. A shared `db` singleton would break the `db.settings(...)` ordering (H3) and the import-order guarantees (H2).

### C2. `sleep(ms)` — IDENTICAL everywhere
`clearAllUsersContent.js:32-34`, `clearStaleCurrentWorkouts.js:15`, `clearUserContentByHandle.js:32`, `resetApp.js:96-98`, `resetUserContentByHandle.js:17-19`, `resetUserWorkouts.js:32-34`; also `functions/shared/deleteUserAndContent.js:23-25`, `functions/shared/handlePropagation.js:15-17`, `functions/shared/namePropagation.js:16-18` (all module-private). Declaration vs arrow form only.

### C3. `normaliseHandle` — three behaviours inside `functions/`
- Variant A (exported): `functions/shared/handlePropagation.js:19-25`. `null/undefined -> ""`, trim, strip one leading `@`, trim again.
- Variant B: `functions/shared/deleteUserAndContent.js:27-33` and `functions/scripts/resetUserContentByHandle.js:21-27` (byte-identical apart from a trailing space on line 27). Guard is `!rawHandle && rawHandle !== 0`, so `false` and `NaN` give `""` (A gives `"false"`, `"NaN"`). Identical to A for every string.
- Variant C: `functions/scripts/clearActiveWorkoutByHandle.js:12-17`, `clearUserContentByHandle.js:34-39`, `toggleUserVerification.js:12-17` (same body three times). **No second trim**: `"@ bob"` gives `" bob"` (A and B give `"bob"`).
- `backend/admin/{changeHandle.js:42, changeName.js:43, deleteUserAccount.js:32, verifyUser.js:42, exportFoodLogsTable.js:117}` are further CommonJS copies (other partition).
- Verdict: C is IDENTICAL to A except when whitespace follows a leading `@`. Not identical for every input, so by rule 4 do not merge. The three C copies are identical to each other.

### C4. `findUserByHandle` — five behaviours
| Id | Location | Collection | Candidate fields | Multiple-match message |
|---|---|---|---|---|
| F1 | `functions/shared/handlePropagation.js:145-185` (exported) | `usersPublic`, then `userHandles/<lower>` fallback | handle, @handle, handle(lower), handleLower, handle_lower | `Multiple usersPublic docs matched by ...` |
| F2 | `functions/shared/deleteUserAndContent.js:65-95` (exported) | `users` | handle, @handle, handle(lower), handle_lower, username, username_lower, tag (7) | `Multiple users matched by <f> = "<v>". Aborting.` |
| F2' | `functions/scripts/resetUserContentByHandle.js:59-89` | byte-identical to F2 (no `export`) | | |
| F3 | `functions/scripts/clearUserContentByHandle.js:41-70` | `users` | same 7 as F2 | same as F2 | 
| F4 | `functions/scripts/clearActiveWorkoutByHandle.js:47-77` | `users` | 6: no `handle == lower` candidate | same as F2 |
| F5 | `functions/scripts/toggleUserVerification.js:19-47` | `users` | same 6 as F4 | `Multiple users matched <f> = "<v>".` (no "by", no "Aborting.") |
- F2' is IDENTICAL to F2. F3 differs from F2 only through `normaliseHandle` variant C vs B (the `"@ x"` case). F4/F5 query one candidate fewer. F1 is a different lookup altogether.
- `backend/admin/changeHandle.js:93` and `backend/admin/verifyUser.js:161` are yet other variants (return plain objects).
- Recommendation: do not merge. Flag for the `functions-shared` owner: two different exported functions named `findUserByHandle` live in `functions/shared/` (F1 and F2).

### C5. `resolveUserDoc` — DIFFERS
`functions/scripts/toggleUserVerification.js:49-59` (trims; `users/<id>` then local F5; errors propagate unchanged) vs `functions/shared/namePropagation.js:571-580` (no trim; `usersPublic/<id>` then F1; wraps any error as `Could not resolve user ...`). Leave.

### C6. uid extraction helpers
- `toUid`: `functions/scripts/initializeLeaderboardZeroSnapshot.js:15-23`, `setAllLastRanksToOne.js:14-22`, `simulateLeaderboardLastRanksRefresh.js:16-24` are byte-identical (verified with `diff`); also `functions/index.js:2723-2731`, `backend/admin/simulateLeaderboardLastRanksRefresh.js:15-23`, `backend/admin/resetLeaderboardLastRanks.js:14-22` (arrow form). IDENTICAL.
- `getUidFromEntry`: `resetUserContentByHandle.js:34-57` IDENTICAL to `functions/shared/deleteUserAndContent.js:40-63`.
- `toUidString`: `clearActiveWorkoutByHandle.js:19-39`. DIFFERS from `getUidFromEntry` (trims; candidate keys `userID`, `userUID` instead of `creatorUID`, `ownerUID`). Unique; leave.

### C7. string coercion
- `toStringSafe` (no trim): `resetUserContentByHandle.js:29-32` IDENTICAL to `functions/shared/deleteUserAndContent.js:35-38`.
- `toStringSafe` (trims): `seedSuggestedUsersFromVerified.js:16-20`. Same name, DIFFERENT behaviour from the one above. IDENTICAL in behaviour to `toTrimmedString` in `purgeFakeUsers.js:8-12`.

### C8. zero-stat constants — IDENTICAL values
`ZERO_HEXAGON` at `clearAllUsersContent.js:15-23` and `resetUserWorkouts.js:15-23`; `ZERO_HEX` at `clearUserContentByHandle.js:15-23`; the same literal inline at `clearWorkoutData.js:36-44`. `DEFAULT_STATS` at `clearAllUsersContent.js:25-30`, `resetUserWorkouts.js:25-30`, `clearUserContentByHandle.js:25-30`.

### C9. user-reset payloads — DIFFER, do not unify
`clearAllUsersContent.js:87-105` (posts + workouts + stats), `resetUserWorkouts.js:87-101` (no post fields, adds `workoutsByDate: {}`), `clearUserContentByHandle.js:318-339` (as the first, but `statsHexagonMeta: { updatedAt, lastTrainedByGroup: {} }`), `clearWorkoutData.js:28-46` (no `currentWorkout`, `workouts`, `stats`). These are Firestore field shapes (rule 1).

### C10. collection deletion
- `deleteCollection`: `clearAllUsersContent.js:36-65` byte-identical to `resetUserWorkouts.js:36-65` (logs progress, returns nothing).
- `deleteCollectionByPath`: `resetUserContentByHandle.js:91-112` IDENTICAL to `functions/shared/deleteUserAndContent.js:97-118` (silent, returns the count).
- The two families DIFFER (logging and return value).

### C11. near-twin scripts
- `clearAllUsersContent.js:1-66` byte-identical to `resetUserWorkouts.js:1-66`; the rest differs only in the payload, log texts, and the extra `posts`/`global/posts` steps (`diff` output reviewed).
- `clearUserMessages.js` vs `clearWorkoutData.js`: same skeleton, different payload and log texts.
- `copyStatsHexagonToUsersPublic.js:44-91` vs `recomputeAllHexagonStats.js:50-95`: same `main` skeleton, different per-user function.
- `recomputeHexagonByHandle.js` vs `recomputeHexagonStandalone.js`: identical except line 17 (B3).

### C12. "page through all users" loop — 12 copies, same shape, different bodies
`clearAllBlocks.js:27-73`, `clearAllUsersContent.js:71-117`, `clearStaleCurrentWorkouts.js:116-175`, `clearUserContentByHandle.js:230-311`, `clearUserMessages.js:16-40`, `clearWorkoutData.js:17-56`, `copyStatsHexagonToUsersPublic.js:51-79`, `recomputeAllHexagonStats.js:57-83`, `removeSpartanAutoFollow.js:37-84`, `resetUserContentByHandle.js:364-486`, `resetUserWorkouts.js:71-113`, `setAllLastRanksToOne.js:129-197`. Page sizes differ (200, 400, 500), throttling differs (none or `sleep(50)`), commit strategy differs (per page, or a rolling batch across pages in `clearStaleCurrentWorkouts.js`). Abstracting this is a rewrite, not a move: **leave**.

### C13. account-deletion helpers: `resetUserContentByHandle.js` vs `functions/shared/deleteUserAndContent.js`
Compared function by function (trailing whitespace and `export` ignored):

| Function | Script lines | Shared lines | Result |
|---|---|---|---|
| `sleep` | 17-19 | 23-25 | IDENTICAL |
| `normaliseHandle` | 21-27 | 27-33 | IDENTICAL |
| `toStringSafe` | 29-32 | 35-38 | IDENTICAL |
| `getUidFromEntry` | 34-57 | 40-63 | IDENTICAL |
| `findUserByHandle` | 59-89 | 65-95 (exported) | IDENTICAL |
| `deleteCollectionByPath` | 91-112 | 97-118 | IDENTICAL |
| `deleteUserPosts` | 114-141 | 120-147 | IDENTICAL |
| `deleteUserWorkouts` | 143-187 | 149-193 | IDENTICAL |
| `cleanGlobalPosts` | 189-250 | 341-402 | IDENTICAL |
| `cleanGlobalExplorePosts` | 252-267 | 404-419 | IDENTICAL |
| `removeFromGlobalUsers` | 269-281 | 421-433 | IDENTICAL |
| `filterUserRefArray` | 283-293 | 435-445 | IDENTICAL |
| `filterPidArray` | 295-313 | 447-465 | IDENTICAL |
| `filterPostRecords` | 315-328 | 467-480 | IDENTICAL |
| `filterMessagesArray` | 330-339 | 482-491 | IDENTICAL |
| `filterUidArray` | 341-347 | 493-499 | IDENTICAL |
| `filterUidMap` | 349-356 | 501-508 | IDENTICAL |
| `purgeMessageContent` | 491-512 | 669-690 | IDENTICAL |
| `deleteAuthUser` | 607-618 | 849-860 | IDENTICAL |
| `scrubUserReferences` | 358-489 | 510-667 (`scrubUserCollection` + wrapper) | DIFFERS: script scans only `users` and lets errors throw; shared scans `users`, `usersPublic`, `usersPrivate` and catches per collection |
| `removeUserFromMessages` | 514-567 | 754-812 | DIFFERS: script deletes a chat when at most one member remains and removes the user from `users`; shared deletes only when no member remains, replaces the user with a "Deleted User" placeholder and writes `userCount` |
| `cleanTribes` | 569-605 | 814-847 | DIFFERS: script hands ownership to the next member; shared deletes the tribe when the owner leaves |
| `main` | 620-665 | `deleteUserCore` 992-1108 | DIFFERS: shared also applies a placeholder identity and deletes `usersPublic`, `usersPrivate` (+ subcollections), `userHandles`, `userSearchIndex` |

Relatives in `clearUserContentByHandle.js`:
- `deleteUserPosts` `:72-94` and `deleteUserWorkouts` `:96-140`: IDENTICAL in behaviour to the versions above (statement order and `!pending` vs `pending === 0` only).
- `cleanGlobalExplorePosts` `:206-221`: IDENTICAL for string ids (`String(id)` vs `toStringSafe`).
- `cleanGlobalPosts` `:142-204`: **DIFFERS**. Early return is `if (!pidList.length)` (`:143`); the other two use `if (!pidList.length && !uid)`. With no deleted posts, this copy skips the ownerMap-by-uid cleanup. See E1.
- `pruneArray` `:245-259` / `pruneMap` `:261-272` vs `filterPidArray` / `filterPostRecords`: same filtering; the `filter*` versions additionally short-circuit on an empty `pidSet`, which `scrubPostReferences` can never pass (`:224` returns first). Different signatures (closure over `pidSet` vs parameter).

Canonical home if the owner keeps the legacy script: `functions/shared/deleteUserAndContent.js` (see D). Recommendation for this refactor: do not touch beyond B1.

### C14. leaderboard rank logic
- `functions/scripts/simulateLeaderboardLastRanksRefresh.js` vs the deployed `refreshLeaderboardLastRanks` (`functions/index.js:2985-3300`): helpers `EPSILON`, `HEX_RANK_KEYS`, `toUid`, `safeNumber`, `ensureMembersInValueMap`, `buildEntriesForMembers`, `computeGlobalRanks` (script `:4-5,16-85`; function file `:2687-2736, 2962-2983`) are IDENTICAL in behaviour. The main bodies have drifted: the function also treats `data?.isPrivate === true` as private (script `:105-108` does not) and returns early when there are no metrics (the script goes on and writes an empty snapshot). See I5.
- `backend/admin/simulateLeaderboardLastRanksRefresh.js` (347 lines) is an **older fork** of the script: `diff` shows only the missing tie handling (`computeGlobalRanks` and `buildEntriesForMembers` assign `index + 1`, no `EPSILON`). DIFFERS in output whenever two users tie.
- `initializeLeaderboardZeroSnapshot.js` shares with the simulate script: the tribe-membership block (`:94-129` vs `:143-178`, one log label differs), the snapshot/batch write block (`:226-258` vs `:331-363`, constant name and one log line differ), `toUid`, `HEX_RANK_KEYS` (`:4` vs `:5`), and the head of the user loop.
- Canonical home, if `functions-index` extracts the leaderboard code from `functions/index.js`: a module under `functions/shared/` exporting the seven helpers, which the two scripts can then import. Until such a module exists, leave the scripts alone (apart from B2).

### C15. in-file repetition (leave; noted for completeness)
- `removeSpartanAutoFollow.js`: `isSpartanFollowEntry` `:17-22` and `isSpartanUser` `:24-29` have the same body; the followers filter `:144-149` equals `:188-193`; the following filter `:49-60` nearly equals `:112-123`.
- `simulateLeaderboardLastRanksRefresh.js`: six blocks of "`ensureMembersInValueMap` + `buildEntriesForMembers` + assign" (`:225-231`, `:233-239`, `:253-259`, `:261-267`, `:277-283`, `:286-292`); the same pattern is in the deployed function, so keep them parallel.
- `initializeLeaderboardZeroSnapshot.js`: `buildZeroEntries` re-sorts and re-stringifies arrays that are already sorted strings (`:135,141,147,155,175`). Pure; leave.
- `resetUserContentByHandle.js:94-109` vs `:494-509` (two batch-delete loops).

### C16. `chunk` — IDENTICAL
`clearStaleCurrentWorkouts.js:7-13` and `functions/index.js:4051-4055`.

### C17. `toMillis` — DIFFERS from every other copy
`clearStaleCurrentWorkouts.js:17-42` returns `null` on failure and the caller chains `??` on that (`:132-142`). `functions/shared/rebuildHexagonStats.js:15-35` returns `0`; `functions/index.js:3553` (`toMillisSafe`) handles `toDate`; about 20 client-side `toMillis` exist. Do not merge.

### C18. numeric coercion — trivially equivalent, leave
`toNumberOrDefault(value, d)` (`addFeaturedGlobalPost.js:12-15`) is the same function as `toNumber(value, fallback)` (`functions/shared/rebuildHexagonStats.js:3-6`, private); `safeNumber` (`simulateLeaderboardLastRanksRefresh.js:26-29`) is the same with fallback 0.

### C19. `coerceBoolean` — DIFFERS
`toggleUserVerification.js:61-65` vs `backend/admin/verifyUser.js:48-59` (the latter parses `"true"`/`"false"` strings and takes a fallback).

### Optional consolidation (not recommended for this refactor)
If the planner wants DRY in the scripts anyway, the only extraction that is safe by construction is a **pure** module (no Firebase imports, so no init-order hazard), for example `functions/scripts/lib/scriptHelpers.js`, receiving verbatim: `sleep` (`clearAllUsersContent.js:32-34`), `toUid` (`initializeLeaderboardZeroSnapshot.js:15-23`), `ZERO_HEXAGON` and `DEFAULT_STATS` (`clearAllUsersContent.js:15-30`), `HEX_RANK_KEYS` (`initializeLeaderboardZeroSnapshot.js:4`). Consumers: C2, C6, C8 and C14 locations inside this partition (`clearUserContentByHandle.js` would import `ZERO_HEXAGON as ZERO_HEX`). Net saving is roughly 70 lines. Reasons against: these are standalone operator tools, about half of them look obsolete (I1), none can be run to confirm, and `fn-check.sh` syntax-checks only `functions/scripts/*.js` (a file in a subfolder needs a manual `node --check`). Anything that needs `db` (`deleteCollection`, `findUserByHandle`) must not go into such a module.

---

## D. Decomposition plan (files over about 500 lines)

Only one file qualifies: `functions/scripts/resetUserContentByHandle.js` (671 lines).

**Recommendation: do not decompose. Remove the dead counter (B1) and list the file for owner-approved deletion (I2).** It is a stale fork; splitting it would add files to a script that should disappear.

If the owner wants to keep its legacy behaviour, this is the move-only plan (needs a change in the `functions-shared` partition, G5):

1. In `functions/shared/deleteUserAndContent.js`, add `export` to the 18 private declarations that are identical (line of each declaration): `sleep` 23, `normaliseHandle` 27, `toStringSafe` 35, `getUidFromEntry` 40, `deleteCollectionByPath` 97, `deleteUserPosts` 120, `deleteUserWorkouts` 149, `cleanGlobalPosts` 341, `cleanGlobalExplorePosts` 404, `removeFromGlobalUsers` 421, `filterUserRefArray` 435, `filterPidArray` 447, `filterPostRecords` 467, `filterMessagesArray` 482, `filterUidArray` 493, `filterUidMap` 501, `purgeMessageContent` 669, `deleteAuthUser` 849. (`findUserByHandle` at 65 is already exported.) No body changes.
2. In the script, delete lines 17-356, 491-512 and 607-618 and import the 19 names from `"../shared/deleteUserAndContent.js"`.
3. What stays in the script: imports and constants (`:1-6`; `getAuth` import and `auth` at `:3,15` become unused and go), the bootstrap (`:8-14`), `scrubUserReferences` (`:358-489`), `removeUserFromMessages` (`:514-567`), `cleanTribes` (`:569-605`), `main` and its invocation (`:620-670`). About 290 lines.
4. What blocks a clean extraction: (a) it widens the export surface of a module that is deployed with the Cloud Functions, only to serve a legacy script; (b) the script would then run the shared module's own `initializeApp()`/`getFirestore()`/`getAuth()` at import (same default app, so the same instances, but it is a second init path); (c) nothing here can be executed to confirm. Hence "not recommended".

Files under 500 lines that are still large: `clearUserContentByHandle.js` (384) and `simulateLeaderboardLastRanksRefresh.js` (377) are each one cohesive procedure; no split.

---

## E. Latent bugs

None is of the "unambiguous" kind that rule 2 allows fixing silently (no undefined names, no duplicate keys, lint is clean apart from B1). Each item below changes what a script writes to the live database if "fixed", so **record them and do not fix without the owner** (they are repeated in I).

| # | Location | Problem | Smallest fix matching evident intent | Confidence it is a bug |
|---|---|---|---|---|
| E1 | `functions/scripts/clearUserContentByHandle.js:143` | `cleanGlobalPosts` returns early when no posts were deleted, so the "remove every ownerMap entry owned by this uid" logic at `:157-177` never runs for a user whose `posts` query was empty. The newer copies use `if (!pidList.length && !uid)` (`resetUserContentByHandle.js:190`, `functions/shared/deleteUserAndContent.js:342`). | Change the condition to `!pidList.length && !uid`. Changes behaviour (more cleanup); owner decision. | medium |
| E2 | `functions/scripts/setAllLastRanksToOne.js:145-147,157` | Fallback when `count()` fails: `effectiveTotalUsers` is set to `processedDocs` on the first document (1) and never updated again, so every "global" scope gets rank 1 / participantCount 1. The comment says "fallback when count() unavailable". | Not obvious (a correct fallback needs a full pre-count). Do not guess. | medium-high that it is wrong; fix unclear |
| E3 | `functions/scripts/resetApp.js:180-187` | The second test repeats `error?.code === 404 ||`; any 404 is already handled by the first branch, so that sub-condition is unreachable and a missing bucket reported with code 404 is logged as "already empty". Both branches only log and return, so the effect is a misleading message. | Leave. (A fix would be to test the two message patterns before the bare code.) | low impact |
| E4 | `functions/scripts/clearStaleCurrentWorkouts.js:83-91` | Sets `active: false` on the workout document for every stale participant, even when other members remain. `clearActiveWorkoutByHandle.js:150-155` deactivates only when no member is left. Also only the `users` doc is cleared (`:148-154`), not `usersPublic`/`usersPrivate` as in `clearActiveWorkoutByHandle.js:87`. | Intent unclear; do not change. | low-medium |
| E5 | `functions/scripts/purgeFakeUsers.js:26-33` vs messages at `:50,54,87` | Logic selects users missing **any** of uid/name/handle; the messages say "missing uid + name + handle". With `--yes` this deletes real accounts whose `users` doc merely lacks one field. | Intent unclear; do not change. | medium that message and logic disagree |

Non-bugs checked: `process.exit` inside `main` before any write (`clearActiveWorkoutByHandle.js:181`, `clearUserContentByHandle.js:348`, `resetUserContentByHandle.js:624`, `switchUser*.js`) is fine; `switchUserName.js:31-34` exits inside `.catch`, so `userDoc` is never undefined afterwards; hoisted function declarations used before their definition in `removeSpartanAutoFollow.js:93-94` are fine.

---

## F. Best-practice issues

| # | Issue | Location | Proposed action | Risk |
|---|---|---|---|---|
| F1 | A module is imported through two paths. `recomputeAllHexagonStats.js:3-5` imports `../shared/rebuildHexagonStats.js` (the real module in `functions/shared/`); `recomputeHexagonByHandle.js:3-7` and `recomputeHexagonStandalone.js:3-7` import `../../shared/rebuildHexagonStats.js`, the repo-root shim whose whole content is `export * from "../functions/shared/rebuildHexagonStats.js"` plus the default re-export. So the two scripts leave `functions/` only to come straight back. | lines 7 of both files | Change the specifier to `"../shared/rebuildHexagonStats.js"` in both files. Same module instance, same three named bindings. After that, `shared/rebuildHexagonStats.js` has no importer (G1). | very low; `fn-check.sh` verifies the import resolves, `lint.sh` (`import/named`) verifies the names |
| F2 | Functions and a table re-created for every user document inside a loop: `pruneArray`, `pruneMap`, `targets` in `clearUserContentByHandle.js:245-280` (inside `snapshot.docs.forEach`). They close only over `pidSet` (`:225`). | as cited | Optional: hoist the three declarations to just after `:228`. Needs re-indenting 36 moved lines. Behaviour identical. I would skip it: it is a single-user maintenance script and the gain is cosmetic. | low |
| F3 | Dead computation mirrored from the Cloud Function | B2 | Remove (B2). | very low |
| F4 | Misleading names. File `resetUserContentByHandle.js` deletes the account (`:627` logs "Deleting Spartan account"); file `setAllLastRanksToOne.js` sets counts and its error label is `setAllLastRanksToCounts` (`:211`); `DRY_RUN_FLAG = "--yes"` is the confirm flag (`purgeFakeUsers.js:6`); parameter `excludeUid` marks the user that gets reset, not excluded (`clearUserContentByHandle.js:223,290`); log label "computeHexagonFromStats outputs" (`recomputeHexagonByHandle.js:54`). | as cited | Leave. Files cannot be renamed (rule 8); identifier renames in untestable scripts buy nothing. Mention to the owner (I). | n/a |
| F5 | Failure paths logged with `console.log` instead of `console.warn` | `clearActiveWorkoutByHandle.js:93,118,161,168`; `clearStaleCurrentWorkouts.js:79,93` | Leave: switching moves the text from stdout to stderr, an observable change for an operator piping output. | n/a |
| F6 | Empty `catch {}` without the explanatory comment the other scripts have | `clearUserMessages.js:8`, `clearWorkoutData.js:8`, `recomputeHexagonByHandle.js:11`, `recomputeHexagonStandalone.js:11`, `removeSpartanAutoFollow.js:10` | Leave (no behaviour, no lint finding). | n/a |
| F7 | Duplicate work for logging: `recomputeHexagonByHandle.js:36-46` calls `rebuildStatsFromWorkouts` and `combineStatsExercises`, which `computeHexagonFromUserData` (`:48`) runs again internally and already returns as `rebuiltStatsExercises`, `statsExercises`, `skippedExercises` (`functions/shared/rebuildHexagonStats.js:330-358`). | as cited | Leave (would be a rewrite). | n/a |
| F8 | Redundant second `initializeApp()` | `purgeFakeUsers.js:91-95` (the imported shared module already initialised; the comment says so) | Leave. | n/a |
| F9 | Style nits: single quotes in a double-quote file (`clearAllUsersContent.js:126`); trailing spaces (`resetUserContentByHandle.js:27,31`) | as cited | Leave (rule 6). | n/a |

Import hygiene is otherwise fine in all 25 files: `firebase-admin/*` imports first, local imports after, no duplicate imports of the same module, no unused bindings.

---

## G. Cross-partition requests

1. **`backend-shared` — `shared/rebuildHexagonStats.js`.** Its only importers in the whole repo are `functions/scripts/recomputeHexagonByHandle.js:7` and `functions/scripts/recomputeHexagonStandalone.js:7` (its header comment claims frontend/backend use; grep finds none). Until F1 is applied it must keep re-exporting `computeHexagonFromUserData`, `rebuildStatsFromWorkouts`, `combineStatsExercises`. After F1 it has no importer: do not delete it (rule 8); list it under "files that can now be deleted".
2. **`functions-shared` — keep these named exports** even if an unused-export tool flags them, because the scripts are their consumers: from `functions/shared/deleteUserAndContent.js`: `deleteUserAndContentByHandle` (`deleteUserAndContentByHandle.js:1`), `deleteUserAndContentByUid` with its `{ userDocSnap }` option (`purgeFakeUsers.js:3,74`); from `functions/shared/handlePropagation.js`: `normaliseHandle`, `findUserByHandle`, `ensureHandleAvailable`, `propagateHandleChange` (`switchUserHandle.js:2-7`); from `functions/shared/namePropagation.js`: `normaliseName`, `resolveUserDoc`, `buildOldNamesSet`, `propagateNameChange` (`switchUserName.js:2-7`); from `functions/shared/rebuildHexagonStats.js`: `computeHexagonFromUserData`, `rebuildStatsFromWorkouts`, `combineStatsExercises`. `resolveUserDoc`, `rebuildStatsFromWorkouts`, `combineStatsExercises` and the exported `normaliseHandle` have no consumer other than these scripts (and their own module). The scripts use named imports only, so this partition does not need the default-export objects at `handlePropagation.js:482`, `namePropagation.js:626`, `rebuildHexagonStats.js:360`.
   Also keep the import-time behaviour: `deleteUserAndContent.js:14-21` initialises the app itself (two scripts rely on it, H2), while `handlePropagation.js` and `namePropagation.js` get Firestore lazily through `getDb()` (the switch scripts initialise the app after those imports are evaluated, H2).
3. **`functions-index` — `functions/index.js`.** (a) `computeGlobalRanks` (`:2962-2983`) has the same never-read result as in the script (B2); please remove it in both places or in neither so the simulate script keeps mirroring the function. (b) If the leaderboard helpers (`EPSILON`, `HEX_RANK_KEYS`, `ensureMembersInValueMap`, `buildEntriesForMembers`, `toUid`, `safeNumber`, `:2687-2736`) are moved to a module under `functions/shared/`, export them so `simulateLeaderboardLastRanksRefresh.js` and `initializeLeaderboardZeroSnapshot.js` can import them later. (c) FYI: `functions/computeHexagon.js` ("legacy entry point") has no importer anywhere; `functions/index.js` imports neither it nor `rebuildHexagonStats`.
4. **`tooling-scripts` — `backend/admin/changeHandle.js:170-183`, `backend/admin/changeName.js:177-190`.** They spawn `functions/scripts/switchUserHandle.js <old> <new>` and `functions/scripts/switchUserName.js <identifier> <newName> [oldName]` by resolved path and treat exit code 0 as success. Neither side may change the path, the argument order or the exit codes.
5. **`functions-shared` (only if the owner keeps `resetUserContentByHandle.js`, plan D).** Add `export` to the 18 identical helpers listed in D. Not requested otherwise.
6. **`tooling-scripts` — `backend/admin/simulateLeaderboardLastRanksRefresh.js`.** It is an older fork of `functions/scripts/simulateLeaderboardLastRanksRefresh.js` without tie handling (C14). Do not "dedupe" the two (their output differs on ties); list the admin copy as a deletion candidate for the owner.

---

## H. Fragile areas (leave alone or handle with care)

1. **CLI contract of `switchUserHandle.js` and `switchUserName.js`**: path, positional argv (`switchUserName.js:22-24` joins everything after the second argument as the old name), `process.exit(1)` on every failure path, normal return on success. Other tooling depends on it (G4).
2. **Module evaluation order around `initializeApp()`.** ESM imports are evaluated before the importing file's body. `deleteUserAndContentByHandle.js` and `purgeFakeUsers.js` work because `functions/shared/deleteUserAndContent.js` initialises the default app at import. `switchUserHandle.js:9-13` and `switchUserName.js:9-13` work because the propagation modules call `getFirestore()` lazily. Any new helper module that calls `getFirestore()` at import without its own `initializeApp()` would throw "default Firebase app does not exist".
3. **`db.settings({ ignoreUndefinedProperties: true })`** in `copyStatsHexagonToUsersPublic.js:13-20` and `recomputeAllHexagonStats.js:16-20` must run before the first Firestore operation of that instance. Do not route these two scripts through a shared, already-used `db`.
4. **Batch and page sizes** are deliberately below Firestore's 500-writes limit and differ per script (200, 400, 500; `BATCH_WRITE_LIMIT` 400; Auth page 1000). Do not unify the constants.
5. **Throttles**: `sleep(50)` between batches and `sleep(200)` between Auth pages (`resetApp.js:130`) are timing of side effects (rule 1).
6. **Loops that terminate only because documents get deleted**: `deleteUserPosts`/`deleteUserWorkouts`/`purgeMessageContent`/`removeUserFromMessages`/`deleteCollection` re-run the same query until it is empty. The `if (!pending) break;` guard in `deleteUserWorkouts` (`clearUserContentByHandle.js:130`, `resetUserContentByHandle.js:177`) prevents an endless loop when a page contains only already-deleted ids. Do not restructure.
7. **Order of destructive steps** in `resetUserContentByHandle.js:636-648`, `clearUserContentByHandle.js:360-367`, `clearAllUsersContent.js:124-130`, `resetApp.js:197-216` is meaningful (references are cleaned before the user doc and Auth user go).
8. **`resetApp.js` top-level sequence** (`:20-94`): the `--confirm` check exits before any SDK call; bucket resolution fills module-level `storageBucket` / `storageInitError` that `deleteAllStorageFiles` reads later. Leave the file untouched.
9. **Explicit `process.exit(0)` vs natural exit.** Seven scripts exit explicitly on success (`clearAllBlocks.js:84`, `copyStatsHexagonToUsersPublic.js:87`, `initializeLeaderboardZeroSnapshot.js:268`, `recomputeAllHexagonStats.js:91`, `recomputeHexagonByHandle.js:79`, `recomputeHexagonStandalone.js:79`, `simulateLeaderboardLastRanksRefresh.js:371`); the others let the event loop drain. Do not normalise in either direction.
10. **Firestore payload literals** (C9, and `lastRanks` shapes in the leaderboard scripts, `lastRanksVersion` 4 vs 3). Field names and shapes are the contract; do not merge look-alike literals.
11. **Root `shared/*.js` are ES modules without a `"type": "module"` package scope.** Loading them from Node relies on module-syntax detection (Node 20.19+ / 22.7+; local Node 20 is 20.20.2). `functions/shared/computeHexagon.js:4-5` depends on that for every hexagon script regardless of F1. Do not add or change package.json files.
12. **Dependency resolution**: `functions/node_modules` is absent in this checkout; the scripts resolve `firebase-admin` from the repo-root `node_modules`. Nothing to change, but it is why nothing here can be test-run.
13. **Code style**: 2-space indent, double quotes, trailing commas as they are.

---

## I. Open questions for the owner

1. **Which of these scripts are still wanted?** Most were written for the legacy single `users` collection. The app now also uses `usersPublic` / `usersPrivate` (the shared propagation modules call `usersPublic` the primary collection; `backend/admin/*` are described as "post-redesign" CLIs). Scripts that read or write only `users`: `clearAllBlocks`, `clearAllUsersContent`, `clearStaleCurrentWorkouts`, `clearUserContentByHandle`, `clearUserMessages`, `clearWorkoutData`, `initializeLeaderboardZeroSnapshot`, `recomputeAllHexagonStats`, `recomputeHexagonByHandle`/`Standalone`, `removeSpartanAutoFollow`, `resetUserWorkouts`, `seedSuggestedUsersFromVerified`, `setAllLastRanksToOne`, `toggleUserVerification`, `purgeFakeUsers` (selection). Newer equivalents exist for three: `backend/admin/verifyUser.js` (vs `toggleUserVerification.js`), `backend/admin/recomputeAllHexagonStats.js` (vs `recomputeAllHexagonStats.js`), `backend/admin/deleteUserAccount.js` (vs `deleteUserAndContentByHandle.js`).
2. **`resetUserContentByHandle.js`**: delete it? It is misnamed (it deletes the account) and it is the pre-redesign algorithm: it leaves `usersPublic/<uid>`, `usersPrivate/<uid>` and subcollections, `userHandles/*` and `userSearchIndex/<uid>` behind and handles chats and tribes differently from the current shared module (C13). Running it today would orphan data.
3. **`recomputeHexagonByHandle.js` vs `recomputeHexagonStandalone.js`**: identical apart from the usage text. Which one should remain?
4. **`setAllLastRanksToOne.js`**: writes the `lastRanksVersion: 3` shape (`{exercises: {<name>: {<scope>: {...}}}, hex: {...}}`) while everything else reads/writes version 4 (`{following: {...}, tribes: {...}}`); it also has the fallback problem E2 and a name that does not match what it does. Obsolete?
5. **`simulateLeaderboardLastRanksRefresh.js`** has drifted from the deployed function (no `isPrivate === true` exclusion, no early return when there is nothing to rank; C14). Should it be brought back in line, or is it obsolete now that the Compete tab is parked? Same question for the older copy in `backend/admin/`.
6. **`initializeLeaderboardZeroSnapshot.js`** reads `users` and writes `lastRanks` onto `users/<uid>` (`:36,58,245`), whereas the deployed refresh reads `usersPublic` and writes there. Intended?
7. **E1**: should `clearUserContentByHandle.js` also clean `global/posts.ownerMap` by uid when the user has no documents in `posts` (as the newer code does)?
8. **E4**: should `clearStaleCurrentWorkouts.js` deactivate a shared workout while other members are still in it, and should it also clear `usersPublic` / `usersPrivate`?
9. **E5**: `purgeFakeUsers.js` deletes users missing any one of uid/name/handle, while its messages say all three. Which is intended?
10. **E3**: `resetApp.js` reports a missing bucket (404) as "already empty". Cosmetic; fix wanted?
11. **One-off migrations** `removeSpartanAutoFollow.js` and `copyStatsHexagonToUsersPublic.js`: already run and safe to delete?
12. **Deployment hygiene**: `firebase.json` uploads the whole `functions/` folder, so these scripts ship with every functions deploy. Add `scripts` to the functions `ignore` list? (Config change, outside this refactor.)

---

## Work order summary for the implementer

Do:
1. `functions/scripts/clearUserContentByHandle.js`: delete lines 226 and 309 (B1).
2. `functions/scripts/resetUserContentByHandle.js`: delete lines 360 and 484 (B1).
3. `functions/scripts/simulateLeaderboardLastRanksRefresh.js`: remove `computeGlobalRanks` and the two `ranks` values (B2), in step with `functions/index.js` (G3).
4. `functions/scripts/recomputeHexagonByHandle.js:7` and `functions/scripts/recomputeHexagonStandalone.js:7`: import from `"../shared/rebuildHexagonStats.js"` (F1).
5. Run `SPX/tools/lint.sh functions/scripts` and `SPX/tools/fn-check.sh`.

Report under "files that can now be deleted" (owner decides): `functions/scripts/recomputeHexagonStandalone.js`, `functions/scripts/resetUserContentByHandle.js`, `shared/rebuildHexagonStats.js` (after step 4), `backend/admin/simulateLeaderboardLastRanksRefresh.js`.

Do not: strip console output, merge the handle/user lookup helpers, unify payloads or batch sizes, build a shared `db` module, rename or move any script, or "fix" E1-E5.

Removable lines by in-place edits: about 30 (4 for B1, about 26 for B2). With owner-approved deletions inside the partition: a further 756 (85 + 671).
