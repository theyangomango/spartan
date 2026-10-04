# Audit: partition "tooling-scripts" (17 files, 3645 lines)

All 17 files were read completely, top to bottom. All are byte-identical to SPX/baseline (checked with `cmp`). All 17
pass `node --check` under Node 20.20.2. Every file is TOOLING (operator scripts, dev analyzers, one-off codemods, the
single test). Nothing in this partition is bundled into the app: no LIVE, PARKED or functions/ file imports any of them.
Line numbers below are the numbers in the files as they are now.

What was and was not executed during this audit: `tests/feedRanking.test.js` was run with Node 20 (it is the gate test;
it is pure and passes: "feedRanking tests passed"). No file under backend/admin/ or scripts/ was executed. Claims about
the two import analyzers were checked with a read-only re-implementation of their regexes in the scratchpad, not by
running the scripts.

Overall verdict for the implementer: this partition needs very little. There is one lint finding, two tiny doc/dev-tool
fixes, one optional mechanical dedupe inside backend/admin, and a list of owner questions. Everything else should be
left exactly as it is, because none of it can be run here and most of it writes to (or deletes from) the live database.

Legend used below: APPLY = safe, verified, recommended. OPTIONAL = behaviour-preserving but low value; do it only if
the file is being touched anyway. KEEP = looks removable but must stay. OWNER = needs the owner's decision.

---------------------------------------------------------------------------------------------------------------------

## A. Module map

No file in this partition has exports (no `module.exports`, no `export`). Every file is a CLI entry point or a test.
"Importers" is therefore "who invokes it". The column "Reaches out to" lists the string-based/dynamic dependencies on
files OUTSIDE the partition; these are invisible to knip and to the import graph and are the reason for section G.

| File (lines) | Module system | Purpose | Invoked by | Reaches out to (outside partition) |
|---|---|---|---|---|
| backend/admin/changeHandle.js (281) | CJS, 4-space, `"` | Admin CLI: rename a user's handle. Resolves the user in `usersPublic`/`userHandles`, checks availability, spawns the propagation script, then updates `userHandles/{lower}` in a transaction and rewrites `userSearchIndex/{uid}`. Flags `--dry-run`, `--help`. | by hand (`node backend/admin/changeHandle.js <old> <new>`); referenced nowhere else | spawns `functions/scripts/switchUserHandle.js` by path with argv `[oldHandle, newHandle]` (:171-176) |
| backend/admin/changeName.js (276) | CJS, 4-space, `"` | Admin CLI: change a display name. Writes `displayName`/`name` to `usersPublic/{uid}` and `users/{uid}` (:215-230), spawns the propagation script, rewrites `userSearchIndex/{uid}`. Flags `--old <name>`, `--dry-run`. | by hand | spawns `functions/scripts/switchUserName.js` with argv `[identifier, newName, oldName?]` (:178-185) |
| backend/admin/deleteUserAccount.js (210) | CJS, 2-space, `"` | Admin CLI: delete an account and all content, with interactive confirmation (`--force` skips it, `--dry-run` only prints). | by hand | dynamic `import()` of `functions/shared/deleteUserAndContent.js` (:20-22, :66); needs its named exports `findUserByHandle` and `deleteUserAndContentByHandle` (:144-147) |
| backend/admin/exportFoodLogsTable.js (499) | CJS, 4-space, `"` | Admin CLI: read-only export of every `usersPrivate/*/foodLogs/*/entries/*` doc into a Markdown table file (default `./food_logs_table.md`). Reads `usersPublic` and legacy `users` for the handle. | by hand | none (only firebase-admin, fs, path) |
| backend/admin/recomputeAllHexagonStats.js (307) | CJS, 2-space, `"` | Admin CLI: page through `users`, recompute hexagon stats and merge-write them back; `--update-public` mirrors to `usersPublic`; `--dry-run`, `--limit`, `--start-after`, `--batch-size`, `--verbose`. | by hand | dynamic `import()` of `functions/shared/rebuildHexagonStats.js` (:131-134); needs `computeHexagonFromUserData` (named, or on the default export) (:135) |
| backend/admin/resetLeaderboardLastRanks.js (149) | ESM syntax in a `.js` file, 4-space, `"` | Admin script: rewrites every `usersPublic/*.lastRanks` so each listed uid gets rank = number of entries (i.e. "everyone last"), sets `lastRanksVersion: 4`. No flags. Runs on import. | by hand | none |
| backend/admin/simulateLeaderboardLastRanksRefresh.js (348) | ESM syntax in a `.js` file, 2-space, `"` | Admin script: one-off run of the leaderboard "last ranks" refresh (same algorithm as the scheduled Cloud Function `refreshLeaderboardLastRanks`, but WITHOUT tie sharing, see C7). Writes `leaderboardSnapshots/{iso}`, `leaderboardMeta/currentSnapshot`, and `usersPublic/*.lastRanks`. | by hand | none (it is a divergent twin of `functions/scripts/simulateLeaderboardLastRanksRefresh.js`) |
| backend/admin/verifyUser.js (333) | CJS, 4-space, `"` | Admin CLI: set/unset the verified badge on `usersPublic/{uid}` and legacy `users/{uid}`. Flags `--dry-run`, `--unverify`/`--unset`/`--remove`, `--help`. | by hand | none |
| scripts/backfillRanks.js (144) | CJS, 2-space, `'` | Operator script: for every (or one) `usersPublic` doc compute the rank from `completedWorkouts` + `statsHexagon` and merge-write rank fields to `usersPublic`, `usersPrivate`, `users`. Flags `--uid=`, `--limit=`. | by hand | dynamic `import()` of `shared/rankProgress.js` by path string (:53-54); needs named export `computeRankProgressFromData` (:55-58) |
| scripts/bootstrap/purgeLegacyData.js (107) | CJS, 2-space, `'` | One-off, extremely destructive: deletes eight top-level collections, Storage prefixes `pfps/` and `posts/`, and ALL Firebase Auth users. Default project id is the production project (:14). Initialises the Admin SDK at module load (:29-34). | by hand | none |
| scripts/bootstrap/seedAccounts.js (126) | CJS, 2-space, `'` | Bootstrap: create/update Auth users and `usersPublic`/`usersPrivate` docs from a JSON config (`--config=path`). | by hand | reads the JSON file given on the command line (documented as `docs/bootstrap/accounts.json`) |
| scripts/check-relative-imports.js (115) | CJS, 2-space, `'` | Dev analyzer (read-only): walks relative imports from `App.js` with a regex, prints JSON `{reachableFileCount, missingImportCount, missing}`, exits 1 if any relative import does not resolve. Has `require.main === module` guard (:112). | `npm run audit:imports` (package.json:8), README.md:40-41 | reads every reachable project file |
| scripts/find-unused-frontend.js (119) | CJS, 2-space, `'` | Dev analyzer (read-only): builds an import graph of `frontend/**` + `App.js`, prints JSON listing files under `frontend/components` and `frontend/screens` not reachable from `App.js` (minus a hard-coded MakePost exclusion, :107-108). Guard at :118. | `npm run audit:unused:frontend` (package.json:9), README.md:43-44 | reads all of `frontend/` |
| scripts/removeWhiteExerciseBackgrounds.js (58) | CJS, 2-space, `'` | One-off image fix: makes near-white pixels transparent, IN PLACE, in ten hard-coded PNGs under `exercises copy/` (:6-17). Runs on load (:57). Requires `pngjs`, which is not a declared dependency (see E8). | by hand; referenced nowhere | overwrites bundled assets that `frontend/components/common/exerciseImageMap.js` requires |
| scripts/scale-fontsize-codemod.js (275) | CJS, 2-space, `'` | One-off recast codemod: rewrites every `fontSize:` value in every `frontend/**/*.js` to `scaleSize(...)` and inserts the import. Guard at :272. | by hand; referenced nowhere | rewrites all of `frontend/`; hard-codes `frontend/helper/scaleSize.js` (:18-19) |
| scripts/scale-style-magic-numbers-codemod.js (239) | CJS, 2-space, `'`, very dense one-line style | One-off recast codemod: wraps numeric values of dimension-like style props in `scaleSize(...)` in every `frontend/**/*.js`. Guard at :238. | by hand; referenced nowhere | rewrites all of `frontend/`; hard-codes `frontend/helper/scaleSize.js` (:16-17) |
| tests/feedRanking.test.js (59) | CJS, 4-space, `"` | The only test: plain-node `assert` checks of feed scoring/mixing. | `SPX/tools/gate.sh:15` (`node tests/feedRanking.test.js`); by hand | `require("../frontend/helper/feedRanking")` (:2-7): needs CommonJS exports `scoreFeedCandidate`, `mixRankedFeeds`, `extractPostTopics`, `buildViewerTopicVector` |

