# Audit: partition `functions-shared` (5 files, 2612 lines)

Read-only audit. All five files were read completely, top to bottom. All five are byte-identical to
`SPX/baseline/<path>`, so line numbers below are valid for both. Paths are relative to the project root
`/Users/yangbai/Desktop/Projects/spartan`. Nothing inside the project was written. Scratch files (function-body
diffs and two pure-function probes) live only in the session scratchpad.

Classification: all five files are TOOLING (Cloud Functions runtime code and the library behind operator scripts).
None of it can be executed here except: `SPX/tools/fn-check.sh` (loads `functions/index.js`, which statically links
`deleteUserAndContent.js`, `handlePropagation.js`, `namePropagation.js`) and plain `node` on pure modules.
Style in this folder: 2-space indent, double quotes, semicolons (NOT the app's 4-space style). Keep it.

Headline numbers
- Firm, behaviour-preserving removals inside the partition: about 35 lines (one dead function, two dead
  default-export objects, one no-op line). Everything else that looks removable is either used through a dynamic
  `import()` the tools cannot see, or is "provably no-op but intent unclear" and is parked in section I.
- Two files exceed ~500 lines: `deleteUserAndContent.js` (1121) and `namePropagation.js` (632). Plans in D.
- One knip finding is a FALSE POSITIVE: `findUserByHandle` in `deleteUserAndContent.js:65` is used by
  `backend/admin/deleteUserAccount.js:144-151` through `await import(fileURL)`. Do not un-export it.
- I found six real logic defects in the propagation engine (two confirmed by executing a scratch copy of the pure
  functions). None is of the "undefined name / duplicate key / unreachable code" kind, all mutate production data,
  so none should be fixed silently by the refactor. They are recorded in E and raised in I.
- Biggest duplication is cross-partition: `functions/scripts/resetUserContentByHandle.js` carries about 360 lines
  that are byte-identical to `deleteUserAndContent.js` (22 top-level declarations).

---------------------------------------------------------------------------------------------------------------

## A. Module map

| File | Purpose | Exports | Importers (all TOOLING; none LIVE/PARKED) |
|---|---|---|---|
| `functions/shared/computeHexagon.js` (6) | Re-export shim: `export *` + `export { default }` from repo-root `shared/computeHexagon.js` (reaches OUTSIDE `functions/`) | everything `shared/computeHexagon.js` exports, plus its default | `functions/shared/rebuildHexagonStats.js:1` (default only); `functions/computeHexagon.js:2-3` (legacy shim in partition `functions-index`; nothing imports that file) |
| `functions/shared/deleteUserAndContent.js` (1121) | Full account purge with firebase-admin: placeholder identity, posts, workouts, global lists, chats, tribes, references in other users' docs, registry/search/public/private docs, Auth user, user doc. Import-time side effect: `initializeApp()` + `getFirestore()` + `getAuth()` (`:14-21`) | `findUserByHandle` (`:65`), `deleteUserAndContentByUid` (`:1110`), `deleteUserAndContentByHandle` (`:1117`) | `functions/index.js:10` (`deleteUserAndContentByUid`, used `:4403` in callable `deleteOwnAccount`); `functions/scripts/purgeFakeUsers.js:3` (`...ByUid`); `functions/scripts/deleteUserAndContentByHandle.js:1` (`...ByHandle`); `backend/admin/deleteUserAccount.js:20-22,66,144` (dynamic `import()` by absolute file URL: `findUserByHandle`, `deleteUserAndContentByHandle`) |
| `functions/shared/handlePropagation.js` (488) | Rewrites every occurrence of a user's old handle across `usersPublic`, `global`, `posts`, `workouts`, `workoutInvites`, `tribes`, `messages` + `messages/*/content`, `usersPrivate/*/notifications`. Lazy `getDb()`; module-level mutable `replaceConfig` | named: `normaliseHandle` (`:19`), `findUserByHandle` (`:145`), `ensureHandleAvailable` (`:187`), `propagateHandleChange` (`:434`); default object of the same four (`:482`, unused) | `functions/index.js:11` (`propagateHandleChange`, used `:1653` in `setUserHandle`); `deleteUserAndContent.js:4` (`ensureHandleAvailable`, `propagateHandleChange`); `namePropagation.js:2` (`findUserByHandle`); `functions/scripts/switchUserHandle.js:2-7` (all four named; that script is spawned by `backend/admin/changeHandle.js:171`) |
| `functions/shared/namePropagation.js` (632) | Same traversal for display names, restricted to sub-trees that reference the target uid. Lazy `getDb()`; module-level mutable `replaceConfig` | named: `normaliseName` (`:20`), `buildOldNamesSet` (`:546`), `resolveUserDoc` (`:571`), `propagateNameChange` (`:582`); default object of the same four (`:626`, unused) | `functions/index.js:12` (`propagateNameChange` `:1741`, `buildOldNamesSet` `:1706`, `normaliseName as normalizeDisplayName` `:1678,1699,1708`); `deleteUserAndContent.js:5` (`buildOldNamesSet`, `propagateNameChange`); `functions/scripts/switchUserName.js:2-7` (all four named; spawned by `backend/admin/changeName.js:178`) |
| `functions/shared/rebuildHexagonStats.js` (365) | Pure: rebuild `statsExercises`/totals from `completedWorkouts`, merge with stored stats, compute hexagon via `./computeHexagon.js` | named: `rebuildStatsFromWorkouts` (`:126`), `combineStatsExercises` (`:289`), `computeHexagonFromUserData` (`:330`); default object of the three (`:360`) | `functions/scripts/recomputeAllHexagonStats.js:3-5` (direct); `shared/rebuildHexagonStats.js:2-3` (repo-root re-export shim, partition `backend-shared`), through which `functions/scripts/recomputeHexagonByHandle.js:3-7` and `recomputeHexagonStandalone.js:3-7` import; `backend/admin/recomputeAllHexagonStats.js:131-135` (dynamic `import()`, reads `mod.computeHexagonFromUserData || mod.default?.computeHexagonFromUserData`). NOT imported by `functions/index.js` |

Import graph inside the partition: `deleteUserAndContent -> handlePropagation, namePropagation`;
`namePropagation -> handlePropagation`; `rebuildHexagonStats -> computeHexagon -> ../../shared/computeHexagon.js`.

Deploy boundary (see H-1): `firebase.json` deploys `source: "functions"` only. The three modules reachable from
`functions/index.js` (`deleteUserAndContent`, `handlePropagation`, `namePropagation`) stay inside `functions/`.
`computeHexagon.js` and `rebuildHexagonStats.js` reach `../../shared` and are therefore script-only.

---------------------------------------------------------------------------------------------------------------

## B. Verified dead code

### B-1. Remove (firm)

| # | Identifier | Kind | Location | Evidence |
|---|---|---|---|---|
| B1 | `mergeProgressIntoTimeline` | unused const arrow function | `functions/shared/rebuildHexagonStats.js:82-100` (+ blank `:101`) | ESLint `no-unused-vars`; repo-wide `grep -w` finds only the definition. After removal `parseDayKey` is still used (`:262`, `:267`) and `toNumber` is still used. |
| B2 | `export default { normaliseHandle, findUserByHandle, ensureHandleAvailable, propagateHandleChange }` | duplicate default export of named bindings | `functions/shared/handlePropagation.js:482-487` (+ blank `:481`) | All four importers use named imports (`functions/index.js:11`, `deleteUserAndContent.js:4`, `namePropagation.js:2`, `functions/scripts/switchUserHandle.js:2-7`). No default import, no namespace import, no dynamic `import()`/`.default` access anywhere (grepped `functions/`, `backend/admin/`, `shared/`, `scripts/`). |
| B3 | `export default { normaliseName, resolveUserDoc, buildOldNamesSet, propagateNameChange }` | duplicate default export | `functions/shared/namePropagation.js:626-631` (+ blank `:625`) | Importers `functions/index.js:12`, `deleteUserAndContent.js:5`, `functions/scripts/switchUserName.js:2-7` are all named. No `.default` access. |
| B4 | `if (entry.trim().toLowerCase() === newNameLower) return entry;` | no-op statement (the next line returns `entry` too) | `functions/shared/namePropagation.js:371` | `entry` is a string here (guard at `:369`), so the expression cannot throw; deleting the line changes nothing. `newNameLower` stays in use at `:364`. |

Verification after B1-B4: `SPX/tools/lint.sh functions/shared` and `SPX/tools/fn-check.sh` (B2/B3 are in the
`index.js` link graph, so a wrong removal would fail the load).

### B-2. KEEP (machine finding is wrong, or the use is invisible to the tools)

| # | Identifier | Location | Why it must stay |
|---|---|---|---|
| K1 | `export` on `findUserByHandle` | `deleteUserAndContent.js:65` | knip false positive. `backend/admin/deleteUserAccount.js:144` destructures it from `await import(deletionModulePath)` and calls it at `:151`; `:145` throws if it is not a function. Also used internally at `:1118`. |
| K2 | `export default { rebuildStatsFromWorkouts, combineStatsExercises, computeHexagonFromUserData }` | `rebuildHexagonStats.js:360-364` | `shared/rebuildHexagonStats.js:3` does `export { default } from "../functions/shared/rebuildHexagonStats.js"`: removing the default makes that shim fail at link time (SyntaxError), which breaks `functions/scripts/recomputeHexagonByHandle.js` and `recomputeHexagonStandalone.js`. `fn-check.sh` would NOT catch this (it does not execute scripts). Also read as a fallback at `backend/admin/recomputeAllHexagonStats.js:135`. Removable only together with G1+G2. |
| K3 | `export *` | `computeHexagon.js:4` | Only consumer is `functions/computeHexagon.js:2` (legacy shim, itself imported by nothing). Keep until that file is approved for deletion (G3). The default re-export (`:5`) is live (`rebuildHexagonStats.js:1`). |
| K4 | All `console.log` / `console.warn` (48 in `deleteUserAndContent.js`, 14 in `handlePropagation.js`, 13 in `namePropagation.js`) | e.g. `deleteUserAndContent.js:141,187,792,1003,1047-1075`; `handlePropagation.js:219,300,341,344,351,354,375,380,417,430,438,442,455,478`; `namePropagation.js:308,400,445,448,455,458,483,488,529,542,585,599,623` | Not tracing: this is the progress/summary output of the operator CLIs (`switchUserHandle.js`, `switchUserName.js`, `deleteUserAndContentByHandle.js`, `backend/admin/*`) and the Cloud Logging trail of three callables. Keep every one. |

### B-3. Provably inert code that I recommend NOT touching in this refactor (listed so nobody rediscovers it)

Each item is behaviour-neutral to remove, but it sits in a production data-mutation path with no tests, the proof
is non-trivial, or it encodes intent the owner may want back. Default: leave. If the lead wants them gone, the
exact edit is given.

| # | What | Location | Proof / note |
|---|---|---|---|
| N1 | `isNameField` has no effect; therefore `isLikelyNameKey`, `DISALLOWED_NAME_SEGMENTS`, `LIKELY_NAME_PREFIXES` are effectively dead | `namePropagation.js:245`, `:247-251`; helpers `:100-127`, `:38-62`, `:64-94` | `:247-251` is `if (!isLowerField && !isNameField) { if (!matchesOldName(value)) return value; } else if (!matchesOldName(value)) { return value; }`: both arms do the same thing. `isLikelyNameKey`/`cleanKey` are pure. Exact edit if approved: replace `:247-251` by `if (!matchesOldName(value)) return value;`, delete `:245`, delete `:38-62`, `:64-94`, `:100-127` (about 92 lines). `cleanKey` (`:96-98`) must stay (used `:176`, `:185`, `:207`, `:210`). This looks like a neutralised safeguard ("only rewrite name-like keys"), hence open question I-1. |
| N2 | Unreachable branches in handle `transformString` | `handlePropagation.js:89-91` and `:93-95` | `:89`: `trimmed === oldHandle` implies `lower === oldHandleLower` (already returned at `:83-85`); `trimmed === oldHandleAt` implies `lower === oldHandleAt.toLowerCase()` (returned at `:86-88`). `:93`: `strippedLower === oldHandleLower` implies one of those two as well (`stripAt` removes at most one leading `@`). Also the ternaries `isLowerField ? newHandleLower : newHandle` at `:78` and `:84` can only take the `newHandle` arm (the lower-field case returned at `:69-73`). Confirmed with a probe run. Leave: branch order in this function is fragile (H-5). |
| N3 | Redundant third clause of `inspectKey`; consequently the `parentKey` parameter of `valueContainsTargetUid` has no effect | `namePropagation.js:214` (clause), `:197`, `:204`, `:207` | `looksLikeUidPointerKey("id")` is already true (`:178`). Leave. |
| N4 | `processCollection` options that never vary | `handlePropagation.js:304`, `:339-345`; `namePropagation.js:404`, `:443-449` | `logOnlyIfChanged` is only ever passed as `true` together with `quiet: true` (`handlePropagation.js:426`, `:468-473`; `namePropagation.js:538`, `:612-617`), and the `quiet` branch never reads it, so `!logOnlyIfChanged || mutated > 0` is always true. `label` always equals `path`; `limit` is always 200. Optional tidy (drop the option at the two call sites and the signature, make `:340`/`:444` unconditional); low value, leave unless the lead wants it. |
| N5 | Return values nobody reads | `handlePropagation.js:301` (`mutated`), `:347` (`processed`), `:355/:376` (whole result), `:418` (`mutated`); same in `namePropagation.js:401`, `:451`, `:459/:484`, `:530` | Harmless and self-documenting. Leave. |
| N6 | `if (!candidate) { attempt += 1; continue; }` | `deleteUserAndContent.js:927-930` | `candidate` is `normaliseHandle("deleteduser" + digits)`, never empty. Leave (defensive). Same for `:895`/`:897` guards. |
| N7 | `.catch(...)` on `deleteUsersPrivateArtifacts(uid)` | `deleteUserAndContent.js:1024-1037` | The callee wraps every await in try/catch (`:279-336`) and cannot reject. Defensive; keep. |
| N8 | `lastTrainedByGroup` returned by `rebuildStatsFromWorkouts` is read by no caller; so are `inferGroup`, `distributeFullBody` and the block that feeds them | `rebuildHexagonStats.js:200-207`, `:258-276`, `:281`; helpers `:102-113`, `:115-124` | `computeHexagonFromUserData` uses `lastTrained` from `computeHexagonFromStats` instead (`:338`, `:348`, `:354`); the two scripts that call `rebuildStatsFromWorkouts` directly read only `.statsExercises`. Removal would change the return shape of an exported function that mirrors the client twin (C-7). Keep. |
| N9 | Result fields nobody reads: `statsHexagonMeta`, `rebuiltStatsExercises` | `rebuildHexagonStats.js:347-349`, `:356` | Callers rebuild their own `statsHexagonMeta`. API shape; keep. |
| N10 | Default parameter values no caller overrides | `deleteUserAndContent.js:120`, `:149`, `:268`, `:669` (`batchSize`); `rebuildHexagonStats.js:3` (`fallback`); `namePropagation.js:257` (`context` default) | Leave. |
| N11 | `set.date || toDayKey(Date.now())` fallback | `rebuildHexagonStats.js:229` | `normalizeSet` always sets a non-empty `date` (`:64-70`). Leave. |
| N12 | Target-doc candidate loop largely subsumed by the generic pass | `namePropagation.js:342-347` | `replaceNamesInPlace` with `matchesTarget: true` (`:327-328`) has already rewritten these keys. Leave. |

No commented-out code, no TODO/FIXME, no unused imports in the five files (checked each import against its uses).

---------------------------------------------------------------------------------------------------------------

## C. Duplication

Verdicts come from extracting each top-level declaration and comparing text (exact, then whitespace-normalised),
then reading the diffs.

### C-1. `handlePropagation.js` <-> `namePropagation.js`: byte-identical leaf helpers (dedupe candidate, low risk)

| Declaration | handlePropagation.js | namePropagation.js | Verdict |
|---|---|---|---|
| `cachedDb` + `getDb()` | `:3-9` | `:4-10` | identical |
| `USERS_BATCH_SIZE = 200` | `:11` | `:12` | identical |
| `GENERIC_BATCH_SIZE = 200` | `:12` | `:13` | identical |
| `PRIMARY_USER_COLLECTION = "usersPublic"` | `:13` | `:14` | identical |
| `sleep(ms)` | `:15-17` | `:16-18` | identical (also `deleteUserAndContent.js:23-25`) |
| `isPlainObject(value)` | `:39-43` | `:25-29` | identical |

Recommended canonical home: a new `functions/shared/propagationCommon.js` exporting `getDb`, `sleep`,
`isPlainObject`, `USERS_BATCH_SIZE`, `GENERIC_BATCH_SIZE`, `PRIMARY_USER_COLLECTION` (move the bodies verbatim from
`handlePropagation.js`, add `export`). Sharing one `cachedDb` is equivalent to two: `getFirestore()` returns the
default app's singleton and both modules call it lazily. `deleteUserAndContent.js` may import `sleep` from it too.
CAUTION: `deleteUserAndContent.js:7` has its own `USERS_BATCH_SIZE = 400`: a different value under the same name.
Do not merge that one.

### C-2. `handlePropagation.js` <-> `namePropagation.js`: scan skeletons (do NOT merge)

| Function | handle | name | Difference |
|---|---|---|---|
| `processUserSubcollection` | `:421-432` | `:533-544` | byte-identical, but each closes over its own module's `processCollection`, which differs. Not shareable without passing the scanner in. |
| `processCollection` | `:304-348` | `:404-452` | identical except the per-document call: `replaceHandlesInPlace(data, [])` (`:322`) vs a 5-line `initialContext` + `replaceNamesInPlace(data, [], initialContext)` (`:422-426`). |
| `processGlobalDocs` | `:350-377` | `:454-485` | same single difference (`:363` vs `:467-471`). |
| `processMessages` | `:379-419` | `:487-531` | same single difference (`:400` vs `:508-512`). |
| `processUsers` | `:218-302` | `:307-402` | same paging/batching skeleton; different target-document fix-ups (`:241-282` vs `:331-382`). |
| orchestrator | `propagateHandleChange` `:434-480` | `propagateNameChange` `:582-624` | same traversal list (`:455-476` == `:599-620`); differ in validation, config shape, and the order of "log completed" vs `replaceConfig = null` (`:478-479` vs `:622-623`). |
| within one file | `processMessages` vs `processCollection("messages")` | `handlePropagation.js:379-415` vs `:304-337`; `namePropagation.js:487-527` vs `:404-441` | `processMessages` additionally collects `ids` and logs a header. |

Merging these needs a callback-parameterised `scanCollection(path, mutateDoc, opts)`: a rewrite of the code that
overwrites production documents with `{ merge: false }`, which cannot be exercised here. Rule 3 (move, do not
rewrite) applies. Leave as known duplication. If the owner approves threading the config as a parameter (E-4),
that is the moment to unify.

### C-3. `normaliseHandle` (keep both; NOT identical for every input)

- `deleteUserAndContent.js:27-33`: returns `""` for every falsy input except `0` (`!rawHandle && rawHandle !== 0`).
- `handlePropagation.js:19-25` (exported): returns `""` only for `null`/`undefined`.
- They differ for `false` -> `""` vs `"false"`, and `NaN` -> `""` vs `"NaN"`. Identical for strings, numbers incl.
  `0`, `null`, `undefined`. `deleteUserAndContent.js` feeds it raw Firestore fields (`userData?.handle`,
  `?.username`, `?.tag`, `?.handleLower` ... at `:197-207`, `:864-867`), which are untyped, so a boolean `false` is
  a possible input. Per rule 4: leave both.
- Other definitions (other partitions, for reference): `functions/scripts/resetUserContentByHandle.js:21-27`
  (byte-identical to the `deleteUserAndContent.js` one); `functions/scripts/clearActiveWorkoutByHandle.js:12`,
  `toggleUserVerification.js:12`, `clearUserContentByHandle.js:34` (no second `trim()` after removing `@`, so
  `"@ bob"` -> `" bob"`: different); `backend/admin/deleteUserAccount.js:32`, `verifyUser.js:42`,
  `changeHandle.js:42`, `changeName.js:43`, `exportFoodLogsTable.js:117` (CommonJS; same results as the
  `handlePropagation.js` one, but they cannot statically import an ES module); `functions/index.js:4367-4373`
  (local `normalizeHandle` = `normaliseHandle(value).toLowerCase()` exactly; see G6).

### C-4. `findUserByHandle` (two different functions under one name; keep both)

- `deleteUserAndContent.js:65-95`: queries collection `users` on `handle` (raw, `@`-prefixed, lower),
  `handle_lower`, `username`, `username_lower`, `tag`; no registry fallback; returns the `users/{uid}` snapshot
  (whose `.ref` is deleted at `:1042`).
- `handlePropagation.js:145-185`: queries `usersPublic` on `handle` (3 forms), `handleLower`, `handle_lower`; falls
  back to `userHandles/{lower}` -> `usersPublic/{uid}` (`:173-182`); returns the `usersPublic` snapshot.
- Different collection, fields, fallback and returned document: not interchangeable.
- Copies elsewhere: `functions/scripts/resetUserContentByHandle.js:59-89` (byte-identical to the
  `deleteUserAndContent.js` one); `clearUserContentByHandle.js:41` (same logic, arrow form);
  `clearActiveWorkoutByHandle.js:47`, `toggleUserVerification.js:19` (one candidate fewer);
  `backend/admin/verifyUser.js:161`, `changeHandle.js:93`, `changeName.js:71` (CommonJS, different return shape;
  these are the jscpd hits `verifyUser.js:163-179` and `changeName.js:93-104`). Leave all.

### C-5. `stripAt`
`handlePropagation.js:27-31` (non-string -> `""`, no trim after removing `@`) vs `backend/admin/*.js` copies (trim
after removing `@`, CommonJS). Different. Leave.

### C-6. `deleteUserAndContent.js` <-> `functions/scripts/resetUserContentByHandle.js` (cross-partition, about 360 lines)

Byte-identical top-level declarations (first range = `deleteUserAndContent.js`, second =
`resetUserContentByHandle.js`):
`USERS_BATCH_SIZE` 7 / 5; `DELETE_BATCH_SIZE` 8 / 6; `db` 20 / 14; `auth` 21 / 15; `sleep` 23-25 / 17-19;
`normaliseHandle` 27-33 / 21-27; `toStringSafe` 35-38 / 29-32; `getUidFromEntry` 40-63 / 34-57;
`findUserByHandle` 65-95 / 59-89; `deleteCollectionByPath` 97-118 / 91-112; `deleteUserPosts` 120-147 / 114-141;
`deleteUserWorkouts` 149-193 / 143-187; `cleanGlobalPosts` 341-402 / 189-250; `cleanGlobalExplorePosts`
404-419 / 252-267; `removeFromGlobalUsers` 421-433 / 269-281; `filterUserRefArray` 435-445 / 283-293;
`filterPidArray` 447-465 / 295-313; `filterPostRecords` 467-480 / 315-328; `filterMessagesArray`
482-491 / 330-339; `filterUidArray` 493-499 / 341-347; `filterUidMap` 501-508 / 349-356; `purgeMessageContent`
669-690 / 491-512; `deleteAuthUser` 849-860 / 607-618. (Whitespace-only difference: trailing spaces at script
`:27`, `:31`.)

Same name, DIFFERENT behaviour (must stay separate):
- `scrubUserReferences`: `deleteUserAndContent.js:657-667` loops over `users`, `usersPublic`, `usersPrivate` via
  `scrubUserCollection` (`:510-655`, tolerant of scan/commit errors); the script (`:358-489`) scans `users` only
  and lets errors propagate.
- `removeUserFromMessages`: `:754-812` replaces the user with a "Deleted User" placeholder
  (`sanitizeChatUsers`), writes `userCount`, deletes the chat only when no member remains; the script (`:514-567`)
  filters the user out and deletes the chat when one or zero members remain.
- `cleanTribes`: `:814-847` deletes the tribe when the user is the owner; the script (`:569-605`) hands ownership
  to the next member.

Canonical home: the modules proposed in D-1. The script is an older fork of the same job (it prints "Deleting
Spartan account for handle", script `:627`) and is superseded by `functions/scripts/deleteUserAndContentByHandle.js`;
see G4 and I-6 before investing in it.

### C-7. `rebuildHexagonStats.js` <-> client twins `backend/workouts/deleteCompletedWorkout.js` and `updateCompletedWorkout.js` (LIVE; do NOT unify across runtimes)

| Helper | functions (`rebuildHexagonStats.js`) | `deleteCompletedWorkout.js` | `updateCompletedWorkout.js` | Verdict |
|---|---|---|---|---|
| `toNumber` | `:3-6` | `:7-10` | `:9-12` | identical |
| `calculate1RM` | `:8-13` | `:12-18` | `:14-19` | identical behaviour (one extra comment). `frontend/helper/calculate1RM.js` is different (no guards, no coercion). |
| `toMillis` | `:15-35` | `:20-32` | `:21-41` | functions == update; the delete copy lacks the plain `{seconds,_seconds,nanoseconds}` branch, so such an object yields 0 there. |
| `toDayKey` | `:37-44` | `:34-41` | `:43-50` | identical. `shared/hexagon/computeHexagonCore.js:150` and `frontend/utils/date.js:3` are different functions. |
| `parseDayKey` | `:46-57` | `:43-54` | `:52-63` | identical. `shared/hexagon/computeHexagonCore.js:158` differs (returns `NaN`, not 0, for unparsable keys). |
| `inferGroup` | `:102-113` | `:56-67` | `:65-76` | DIFFERENT: functions tests chest first and excludes "bench" from the shoulders `press` rule; both client copies test shoulders first. "Bench Press" -> `chest` (functions; confirmed by running the module) vs `shoulders` (client). |
| `distributeFullBody` | `:115-124` | `:69-78` | `:78-87` | same behaviour (delete copy has an unused third parameter). |
| `rebuildStatsFromWorkouts` | `:126-287` | `:145-299` | `:217-371` | DIFFERENT: functions clones exercises/sets and uses `normalizeSet` (per-set date/wid/privacyMode passthrough); client copies stamp `privacyMode: workout?.privacyMode ?? "followers"`, compute `statsHexagon`, and compact `lastTrainedByGroup`; the two client copies differ from each other in `setDay`. |

Conclusion: nothing here can be shared with the client code. Inside this partition there is nothing to dedupe for
these helpers. The client-side pair is a matter for the `backend-shared` audit (G7).

---------------------------------------------------------------------------------------------------------------

## D. Decomposition plans for files over ~500 lines

General constraints for both plans
- Move by line range (`sed -n 'A,Bp'`), then add only `import`/`export`. 2-space indent, double quotes.
- New modules must live under `functions/` and must not import from `../../shared` (deploy boundary, H-1).
- Verification available: `SPX/tools/lint.sh functions/shared` (`no-undef` catches a helper that was not
  imported; `no-unused-vars` catches a stale import) and `SPX/tools/fn-check.sh` (really loads `index.js`, so the
  ES-module link step validates every named import in the moved graph). Neither executes a single code path.

### D-1. `functions/shared/deleteUserAndContent.js` (1121 lines) -> 8 modules + a 140-line entry file. Extraction risk: MEDIUM

Seam quality: clean. There is no mutable module state and no closure sharing; every function depends only on
module-level `db` (`:20`), `auth` (`:21`, used only at `:851`), the six constants (`:7-12`), and other top-level
functions. The one blocker is the import-time initialisation (`:14-21`): `db`/`auth` must come from a single module
that still runs `try { initializeApp(); } catch {}` before `getFirestore()`/`getAuth()`, because
`functions/scripts/deleteUserAndContentByHandle.js` and `backend/admin/deleteUserAccount.js` never call
`initializeApp()` themselves and rely on this import side effect. Risk is rated medium only because this is the
irreversible account-deletion path and nothing can be run.

Proposed folder `functions/shared/deleteUser/`:

| New module | Declarations that move (current line ranges) | Needs |
|---|---|---|
| `firebaseAdmin.js` | `:14-18` (init try/catch), `db` `:20`, `auth` `:21`; export `db`, `auth` | `initializeApp`, `getFirestore`, `getAuth` |
| `helpers.js` | `DELETE_BATCH_SIZE` `:8`, `sleep` `:23-25`, `normaliseHandle` `:27-33`, `toStringSafe` `:35-38`, `getUidFromEntry` `:40-63`, `deleteCollectionByPath` `:97-118` | `db` |
| `userLookup.js` | `findUserByHandle` `:65-95`, `gatherHandleLowerCandidates` `:195-218`, `resolveHandleFromData` `:862-874` | `db`, `normaliseHandle` |
| `contentCleanup.js` | `deleteUserPosts` `:120-147`, `deleteUserWorkouts` `:149-193`, `cleanGlobalPosts` `:341-402`, `cleanGlobalExplorePosts` `:404-419`, `removeFromGlobalUsers` `:421-433`, `cleanTribes` `:814-847` | `db`, `FieldValue`, `DELETE_BATCH_SIZE`, `sleep`, `toStringSafe`, `getUidFromEntry` |
| `profileCleanup.js` | `deleteHandleRegistryEntries` `:220-240`, `deleteUserSearchIndexDoc` `:242-253`, `deleteUserPublicDoc` `:255-266`, `deleteUsersPrivateArtifacts` `:268-339`, `deleteAuthUser` `:849-860` | `db`, `auth`, `DELETE_BATCH_SIZE`, `sleep`, `normaliseHandle`, `deleteCollectionByPath` |
| `referenceScrub.js` | `USERS_BATCH_SIZE` `:7`, `filterUserRefArray` `:435-445`, `filterPidArray` `:447-465`, `filterPostRecords` `:467-480`, `filterMessagesArray` `:482-491`, `filterUidArray` `:493-499`, `filterUidMap` `:501-508`, `scrubUserCollection` `:510-655`, `scrubUserReferences` `:657-667` (export the last) | `db`, `sleep`, `toStringSafe`, `getUidFromEntry` |
| `chatCleanup.js` | `DELETED_USER_HANDLE_LABEL` `:10`, `DELETED_USER_PFP` `:12`, `purgeMessageContent` `:669-690`, `buildDeletedChatUser` `:692-714`, `sanitizeChatUsers` `:716-752`, `removeUserFromMessages` `:754-812` (export the last) | `db`, `FieldValue`, `DELETE_BATCH_SIZE`, `sleep`, `toStringSafe`, `getUidFromEntry`, `deleteCollectionByPath` |
| `deletedIdentity.js` | `DELETED_USER_DISPLAY_NAME` `:9`, `DELETED_USER_HANDLE_BASE` `:11`, `assignDeletedName` `:876-892`, `setHandleDocuments` `:894-917`, `assignDeletedHandle` `:919-979`, `applyDeletedIdentity` `:981-990` (export the last) | `db`, `FieldValue`, `normaliseHandle`, `resolveHandleFromData`, `ensureHandleAvailable`/`propagateHandleChange` from `../handlePropagation.js`, `buildOldNamesSet`/`propagateNameChange` from `../namePropagation.js` |

What stays in `functions/shared/deleteUserAndContent.js`: `deleteUserCore` `:992-1108`, `deleteUserAndContentByUid`
`:1110-1115`, `deleteUserAndContentByHandle` `:1117-1120`, the imports they need, and
`export { findUserByHandle } from "./deleteUser/userLookup.js";` so that the three public names keep the same path
(index.js, two scripts and the dynamic import in `backend/admin/deleteUserAccount.js` do not change).

Notes for the implementer
- Evaluation order is preserved in every way that matters: `firebaseAdmin.js` runs once, before any dependant,
  and still before the body of `functions/index.js` (static imports are evaluated first; index's own
  `try { initializeApp(); } catch { }` at `index.js:21` then no-ops or throws-and-swallows exactly as today).
  `handlePropagation.js`/`namePropagation.js` have no top-level side effects, so their relative order is moot.
- Do not turn `db` into a lazy getter while moving (that would be a rewrite and changes when `getFirestore()` runs).
- Do not reorder anything inside `deleteUserCore` (H-2) or change the returned summary object (H-3).
- The duplicated claim sequence in `assignDeletedHandle` (`:931-941` vs `:961-971`) has different error handling
  around it (retry-by-message vs warn-and-return-null). Move the function whole; do not factor it.
- If the split is done, G4 becomes possible (the old script can import the 22 identical helpers).

Lower-risk alternative if the lead prefers not to split a deletion path that cannot be run: leave the file whole,
apply nothing here, and note it as an accepted exception. I consider the split executable and adequately checked
by lint + fn-check, but not valuable enough to do if the lead is short on review budget.

### D-2. `functions/shared/namePropagation.js` (632 lines) -> 1 new pure module, about 465 lines stay. Extraction risk: LOW

New module `functions/shared/nameKeyHeuristics.js` (stateless, pure; about 165 lines):
`withOriginalWhitespace` `:31-36`, `DISALLOWED_NAME_SEGMENTS` `:38-62`, `LIKELY_NAME_PREFIXES` `:64-94`, `cleanKey`
`:96-98`, `isLikelyNameKey` `:100-127`, `isLowerKey` `:129-137`, `UID_POINTER_PREFIXES` `:139-173`,
`looksLikeUidPointerKey` `:175-182`, `looksLikeUserContainerKey` `:184-189`.
Export: `withOriginalWhitespace`, `cleanKey`, `isLikelyNameKey`, `isLowerKey`, `looksLikeUidPointerKey`,
`looksLikeUserContainerKey`. (`isPlainObject` `:25-29` goes to `propagationCommon.js` per C-1 instead.)

What stays: `getDb`/constants/`sleep` (or their import from `propagationCommon.js`), `normaliseName` `:20-23` (must
stay exported from this path: `index.js:12`, `switchUserName.js`), `keyMatchesTargetUid` `:191-195`,
`valueContainsTargetUid` `:197-222`, `replaceConfig` `:224`, `matchesOldName` `:226-237`, `transformString`
`:239-255`, `replaceNamesInPlace` `:257-305`, `processUsers` .. `processUserSubcollection` `:307-544`,
`buildOldNamesSet` `:546-569`, `resolveUserDoc` `:571-580`, `propagateNameChange` `:582-624`.

What blocks a deeper split (moving the replacement engine `:191-305` out): the module-level mutable
`let replaceConfig` (`:224`) is assigned at `:592` and `:622` and read at `:192`, `:198-199`, `:227`, `:231`,
`:240`, `:253`, `:331-332`, `:423`, `:468`, `:509`. An importer cannot assign an imported binding, so the engine
could only move with a new setter or with the config threaded as a parameter: a rewrite, and the same change that
would fix E-4. Leave the engine where it is.

Note: `let replaceConfig` is declared at `:224`, after functions that read it (`:191-222`). That is legal (they run
only after module evaluation). If lines are moved, keep the declaration in this module and before any call.

`handlePropagation.js` (488) and `rebuildHexagonStats.js` (365) are under the threshold; no split. The same
`replaceConfig` blocker (`handlePropagation.js:37`, assigned `:446`/`:479`) applies there.

---------------------------------------------------------------------------------------------------------------

## E. Latent bugs with minimal fixes

None of these is an "undefined name / duplicate key / unreachable code" case. All sit in code that rewrites
production Firestore documents and cannot be run here. Recommendation for every item: DO NOT change behaviour in
this refactor; record it and ask the owner (section I). A minimal fix is given so the owner can approve it quickly.
E-1, E-3, E-5 and E-6 were reproduced by running a scratch copy of the pure functions under Node 20.

| # | Location | Defect | Minimal fix (needs owner approval) | Confidence |
|---|---|---|---|---|
| E-1 | `handlePropagation.js:97-105` | Double replacement of in-text mentions. `directPattern` (`@old`) and `lowerPattern` (`@oldLower`) are applied one after the other; the second pass re-matches the output of the first whenever the new handle starts with the old one. Handles are lowercase (`index.js` `HANDLE_REGEX`), so the two patterns are normally the same regex. Reproduced: `johnsmith -> johnsmith2` turns `"hey @johnsmith nice lift"` into `"hey @johnsmith22 nice lift"`. Affects captions, comments, message text, notification text. | One pass with an alternation: replace `:98-105` by `const mentionPattern = new RegExp(\`@(?:${escapeRegExp(oldHandle)}|${escapeRegExp(oldHandleLower)})\`, "g"); next = next.replace(mentionPattern, \`@${newHandle}\`);`. Identical output in every non-corrupting case. | bug: high; fix: medium-high |
| E-2 | `handlePropagation.js:98-99` | No right-hand boundary on the mention regex: renaming `johnsmith` also rewrites mentions of a different user `@johnsmith2` (reproduced: `"cc @johnsmith2 and @johnsmith"` -> `"cc @jsmith992 and @jsmith99"`). | Add a negative look-ahead for handle characters (`(?![a-z0-9_.])`, case-insensitive). Intent on trailing `.` is unclear. | bug: high; fix: medium |
| E-3 | `handlePropagation.js:83-85` (also `:69-81`, `:86-88`) | Key-agnostic whole-value match: ANY string value in ANY scanned document whose trimmed lower-case form equals the old handle is replaced, whatever its key. A user whose handle is an ordinary word (`deadlift`, `squats`, `running` all satisfy the 6-20 char rule) who renames, or whose account is deleted (delete propagates `old -> deleteduser`, `deleteUserAndContent.js:934`), rewrites e.g. every `exercises[].name === "Deadlift"` in every `workouts`/`posts` document. Reproduced. | Restrict whole-value replacement to handle-like keys (`isHandleField`) or to sub-trees that reference the uid, as `namePropagation` does. Not minimal; owner decision. | bug: high; fix: open |
| E-4 | `handlePropagation.js:37`, `:446-453`, `:479`; `namePropagation.js:224`, `:592-597`, `:622` | The replace configuration is module-level mutable state used as an implicit argument across `await`s. Cloud Functions v2 instances serve concurrent requests (`index.js:14-18` sets no `concurrency`; v2 default is 80 when cpu >= 1). Two overlapping `setUserHandle` (or `setUserDisplayName`, or `deleteOwnAccount`) calls on one instance overwrite each other's config mid-scan, and the first to finish sets it to `null`, after which the other silently stops replacing (`transformString` returns early at `handlePropagation.js:46` / `namePropagation.js:240`). Also no `try/finally`, so a throw leaves the config set. | Thread the config through the call chain as a parameter (mechanical but touches every function), or set `concurrency: 1` on the three callables in `index.js` (changes function options; `fn-check` would flag it). | bug: medium-high (depends on deployed concurrency); fix: open |
| E-5 | `namePropagation.js:265`, `:283-284` | Over-broad sub-tree match: if an array or map contains the target uid anywhere, the WHOLE container is treated as "the target", so another user with the same display name in the same container is renamed too. Reproduced: `users: [{uid:U1,name:"Old Name"},{uid:U2,name:"Old Name"}]` -> both become "New Name"; same for a map keyed by uid. Hits chat `users` arrays and any member map. | For arrays, decide per element (already done at `:265`) but do not let the parent's `valueHit` (`:283`) mark the whole container; needs care. | bug: high; fix: open |
| E-6 | `namePropagation.js:327`, `:422-425`, `:467-470`, `:508-511` | The root document is only "the target" when its id equals the uid. Top-level sibling fields are therefore never renamed: `{ uid: U1, name: "Old Name" }` and `{ senderUid: U1, senderName: "Old Name" }` stay unchanged (reproduced), while the same pair nested one level down is renamed. Whether any collection stores author names at the top level decides if this matters. | Initialise `matchesTarget` with `docSnap.id === uid || valueContainsTargetUid(data, "")`. Combined with E-5 this needs the owner's view of intended scope. | behaviour: high; is-it-a-bug: medium |
| E-7 | `deleteUserAndContent.js:760-794` | Possible endless loop. When the last member leaves, the chat doc is deleted with a fallback `docSnap.ref.set({ deleted: true }, { merge: true })` (`:790`). If the delete fails and the fallback succeeds, the doc still has `memberUids` containing the uid, the `while (true)` query (`:761-765`) returns it again, and the loop never ends (until the function times out). Very unlikely with admin credentials. | Also clear `memberUids` in the fallback, or track processed ids and break. Data-shape decision. | low-medium |
| E-8 | `deleteUserAndContent.js:998`, `:1106`, `:1041-1045` | `userDocDeleted: userExists` reports "existed", not "was deleted" (the delete error is swallowed at `:1042`), and is `undefined` (dropped from the callable's JSON) when the initial read failed (`:995`). Cosmetic. | `userDocDeleted: Boolean(userExists)`; or leave. | high; trivial |
| E-9 | `namePropagation.js:370` | `searchKeywords` entries that match an old name are replaced with the cased `newName`, although keyword arrays are normally lower-case (`matchesOldName` matches case-insensitively). | Replace with `newNameLower` when the entry is lower-case. Needs knowledge of the keyword format. | low |
| E-10 | `deleteUserAndContent.js:857` | `error.message || error` without optional chaining inside a catch that already used `error?.code` (`:854`). Throws only if something throws `null`/`undefined`. | `error?.message || error`. Trivial, optional. | high; trivial |

Also worth knowing (design, not a refactor item): every rename and every account deletion performs full scans of
`usersPublic`, `posts`, `workouts`, `workoutInvites`, `tribes`, `messages`, every `messages/*/content`, and one
`usersPrivate/{uid}/notifications` query PER USER (`handlePropagation.js:457-476`, `namePropagation.js:601-620`),
inside callables with the default 60 s timeout (`index.js:1582`, `:1668`, `:4356`). `deleteOwnAccount` does this
twice (name, then handle) and then scans `users`, `usersPublic`, `usersPrivate` again
(`deleteUserAndContent.js:659`). See I-9.

---------------------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Issue | Location | Suggested action | Risk |
|---|---|---|---|---|
| F1 | Duplicate default + named exports of the same bindings | `handlePropagation.js:482-487`, `namePropagation.js:626-631` (remove: B2, B3); `rebuildHexagonStats.js:360-364` (keep until G1/G2) | Remove the first two | none (verified importers) |
| F2 | Unused top-level function | `rebuildHexagonStats.js:82-100` | Remove (B1) | none |
| F3 | Six helpers/constants duplicated verbatim between the two propagation modules | C-1 | Extract `functions/shared/propagationCommon.js`, import in both | low; checked by lint + fn-check |
| F4 | Files over 500 lines | `deleteUserAndContent.js`, `namePropagation.js` | D-1 (medium), D-2 (low) | see D |
| F5 | One module is imported through two paths | `functions/shared/rebuildHexagonStats.js` directly (`functions/scripts/recomputeAllHexagonStats.js:5`) and via `shared/rebuildHexagonStats.js` (`recomputeHexagonByHandle.js:7`, `recomputeHexagonStandalone.js:7`) | G1 | low (scripts cannot be run; `node --check` + path existence only) |
| F6 | Literal `200` where `GENERIC_BATCH_SIZE` (= 200) is meant | `handlePropagation.js:472`, `namePropagation.js:616` | Optional: use the constant (same value). Or leave. | none |
| F7 | Module-level mutable state used as an implicit parameter; not re-entrant; no `try/finally` | `handlePropagation.js:37`, `namePropagation.js:224` | Do not change here (E-4, I-4) | high if touched |
| F8 | Import-time side effects (`initializeApp`, `getFirestore`, `getAuth`) in one module while its siblings use a lazy `getDb()` | `deleteUserAndContent.js:14-21` vs `handlePropagation.js:3-9` | Leave (scripts rely on it; H-1) | medium if touched |
| F9 | Error classification by message substring | `deleteUserAndContent.js:944-950` matched against messages thrown at `handlePropagation.js:201`, `:213` | Leave; do not reword those messages (H-4) | medium if touched |
| F10 | Unused `catch (error)` binding that discards the cause | `namePropagation.js:577` | Leave (changing the thrown message is a behaviour change); optionally `catch {` | none |
| F11 | Read-modify-write of whole documents with `{ merge: false }` outside a transaction (lost-update window against concurrent client writes) | `handlePropagation.js:285`, `:324`, `:365`, `:402`; `namePropagation.js:385`, `:428`, `:473`, `:514` | Design issue; leave (H-6) | high if touched |
| F12 | Two different functions share the exported name `findUserByHandle` | `deleteUserAndContent.js:65`, `handlePropagation.js:145` | Leave (public names; `backend/admin/deleteUserAccount.js` depends on the first by name). A one-line comment on each saying which collection it reads would help. | none |
| F13 | Same statement sequence written twice | `deleteUserAndContent.js:931-941` and `:961-971` | Leave (different error handling around each) | low-medium if touched |

React-specific checks (hooks, components in render, effect cleanup) do not apply: no React code in this partition.

---------------------------------------------------------------------------------------------------------------

## G. Cross-partition requests

| # | Target file(s) (partition) | Request | Why |
|---|---|---|---|
| G1 | `functions/scripts/recomputeHexagonByHandle.js:7`, `functions/scripts/recomputeHexagonStandalone.js:7` (functions-scripts) | Import from `"../shared/rebuildHexagonStats.js"` instead of `"../../shared/rebuildHexagonStats.js"` (same module, one hop less; matches `recomputeAllHexagonStats.js:5`). | After this, repo-root `shared/rebuildHexagonStats.js` (backend-shared; a 4-line shim with no LIVE importer) has no importers and can go on the "can now be deleted" list. |
| G2 | `shared/rebuildHexagonStats.js:3` (backend-shared); `backend/admin/recomputeAllHexagonStats.js:135` (tooling-scripts) | Only after G1: drop the `export { default }` line (or retire the shim), and drop the `|| mod?.default?.computeHexagonFromUserData` fallback. | Then, and only then, the default export at `functions/shared/rebuildHexagonStats.js:360-364` can be removed (K2). If G1/G2 are not done, keep it. |
| G3 | `functions/computeHexagon.js` (functions-index) | Nothing imports this "legacy entry point" (grepped the repo; `index.js` does not). Put it on the "can now be deleted" list. | After the owner deletes it, `functions/shared/computeHexagon.js:4` (`export *`) has no consumer and can be reduced to the default re-export. |
| G4 | `functions/scripts/resetUserContentByHandle.js` (functions-scripts) | If D-1 is executed: replace its 22 byte-identical local declarations (C-6 list: script lines 5-6, 14-15, the whole run 17-356, 491-512 and 607-618) with imports from `functions/shared/deleteUser/*`; keep its own `scrubUserReferences` (`:358-489`), `removeUserFromMessages` (`:514-567`), `cleanTribes` (`:569-605`) and `main`. If D-1 is not executed, leave the script alone. First ask I-6 (it may simply be obsolete). | About 360 duplicated lines. |
| G5 | `functions/scripts/recomputeHexagonByHandle.js` and `recomputeHexagonStandalone.js` (functions-scripts) | FYI: the two files differ only in the usage string at line 17. | One of them is redundant (owner's call). |
| G6 | `functions/index.js:4367-4373` (functions-index) | Optional: the local `normalizeHandle` inside `deleteOwnAccount` equals `normaliseHandle(value).toLowerCase()` from `./shared/handlePropagation.js` for every input (same null check, trim, single `@` strip, trim). Could import instead of redefining. | DRY; behaviour-identical. Low value; skip if `index.js` is otherwise untouched. |
| G7 | `backend/workouts/deleteCompletedWorkout.js`, `backend/workouts/updateCompletedWorkout.js` (backend-shared, LIVE) | Do NOT import anything from `functions/shared/rebuildHexagonStats.js` or `shared/rebuildHexagonStats.js` to dedupe: `inferGroup`, `rebuildStatsFromWorkouts` and (for the delete file) `toMillis` differ (C-7). Between the two client files, `toNumber`, `calculate1RM`, `toDayKey`, `parseDayKey`, `inferGroup` are identical and `distributeFullBody` is behaviour-identical; `toMillis` is not. | Prevents a wrong "obvious" unification. |
| G8 | `functions/scripts/deleteUserAndContentByHandle.js`, `backend/admin/deleteUserAccount.js` (functions-scripts, tooling-scripts) | No change requested. Both rely on `deleteUserAndContent.js` initialising the Admin app at import time and on the three export names at that exact path. | Constraint on D-1. |
| G9 | any partition | Do not add an import of `functions/shared/rebuildHexagonStats.js` or `functions/shared/computeHexagon.js` to `functions/index.js`. | They resolve `../../shared/*`, which is outside the deployed `functions/` directory (H-1). |

---------------------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

1. Deploy boundary and module format. `firebase.json` deploys only `functions/`. `functions/shared/computeHexagon.js:4-5`
   imports `../../shared/computeHexagon.js`, which exists on an operator's machine but not in the deployed bundle;
   this is harmless only because `index.js` never imports it or `rebuildHexagonStats.js`. In addition the root
   `package.json` has no `"type": "module"`, so Node loads `shared/*.js` as ES modules only through syntax
   detection (works on the local Node 20.20 with a `MODULE_TYPELESS_PACKAGE_JSON` warning; fails on Node < 20.19).
   Do not move, rename or "simplify" these shims, and do not touch `package.json`.
2. Step order in `deleteUserCore` (`deleteUserAndContent.js:1005-1045`): placeholder identity is propagated FIRST
   (needs the user's docs and handle registry to still exist), the new placeholder handle is appended to
   `handleLowerCandidates` (`:1006-1009`) so that its registry entry is removed again at `:1022`, the Auth user is
   deleted near the end (`:1039`), the `users` doc last (`:1041-1045`). Any reordering changes outcomes.
3. The summary object returned at `deleteUserAndContent.js:1077-1107` is the response payload of the
   `deleteOwnAccount` callable (`index.js:4403-4404`) and is printed as JSON by two CLIs. Keep every key.
4. Error-message coupling: `assignDeletedHandle` decides "try the next candidate" by substring
   (`deleteUserAndContent.js:944-950`: "conflicts", "reserved", "Handle", "non-empty") against the messages thrown
   by `ensureHandleAvailable` (`handlePropagation.js:201`, `:213`). Do not reword any thrown message in this
   partition.
5. Branch order in handle `transformString` (`handlePropagation.js:69-105`). Several branches are subsumed by
   others (N2), which makes the function look simplifiable; the exact order still defines which `@`-prefix and
   which casing is written back. Move it only as a whole, never edit inside.
6. In-place mutation + full overwrite: `replaceHandlesInPlace` / `replaceNamesInPlace` mutate the object returned
   by `docSnap.data()` and the callers write it back with `{ merge: false }` (locations in F11). `isPlainObject`
   (prototype check) is what keeps `Timestamp`, `GeoPoint`, `DocumentReference`, `FieldValue` instances untouched.
   Do not swap it for a looser "is object" test, do not clone, do not change the merge flag.
7. Module state and its reset points: `replaceConfig` is set at `handlePropagation.js:446` / `namePropagation.js:592`
   and cleared at `:479` / `:622` (after the "completed" log in one file, before it in the other). Keep both as
   they are; see E-4 before touching.
8. Import-time initialisation at `deleteUserAndContent.js:14-21` and its place in the evaluation order (before
   the body of `functions/index.js`, which then runs its own guarded `initializeApp()` at `index.js:21`).
9. Throttles and batch sizes: `sleep(50)` / `sleep(25)`, `USERS_BATCH_SIZE` 400 (delete) vs 200 (propagation),
   `DELETE_BATCH_SIZE` 500 (Firestore's batch maximum), `GENERIC_BATCH_SIZE` 200. Two constants named
   `USERS_BATCH_SIZE` have different values; do not unify.
10. Lookup candidate lists and their order: `deleteUserAndContent.js:71-79`, `handlePropagation.js:152-158`,
    `:189-195`; uid key order in `getUidFromEntry` (`deleteUserAndContent.js:46-54`). First match wins.
11. `rebuildHexagonStats.js` day keys use the process's local time zone (`setHours(0,0,0,0)` at `:42`, `:51`):
    results depend on where the script runs. Do not replace with a UTC helper or with `frontend/utils/date.js`.
12. All console output (K4) and the 2-space/double-quote style of this folder.

---------------------------------------------------------------------------------------------------------------

## I. Open questions for the owner

1. `namePropagation.js:245-251`: the "is this a name-like key" test is computed and then ignored (both branches are
   identical), so any string equal to an old name inside a matching sub-tree is replaced, including values under
   keys the deny-list (`:38-62`: workout, exercise, template, meal ...) was written to protect. Was the restriction
   meant to be active? If not, about 92 lines can be deleted (N1); if yes, the condition needs fixing, not removing.
2. `handlePropagation.js:97-105` (E-1): may the double-replacement bug be fixed with the single-pass regex? And
   should mentions get a right-hand boundary so `@johnsmith` does not match inside `@johnsmith2` (E-2)?
3. `handlePropagation.js:83-88` (E-3): whole-value replacement ignores the field name. Is it intended that a
   handle such as `deadlift` rewrites every identical string (exercise names, titles) in every scanned collection,
   including on account deletion?
4. E-4: are `setUserHandle`, `setUserDisplayName`, `deleteOwnAccount` deployed with per-instance concurrency > 1?
   If so the shared `replaceConfig` can cross-contaminate two users' renames. Preferred fix: pass the config as a
   parameter (which would also allow unifying the scan skeletons, C-2).
5. E-5 / E-6: for name propagation, what is the intended scope? Today a same-named OTHER user inside the same
   array/map is renamed, while top-level `{ uid, name }` / `{ senderUid, senderName }` pairs are not.
6. Is `functions/scripts/resetUserContentByHandle.js` still needed? It is an older fork of the deletion job with
   weaker semantics (C-6) and has been superseded by `functions/scripts/deleteUserAndContentByHandle.js`.
7. Are the shims `functions/computeHexagon.js` ("legacy entry point", no importer) and repo-root
   `shared/rebuildHexagonStats.js` (only two scripts import it) still wanted? (G1-G3)
8. `deleteUserAndContent.js:830-835`: when the deleted user owns a tribe, the whole tribe is deleted, whereas the
   older script handed ownership to the next member. Intended? (Tribes belong to the parked Compete feature.)
9. Scalability: rename and delete do full-collection scans inside 60-second callables (end of section E). Is a
   background job or a higher timeout planned?
10. `rebuildHexagonStats.js:102-113` vs the client twins: "Bench Press" is `chest` on the server tool and
    `shoulders` in `backend/workouts/*` (C-7). Which is right? (The server value is currently unread, N8.)
11. E-7: should the `{ deleted: true }` fallback at `deleteUserAndContent.js:790` also clear `memberUids`?
12. Outside this partition but on the path into it: `functions/index.js:4357-4359` accepts the uid from the request
    payload when the caller is unauthenticated (then requires only a matching handle at `:4376-4399`) before
    calling `deleteUserAndContentByUid`. Intended?