Neighbours in the same folders that are not JavaScript and not in the partition: `scripts/crop_exercise_images.py`,
`scripts/bootstrap/enableAuthProviders.sh`. Not audited.

Top-level declarations per file (name: line range), for reference by the sections below:

- changeHandle.js: state `firestore`/`appInitialized` 17-18; `ensureDb` 20-34; `stripAt` 36-40; `normaliseHandle` 42-46; `sanitiseNewHandle` 48-54; `buildSearchTokens` 56-71; `parseArgs` 73-91; `findUserByHandle` 93-148; `ensureHandleRegistryAvailable` 150-168; `runSwitchUserHandleScript` 170-183; `updateHandleRegistry` 185-211; `refreshUserSearchIndex` 213-233; `main` 235-275; entry 277-280.
- changeName.js: `PRIMARY_USER_COLLECTION` 16; state 18-19; `ensureDb` 21-35; `stripAt` 37-41; `normaliseHandle` 43-47; `normaliseName` 49-52; `buildSearchTokens` 54-69; `findUserByIdentifier` 71-133; `parseArgs` 135-175; `runSwitchUserNameScript` 177-192; `refreshUserSearchIndex` 194-213; `applyNameUpdate` 215-230; `main` 232-273; call 275.
- deleteUserAccount.js: `deletionModulePath` 20-22; `cachedDeletionModule` 24; `stripAt` 26-30; `normaliseHandle` 32-36; `parseArgs` 38-61; `loadDeletionModule` 63-72; `describeUserData` 74-93; `promptForConfirmation` 95-113; `formatDate` 115-135; `main` 137-204; entry 206-209.
- exportFoodLogsTable.js: constants 25-26; state 28-29; `printUsage` 31-41; `parseArgs` 43-99; `ensureDb` 101-115; `normaliseHandle` 117-123; `safeNumber` 125-128; `coercePortion` 130-142; `scaleMacros` 144-156; `parseMacrosFromDescription` 158-179; `ensureMacros` 181-198; `normalizeMeal` 200-210; `escapeMarkdown` 212-218; `toMillis` 220-237; `inferDayMillis` 239-243; `resolveTimestamp` 245-258; `formatNumber` 260-268; `formatQuantity` 270-278; `formatIso` 280-285; `getUserDescriptor` 287-333; `normalizeEntry` 335-353; `buildTableRow` 355-375; `exportFoodLogs` 377-486; IIFE 488-497.
- recomputeAllHexagonStats.js: constants 26-28; `printUsage` 30-43; `parseArgs` 45-115; `ensureFirestore` 117-128; `loadComputeHexagon` 130-140; `buildUpdatePayload` 142-159; `recomputeForUser` 161-205; `formatDuration` 207-218; `main` 220-301; entry 303-306.
- resetLeaderboardLastRanks.js: `USERS_BATCH_SIZE` 4; init 6-10; `db` 12; `toUid` 14-22; `rebuildEntries` 24-36; `rebuildEntriesMap` 38-47; `rebuildBranch` 49-65; `rebuildLastRanks` 67-90; `resetAllLastRanks` 92-143; entry 145-148.
- simulateLeaderboardLastRanksRefresh.js: constants 4-5; init 7-11; `db` 13; `toUid` 15-23; `safeNumber` 25-28; `computeGlobalRanks` 30-42; `ensureMembersInValueMap` 44-48; `buildEntriesForMembers` 50-56; `simulateRefresh` 58-337; entry 339-347.
- verifyUser.js: constants 14-15; state 17-18; `ensureDb` 20-34; `stripAt` 36-40; `normaliseHandle` 42-46; `coerceBoolean` 48-59; `formatHandle` 61-64; `buildVerificationPayload` 66-82; `buildLegacyPayload` 84-122; `printUsage` 124-130; `parseArgs` 132-159; `findUserByHandle` 161-213; `resolveUser` 215-232; `loadUserState` 234-278; `applyVerification` 280-289; `main` 291-330; call 332.
- backfillRanks.js: constants 18-20; `parseArgs` 22-36; `initAdmin` 38-50; `loadRankCalculator` 52-59; `buildRankFields` 61-77; `fetchTargets` 79-93; `main` 95-138; entry 140-143.
- purgeLegacyData.js: `PROJECT_ID` 14; `assertServiceAccount` 16-27; init 29-34; handles 36-38; `purgeCollection` 40-50; `purgeSubcollections` 52-61; `purgeAuthUsers` 63-76; `purgeStoragePrefix` 78-84; `main` 86-101; entry 103-106.
- seedAccounts.js: constants 17-18; `readConfigPath` 20-27; `loadAccounts` 29-39; `initAdmin` 41-49; `ensureAccount` 51-109; `main` 111-120; entry 122-125.
- check-relative-imports.js: constants 11-13; `IMPORT_RE` 15; `readFileSafe` 17-23; `parseImportSpecs` 25-33; `resolveRelativeImport` 35-61; `walkReachableFiles` 63-91; `main` 93-110; guard 112-114.
- find-unused-frontend.js: constants 8-13; `walk` 15-23; `readFileSafe` 25-27; `IMPORT_RE` 31; `resolveImport` 33-51; `buildGraph` 53-70; `dfs` 72-83; `main` 85-116; guard 118.
- removeWhiteExerciseBackgrounds.js: `exerciseImagePaths` 6-17; constants 19-21; `isAlmostWhite` 23-33; `removeWhiteBackground` 35-55; run 57.
- scale-fontsize-codemod.js: constants 18-19; `parse` 21-23; `print` 25-27; `isImportingScaleSizeFrom` 29-39; `resolveImportAbs` 41-46; `hasTopLevelBinding` 48-68; `getExistingScaleImport` 70-87; `insertScaleImport` 89-116; `chooseIdentifier` 118-125; `isAlreadyScaled` 127-142; `transformFile` 144-247; `walk` 249-259; `main` 261-270; guard 272-274.
- scale-style-magic-numbers-codemod.js: constants 16-17; `SCALE_PROPS` 19-36; `NESTED_SCALE_PROPS` 38-40; `parse` 42; `print` 43; `resolveImportAbs` 45-48; `isImportingScaleSizeFrom` 49-53; `getExistingScaleImport` 54-64; `hasTopBinding` 65-73; `chooseIdent` 74; `insertScaleImport` 75-85; `isAlreadyScaled` 86-91; `shouldScaleProp` 92; `isNumericLiteral` 93; `scaleNode` 95-99; `transformStyleObject` 101-137; `transformInlineStyleObject` 139-142; `transformJSXStyleAttr` 144-163; `isStyleSheetCreate` 165-170; `transformFile` 172-220; `walk` 222-229; `main` 231-236; guard 238.
- tests/feedRanking.test.js: requires 1-7; `makePost` 9-21; fixtures 23-31; scores 33-43; asserts 45-46; mix 48-52; asserts 54-56; log 58.

---------------------------------------------------------------------------------------------------------------------

## B. Verified dead code

### B1. Machine findings, verified

| Finding | Verdict | Evidence | Action |
|---|---|---|---|
| ESLint `no-unused-vars`: `willNeedImport` at scripts/scale-fontsize-codemod.js:157 | CONFIRMED dead | Declared :157; assigned at :197, :206, :214, :222 (each inside `if (!scaleIdent) { willNeedImport = true; }`); never read. The import decision is made from `scaleIdent` at :239. | APPLY: delete line 157 and the four whole-line statements at 197, 206, 214, 222 (each of those lines contains nothing else). 5 lines. |
| ESLint `import/no-unresolved` x14 on `firebase-admin/app` and `firebase-admin/firestore` in the eight backend/admin files | FALSE POSITIVE | `node_modules/firebase-admin@13.5.0` is installed (as a peer of the root dependency `firebase-functions`), and these subpaths are package `exports` entries that eslint-plugin-import's node resolver cannot follow. SPX's eslintrc override already turns the rule off for `functions/**`, `scripts/**`, `tests/**` but not `backend/admin/**` (SPX/tools/eslintrc.cjs:66). | Nothing to change in the repo. These 14 errors are baseline noise and will remain. See G9. |
| knip: no unused exports | CONFIRMED | No file in the partition exports anything. | None. |

### B2. Found by reading (not reported by the tools)

There is no commented-out code, no TODO/FIXME, and no tracing `console.log` in the partition: every `console.*` call
is operator-facing CLI output (progress, summaries, usage, errors). Do not remove any of them.

| # | Identifier | Kind | Location | Evidence | Action |
|---|---|---|---|---|---|
| 1 | `hasNamedTS` | variable + returned property never read | scripts/scale-fontsize-codemod.js:73 (decl), :80 (assignment), :86 (returned) | The two callers read only `decl`/`defaultLocal` (:91-99 via `existing.decl`, `existing.defaultLocal`; :155 destructures `{ defaultLocal }`). | APPLY: delete lines 73 and 80; change :86 to `return { decl, defaultLocal };`. |
| 2 | no-op visitor methods | dead code | scripts/scale-fontsize-codemod.js:63-65 | `visitImportSpecifier`, `visitImportDefaultSpecifier`, `visitImportNamespaceSpecifier` only call `this.traverse(p)`, which is what ast-types does when no method is defined. | OPTIONAL (relies on library default); see also E7, they look like an unfinished check. Leave. |
| 3 | unreachable "collapse" branch | unreachable | scripts/scale-fontsize-codemod.js:224-231 | `innerName === outerName` (:228) cannot be true: a call whose callee is `scaleIdent || 'scaleSize'` already returned at :190 through `isAlreadyScaled` (:133). | OPTIONAL. Leave (one-off codemod). |
| 4 | `payload` | redundant copy + misplaced comment | scripts/backfillRanks.js:117-120 | `{ ...fields, // comment }` is a shallow copy of `fields` that is never mutated; `.set(payload, ...)` (:124) is identical to `.set(fields, ...)`. The comment inside the literal describes the `users` write on :123. | OPTIONAL: replace 117-120 by nothing and use `fields` on :124, moving the comment above :122. Zero behavioural risk; trivial value. |
| 5 | `transformInlineStyleObject` | wrapper that only forwards | scripts/scale-style-magic-numbers-codemod.js:139-142 (callers :153, :157) | Body is `return transformStyleObject(obj, b, scaleIdent);`. | OPTIONAL: inline the two calls. Leave unless touching the file. |
| 6 | no-op guard | dead statement | scripts/scale-style-magic-numbers-codemod.js:115 | Own comment says "impossible but safe"; an `Identifier` value is never scaled anyway because :118 only scales NumericLiteral/Unary/Binary/Call. | OPTIONAL. Leave. |
| 7 | redundant alias `n` | dead variable | scripts/scale-style-magic-numbers-codemod.js:166 | `const n = pathNode.node || pathNode; const node = n;` | OPTIONAL. Leave (no churn). |
| 8 | fallback `|| chooseIdent(ast, 'scaleSize')` | unreachable | scripts/scale-style-magic-numbers-codemod.js:215 | `scaleIdent` is always assigned by a visitor (:183, :189, :198) before `changed` can become true. | KEEP (harmless). |
| 9 | `visitCallExpression` + `isStyleSheetCreate`, `visitJSXAttribute` + `transformJSXStyleAttr` | functionally redundant | scripts/scale-style-magic-numbers-codemod.js:188-209, 144-170 | `visitObjectExpression` (:182-187) already transforms EVERY object literal in the file, so the StyleSheet.create and JSX-style special cases never find anything new. (The header comment "Targets StyleSheet.create({...}) objects" at :4 is therefore inaccurate.) | KEEP. Codemod semantics; do not "simplify". See I5. |
| 10 | `legacyExists` (returned property) | returned, never read | backend/admin/verifyUser.js:276 | Callers (:297-305, :312-313, :322-324, and `applyVerification` :283) read `publicData`, `legacyData`, `publicVerified`, `legacyVerified`, `handle`, `displayName` only. The local at :248-249 IS used. | OPTIONAL: delete line 276 only. See I9 before touching. |
| 11 | `cachedDeletionModule` | memo for a single call | backend/admin/deleteUserAccount.js:24, :64, :66-67 | `loadDeletionModule()` has exactly one call site (:144). | KEEP (harmless; destructive tool, do not touch). |
| 12 | "Type DELETE" confirmation path | unreachable from the only caller | backend/admin/deleteUserAccount.js:98-100, :106-109 | Caller passes `descriptor.handle || normalizedInput` (:186) and `normalizedInput` is non-empty (:139-142), so `normalizedExpected` is never empty. | KEEP (defensive guard in a destructive tool). |
| 13 | `!userSnap?.exists` check | unreachable with the current callee | backend/admin/deleteUserAccount.js:157-160 | `functions/shared/deleteUserAndContent.js:65-95` either returns a query document (always exists) or throws. | KEEP (cross-module defensive). |
| 14 | `includeServerTimestamp` | parameter that is constant | backend/admin/recomputeAllHexagonStats.js:142, :146 | Single call site passes the literal `true` (:185). | OPTIONAL. Leave. |
| 15 | `result` in `recomputeForUser`'s return value | returned, never read | backend/admin/recomputeAllHexagonStats.js:182, :204 | The caller destructures only `wrote` (:260). | OPTIONAL. Leave. |
| 16 | `lastDoc = ...` before `break outer` | dead assignment | backend/admin/recomputeAllHexagonStats.js:273 | `lastDoc` is not read after the loop exits. | OPTIONAL. Leave. |
| 17 | `return;` after `process.exit(0)` | unreachable | backend/admin/recomputeAllHexagonStats.js:225 | `process.exit` does not return. | KEEP (harmless guard). |
| 18 | `descriptor.displayName`, `descriptor.uid`, `normalized.serving`, `handleCache` | computed, never output | backend/admin/exportFoodLogsTable.js:298-303, :313-319, :327, :329 (displayName/uid); :350 (serving); :379, :288, :331 (cache) | `buildTableRow` (:355-375) uses `handle, uid, dayKey, meal, foodName, brand, description, quantity, macros, timestamp, source, entryId` where `uid` is the loop variable (:437). The cache can never hit: each `usersPrivate` doc is visited once. | KEEP. Removing `displayName` would also change WHEN the legacy `users/{uid}` doc is read (:305). Output would be identical but the read pattern would not; not worth it on an untestable script. See I11. |
| 19 | fraction branch of `coercePortion` | unreachable in this script | backend/admin/exportFoodLogsTable.js:133-141 | `quantity` is always a finite number after :336, so the `typeof q === "number"` return at :132 always fires. | KEEP (it is a verbatim copy of the app helper, C10). |
| 20 | `computeGlobalRanks` and the stored `ranks` | pure computation whose result is never read | backend/admin/simulateLeaderboardLastRanksRefresh.js:30-42, :177-178, :188-189 | `exerciseMaps`/`hexMaps` entries are only read through `config.valueMap` (:199-200, :207-208, :227-228, :235-236, :251-252, :260-261). No `.ranks` read exists. The same dead computation exists in the twin `functions/scripts/simulateLeaderboardLastRanksRefresh.js:31, :206-207, :217-218` and in production `functions/index.js:2962, :3126-3127, :3139-3140`. | KEEP here (the script is meant to mirror the Cloud Function line for line). Cross-partition note G7. |
| 21 | redundant `.toLowerCase()` / `.trim()` / `normaliseName` | harmless redundancy | backend/admin/changeHandle.js:245 (already lower-cased at :125, :141), :45 and twins (stripAt already trims); changeName.js:245 (already normalised at :146); simulate...:216, :244 (`Set.add` is idempotent) | Reading. | KEEP. |
| 22 | `// eslint-disable-next-line no-await-in-loop` | stale directive | scripts/bootstrap/seedAccounts.js:116 | The repo has no linter; SPX's rule set does not enable that rule. | OPTIONAL: delete the comment line. |
| 23 | `typeof limit === 'number' && limit > 0` | always equal to `limit !== null` | scripts/backfillRanks.js:92 | `parseArgs` only ever sets a positive finite number (:29-32). | KEEP. |

Candidate FILES for deletion (owner sign-off; never delete here): see I1-I4.

---------------------------------------------------------------------------------------------------------------------

## C. Duplication

Constraint that shapes every recommendation below: the six CJS admin scripts cannot `require()` code from `functions/`
(ES modules) or from `frontend/`/`shared/` (ESM syntax, React Native imports) without a dynamic `import()`. A shared
helper for backend/admin therefore has to be a NEW CommonJS file inside backend/admin. The two ESM-syntax admin scripts
(resetLeaderboardLastRanks, simulateLeaderboardLastRanksRefresh) cannot use `require` at all.

### C1. `stripAt` + `normaliseHandle` (handle normalisation)
- backend/admin/changeHandle.js:36-46, changeName.js:37-47, verifyUser.js:36-46, deleteUserAccount.js:26-36: IDENTICAL (byte-identical after stripping indentation; checked with diff). `stripAt` is used only by `normaliseHandle` in each file.
- backend/admin/exportFoodLogsTable.js:117-123: different text, IDENTICAL behaviour for every input (null/undefined -> ""; otherwise `String(v).trim()`, strip one leading "@", trim again).
- functions/shared/handlePropagation.js:19-25 (exported): IDENTICAL behaviour to the five above.
- functions/shared/deleteUserAndContent.js:27-33 and functions/scripts/resetUserContentByHandle.js:21-27: DIFFERENT for `false` and `NaN` (return "" instead of "false"/"NaN") because of `!rawHandle && rawHandle !== 0`.
- functions/scripts/toggleUserVerification.js:12-17, clearActiveWorkoutByHandle.js:12-17, clearUserContentByHandle.js:34-39: DIFFERENT, no trim after removing "@" ("@ bob" -> " bob").
- Canonical home: for backend/admin, a new `backend/admin/lib/handleUtils.js` (CJS); for functions/, the existing export in functions/shared/handlePropagation.js (that is the functions partitions' call).
- Recommended action (OPTIONAL, low risk, mechanical): create `backend/admin/lib/handleUtils.js` containing `"use strict";`, then changeHandle.js lines 36-46 and 56-71 moved verbatim (`sed -n '36,46p;56,71p'`), then `module.exports = { stripAt, normaliseHandle, buildSearchTokens };`. In changeHandle.js delete 36-46 and 56-71 and add `const { normaliseHandle, buildSearchTokens } = require("./lib/handleUtils");` after the existing requires; same in changeName.js (delete 37-47 and 54-69); in verifyUser.js delete 36-46 and import `normaliseHandle`; in deleteUserAccount.js delete 26-36 and import `normaliseHandle` (keep that file's 2-space style on the lines you add). exportFoodLogsTable.js:117-123 may also switch to the import (semantically identical) or stay. Verification available here: `node --check` on each file; ESLint `no-undef` and `import/no-unresolved` (the rule is active for backend/admin with `commonjs: true`, so a wrong relative `require` path is caught). Failure mode if something were wrong: the CLI throws at startup, before any database access. If the orchestrator wants zero risk on untestable scripts, skip this; nothing else depends on it.

### C2. `buildSearchTokens`
- backend/admin/changeHandle.js:56-71 == changeName.js:54-69: IDENTICAL.
- functions/index.js:88-105: DIFFERENT in one edge: no `typeof token !== "string"` guard, so a truthy non-string throws there and is skipped in the admin copies. Same output for strings and falsy values.
- Canonical home: the same `backend/admin/lib/handleUtils.js` for the two admin copies (covered by C1). Leave functions/index.js alone.

### C3. `ensureDb` / Admin SDK initialisation
- changeHandle.js:17-34 == changeName.js:18-35: IDENTICAL.
- verifyUser.js:17-34: differs in one string, `"already exists"` instead of `"app already exists"` (:26).
- exportFoodLogsTable.js:28-29 + 101-115: same as verifyUser but the flag is spelled `appInitialised`.
- recomputeAllHexagonStats.js:117-128 `ensureFirestore`: DIFFERENT (uses `getApps().length`, sets `ignoreUndefinedProperties`).
- resetLeaderboardLastRanks.js:6-12 and simulate...:7-13: DIFFERENT (top-level try/initializeApp/catch-all, ESM).
- scripts/backfillRanks.js:38-50 (`initAdmin`: explicit credential or ADC + projectId), scripts/bootstrap/seedAccounts.js:41-49 (`initAdmin`: credential required, returns `{auth, db}`), scripts/bootstrap/purgeLegacyData.js:16-34 (credential required with existsSync check, adds `storageBucket`): three DIFFERENT variants. The `PROJECT_ID` constant is identical in all three (backfillRanks.js:20, purgeLegacyData.js:14, seedAccounts.js:17).
- Recommendation: do NOT dedupe. The variants differ (substring, settings, credentials), the state is module-level, and the differing catch branch cannot be exercised (E5).

### C4. Handle lookup (five candidate queries on `usersPublic`, then `userHandles/{lower}` fallback)
- backend/admin/changeHandle.js:93-148 (`findUserByHandle`, returns `{uid, source, handle, handleLower}`), changeName.js:71-133 (`findUserByIdentifier`, doc-id first, returns `{uid, source, data}`), verifyUser.js:161-232 (`findUserByHandle` + `resolveUser`, trims the identifier first, returns `{uid, source, data}`), functions/shared/handlePropagation.js:145-185 (returns the document snapshot).
- Same query plan, but DIFFERENT return shapes, different error messages (operator-visible), and changeName does not trim the identifier before the doc-id lookup while verifyUser does.
- functions/shared/deleteUserAndContent.js:65-95 and functions/scripts/toggleUserVerification.js:19-47 are a different lookup (legacy `users` collection, `username`/`tag` fields).
- Recommendation: leave all of them.

### C5. `refreshUserSearchIndex`
- changeHandle.js:213-233 vs changeName.js:194-213: DIFFERENT (changeHandle falls back to the passed handle and to the handle as display name, no name trimming; changeName trims the name and falls back to `data.username`). functions/index.js:107-122 `upsertSearchIndex` is a third variant. Leave.

### C6. Child-process wrapper
- changeHandle.js:170-183 `runSwitchUserHandleScript` vs changeName.js:177-192 `runSwitchUserNameScript`: same shape, different script path, argv and error label. Could be one `runNodeScript(scriptPath, args, label)`, but it is 14 lines twice; leave.

### C7. `simulateLeaderboardLastRanksRefresh` (whole file)
- backend/admin/simulateLeaderboardLastRanksRefresh.js (348 lines) vs functions/scripts/simulateLeaderboardLastRanksRefresh.js (376 lines). `diff` shows exactly three differences: the functions copy has `const EPSILON = 1e-6;` (its line 4), tie sharing in `computeGlobalRanks` (its 39-49 vs admin :38-40) and tie sharing in `buildEntriesForMembers` (its 65-84 vs admin :55). Everything from `async function simulateRefresh()` to the end is IDENTICAL (admin 58-337 == functions 87-366).
- So they are NOT behaviourally identical: with equal values the admin copy assigns distinct sequential ranks, the functions copy and production (`functions/index.js:2698-2721`, `:2962-2982`) give equal values the same rank.
- Both files changed in the same commit (46b87b51, 2025-11-15: the admin copy was created, the functions copy switched from `users` to `usersPublic`), so it is not possible to tell from history whether the missing tie handling is deliberate.
- Recommendation: do not touch either file. OWNER decides which one survives (I1).

### C8. `toUid`
- backend/admin/simulate...:15-23, resetLeaderboardLastRanks.js:14-22 (arrow form), functions/index.js:2723-2731, functions/scripts/simulate...:16-24, functions/scripts/initializeLeaderboardZeroSnapshot.js:15-23, functions/scripts/setAllLastRanksToOne.js:14-22: IDENTICAL bodies.
- The two admin copies are in ESM-syntax files and could share a module, but that would be two standalone scripts importing a 9-line helper. Leave. Canonical home for functions/ is the functions partitions' decision.

### C9. `recomputeAllHexagonStats` (near-duplicate scripts)
- backend/admin/recomputeAllHexagonStats.js (307 lines, options) vs functions/scripts/recomputeAllHexagonStats.js (95 lines, no options). With no flags the admin script performs the same writes (same collection `users`, page size 200, same merge payload: admin :150-158 vs functions :34-45). The functions script is a strict subset. Differences: log text, and the functions copy calls `process.exit(0)`.
- Recommendation: leave both; OWNER decides (I2).

### C10. Nutrition helpers copied from the app
- exportFoodLogsTable.js:130-142 `coercePortion` vs frontend/utils/nutrition.js:4-16: IDENTICAL (quotes aside).
- :144-156 `scaleMacros` vs nutrition.js:54-63: IDENTICAL behaviour.
- :158-179 `parseMacrosFromDescription` vs nutrition.js:69-99: IDENTICAL behaviour (the app version adds `Number.isFinite` guards that cannot fail because the regexes only capture digits).
- :125-128 `safeNumber` vs frontend/utils/loggedFoods.js:4-7: IDENTICAL. :181-198 `ensureMacros` vs loggedFoods.js:34-52: DIFFERENT (takes the quantity as a parameter, also reads `description`).
- :220-237 `toMillis`: one of 20+ `toMillis` definitions in the repo (e.g. frontend/utils/date.js:6, frontend/utils/friends.js:4); DIFFERENT from each (parses strings with `Date.parse`, rounds nanoseconds).
- Cannot be shared: the admin script is CJS run by plain node; the app modules are ESM for Metro. Leave the copies. If another partition changes the app helpers, this script intentionally does not follow.

### C11. The two recast codemods
- scripts/scale-fontsize-codemod.js vs scripts/scale-style-magic-numbers-codemod.js.
- IDENTICAL behaviour: `FRONTEND_DIR`/`SCALE_FILE` (18-19 vs 16-17), `parse` (21-23 vs 42), `print` (25-27 vs 43), `resolveImportAbs` (41-46 vs 45-48), `isImportingScaleSizeFrom` (29-39 vs 49-53), `insertScaleImport` (89-116 vs 75-85), `walk` (249-259 vs 222-229), `main` (261-270 vs 231-236).
- DIFFERENT: `getExistingScaleImport` (70-87 vs 54-64: the extra dead `hasNamedTS`), `hasTopLevelBinding` (48-68) vs `hasTopBinding` (65-73) (only the latter counts imported names, see E7), `chooseIdentifier` (118-125) vs `chooseIdent` (74) (different fallback names), `isAlreadyScaled` (127-142 vs 86-91: the fontsize version also accepts member calls).
- Recommendation: do not dedupe. One-off tools that have already been applied (both date from 2025-09-15) and are candidates for deletion (I3).

### C12. The two import analyzers
- scripts/check-relative-imports.js vs scripts/find-unused-frontend.js.
- IDENTICAL: `PROJECT_ROOT` (11 vs 8), `EXTS` (13 vs 13), `readFileSafe` (17-23 vs 25-27).
- Same algorithm, different return shape: `resolveRelativeImport` (35-61, returns `{resolved, missing}`) vs `resolveImport` (33-51, returns path or null).
- DIFFERENT: `IMPORT_RE` (15, single-line `[^'"\n]+?`) vs (31, multi-line `[\s\S]*?\s`). This difference is the bug in E2.
- Recommendation: do not merge the files (each is wired to its own npm script and prints its own JSON shape). Only align the regex (E2).

### C13. Rank-fields payload (cross-partition)
- scripts/backfillRanks.js:61-77 `buildRankFields(progress)`; frontend/logic/useWorkoutManager.js:159-184 `buildRankPayload` (same object when an entry exists, wrapped in try/catch, computes the progress itself); backend/workouts/updateCompletedWorkout.js:495-517 and backend/workouts/deleteCompletedWorkout.js:327-349 (same `currentRank` + `rankTier/rankLabel/rankLevel`, but emit explicit nulls when there is no entry instead of returning null).
- PARTLY identical. If the owning partition adds a canonical builder to `shared/rankProgress.js`, the script could pick it up through the dynamic import it already performs. Not required; do not change the script on its own.

### C14. Paged-scan loop (`orderBy("__name__").limit(n)` + `startAfter(lastDoc)`)
- exportFoodLogsTable.js:397-463, recomputeAllHexagonStats.js:246-288, resetLeaderboardLastRanks.js:97-140, and several functions/scripts. A pattern, not a helper: each loop body differs. Leave.

---------------------------------------------------------------------------------------------------------------------

## D. Decomposition plans for files over about 500 lines

No file is over 500 lines. The only one at the threshold is backend/admin/exportFoodLogsTable.js (499 lines in the
partition listing; `wc -l` gives 498, the last being a blank line).

Recommendation: do NOT split it. It is a single-purpose, read-only CLI that is meant to be run as one file, it cannot
be executed here to confirm a split, and nothing else would import the extracted pieces.

If the owner nevertheless wants it split, the seam is clean (all candidates are pure functions without closures or
module state):

- New `backend/admin/lib/foodLogRows.js` (CJS), moved verbatim: `safeNumber` 125-128, `coercePortion` 130-142, `scaleMacros` 144-156, `parseMacrosFromDescription` 158-179, `ensureMacros` 181-198, `normalizeMeal` 200-210, `escapeMarkdown` 212-218, `toMillis` 220-237, `inferDayMillis` 239-243, `resolveTimestamp` 245-258, `formatNumber` 260-268, `formatQuantity` 270-278, `formatIso` 280-285, `normalizeEntry` 335-353, `buildTableRow` 355-375. Export only `normalizeEntry` and `buildTableRow` (the only two the remainder calls, at :435 and :444).
- Stays in exportFoodLogsTable.js: header 1-18, requires 20-23, constants 25-26, module state 28-29, `printUsage` 31-41, `parseArgs` 43-99, `ensureDb` 101-115, `normaliseHandle` 117-123 (or the C1 import), `getUserDescriptor` 287-333, `exportFoodLogs` 377-486, the IIFE 488-497.
- Blockers: none. `firestore`/`appInitialised` (28-29) are only touched by `ensureDb`. Extraction risk: low; value: low.

---------------------------------------------------------------------------------------------------------------------

## E. Latent bugs with minimal fixes

| # | File:line | Bug | Minimal fix | Confidence | Recommendation |
|---|---|---|---|---|---|
| E1 | scripts/bootstrap/purgeLegacyData.js:87-96 (`purgeSubcollections` 52-61) | `purgeSubcollections('usersPublic')` and `('usersPrivate')` run AFTER `purgeCollection` has deleted every parent document. `db.collection(parent).get()` (:54) then returns nothing, so no subcollection is ever purged and they are left orphaned. | Move lines 95-96 above line 87 (purge subcollections first). | High on the diagnosis | DO NOT APPLY without the owner: one-off, maximally destructive script that cannot be tested and has presumably already been run. Record as open question I4. |
| E2 | scripts/check-relative-imports.js:15 | The regex cannot cross newlines (`[^'"\n]+?`), so every multi-line `import { ... } from "..."` is skipped. Verified on App.js: 34 relative specifiers found instead of 35; the one missed is `./frontend/screens` (the screens barrel). The tool's stated purpose (:3-6, README.md:40-41) is to validate all reachable relative imports. The sibling tool already carries the multi-line form with a comment explaining it (find-unused-frontend.js:29-31). | Replace the regex literal on line 15 with the one on find-unused-frontend.js:31 (same three capture groups, so `parseImportSpecs` :29 is unchanged). | High | APPLY (read-only dev tool). Simulated effect today: the walk grows from 336 to 339 source files, `missing` stays empty, exit code stays 0. Record it as a fix. If the orchestrator considers any tool-output change out of scope, downgrade to an owner question. |
| E3 | scripts/bootstrap/seedAccounts.js:9 | The usage comment shows `--config docs/bootstrap/accounts.json` (space), but the parser only accepts `--config=<path>` (:18, :22-23); the documented command throws "Pass --config=path/to/accounts.json" (:26). | Change the comment on line 9 to `node scripts/bootstrap/seedAccounts.js --config=docs/bootstrap/accounts.json`. | High | APPLY (comment only). |
| E4 | scripts/backfillRanks.js:122-127 | `Promise.allSettled` results are discarded, so `updated` is incremented even if all three writes were rejected, and failures are silent. Also, merge-`set` on `usersPrivate/{id}` and `users/{id}` CREATES those documents when they do not exist. | None that is unambiguous. | Medium that it is unintended | Do not change. Open question I6. |
| E5 | backend/admin/changeHandle.js:26, changeName.js:27 | The "app already exists" substring does not occur in any firebase-admin 13.5.0 message (they read `A Firebase app named "..." already exists with a different configuration.`; node_modules/firebase-admin/lib/app/lifecycle.js:54, :69). verifyUser.js:26 and exportFoodLogsTable.js:107 test "already exists", which does match. | None needed: `initializeApp()` is called once per process (guarded by the flag) and a second no-argument call is idempotent in v13, so the catch never runs. | High | No change. Reason not to unify the four `ensureDb` copies (C3). |
| E6 | scripts/scale-fontsize-codemod.js:213 | `/scale|rs|ss|vs|ms/` is unanchored, so it matches any callee whose name merely CONTAINS one of those letter pairs (for example `parseFloat` and `parseInt` contain "rs"). `fontSize: parseFloat(x)` would be rewritten to `fontSize: scaleSize(x)`. | Anchor the names (`/^(scaledSize|rs|ss|vs|ms)$/`), but intent is not fully clear. | High that it over-matches | Do not fix, do not run. One-off codemod; I3. |
| E7 | scripts/scale-fontsize-codemod.js:48-68 | `hasTopLevelBinding` does not count imported names (the three import visitors at :63-65 do nothing), so `chooseIdentifier` (:118-125) can pick `scaleSize` in a file that already imports a different `scaleSize`, producing a duplicate binding. The sibling `hasTopBinding` checks import locals (scale-style-magic-numbers-codemod.js:70-71). | Port the two checks. | Medium | Do not fix. One-off codemod; I3. |
| E8 | scripts/removeWhiteExerciseBackgrounds.js:3 | `require('pngjs')`: not in package.json. It resolves only because `parse-png`/`pixelmatch` pull in pngjs 3.4.0 transitively; a dependency update can break the script. | Declaring the dependency (forbidden by rule 5). | High | No change possible here. I3/I7. |
| E9 | scripts/check-relative-imports.js:15 and scripts/find-unused-frontend.js:31 | Neither regex matches bare side-effect imports (`import './x';`). The only one in the app today is App.js:6 `import './frontend/polyfills/base64'`. A missing side-effect import is not reported, and a file imported only for side effects under components/ or screens/ would be listed as unreachable (none today: the polyfill is outside the reported folders). | Would need a fourth alternative and a change to the capture-group handling in both files. Not minimal. | High on the gap | Do not fix. Open question I8. |
| E10 | backend/admin/recomputeAllHexagonStats.js:213 | `formatDuration` can print "1m 60s" (remainder >= 59.5 is rounded by `toFixed(0)`). Cosmetic log text. | None worth making. | High | No change. |
| E11 | backend/admin/changeHandle.js:86-88 | `--help` prints the usage with `console.error` and exits 0; deleteUserAccount.js:56 and verifyUser.js:125 use `console.log`. Cosmetic. | None. | High | No change. |
| E12 | backend/admin/changeHandle.js:270 | The line is indented 8 spaces inside a 4-space block. Cosmetic only. | Re-indent. | High | Leave (rule 6: the line is not otherwise changed). |

Not bugs, checked and cleared:
- `IMPORT_RE` is a module-level regex with the `g` flag reused across files (check-relative-imports.js:15/:28, find-unused-frontend.js:31/:60). Safe: each loop runs `exec` until it returns null, which resets `lastIndex`.
- changeName.js writes the new name (:261) BEFORE spawning the propagation script (:264). That works because the explicit old name is passed as the third argument and `buildOldNamesSet` pushes it first (functions/shared/namePropagation.js:553), so `oldNames[0]` is the old name.
- exportFoodLogsTable.js:336 turns a fractional string quantity such as "1/2" into 1. The app does the same (frontend/utils/loggedFoods.js:45), so the export is consistent with what users see.
- `node --check` passes for the two ESM-syntax `.js` files in the typeless root package; both Node 20.20.2 and the default Node 26 load them through module-syntax detection (verified with a scratch file; Node prints a MODULE_TYPELESS_PACKAGE_JSON warning).

---------------------------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

React-specific items (hook order, components defined during render, effect cleanup) do not apply: there is no React
code in this partition.

| # | Issue | Location | Risk of fixing | Recommendation |
|---|---|---|---|---|
| F1 | Unused variable flagged by the linter (`willNeedImport`), plus the dead `hasNamedTS` | scripts/scale-fontsize-codemod.js:157, 197, 206, 214, 222; :73, :80, :86 | None (pure deletions of write-only variables) | APPLY (B1, B2 #1). Makes the partition lint-clean apart from the 14 resolver false positives. |
| F2 | File URL built by string concatenation: `` `file://${modulePath}` `` | scripts/backfillRanks.js:54 | Very low. `pathToFileURL(modulePath).href` gives the identical URL for the current path and also survives spaces, `#`, `%`. The other two dynamic loaders already do this (deleteUserAccount.js:18-22, recomputeAllHexagonStats.js:22, :131-133). | OPTIONAL: add `const { pathToFileURL } = require('url');` and use it. Not testable here; skip unless the file is being edited. |
| F3 | Mixed module systems in one folder: six CJS scripts with `"use strict"` and two ESM-syntax `.js` files relying on Node's syntax detection | backend/admin/resetLeaderboardLastRanks.js:1-2, simulateLeaderboardLastRanksRefresh.js:1-2 | High if touched: converting requires renames (`.mjs`) or rewriting imports, and neither can be run. | Leave. See H2. |
| F4 | Redundant shallow copy with a misplaced comment | scripts/backfillRanks.js:117-120 | None | OPTIONAL (B2 #4). |
| F5 | Wrapper that only forwards | scripts/scale-style-magic-numbers-codemod.js:139-142 | None | OPTIONAL (B2 #5). |
| F6 | Collection names sometimes via constant, sometimes literal | backend/admin/changeName.js:16 vs :112, :219, :224; verifyUser.js is consistent | None, but pure churn | Leave. |
| F7 | Admin CLIs have no `require.main === module` guard and run `main()` at load, so they cannot be loaded for a static/unit check without executing | all eight backend/admin files, scripts/backfillRanks.js:140, purgeLegacyData.js:103, seedAccounts.js:122, removeWhiteExerciseBackgrounds.js:57 | Low, but changes how the files behave when required | Leave. Consequence for the implementer: never `require`/`import` these files to "smoke test" them. |
| F8 | Analyzers read binary assets as UTF-8 text: a resolved `require('./x.png')` is pushed onto the walk (check-relative-imports.js:40-42, :86) and regex-scanned. `reachableFileCount` is therefore 606 of which only 336 are source files. | scripts/check-relative-imports.js:73-86; find-unused-frontend.js:63-64 (adds assets as graph nodes) | Low, but changes the printed counts | Leave. Mention to the owner (I8). |
| F9 | Stale lint directive | scripts/bootstrap/seedAccounts.js:116 | None | OPTIONAL (B2 #22). |
| F10 | Success paths end differently: explicit `process.exit(0)` (exportFoodLogsTable.js:492, simulate...:342) vs falling off the end (changeHandle, changeName, verifyUser, deleteUserAccount, recompute, reset) | as listed | Changing it alters when the process exits relative to pending gRPC handles | Leave. |
| F11 | Header comment contradicts the code ("Targets StyleSheet.create({...}) objects" while every object literal is transformed) | scripts/scale-style-magic-numbers-codemod.js:4 vs :182-187 | None (comment) | Leave; covered by I3/I5. |
| F12 | Import grouping: node built-ins required after third-party modules | scripts/bootstrap/purgeLegacyData.js:7-12 | None, pure churn | Leave (rule 6). |

Net recommended edits for this partition, in order:
1. scripts/scale-fontsize-codemod.js: remove `willNeedImport` (5 lines) and `hasNamedTS` (2 lines + 1 edited). APPLY.
2. scripts/bootstrap/seedAccounts.js:9: fix the usage comment. APPLY.
3. scripts/check-relative-imports.js:15: adopt the multi-line regex. APPLY (or owner question, see E2).
4. OPTIONAL: C1 extraction of `stripAt`/`normaliseHandle`/`buildSearchTokens` into `backend/admin/lib/handleUtils.js`.
5. OPTIONAL trivia: B2 #4, #5, #22; F2.
Everything else: leave untouched.

Verification available without running anything: `SPX/tools/lint.sh backend/admin scripts tests`, `node --check <file>`
for each edited file (use Node 20), `node tests/feedRanking.test.js`, and `node SPX/tools/changes.cjs backend/admin scripts tests`.

---------------------------------------------------------------------------------------------------------------------

## G. Cross-partition requests

These are constraints on files OUTSIDE the partition. All of them are string-based or dynamic uses that knip and the
import graph cannot see, so the owning partitions may otherwise believe an export or a file is unused.

| # | Target file(s) | Request |
|---|---|---|
| G1 | frontend/helper/feedRanking.js | Keep it CommonJS (`module.exports = {...}` at :225-231) and keep the names `scoreFeedCandidate`, `mixRankedFeeds`, `extractPostTopics`, `buildViewerTopicVector`: tests/feedRanking.test.js:2-7 loads it with `require()` under plain node, and the gate runs that test. Do not convert it to `export` syntax and do not add React Native imports to it. (`toMillisSafe` in that export list is used by neither the test nor frontend/screens/feed/hooks/usePersonalizedFeed.js:6-11; dropping it from the export object is fine, it is still used inside the file at :78.) |
| G2 | shared/rankProgress.js, shared/rankLevelTasks.js | scripts/backfillRanks.js:53-58 loads `shared/rankProgress.js` by path with a dynamic `import()` and requires the named export `computeRankProgressFromData`. Keep the path, the export, explicit `.js` extensions on its relative imports (rankProgress.js:1), and keep it free of React Native/Expo imports so plain Node can load it. |
| G3 | functions/shared/deleteUserAndContent.js | backend/admin/deleteUserAccount.js:20-22, :144-147 dynamically imports it and requires the named exports `findUserByHandle` (:65) and `deleteUserAndContentByHandle` (:1117). Keep both exported under these names. Note the module initialises the Admin SDK at import (:14-21); that timing is relied on. |
| G4 | functions/shared/rebuildHexagonStats.js | backend/admin/recomputeAllHexagonStats.js:131-139 dynamically imports it and requires `computeHexagonFromUserData` (:330) as a named export or on the default export (:360). Keep it. |
| G5 | functions/scripts/switchUserHandle.js, functions/scripts/switchUserName.js | Spawned by path as child processes from backend/admin/changeHandle.js:171-176 and changeName.js:178-185. Keep the file paths, the positional argv contract (`<oldHandle> <newHandle>`; `<uidOrHandle> <newName> [oldName]`) and exit code 0 on success / non-zero on failure. They look unreferenced to static tools. |
| G6 | functions/scripts/simulateLeaderboardLastRanksRefresh.js, functions/scripts/recomputeAllHexagonStats.js | Each has a twin in backend/admin (C7, C9). Do not "sync" them in either direction: the simulate twins differ on purpose or by accident in tie handling (owner question I1), and the recompute twins differ in CLI surface. |
| G7 | functions/index.js | For information: `computeGlobalRanks` (:2962-2982) is called at :3126 and :3139 and its result stored in the maps, but `.ranks` is never read anywhere (same in both simulate scripts). It is dead computation in the scheduled function. Also duplicated there: `toUid` :2723, `safeNumber` :2733, `ensureMembersInValueMap` :2690, `buildEntriesForMembers` :2698, `buildSearchTokens` :88. backend/admin copies must stay as they are whatever the functions partition decides. |
| G8 | whichever partition owns backend/workouts/updateCompletedWorkout.js, deleteCompletedWorkout.js, frontend/logic/useWorkoutManager.js, shared/rankProgress.js | If a canonical "rank fields from progress" builder is added to shared/rankProgress.js (C13), tell this partition: scripts/backfillRanks.js:61-77 could reuse it through its existing dynamic import. Not required. |
| G9 | SPX/tools/eslintrc.cjs (orchestrator, not the repo) | The override at :66 that disables `import/no-unresolved` should also cover `backend/admin/**/*.js`; otherwise the 14 `firebase-admin/*` false positives stay in every gate run. |
| G10 | frontend/helper/scaleSize.js, `exercises copy/*/large.png`, frontend/components/5_Profile/MakePost/ | Hard-coded in scripts by string: scale-fontsize-codemod.js:18-19, scale-style-magic-numbers-codemod.js:16-17, removeWhiteExerciseBackgrounds.js:7-16, find-unused-frontend.js:108. No action needed as long as nothing is moved or renamed (rule 8). |
| G11 | frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js | Line 61 is a commented-out import of the DEAD file `./components/WorkoutReminderModal` (its JSX use at :1729-1734 is commented out too). The owner's `npm run audit:imports` does not strip comments, so after the DEAD file is deleted it would report this as a missing import and exit 1 (simulated). The workout-active audit already lists this commented-out block for removal under rule 7; make sure line 61 goes with it. |

---------------------------------------------------------------------------------------------------------------------

## H. Fragile areas

1. Nothing here can be executed. Every backend/admin script and scripts/backfillRanks.js, scripts/bootstrap/* writes to
   (or deletes from) the production project by default (`spartan-8a55f`, scripts/backfillRanks.js:20,
   purgeLegacyData.js:14, seedAccounts.js:17). scripts/removeWhiteExerciseBackgrounds.js and both codemods overwrite
   project files in place. None has a load guard except the four in scripts/ noted in A, so even `require()`-ing a
   file to test it runs it (F7). Static checks only.
2. Module format is load-bearing. backend/admin/resetLeaderboardLastRanks.js and simulateLeaderboardLastRanksRefresh.js
   are ESM-syntax `.js` files in a package without `"type"`; they run only because Node detects module syntax. Adding a
   `require(...)`, a `"use strict"` prologue plus CommonJS code, or a package.json nearby would break them. The other
   six admin files are CommonJS and cannot statically import anything from functions/, shared/ or frontend/.
3. String-based links to other code (invisible to tools): the dynamic imports and child-process spawns listed in
   section A, column "Reaches out to". Paths are built from `__dirname` (changeHandle.js:171, changeName.js:178,
   deleteUserAccount.js:21, recomputeAllHexagonStats.js:132, backfillRanks.js:53); moving a script breaks them.
4. Firestore paths and field shapes are the scripts' whole purpose and fall under hard rule 1: `usersPublic`, `users`,
   `usersPrivate`, `userHandles/{lower}`, `userSearchIndex/{uid}`, `leaderboardSnapshots/{iso}`,
   `leaderboardMeta/currentSnapshot`, `lastRanks`/`lastRanksVersion: 4`/`lastRanksUpdatedAt`, `statsHexagon*`,
   `isVerified`/`verified`/`verifiedAt`, `currentRank`/`rankTier`/`rankLabel`/`rankLevel`. Do not rename, reorder
   writes, or change merge options.
5. Order of operations in the multi-step CLIs: changeHandle.js:259-272 (availability check, spawn propagation, registry
   transaction, search index) and changeName.js:261-266 (write name, spawn propagation with the explicit old name,
   search index). The changeName order matters (see "cleared" note under E).
6. deleteUserAccount.js confirmation flow (:95-113, :185-191) and its defensive checks (B2 #12, #13): leave exactly
   as written.
7. CLI output text, usage strings and exit codes are the operator's interface. Do not reword messages, do not turn
   `console.log` into something else, do not change `process.exit` placement (F10).
8. backend/admin/simulateLeaderboardLastRanksRefresh.js is intentionally (or accidentally) line-for-line parallel to the
   Cloud Function body; "cleaning" it (for example removing the dead `computeGlobalRanks`) makes future comparison with
   functions/index.js harder. Leave it.
9. The two recast codemods must never be run as part of the refactor: they rewrite every file under frontend/ and have
   known over-matching (E6, E7, B2 #9). Do not "fix" their matching logic either.
10. The regex analyzers (check-relative-imports, find-unused-frontend) do not strip comments, so commented-out imports
    count as edges. Simulated read-only with both regexes: all 16 PARKED files are "reachable" for these tools through
    the commented import at frontend/screens/2_Competition.js:26 (which must stay), and today there are 0 missing
    imports. The only other commented relative import in the app is
    frontend/components/3_Workout/NewWorkout/ActiveWorkoutModal.js:61, which points at the DEAD file
    `components/WorkoutReminderModal.js`: once that DEAD file is deleted, `npm run audit:imports` would report it as a
    missing import and exit 1 unless the commented line is removed first (see G11).
11. tests/feedRanking.test.js is the only test and part of the gate. It depends on the scoring constants inside
    frontend/helper/feedRanking.js (`scoreSuggested > scoreFollowing - 2`, :46) and on the following-first ordering of
    `mixRankedFeeds` (:56). Any change to that helper in another partition must re-run it.
12. `IMPORT_RE` objects are stateful (`g` flag). If either analyzer is edited, keep the "exec until null" loops intact.

---------------------------------------------------------------------------------------------------------------------

## I. Open questions for the owner

1. Two "simulate last ranks refresh" scripts exist: backend/admin/simulateLeaderboardLastRanksRefresh.js gives tied
   users distinct sequential ranks; functions/scripts/simulateLeaderboardLastRanksRefresh.js (and the scheduled Cloud
   Function) give tied users the same rank. Both were touched in the same commit (46b87b51). Is the admin copy's
   behaviour intended? Which file should be deleted? (Both maintain data for the parked Compete tab.)
2. functions/scripts/recomputeAllHexagonStats.js is a strict subset of backend/admin/recomputeAllHexagonStats.js. Can
   the functions copy be deleted?
3. One-off tools that have already been applied and are referenced by nothing: scripts/scale-fontsize-codemod.js,
   scripts/scale-style-magic-numbers-codemod.js (both 2025-09-15, both with known over-matching),
   scripts/removeWhiteExerciseBackgrounds.js (ten hard-coded files, undeclared `pngjs` dependency). May they be
   deleted? If the codemods go, the devDependencies `recast` and `@babel/parser` have no remaining user in the repo
   (package.json is not touched by the refactor).
4. scripts/bootstrap/purgeLegacyData.js wipes eight collections, two Storage prefixes and every Auth user, and defaults
   to the production project id. It also has the ordering bug E1 (subcollections are never purged). Should it still
   exist after the relaunch? If it stays, should E1 be fixed?
5. scripts/scale-style-magic-numbers-codemod.js transforms every object literal in every frontend file, not only
   StyleSheet.create/JSX style objects as its header says. Only relevant if the codemods are kept.
6. scripts/backfillRanks.js: (a) it reads `completedWorkouts` from `usersPublic`, while the hexagon recompute scripts
   read them from `users`: is the public mirror guaranteed to carry the full workout list? (b) write failures are
   swallowed by `Promise.allSettled` and still counted as "updated"; (c) merge-set creates `usersPrivate/{id}` and
   `users/{id}` documents that do not exist. Intended?
7. `firebase-admin` is not a declared dependency of the root package (it is installed only as a peer of
   `firebase-functions`), yet every backend/admin and scripts/ operator script requires it; `pngjs` is only transitive.
   Should they be declared (outside this refactor)?
8. The two audit tools ignore bare side-effect imports and count binary assets as "files" (E9, F8). With E2 applied
   they agree on the reachable set; is more accuracy wanted, or will the owner rely on a real tool (knip/ESLint)?
   Also: find-unused-frontend.js:107-108 hides everything under `frontend/components/5_Profile/MakePost/` and reports
   only `frontend/components` and `frontend/screens` (not hooks/helper/utils/logic). Still wanted?
9. backend/admin/verifyUser.js: `loadUserState` returns `legacyExists` (:276) but nobody reads it, and
   `applyVerification` (:285-288) always merge-writes `users/{uid}`, creating the legacy document (with uid, handle,
   name, photo from `buildLegacyPayload`) when it does not exist. Was the flag meant to skip that write?
10. backend/admin/changeName.js has no `--help` (it falls into the usage error, exit 1), and changeHandle.js prints
    help on stderr. Cosmetic; align or leave?
11. backend/admin/exportFoodLogsTable.js fetches each user's display name (including an extra read of the legacy
    `users` document) but the table has no name column. Was a "Name" column intended, or can the lookup go?
12. scripts/bootstrap/seedAccounts.js overwrites `createdAt` with "now" on every re-run (:91, merge-set at :106) and
    sets `lastLoginAt` likewise (:102). Intended for an idempotent seed?
13. README.md:37-47 tells contributors to run `npm run audit:imports` and `npm run audit:unused:frontend` around
    refactors. During this refactor those are replaced by SPX tools (rule 10 forbids running scripts/); both are
    read-only by inspection (only `fs.readFileSync`/`readdirSync`/`existsSync`/`statSync` and one `console.log`), so
    the owner can run them afterwards. Expect find-unused-frontend to stop listing the DEAD files that live under
    frontend/components and frontend/screens once they are deleted; it never lists the 16 PARKED files (H10).
