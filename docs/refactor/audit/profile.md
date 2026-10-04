# Audit: partition "profile" (25 files, 5067 lines)

All 25 files were read completely. Baseline and working tree are identical for every file of the partition (`diff -q` against `SPX/baseline`), so line numbers below are valid for both.

Abbreviations
- `EP/` = `frontend/components/5_Profile/EditProfile/`
- `PT/` = `frontend/components/5_Profile/ProfileTop/`
- `PB/` = `frontend/components/5_Profile/ProfileBottom/`
- `VP/` = `frontend/components/ViewProfile/`
- `S/`  = `frontend/screens/`
- VPS = `S/4.1_ViewProfile.js`, PRO = `S/5_Profile.js`, PWP = `S/ProfileWorkoutsAndPostsScreen.js`
- FWVS = `frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js` (partition feed-post)
- US detail = `frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js` (partition user-stats), FEED = `S/1_Feed.js`

Indentation: 4 spaces everywhere except `VP/ViewProfileOptionsSheet.js`, `S/ChangeName.js`, `S/ChangeUsername.js`, `S/DeleteAccount.js`, `S/PrivacyPolicy.js`, `S/PrivateProfileInfo.js`, `S/Settings.js`, `S/TermsOfService.js` (2 spaces). Keep each file's own.

Headline findings
1. **VPS crashes for a viewer who was blocked by the profile owner**: two `useMemo` calls sit after an early return (VPS:333-350 vs 360, 366). See E1. Unambiguous fix.
2. **The workout-viewer bottom sheet mounted on both profile screens can never open**: the only functions that set its state (`openViewer` VPS:152, `openWorkoutViewer` PRO:47) are unused. FWVS has no other caller, so it is inert app-wide. See B1/B2, G1, I2.
3. **PWP carries about 105 lines of dead helpers** (a retired "synthetic workout post" builder) and uses `canViewContent` 95 lines before it is declared (E2).
4. **Settings carries a retired units/push toggle** (state, effect, writer, `Row` component, styles): about 55 lines. The `useUserDoc()` call there must stay: it is one of only two callers of a hook with global side effects (H2).
5. **`DeleteAccount` is a registered route nobody navigates to**; Settings has its own copy of the flow (C8, I1).

---

## A. Module map

| File (lines) | Purpose | Exports | Importers |
|---|---|---|---|
| `EP/EditProfileBottomSheet.js` (52) | gorhom BottomSheet (94%) hosting the edit-profile form; expands when `isVisible` turns true | default `React.memo(EditProfileBottomSheet)` props `{isVisible, setIsVisible, setPFP}` | PRO:7 (use PRO:186-190) |
| `EP/EditProfileModal.js` (240) | Edit-profile form: avatar picker, read-only username/name with "Change" links (navigate `ChangeUsername` / `ChangeName`), editable bio (saved on blur to `usersPublic/{uid}.bio`), read-only email/phone/password | default `React.memo(EditProfileModal)` props `{setPFP}` | `EP/EditProfileBottomSheet.js:4` |
| `EP/ProfilePicture.js` (72) | Tappable avatar with camera badge; runs `pickAndUploadProfilePhoto` | default `ProfilePicture` props `{imageUri, setPFP}` | `EP/EditProfileModal.js:3` |
| `PB/ProfileContentCards.js` (234) | "Workouts & Posts" / "Logged Food Items" cards, or the "This account is private" panel | default `ProfileContentCards` | PRO:11 (use PRO:164-182), VPS:4 (use VPS:404-431) |
| `PT/ProfileHeader.js` (129) | Own-profile header: settings icon, verified handle, rank emblem | default `ProfileHeader` props `{userData, onPressSettings}` | PRO:3 |
| `PT/ProfileIdentity.js` (71) | Shared identity block (followers / avatar / following / bio slot) | default `ProfileIdentity`; named `PROFILE_AVATAR_SIZE` | `PT/ProfileInfo.js:9`, `VP/ViewProfileInfo.js:7` |
| `PT/ProfileInfo.js` (132) | Own-profile avatar + bio, rendered through `ProfileIdentity` | default `ProfileInfo` | PRO:4 |
| `PT/ProfileRankBadge.js` (22) | Rank emblem sized for the profile headers | default `ProfileRankBadge` props `{user, size, style}` | `PT/ProfileHeader.js:11`, `VP/ViewProfileHeader.js:11`. Imports `RANK_TIER_THEMES` from `frontend/components/1_Feed/FeedSnapshotCard.js` (feed-cards) and `RankBadgeEmblem`, `resolveLevelStage` from `2_Competition` (ladder-and-weight) |
| `PT/ProfileRowButtons.js` (55) | "Edit Profile" / "View Stats" buttons | default `ProfileRowButtons` props `{handleEditProfile, handleOpenViewStats}` | PRO:5 |
| `PT/WorkoutStats.js` (95) | Three stat tiles (workouts, hours, lbs lifted with k/m/b abbreviation) | default `WorkoutStats` props `{userData}` | PRO:6, VPS:10 |
| `VP/ViewProfileHeader.js` (125) | Other-user header: back, handle (opens options), rank emblem, message icon | default `ViewProfileHeader` props `{handle, goBack, toMessages, onOpenOptions, isVerified, user}` | VPS:8 |
| `VP/ViewProfileInfo.js` (79) | Other-user avatar + bio through `ProfileIdentity` | default `ViewProfileInfo` props `{userData, onPressFollowers, onPressFollowing}` | VPS:7 |
| `VP/ViewProfileOptionsSheet.js` (126) | Options sheet (report / block or unblock / cancel) | default `React.memo(ViewProfileOptionsSheet)` | VPS:17 |
| `VP/ViewProfileRowButtons.js` (250) | Follow / Requested / Following / Blocked button with optimistic `global.userData` update, plus "View Stats" | default `ViewProfileRowButtons` props `{handleOpenViewStats, user, isBlocked, onBlockedPress}` | VPS:5 |
| `S/4.1_ViewProfile.js` (569) | Route `ViewProfile`: loads `usersPublic` (and `usersPrivate` for self), block gate, follow list, DM find-or-create, report/block/unblock | default `ViewProfile` | `S/index.js:17` -> `App.js:53`, `App.js:1612`. Navigated to from FEED:1094-1108, `S/PastWorkoutScreen.js:676-678`, `S/SearchUsers.js:203-204`, `S/1.2_Chat.js:200-201`, `frontend/components/FollowListBottomSheet.js:88-89`, `1_Feed/FeedHeader.js:303`, `1_Feed/Comments/CommentCard.js:84`, FWVS:261-262, `1_Feed/Notifications/NotificationsModal.js:200-205`, US detail:528-716, `4_Explore/SearchBarComponent.js:94-95`, `UserStats/UserStatsBottomSheet.js:103-104`, PWP:918-937. Route param read: `user` |
| `S/5_Profile.js` (234) | Route `Profile` (own profile) | default `Profile` | `S/index.js:18` -> `App.js:47`, `App.js:1573` |
| `S/ChangeName.js` (250) | Route `ChangeName`: form calling `updateUserName` | default `ChangeName` | `S/index.js:10` -> `App.js:44`, `App.js:1482`; navigated from `EP/EditProfileModal.js:75` (param `initialName`) |
| `S/ChangeUsername.js` (242) | Route `ChangeUsername`: form calling `updateUserHandle` | default `ChangeUsername` | `S/index.js:9` -> `App.js:43`, `App.js:1481`; navigated from `EP/EditProfileModal.js:69` (param `initialHandle`) |
| `S/Credits.js` (63) | Route `Credits`: static text | default `Credits` | `S/index.js:30` -> `App.js:63`, `App.js:1623`; from `S/Settings.js:202` |
| `S/DeleteAccount.js` (128) | Route `DeleteAccount`: explanation + delete button (callable `deleteOwnAccount`, then logout) | default `DeleteAccount` | `S/index.js:32` -> `App.js:65`, `App.js:1625`. **No `navigate('DeleteAccount')` anywhere** (see I1) |
| `S/PrivacyPolicy.js` (131) | Route `PrivacyPolicy`: static legal text | default `PrivacyPolicy` | `S/index.js:28` -> `App.js:61`, `App.js:1621`; from `S/0.0_SignUp.js:101`, `S/Settings.js:198` |
| `S/PrivateProfileInfo.js` (110) | Route `PrivateProfileInfo`: private-account switch; writes `usersPrivate.settings.profilePrivate` + `usersPublic.isPrivate`, auto-approves pending requests when switched off | default `PrivateProfileInfo` | `S/index.js:31` -> `App.js:64`, `App.js:1624`; from `S/Settings.js:173` |
| `S/ProfileWorkoutsAndPostsScreen.js` (1278) | Route `ProfileWorkoutsAndPosts`: "Workouts" / "All Posts" lists of `SimpleFeedPost` for one user, with comments sheet, likes sheet, edit flows | default `ProfileWorkoutsAndPostsScreen` | `S/index.js:33` -> `App.js:66`, `App.js:1574`; navigated from PRO:166, VPS:409. Params read: `targetUid`, `isViewingSelf`, `initialUser`, `initialTab` (the last one is never sent, B5) |
| `S/Settings.js` (261) | Route `Settings`: links (private profile, delete account, support mail, ToS, privacy, credits), logout | default `Settings` | `S/index.js:27` -> `App.js:60`, `App.js:1620`; from PRO:143-145 |
| `S/TermsOfService.js` (119) | Route `TermsOfService`: static legal text | default `TermsOfService` | `S/index.js:29` -> `App.js:62`, `App.js:1622`; from `S/0.0_SignUp.js:97`, `S/Settings.js:194` |

No PARKED file and nothing under `functions/`, `scripts/`, `tests/`, `backend/` imports any file of this partition (grep for `5_Profile/(EditProfile|ProfileTop|ProfileBottom)`, `ViewProfile/`, and the screen names). knip reports no unused export, and that is correct: every file exports only what is imported (`PROFILE_AVATAR_SIZE` is used by `PT/ProfileInfo.js:16` and `VP/ViewProfileInfo.js:13`).

---

## B. Verified dead code

Nothing here is used by a PARKED file, so there is no KEEP entry.

### B1. `S/4.1_ViewProfile.js`
| # | Identifier | Kind | Lines | Evidence |
|---|---|---|---|---|
| 1 | `openViewer` | unused callback | VPS:152-167 | Only occurrence of the name in the repo. ESLint no-unused-vars. |
| 2 | `viewerWorkout` / `setViewerWorkout`, `viewerToggle` / `setViewerToggle` | state that can never change | VPS:112-113 | Setters are called only inside `openViewer` (VPS:153, 165, 166). So `viewerWorkout` is always `null`, `viewerToggle` always `false`. |
| 3 | `closeViewer` | no-op callback | VPS:168-170 | Body is a comment; only passed as `onClose` at VPS:450. FWVS's `areEqual` ignores `onClose` anyway. |
| 4 | `<FeedWorkoutViewerSheet .../>` + its import | inert element | VPS:444-451, VPS:14 | With `workout={null}` FWVS computes `items = []` (FWVS:48-65), never calls `expand()` (FWVS:67-74) and renders only a closed sheet inside a `pointerEvents="box-none"` wrapper (FWVS:200-215). Nothing visible, no touch capture. Removal of 1-4 together is behaviour-preserving for the user; it makes FWVS unreferenced (see G1, I2). Minimum safe step if the coordinator does not want the cascade: remove only #1. |
| 5 | fallback inside `safeNormalize` | unreachable branch | VPS:241-248 | `normalizeUserRef(raw)` returns `null` only when `coerceUid(raw)` is `''` (`frontend/utils/userRefs.js:35-37`); the next statement recomputes `coerceUid(raw)` and returns `null` for `''` (VPS:241-242). Lines 243-248 can never run, so `safeNormalize` === `normalizeUserRef`. Replace the two calls (VPS:251, 252) with `normalizeUserRef(...)` and delete VPS:238-249. |
| 6 | `// navigation.navigate('Explore');` | commented-out code | VPS:301 | Delete. (`async` on `goBack`, VPS:300, is unnecessary but harmless; leave.) |
| 7 | `theyBlockedMe` | condition that is always false for other users | VPS:200-201 | `privateData` is `null` unless `isViewingSelf` (VPS:186-188), so `Boolean(privateData && ...)` is false except when a user views their own profile through this route and has blocked themselves. Not unambiguous enough to delete: see I10. Leave. |

### B2. `S/5_Profile.js`
| # | Identifier | Kind | Lines | Evidence |
|---|---|---|---|---|
| 1 | `openWorkoutViewer` | unused callback | PRO:47-66 | Only occurrence in the repo. ESLint. |
| 2 | `profileSelectedWorkout`, `profileWorkoutExpandToggle` (+ setters), comment PRO:38 | state that can never change | PRO:38-40 | Setters only inside `openWorkoutViewer` (PRO:48, 64, 65). |
| 3 | `closeWorkoutViewer` | no-op callback | PRO:67-70 | Only passed as `onClose` (PRO:207). |
| 4 | `<FeedWorkoutViewerSheet .../>` + import + comment | inert element | PRO:201-208, PRO:9 | Same reasoning as B1#4. |
| 5 | `handleDirectPfpEdit` | callback passed to a prop the child does not accept | PRO:99-115, PRO:153 | Passed as `onPressEditPfp`, but `PT/ProfileInfo.js:22-33` destructures no such prop and has no rest spread. `onPressEditPfp` appears nowhere else in the repo. |
| 6 | `isPickingPfpRef` and its guard | ref that is always `false` | PRO:34, PRO:42 | Only written inside `handleDirectPfpEdit` (PRO:101, 113). After #5 the guard `if (isPickingPfpRef.current) return;` never fires; delete both lines. |
| 7 | `import pickAndUploadProfilePhoto` | import only used by #5 | PRO:17 | Becomes unused after #5. |
| 8 | `lastOpenSigRef`, `global.profileOpenSelectPhotosSignal` branch, its comment | branch that can never run | PRO:72-73, PRO:78-82 | `profileOpenSelectPhotosSignal` is read here and written nowhere (`grep -rn profileOpenSelectPhotosSignal` over the whole repo minus node_modules: 1 hit, PRO:78). `sig` is always 0. Keep PRO:76-77 (`clearFooterSuppression()`, `setLoggedFoodsCount(...)`). See I8. |
| 9 | `useRef` import | unused after #6 and #8 | PRO:1 | `React.useRef` at PRO:73 goes with #8. |

### B3. `S/ProfileWorkoutsAndPostsScreen.js`
| # | Identifier | Kind | Lines | Evidence |
|---|---|---|---|---|
| 1 | `buildFeedPostData` | unused function | PWP:148-178 | Defined, never called (in-file grep: line 148 only). ESLint. |
| 2 | `buildWorkoutPid` | only called from #1 | PWP:55-60 | Uses: PWP:160. |
| 3 | `bestTimestamp` | only called from #1 and #2 | PWP:47-53 | Uses: PWP:58, 157. |
| 4 | `toNumber` | only called from #1 | PWP:62-65 | Uses: PWP:170, 172. |
| 5 | `resolveWorkoutCreatedAt` | unused function | PWP:138-146 | ESLint. (The user-stats audit C2 calls this copy "live"; it is not. Both copies are dead.) |
| 6 | `toMillis` | only called from #3 and #5 | PWP:39-45 | Uses: PWP:48-52, 142. (PWP:200-201 is the Timestamp method `value.toMillis()`, not this helper.) |
| 7 | `mergeMediaSources` | unused function | PWP:108-121 | ESLint. |
| 8 | `normalizeMediaEntry` | only called from #7 | PWP:93-106 | Use: PWP:113. |
| 9 | `ensureHandle` | unused function | PWP:87-91 | ESLint. |
| 10 | `insets` + `useSafeAreaInsets` import | unused variable | PWP:286, PWP:15 | ESLint. `useSafeAreaInsets()` only subscribes to the inset context; removing it has no visible effect. |
| 11 | `_options = {}` parameter and the `opts` argument | unused parameter | PWP:721, PWP:953 | `_options` is never read; `renderPost` forwards `opts` only to this parameter. Change to `async (post) =>` and `(_, data) => handleEditPost(data || item)`. |
| 12 | tail of `findPostForWorkout` | redundant branch | PWP:589-592 | Both the inner `return null` and the following `return null` (PWP:593) return the same value. Delete PWP:589-592. |
| 13 | `handleSelectTab` | wrapper that only forwards | PWP:642-644 | `setSelectedTab` is already a stable function. Optional: use `setSelectedTab` at PWP:1023 and drop it from the deps at PWP:1037. Low value; skip if in doubt. |
| 14 | `try { shouldRefreshOnFocusRef.current = true; } catch { }` | pointless try/catch | PWP:715-717, PWP:812-814 | Assigning to a ref cannot throw. Optional: keep the assignment, drop the wrapper. |
| 15 | `highlightPid={null}`, `highlightSignal={0}` | props equal to "not passed" | PWP:946-947 | `SimpleFeedPost.js:254` (`if (!highlightPid) return false`) and `:265` (`if (!highlightSignal) return`) treat `null`/`0` like `undefined`. Optional removal. |
| 16 | `onPressShare={() => { }}` | prop whose handler can never fire | PWP:951 | Feed-post audit B1#14: SimpleFeedPost renders no share control. Remove here whether or not SimpleFeedPost drops the prop. |
| 17 | route param `initialTab` | param no caller sends | PWP:270-273 | The two navigations (PRO:166-170, VPS:409-413) send `targetUid`, `isViewingSelf`, `initialUser` only. Route params are a navigation contract (rule 1): leave the reader in place; listed for the owner (I9). |
| 18 | `postWrapper: {}` | empty style | PWP:1213-1214 (used PWP:942) | Keep the wrapping `View` (view hierarchy); the empty style may stay. No action. |

Removing #1-#9 deletes PWP:39-65, 87-121, 138-178 (about 105 lines). Survivors among the top-level helpers: `ensureAtHandle` (33-37), `sanitizeEntry` (67-74), `stringCandidates` (76-85), `extractWidFromWorkout` (123-129), `extractPidFromWorkout` (131-136), `sortPostsByCreated` (180-187), `getWorkoutTimestamp` (189-208), `sortWorkoutsByTimestamp` (210-213), `LockedView` (215-225).

### B4. `S/Settings.js`
| # | Identifier | Kind | Lines | Evidence |
|---|---|---|---|---|
| 1 | `unitsLbs`/`setUnitsLbs`, `pushEnabled`/`setPushEnabled` | state set but never read | 15-16 | Read only inside commented-out JSX (171, 183-184). ESLint. |
| 2 | hydration effect | effect that only feeds #1 | 41-49 | Sets only the two dead states. |
| 3 | `toggleUnits`, `togglePush` | unused callbacks | 71-74, 76-79 | ESLint. |
| 4 | `persistSetting` | only called from #3 | 54-69 | Uses: 73, 78. |
| 5 | `Row` | unused component | 218-228 | Referenced only in commented-out JSX. ESLint. |
| 6 | `styles.row`, `styles.rowLabel` | styles only used by #5 | 254-255 | Uses: 219-220. |
| 7 | commented-out JSX | commented-out code | 171, 183-184 | Delete. |
| 8 | stale notes | stale comments | 17, 47, 158, 186 | "Removed sound effects toggle", "sound toggle removed from UI", "Privacy section removed...". Delete. |
| 9 | imports | unused after the above | 1 (`useEffect`, `useState`), 2 (`Switch`, `Platform`), 3 (`ts`), 5 (`doc`, `updateDoc as fsUpdateDoc` -> whole line), 8 (`db`) | `ts` is unused today (ESLint); the others only serve #2-#5. |
| 10 | `const user =` binding | unused after #2 | 14 | **Keep the call** `useUserDoc(uid, { ignoreKeys: [] });` (H2). Only the binding becomes unused; add a one-line why-comment. |

### B5. Components
| # | File:line | Identifier | Kind | Evidence |
|---|---|---|---|---|
| 1 | `EP/EditProfileBottomSheet.js:2` | `StyleSheet` import | unused import | ESLint. |
| 2 | `EP/EditProfileBottomSheet.js:10-12`, `:38` | `handleSheetChanges` + `onChange={handleSheetChanges}` | tracing `console.log` | Only effect is the log. Remove both (also requested by messages-chat G-3). `useCallback` stays in use (14). |
| 3 | `PB/ProfileContentCards.js:14-19` | `formatWorkoutsCompleted` | duplicate of `formatCount(value, 'Workout')` | `formatCount` (7-12) yields `"1 Workout"` / `"N Workouts"` with the same count clamping; identical for every input. Replace the call at :32 and delete 14-19. |
| 4 | `PB/ProfileContentCards.js:29`, `:63`, `:82` | prop `showLoggedFoodsCard` | prop no caller passes | Callers PRO:164-182 and VPS:404-431 never pass it; it is always `true`. :63 always yields `styles.cardDivider`; the `&&` at :82 always renders. Remove the prop, use `styles.cardDivider` at :63, unwrap :82/:113. `styles.lastCard` stays (used at :87). |
| 5 | `PB/ProfileContentCards.js:156-157`, `:161-162`, `:165-166` | commented-out colours | commented-out code | Delete. `workoutsBadge` (160-163) and `loggedFoodsBadge` (164-167) are then empty objects; drop the keys and their uses at :67 and :92 (`style={styles.iconBadge}`), identical visual result. |
| 6 | `PB/ProfileContentCards.js:23` | default `onPressLoggedFoods = () => {}` | default never used | Both callers pass it. Harmless; optional. |
| 7 | `PT/ProfileHeader.js:54-56`, `:107-109` | commented-out chevron JSX, `styles.down_arrow_ctnr` | commented-out code + unused style | ESLint. The style is referenced only by the commented block. |
| 8 | `PT/ProfileInfo.js:27-28`, `:30-32` | props `isEditingBio`, `isSavingBio`, `onBioChange`, `onBioSubmit`, `focusBioSignal` | props no caller passes | The only caller (PRO:148-155) passes `userData, pfp, onPressFollowers, onPressFollowing, onPressEditPfp, bioValue`. Each name occurs only inside `PT/ProfileInfo.js` (repo grep). |
| 9 | `PT/ProfileInfo.js:43-50` | `bioInputRef` + focus effect | dead because of #8 | `isEditingBio` is always `false`, the effect always returns at :45. |
| 10 | `PT/ProfileInfo.js:66-81` | `<DismissableTextInput>` branch of `bio` | unreachable branch | Always the `<Text>` branch (:82). Result after cleanup: `const bio = (<Text ...>{bioText}</Text>);`. |
| 11 | `PT/ProfileInfo.js:118-127` | `styles.bio_input`, `styles.bio_input_disabled` | styles only used by #10 | Uses: :69. |
| 12 | `PT/ProfileInfo.js:1`, `:8` | `useEffect`, `useRef`, `DismissableTextInput` imports | unused after #9-#10 | |
| 13 | `PT/ProfileInfo.js:11`, `PT/ProfileRowButtons.js:9`, `PT/WorkoutStats.js:6` | `const scaledSize = (size) => scaleSize(size)` | wrapper that only forwards | Replace `scaledSize(` with `scaleSize(` (ProfileInfo :114; ProfileRowButtons :32, 34, 35, 41, 42; WorkoutStats :58, 62, 63, 66, 79) and delete the alias. Identical output. |
| 14 | `PT/ProfileRowButtons.js:8`, `:3` | `screenHeight`, `Dimensions` import | unused variable | ESLint; `Dimensions` is only used for it. |
| 15 | `PT/ProfileRowButtons.js:20` | `{/* ✅ Enable View Stats and remove disabled/opacity */}` | stale note | Delete. |
| 16 | `VP/ViewProfileHeader.js:2`, `:44-49`, `:103-105` | `ArrowDown2` import, commented-out chevron JSX, `styles.centerChevron` | unused import + commented-out code + unused style | ESLint. Keep `Send2` in the import. |
| 17 | `VP/ViewProfileOptionsSheet.js:65`, `:67` | `theme.success \|\| '#10B981'` | fallback that can never apply | `frontend/theme/mfpDark.js:27` defines `success: '#3FD396'`. Optional simplification to `theme.success`. |
| 18 | `VP/ViewProfileOptionsSheet.js:74`, `:76` | `theme.danger \|\| '#ef4444'` | left side always undefined | `mfpDark.js` has no `danger` key; the colour is always `'#ef4444'`. Leave as is unless the owner answers I12 (do not add a theme key in this refactor). |
| 19 | `VP/ViewProfileRowButtons.js:123` | `catch (err)` | unused catch binding | Optional: `catch {`. |
| 20 | `S/Credits.js:60` | `styles.li` | unused style | ESLint. |

Not dead although it looks like it: `PT/ProfileHeader.js:43` `<RNBounceable>` without `onPress` (it still bounces on touch: I13); PRO:21-26 `setRerender` (H1); `S/Settings.js:14` and `S/PrivateProfileInfo.js:13` `useUserDoc` (H2); the failure-path `console.log` calls VPS:93, 210, 286, 295, 505, 537 (real failure paths, not tracing; I14).

---

## C. Duplication

### C1. Width-375 scaler (identical)
`const scale = screenWidth / 375; function X(size) { return Math.round(size * scale); }`
- `EP/EditProfileModal.js:12-17` (`wScale`), `VP/ViewProfileRowButtons.js:12-17` (local `scaleSize`, which shadows the meaning of the global helper; the global one is imported as `scaleSizeGlobal` at :8)
- outside: `S/0.0_SignUp.js:22-26`, `S/0.1_LogIn.js:22-26`, `S/0.3_UserLogInCredentials.js:12-16`, `frontend/components/5_Profile/MakePost/PostUploadOptionsScreen.js:30-34`, `.../MakePost/ClipBuilderScreen.js:23-24`, `frontend/components/1_Feed/FeedHeader.js:37-38`, and the inner `s` of `frontend/theme/headerMetrics.js:11-12`.
- All compute `Math.round(n * windowWidth / 375)`: identical for every input. It is **not** any existing export of `frontend/helper/scaleSize.js` (`hs` uses 390, default uses min of width/390 and height/844).
- Canonical home: a new named export in `frontend/helper/scaleSize.js` (for example `ws375`). Cross-partition (G5). Until it exists, leave both local copies.

### C2. `scaledSize` forwarding alias (identical to `scaleSize`)
`PT/ProfileInfo.js:11`, `PT/ProfileRowButtons.js:9`, `PT/WorkoutStats.js:6` (+ 16 files outside, listed in feed-cards C.7). Remove in this partition (B5#13).

### C3. Avatar ring constants (identical)
`PT/ProfileInfo.js:12-20` == `VP/ViewProfileInfo.js:9-17` (`PFP_RADIUS_FACTOR` ... `PFP_RING_RADIUS`, nine lines, byte-identical). The two ring/avatar style objects are also identical (`PT/ProfileInfo.js:98-108` `pfp_ring`/`pfp` vs `VP/ViewProfileInfo.js:55-65` `pfp_ctnr`/`pfp`), as are `bio_text` (apart from the comment text) and `bio_placeholder_text`.
Not identical: the empty-avatar colour (`'#e5e7eb'` at `PT/ProfileInfo.js:61` vs `theme.surface` at `VP/ViewProfileInfo.js:37`), the source of the uri (`pfp || cachedPfp || fallbackPfp` vs `usePfp(...) || fallbackPfp`), and `resolvePhotoURL`'s second argument.
Canonical home: `PT/ProfileIdentity.js`, which already owns `PROFILE_AVATAR_SIZE` (move the nine constant lines there and export `PFP_RADIUS`, `PFP_RING_PADDING`, `PFP_RING_BORDER`, `PFP_RING_RADIUS`). Do not merge the two components.

### C4. Profile header constants and styles
`PT/ProfileHeader.js:13-19` == `VP/ViewProfileHeader.js:13-19` (`METRICS`, `ICON_SIZE`, `HEADER_HORIZONTAL_PADDING`, `ICON_WRAPPER_SIZE`, `ICON_COLOR`, `ICON_STROKE_WIDTH`, `RANK_BADGE_SIZE`: identical). Styles `main_ctnr`, `side`, `sideRight`, `iconBtn` are identical in value (quote style differs). The inline `iconStyle` expression is identical (`PT/ProfileHeader.js:52`, `VP/ViewProfileHeader.js:42`).
Not identical: `SIDE_SLOT_WIDTH` (`PT:24` subtracts the overhang, `VP:22` adds gap + icon), `center` (PT adds `maxWidth/flexGrow/minWidth`), `handleRow`, `handle_text`, `rankBadge.marginRight`.
Recommendation: optional. If done, a small `PT/profileHeaderMetrics.js` exporting the seven constants; leave the StyleSheets alone. Low value.

### C5. Screen container styles (identical)
VPS:550-568 == PRO:215-233 (`main_ctnr`, `scrollContent`, `body_ctnr`, `cards_ctnr`; only the trailing comma differs). Canonical home: new `frontend/components/5_Profile/profileScreenStyles.js` (move PRO:215-233 verbatim, default export), imported by both screens. The scroll/body/cards JSX skeleton (PRO:130-137, VPS:373-380) is the same too but hosts different children; do not abstract.

### C6. `openViewer` fallback object
VPS:154-164 ~ PRO:50-61 (PRO adds `privacyMode`). Both are dead (B1#1, B2#1): delete, do not share.

### C7. Block / unblock prelude inside VPS
VPS:461-468 vs VPS:515-522 (snapshot of `blocked` / `blockedUidList`). Same first four statements; the block handler additionally snapshots `following`/`followers`. A helper would save 4 lines and add indirection. Leave; optionally hoist the two inline handlers to named functions (D1).

### C8. Delete-account flow: `S/Settings.js:51-52, 81-156` vs `S/DeleteAccount.js:13-14, 16-91`
`logoutAndReset`, `triggerDeletion`, `confirmDelete` and the two refs. Differences: log prefixes (`'settings: ...'` vs `'delete-account: ...'`), the variable name `currentUid` vs `uid`, a comment (DeleteAccount:58), and **Settings resets `deleteInFlightRef` in the no-uid path (Settings:109) while DeleteAccount does not (E3)**. Not byte-identical, and DeleteAccount is unreachable (I1). Recommendation: do not build a shared hook now. If the owner approves deleting the `DeleteAccount` route/screen, the duplication disappears.

### C9. Info/legal page chrome (six screens)
Header JSX (back `TouchableOpacity` + `Ionicons chevron-back 22` + title + 40-wide spacer): `S/Credits.js:11-17`, `S/DeleteAccount.js:95-101`, `S/PrivacyPolicy.js:12-18`, `S/PrivateProfileInfo.js:71-77`, `S/Settings.js:162-168`, `S/TermsOfService.js:12-18`. Identical apart from the title string and indentation.
Styles:
- `root`, `header`, `iconBtn`, `title`: identical in all six (`Credits:53-56`, `DeleteAccount:118-121`, `PrivacyPolicy:122-125`, `PrivateProfileInfo:100-103`, `Settings:231-234`, `TermsOfService:110-113`).
- `content`: identical in five; `Settings:235` differs (`paddingHorizontal 14`, no `paddingBottom`).
- `h`: identical in Credits:58, PrivacyPolicy:127, TermsOfService:115.
- `p`: identical in Credits:59, PrivacyPolicy:128, TermsOfService:116; DeleteAccount:123 and PrivateProfileInfo:105 add `marginBottom: scaleSize(6)`.
- `li`: identical in five (Credits:60 is unused, B5#20).
Also different and to be kept per file: `SafeAreaView` comes from `react-native` in Credits/DeleteAccount/PrivateProfileInfo/Settings and from `react-native-safe-area-context` with `edges={['top']}` in PrivacyPolicy/TermsOfService; `showsVerticalScrollIndicator={false}` is absent in DeleteAccount:102 and PrivateProfileInfo:78.
Canonical home if done: new `frontend/components/common/InfoScreenHeader.js` (`{ title, onBack }`, owning `header`/`iconBtn`/`title` styles) plus a plain object `infoScreenTextStyles` (`root`, `content`, `h`, `p`, `li`) spread into each screen's `StyleSheet.create`. This is new code rather than a move (six tiny call sites); medium value, low risk. Optional.

### C10. Username/name form screens
- Styles: `S/ChangeUsername.js:132-239` is **byte-identical** to `S/0.4_CreateUsername.js:149-256` (diff = nothing). `S/ChangeName.js:143-247` differs in exactly one key: `inputIcon { marginRight: scaleSize(8) }` (ChangeName:210-212) instead of `usernamePrefix {...}` (ChangeUsername:199-204).
- JSX shell (ImageBackground > SafeAreaView > TouchableWithoutFeedback > back button > heading > form > CTA) and the import block (lines 1-18) are the same in the three files; the texts, the input adornment, `autoCapitalize`/`autoCorrect`, the submit action and the back fallback (`'Tabs'` vs `'SignUp'`) differ.
- `handleBack`: ChangeName:38-44 == ChangeUsername:35-41 (identical); CreateUsername:41-47 navigates to `'SignUp'`.
Canonical home for the styles: new `frontend/screens/styles/handleFormStyles.js` (or next to `useAuthBackgroundSource`) exporting one StyleSheet with the union of keys (`inputIcon` and `usernamePrefix` both present). ESLint's unused-style rule does not look at style-only modules. Involves the auth partition (G3). Do not merge the three components.

### C11. Helpers shared with FEED and US detail (already analysed by feed-screen C2-C4 and user-stats C2; verified again here)
| Helper | Locations | Verdict |
|---|---|---|
| `ensureAtHandle` | PWP:33-37; FEED:315-320; US detail:71-74 | PWP == FEED for every input. US detail differs (`"@"` -> `''`). |
| `sanitizeEntry` | PWP:67-74; US detail:92-99; FEED:1160-1167 (inline) | identical (replacer parameter name only) |
| `stringCandidates` | PWP:76-85; US detail:76-85 | identical |
| `extractPidFromWorkout` | PWP:131-136; US detail:142-147 | identical |
| `extractWidFromWorkout` | PWP:123-129; `UserStats/userStatsUtils.js:41-51` (`extractWid`, same five keys in the same order) | NOT identical in edge cases: `extractWid` stringifies any truthy candidate (a boolean or object becomes `"true"` / `"[object Object]"`) and skips `NaN`; `stringCandidates` accepts only strings and numbers and returns `"NaN"` for `NaN`. Same result for string and finite-number ids. Leave both. |
| `toNumber`, `ensureHandle`, `normalizeMediaEntry`, `mergeMediaSources`, `resolveWorkoutCreatedAt`, `toMillis` | PWP:62, 87, 93, 108, 138, 39 | **dead in PWP (B3)**: delete here instead of sharing. |
| edit-post payload builder | PWP:738-810 + 816-821; FEED:977-1056; US detail:585-664 | From `resolvedCaption` to `editingPayload` the three are textually the same (quotes differ), except the `workoutName` source fallback variable (`resolved` / `sourcePost` / `item`). The step before it differs: PWP:728-733 and US detail merge `{ ...resolved, ...fetched }`, FEED:972 uses `fetched` alone. A shared pure function `buildEditingPostPayload(latest, fallbackWorkoutSource, pid)` returning `{ resolvedCaption, mediaEntries, editingPayload }` would be identical for all three. |
Canonical home: whatever feed-owned util the coordinator creates (user-stats proposes `frontend/utils/feedItemUtils.js`). PWP then imports `ensureAtHandle`, `sanitizeEntry`, `stringCandidates`, `extractPidFromWorkout` (G2).

### C12. `safeNumber` (`PT/WorkoutStats.js:8-11`)
One-argument version of `toNumber(value, fallback = 0)` (six identical copies listed in feed-screen C2) and of `safeNumber` in `frontend/utils/loggedFoods.js:4-7` and `UserStats/userStatsUtils.js:3`. Identical for every input when called with one argument. Import the shared `toNumber` if it gets created; otherwise leave.
`formatNumber` (`PT/WorkoutStats.js:13-24`, k/m/b abbreviation) is unrelated to the other `formatNumber`s (`S/PastWorkoutScreen.js:130`, `1_Feed/PastWorkoutExerciseLog.js:19`, `1_Feed/SimpleFeedPost.js:120`): leave local.

### C13. "This account is private" panels (not identical)
`PB/ProfileContentCards.js:43-55` + styles 200-230; PWP `LockedView` 215-225 + styles 1249-1276; `S/ProfileLoggedFoodsScreen.js:26-36` + styles 450-478. Icon sizes, colours, fonts and default subtitles all differ. Leave.

### C14. In-file repetition in PWP
- PWP:869-877 vs 886-894 (`handlePressComments` / `handlePressLikes` prelude: resolve, pid check, fall back to `openPastWorkout`). Six lines; leave.
- PWP:904-909 / 918-919 vs 925-937 (navigate on ROOT else on `navigation`): one of the 19 sites of feed-screen C11; payloads differ. Leave.

### C15. Optimistic follow-state write
`VP/ViewProfileRowButtons.js:65-92` vs `1_Feed/Notifications/NotificationCard.js:187-216`: NOT identical (uid matching `String(x?.uid || x?.id || x)` vs `readUid(entry)`), as feed-social C10 found. Leave both.

### C16. Bottom-sheet skeleton
`EP/EditProfileBottomSheet.js:6-30` vs `1.1_Messages/CreateGroupChatBottomSheet.js:9-33`: same skeleton, different opacity/child (messages-chat C). Leave.

---

## D. Decomposition plans

### D1. `S/4.1_ViewProfile.js` (569 lines)
Top-level layout today: imports 1-27; DM lookup helpers 29-104; component 106-548; styles 550-568.

Step 0 (prerequisite): apply E1 (move VPS:352-370 above the early return at VPS:333) and the dead-code removals B1#1-#6.

1. **New `frontend/components/ViewProfile/directChat.js`** <- move VPS:29-104 verbatim: `DIRECT_DM_LOOKUP_CACHE` (29), `makePairKey` (31-36), `upsertLocalMessageEntry` (38-47), `resolveParticipants` (49-58), `lookupRemoteDirectChat` (60-104). Export `lookupRemoteDirectChat` and `upsertLocalMessageEntry` (the other three are internal). Imports there: `db` from `../../../firebase.config`, `collection, getDocs, limit, query, where` from `firebase/firestore`, `ensureUidArray, normalizeUserRef` from `../../utils/userRefs`. VPS then drops its own lines 23-24 (`db` and the firestore names are used only at VPS:72-74). The module-level `Map` moves with the functions; VPS is the only user, so it stays a singleton. Keep the `task.finally(...)` / `CACHE.set(...)` order (H5).
2. **Optional, same file**: `toMessages` (VPS:237-298) as `export async function openDirectChat({ navigation, chatTargetRef, profileUserData, user })`. The body moves verbatim; only the signature line and the call site (`toMessages={() => openDirectChat({...})}`) are new. It needs `Alert`, `makeID`, `arrayAppend`, `createChat`, `coerceUid`. Skip if the coordinator prefers zero new signatures.
3. **Hoist the two inline handlers** VPS:460-513 (`onBlock`) and VPS:514-543 (`onUnblock`) to `const handleBlock = async () => {...}` / `const handleUnblock = async () => {...}` declared before the `return` (bodies verbatim). They are recreated every render today, and `ViewProfileOptionsSheet` is `React.memo`'d, so identity behaviour is unchanged. A custom hook (`useProfileBlockState`) is possible but would have to be called exactly where the `isBlocked` effect is now (between VPS:174 and VPS:229) to keep effect order; not worth it.
4. **Styles** VPS:550-568 -> shared `profileScreenStyles.js` (C5).

What stays: route param, state, `chatTargetRef`/`reportProfileUid`/`profileDisplayName` memos, focus effect, `getFullUserData` + its effect, the `isBlocked` effect, the DM prefetch effect, derived values, JSX. Expected size after steps 0, 1, 3, 4: about 400 lines.
Blockers: none for step 1 (pure module code). `getFullUserData` closes over two setters and `user`: leave in place.
Extraction risk: low.

### D2. `S/ProfileWorkoutsAndPostsScreen.js` (1278 lines)
Top-level layout today: imports 1-31; helpers 33-213 (about 105 of those lines dead, B3); `LockedView` 215-225; component 227-1122; styles 1124-1277.

Step 0 (prerequisite): B3 removals and E2 (move PWP:387-389 above PWP:288).

Proposed folder `frontend/screens/profileWorkoutsAndPosts/` (mirrors the existing `frontend/screens/feed/`):
1. **`styles.js`** <- PWP:1124-1277 verbatim (`export default styles`). Imports `StyleSheet`, `scaleSize`, `theme`. Risk: none.
2. **`utils.js`** <- surviving pure helpers verbatim: `ensureAtHandle` (33-37), `sanitizeEntry` (67-74), `stringCandidates` (76-85), `extractWidFromWorkout` (123-129), `extractPidFromWorkout` (131-136), `sortPostsByCreated` (180-187), `getWorkoutTimestamp` (189-208), `sortWorkoutsByTimestamp` (210-213). If the shared feed util of C11 exists, import the four shared ones from it instead and keep only the three sort helpers + `extractWidFromWorkout` here. The dependency array at PWP:594 lists `extractPidFromWorkout` and `extractWidFromWorkout`; they stay valid names after the move (now imports), so leave the array exactly as it is.
3. **`LockedView.js`** <- PWP:215-225 (imports `styles`, `Ionicons`, `scaleSize`).
4. **`useProfilePosts.js`** (custom hook) <- state `posts`/`postsLoading`/`postsError` (236-238), `normalizedPostIds` (240-252), `postIdsKey` (254-257), `previousPostIdsKeyRef` (259), `postsByPid` (261-268), `shouldRefreshOnFocusRef` (275), the focus refresh (288-347) and the load effect (391-475). Signature `useProfilePosts({ userData, canViewContent })` returning `{ posts, postsLoading, postsError, postsByPid, shouldRefreshOnFocusRef }` (the ref is written by `handleEditWorkout` PWP:716 and `handleEditPost` PWP:813). Imports: `useFocusEffect`, `clearFooterSuppression`, `doc`, `getDoc`, `db`, `readDocsByIds`, `sortPostsByCreated`.
5. **`useWorkoutFeedItems.js`** (custom hook) <- state `workoutPostsState`/`workoutPostsLoading` (283-284), hydrate effect (488-572), `findPostForWorkout` (574-594), `workoutFeedItems` (596-636). Signature `useWorkoutFeedItems({ visibleWorkouts, postsByPid, userData, targetUid })` returning `{ workoutFeedItems, workoutPostsLoading, workoutPostsState }` (`resolveFeedItem` PWP:646-651 reads `workoutPostsState.byPid`).
6. **Edit-post payload builder** PWP:738-810 + 816-821 -> the shared function of C11 if the coordinator creates it; otherwise leave inline.
7. **`ProfileTabsHeader`** (optional small component) <- the JSX of `headerContent` (PWP:1004-1035) with props `{ selectedTab, onSelectTab, onBack }`; `headerPaddingTop` (999) becomes a module constant `scaleSize(6)`.

What stays in the screen: params (228-232), `userData`/`isUserLoading` state (234-235), `selectedTab` (270-273), the sheet state (277-282), user load effect (349-372), self subscription (374-385), `viewerData`/`viewerUid`/`canViewContent`, `visibleWorkouts` (477-486), all handlers (638-939), `renderPost`, `keyExtractor`, empty components, `mainContent`, JSX. Expected size: about 560 lines; with step 6 and 7 about 450.

What blocks a clean extraction:
- **Effect order.** Today the effects register in this order: focus (288), user load (349), self subscription (374), posts load (391), workout hydrate (488). A single `useProfilePosts` hook called at the position of today's focus effect yields focus, posts load, user load, subscription, hydrate: the posts-load effect moves ahead of the two user effects. They touch disjoint state (posts load reads the render's `userData`/`canViewContent` and writes `posts*` + `previousPostIdsKeyRef`; the user effects write `userData`/`isUserLoading`), so the reorder is harmless, but it is a reorder. To keep the exact order, split step 4 into two hooks (focus refresh; posts load) and keep `posts` state in the screen. Implementer's choice; say which one was taken in the report.
- `canViewContent` must be computed before the hook call (E2 fix first).
- `posts.length` in the load effect's dependency array (PWP:475) and the cancel flag interplay (E5): move verbatim, do not "tidy".
- Hooks 4 and 5 are coupled through `postsByPid`.
Extraction risk: medium (hooks 4-5), low (1-3).

No other file of the partition exceeds 500 lines.

---

## E. Latent bugs

| # | File:line | Bug | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | VPS:333-350, VPS:360-364, VPS:366-370 | **Hooks after an early return.** The first render always has `blockedFromViewing === false` (VPS:109) and calls both `useMemo`s. `getFullUserData` sets it to `true` when the viewer's `blockedByUidList`/`blockedBy` contains the target (VPS:202-205; the Cloud Function `blockUserAction` writes those fields on the blocked user, `functions/index.js:1433-1435`). The next render returns at VPS:334 with two hooks fewer: React throws "Rendered fewer hooks than expected". | Move VPS:352-370 (the five derived constants and the two `useMemo`s; all pure: `canViewerAccessProfile` and `filterViewableWorkouts` in `frontend/utils/workoutPrivacy.js:129-158, 187-190`, `countLoggedFoods` in `frontend/utils/loggedFoods.js:9-23`) to just above `if (blockedFromViewing)` at VPS:333. No other change. | high |
| E2 | PWP:294, PWP:346 vs PWP:387-389 | **`canViewContent` is used before its `const` declaration.** The dependency array at PWP:346 is evaluated during render, 43 lines before `const canViewContent` runs. Babel lowers `const` to `var` (`@react-native/babel-preset` `transform-block-scoping`, no TDZ), so the array always contains `undefined` in that slot (it would be a ReferenceError with real block scoping). The callback body (PWP:294) runs after render and sees the right value. | Move PWP:387-389 (`viewerData`, `viewerUid`, `canViewContent`; they depend only on `userData` (234) and `global.userData`) to just above PWP:288. Effect: the focus callback now also re-runs when `canViewContent` flips; in practice that only happens together with a `userData` change that already changes `normalizedPostIds`. | high that it is a defect; medium-high that the move is behaviour-neutral |
| E3 | `S/DeleteAccount.js:36-45` | `deleteInFlightRef.current` is set to `true` (36) and not reset on the "no uid" early return (39-45); every later tap is ignored. The twin in `S/Settings.js:109` resets it. | Add `deleteInFlightRef.current = false;` before the `return;` at DeleteAccount:44. (Moot if the screen is deleted, I1.) | high |
| E4 | PWP:353-356, 365 | `Promise.all([readDoc('usersPublic', uid), readDoc('usersPrivate', uid)])`: for any profile other than the viewer's own, the `usersPrivate` read is rejected by the rules (`firestore.rules:175-177`: owner or admin only), the whole `Promise.all` rejects, `.catch(() => { })` swallows it and `userData` is never refreshed; the screen keeps showing `initialUser`. The sibling screens guard each read (`S/ProfileLoggedFoodsScreen.js:115-117` `.catch(() => null)`; VPS:185-188). | `.catch(() => null)` on each `readDoc`. **Do not apply in the refactor**: it changes what other-user profiles show (fresh data, then a silent refresh). Owner question I6. | medium-high that it is unintended |
| E5 | PWP:412-415, 441-451, 466-475 | **Posts beyond the first resolved chunk are dropped.** `posts.length` is a dependency (475). The first `setPosts` (423) changes it, the effect re-runs, the cleanup sets `cancelled = true` (473), and the new run returns early (413-415) because the key is unchanged and posts exist. Tail chunks still in flight hit `if (cancelled) return;` (444) and are discarded; `setPostsLoading(false)` (468) is skipped. For the viewer's own profile the full list still arrives through the focus refresh (PWP:294-337), which re-runs when `normalizedPostIds` gets a new identity after the user doc loads; for other users that never happens (E4), so "All Posts" shows at most the first 10 ids until the screen is left and re-focused. | Not minimal: the fix is to stop depending on `posts.length` (track "loaded" in a ref). **Do not apply in the refactor**; owner question I7. Derived by reading, not by running. | medium |
| E6 | PWP:443-449 with `backend/helper/firebase/readDocsByIds.js:20` | `readDocsByIds` returns `ids.map(...).filter(Boolean)`: missing documents are removed, so `docs[idx]` no longer lines up with `chunkIds[idx]`. A post document without a `pid` field that follows a missing one gets the wrong `pid` assigned (447). | None proposed (needs the helper to return ids, or the caller to stop indexing). Record only. | low (only matters for post docs lacking `pid`) |
| E7 | `EP/EditProfileModal.js:62-64` | `updateDoc('usersPublic', uid, { bio })` is neither awaited nor caught; `backend/helper/firebase/updateDoc.js:25-26` rethrows non-permission errors, giving an unhandled rejection (the local state and `global.userData.bio` are already updated). | None in the refactor (adding a catch changes nothing visible but is new behaviour on a failure path). Record only. | low |

Checked and found correct: `VP/ViewProfileRowButtons.js:50-56` (the subscription closes over `user` but is re-created when the uid string changes); `S/PrivateProfileInfo.js:55` inner `const uid` shadows the outer `uid` (12) only inside the `forEach` callback (smell, not a bug); `PT/ProfileHeader.js:52` reads `styles.handle_text.fontSize` (StyleSheet.create returns the plain object in RN 0.73, so the number is available).

---

## F. Best-practice issues worth fixing

| # | File:line | Issue | Fix | Risk |
|---|---|---|---|---|
| F1 | VPS:360, 366 | Hooks called conditionally | E1 | low |
| F2 | PWP:1063-1070 | Component defined during render (`ListEmptyComponent={() => ...}`): a new component type each render, so the empty view remounts on every render (spinner restarts) | Pass an element like the "All Posts" list does (PWP:1083): `ListEmptyComponent={workoutPostsLoading ? (<View ...>...</View>) : workoutsEmptyComponent}` (FlatList accepts an element). Same pixels, no remount. | low |
| F3 | PRO:213 | `import scaleSize` placed after the component, between code and styles | Move to the import block at the top. | none |
| F4 | PRO:23 | `require('../utils/hexagonEvents')` inside an effect | Static `import { onHexagonUpdate } from '../utils/hexagonEvents'` (the module has no imports and no side effects; `S/UserStatsScreen.js:10` imports it statically). | none |
| F5 | PWP:377 | `require('../utils/userDataEvents')` inside an effect, wrapped in try/catch | Static import of `subscribeUserData` (PRO:14 and `EP/EditProfileModal.js:10` do so; no import cycle: `userDataEvents` imports only `shared/rankProgress.js` and `./rankPromotionEvents`). Keep the effect body otherwise. | low |
| F6 | `EP/EditProfileBottomSheet.js:39` | Inline `require("../../../theme/mfpDark").default.bg` in JSX | Top-level `import THEME from "../../../theme/mfpDark"` and `THEME.bg`. | none |
| F7 | PRO:73 vs PRO:34 | `React.useRef` and `useRef` mixed | Disappears with B2#6/#8. | none |
| F8 | VPS:1-27, PWP:17-31, PRO:3-18 | Imports not grouped (third-party `@react-navigation/native`, `firebase/firestore` interleaved with local modules) | Regroup only in files whose imports are edited anyway (VPS and PWP are). None is order-sensitive (no side-effect imports). | low |
| F9 | `VP/ViewProfileRowButtons.js:8, 15-17` | A local `scaleSize` (width/375) and the global helper imported as `scaleSizeGlobal` coexist in one StyleSheet | Rename the local one only if C1's shared helper lands; values must not change (H4). | low |
| F10 | PWP:445 | Callback parameter `doc` shadows the imported Firestore `doc` (PWP:29) | Leave when moving verbatim (rule 3); rename only if that block is touched for another reason. | none |
| F11 | VPS:172-174, 176-212 | `getFullUserData` has no cancel guard: a late response for a previous `user` param can overwrite newer state | Record only; adding a guard changes timing. | n/a |
| F12 | VPS:460-543 | 85 lines of async handlers inline in JSX | Hoist to named functions (D1 step 3). | low |
| F13 | PWP:829-835 | Mis-indented block (the `navigation.navigate('EditClip', ...)` call and the closing brace of the `if`) | Re-indent only if the block is moved into the shared payload builder; otherwise rule 6 (no formatting churn) says leave. | none |
| F14 | `frontend/utils/pickAndUploadProfilePhoto.js:25, 96` (outside) | Same function exported as named and default; PRO:17 uses the default, `EP/ProfilePicture.js:7` the named form | After B2#7 only the named form is used. See G4. | low |
| F15 | PWP:594 | Module-level names in a dependency array | Informational (rule: never change an array to silence the warning). Leave. | n/a |
| F16 | `VP/ViewProfileRowButtons.js:56`, VPS:174, VPS:227 | exhaustive-deps warnings (complex expression, missing function dep, global read) | Leave exactly as they are (H3, H6). | n/a |

Effects without cleanup that are fine: VPS:229-236 (fire-and-forget prefetch, de-duplicated by the cache), `VP/ViewProfileOptionsSheet.js:25-31` (one `requestAnimationFrame`, guarded by optional chaining), `EP/EditProfileBottomSheet.js:26-30`.

---

## G. Cross-partition requests

1. **feed-post (FWVS) / user-stats.** The only two mounts of `FeedWorkoutViewerSheet` (PRO:202-208, VPS:445-451) always pass `workout={null}` because their openers are unused (B1#1-4, B2#1-4). If the profile partition removes the mounts, `frontend/components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet.js` and `frontend/components/3_Workout/ui/CopyTemplateToast.js` (only importer: FWVS:9) lose their last importer and become deletable; `SpectatingWorkoutModal` keeps `UserStats/UserStatsWorkoutViewerScreen.js:4` as its only user (and the user-stats audit B6 proposes removing that one). The feed-post audit's B4 edits to FWVS become moot. Coordinator decision needed before either partition edits (I2).
2. **feed-screen / user-stats (shared feed helpers).** If a shared util is created (feed-screen C2-C4, user-stats C2), PWP needs only `ensureAtHandle` (the FEED/PWP semantics), `sanitizeEntry`, `stringCandidates`, `extractPidFromWorkout`; it does NOT need `toNumber` or `ensureHandle` (dead in PWP, B3). Correction for the user-stats audit: PWP's `resolveWorkoutCreatedAt` (PWP:138-146) is dead too. Also the edit-post payload builder (C11): PWP:738-810, 816-821.
3. **auth partition, `S/0.4_CreateUsername.js:149-256`**: styles byte-identical to `S/ChangeUsername.js:132-239`. If a shared `handleFormStyles` module is created (C10), CreateUsername should import it too. Needs both partitions in the same step or the profile partition first (an unused shared module is harmless).
4. **owner of `frontend/utils/pickAndUploadProfilePhoto.js`**: after B2#7 the default export (`:96`) has no importer; only `{ pickAndUploadProfilePhoto }` is used (`EP/ProfilePicture.js:7`). Drop the default export per the "one export form" rule.
5. **owner of `frontend/helper/scaleSize.js`**: add the width-375 scaler as a named export (C1) so the eight local copies can import it (two in this partition: `EP/EditProfileModal.js:12-17`, `VP/ViewProfileRowButtons.js:12-17`).
6. **feed-cards D.1 / G.6**: when `RANK_TIER_THEMES` moves out of `FeedSnapshotCard.js`, update `PT/ProfileRankBadge.js:5`. Until then leave the import.
7. **feed-post B1#14 (`onPressShare`)**: PWP:951 can be removed independently (B3#16).
8. **App.js (root) / owner**: `App.js:65`, `App.js:1625` register `DeleteAccount`; nothing navigates to it (I1). No change requested unless the owner approves removing the route and the screen.
9. **owner of `backend/helper/firebase/readDocsByIds.js`**: the `filter(Boolean)` at `:20` breaks index alignment for PWP:445-449 (E6). No change requested; if the helper's contract is ever changed, PWP is the caller to re-check.
10. **messages-chat G-3** asked for the tracing handler in `EP/EditProfileBottomSheet.js:10-12, 38` to go: covered by B5#2.
11. **messages-chat G-8**: VPS keeps calling `createChat(selfUid, participants, cid)` (VPS:291) and `arrayAppend("usersPrivate", selfUid, "messages", {...})` (VPS:282-285) with the same arguments; if `toMessages` is moved (D1 step 2) these two calls move verbatim.

---

## H. Fragile areas

1. **PRO:21-28, 86-93: `userData` state aliases `global.userData`.** `subscribeUserData` passes the global object itself (`frontend/utils/userDataEvents.js:180-186, 194`), so after the first callback `userData === global.userData`; later in-place mutations plus `emitUserDataUpdate()` call `setUserData(sameRef)`, which React ignores. The hexagon listener `setRerender` (PRO:21-26) and `setLoggedFoodsCount` (PRO:90) are what force re-renders. Do not remove `setRerender`, do not "fix" by cloning (`EP/EditProfileModal.js:41` clones on purpose; PRO does not). The effect at PRO:41-45 depends on reference changes of `userData`.
2. **`useUserDoc(uid, { ignoreKeys: [] })` in `S/Settings.js:14` and `S/PrivateProfileInfo.js:13`.** These are the only two callers of `frontend/hooks/useUserDoc.js` in the app. The hook subscribes to `usersPublic/{uid}`, merges every snapshot into `global.userData`, calls `emitUserDataUpdate()` and may recompute and write hexagon stats (`useUserDoc.js:81-149`). In Settings the returned value becomes unused after B4, but the call must stay (rule 1: timing of side effects). The fresh `[]` each render is fine (`ignoreKeys.join("|")` is the dependency, `useUserDoc.js:149`).
3. **`VP/ViewProfileRowButtons.js:28-56, 94-128`**: `deriveInitialState` is both the lazy initial state and the subscription body; the dependency array is the uid string on purpose (comment at :55). `pendingRef` + `busy` guard double taps; `toggleFollow` writes optimistic state, then the server result, and rolls back on throw. Leave the logic and the array untouched.
4. **`VP/ViewProfileRowButtons.js:173-248` and `EP/EditProfileModal.js:174-237`**: sizes mix two scalers (`scaleSize` width/375 for layout, `scaleSizeGlobal`/`scaleSize(wScale(n))` for fonts and paddings). Any "unification" changes pixels.
5. **VPS:60-104 `lookupRemoteDirectChat`**: in-flight de-duplication. `task.finally(() => CACHE.delete(key))` is attached before `CACHE.set(key, wrapped)`; because `task` is async the delete runs after the set. Move verbatim, keep the statement order. The effect at VPS:229-236 prefetches so that `toMessages` usually awaits an already-running promise.
6. **VPS:214-227**: `isBlocked` derives from `global.userData` and has `(global?.userData?.blockedUidList || global?.userData?.blocked || []).length` in the dependency array (read during render). Leave.
7. **VPS:237-298 `toMessages`**: order matters: local `messages` scan, remote lookup, `makeID()`, optimistic `upsertLocalMessageEntry`, `arrayAppend` started but awaited only after `createChat`, then navigate with `{ data: { cid }, usersExcludingSelf }` (param shape read by Chat and by App.js). Do not reorder or merge with Messages' `initChat`.
8. **VPS:460-543 block / unblock**: optimistic mutation of `global.userData.blocked`, `blockedUidList`, `following`, `followers` with exact rollback (`delete global.userData.blocked` when the array did not exist before). The block handler shows the "User blocked" alert before awaiting the call; `ViewProfileOptionsSheet` does not close itself on Block (`VP/ViewProfileOptionsSheet.js:72`), the handler does (VPS:474). Move verbatim only.
9. **`VP/ViewProfileOptionsSheet.js:25-31, 38`**: `index={isVisible ? 0 : -1}` plus an effect that calls `snapToIndex(0)` in a `requestAnimationFrame` or `close()`. gorhom sheets are sensitive to this pairing; leave. `handleStyle={{ display: 'none' }}` hides the handle on purpose.
10. **`EP/EditProfileBottomSheet.js:26-30, 42-44`**: opens via `expand()` when `isVisible` becomes true and never closes programmatically; `onClose` resets the flag. Removing `onChange` (B5#2) does not touch this.
11. **`EP/EditProfileModal.js:50-66` `handleBioBlur`**: order is local state, `global.userData.bio`, Firestore write, emit. It writes on every blur even when unchanged. Leave.
12. **PWP:288-347 focus refresh protocol**: `shouldRefreshOnFocusRef` is set to `true` by the cleanup (344) so the *next* focus refreshes; the first focus does not. The refresh re-fetches with `getDoc` per id in chunks of 10 and keeps stale entries for ids that failed. Also re-runs whenever `normalizedPostIds` changes identity. Move verbatim.
13. **PWP:391-475 load effect**: `previousPostIdsKeyRef`, the `posts.length` dependency and the cancel flag interact (E5). Do not change the dependency array, do not reorder the early returns.
14. **PWP:488-572 hydrate effect**: sequential `where('workoutWid'...)` / `where('workout.wid'...)` queries per workout, `byWid[wid] = null` as a negative cache, single `setWorkoutPostsState` at the end. Query shapes are Firestore contract.
15. **PWP:596-636, 653-703, 829-840**: shapes of feed items and of the `PastWorkout`, `EditClip`, `PostOptions`, `ViewProfile`, `Profile` navigation params (rule 1), including `postMeta` fields nobody reads (feed-post G9) and `Profile` without params (PWP:906-907, 927-928).
16. **`PT/ProfileHeader.js:13-24, 52` and `VP/ViewProfileHeader.js:13-22, 42`**: slot-width arithmetic that centres the handle, the emblem overhang, and the icon offset computed from `styles.handle_text.fontSize`. `getUnifiedHeaderMetrics()` is evaluated at module load.
17. **`S/Settings.js:99-141` / `S/DeleteAccount.js:34-76`**: the callable is fired and deliberately not awaited; logout + `navigation.reset` to `SignUp` happen immediately; `'not-found'` is treated as success. Cloud Function name `deleteOwnAccount` and payload `{ uid, handle }` are contract.
18. **`S/PrivateProfileInfo.js:31-68`**: two writes (`usersPrivate.settings.profilePrivate`, `usersPublic.isPrivate`), then the global patch, then `approveAllFollowRequests` and the optimistic follower merge. Alert shown before the writes. Leave.
19. **`S/PrivacyPolicy.js:20-113`, `S/TermsOfService.js:20-101`, `S/Credits.js:19-44`**: legal / credit copy. Do not touch a character of the text (including the mixed straight/curly quotes and `&amp;`).
20. **`S/ChangeName.js:46-54`, `S/ChangeUsername.js:43-46`**: input sanitising on every keystroke (`replace(/\s+/g, ' ').slice(0, 60)`, `sanitizeHandle`); `handleBack` falls back to `navigate('Tabs')`.
21. **`PT/ProfileRankBadge.js:11-14`**: the stage is parsed from the last word of the rank label; fallbacks to bronze. Leave.
22. Uncommitted owner work: `git status` shows VPS and PRO modified in the working tree (already part of the baseline). Nothing special to do, but do not use `git checkout`/`restore` on them (rule 9).

---

## I. Open questions for the owner

1. **`DeleteAccount` route** (`App.js:1625`, `S/DeleteAccount.js`): nothing navigates to it; Settings runs its own copy of the flow from the "Delete account" row (`S/Settings.js:177`). Delete the screen and the route, or should the Settings row navigate to it (the screen shows an explanation first)? Until answered: keep, apply E3 only.
2. **Workout viewer sheet on the profile screens** (PRO:201-208, VPS:444-451): it can never open (no caller of `openWorkoutViewer` / `openViewer`). Remove the mounts, which makes `FeedWorkoutViewerSheet` and `CopyTemplateToast` dead files, or is "tap a workout to preview it" coming back?
3. **Avatar tap on the own profile**: `handleDirectPfpEdit` (PRO:99-115) is wired to a prop `ProfileInfo` does not have. Was tapping the avatar meant to open the photo picker? Today the photo can only be changed in Edit Profile. The refactor will delete the dead handler unless told otherwise.
4. **Inline bio editing** (`PT/ProfileInfo.js:27-32, 43-50, 66-81`): fully implemented in the component, never enabled by the screen. Delete (default) or keep for a planned feature?
5. **Settings**: units and push toggles are commented out (`S/Settings.js:171, 183-184`); their state and writer will be removed. Should the Settings screen keep its live `usersPublic` subscription (`useUserDoc`, H2)? It will be kept unless told otherwise.
6. **PWP:353-356**: for other users the user refresh always fails (private doc not readable) and the screen works from the route's `initialUser`. Intended, or should it read `usersPublic` alone like VPS does (E4)?
7. **PWP "All Posts" for users with more than 10 posts** (E5): by reading, only the first chunk survives the first load on other users' profiles. Has this been seen? If confirmed, it needs a real fix outside the refactor.
8. **`global.profileOpenSelectPhotosSignal`** (PRO:78): read, never written. Remove the branch (default) or is another screen supposed to set it?
9. **Route param `initialTab`** (PWP:270-273): never sent; the screen always opens on "Workouts". Keep the reader?
10. **VPS:198-208 block gate**: `theyBlockedMe` can never be true for another user (their private doc is not read), so the gate relies only on the viewer's own `blockedByUidList`. Intended?
11. **VPS:411** always sends `isViewingSelf: false` to PWP, even when the viewed profile is the viewer's own (`isViewingSelf` is computed at VPS:357 and used for the logged-foods card). Intended?
12. **`theme.danger`** does not exist in `frontend/theme/mfpDark.js`; `VP/ViewProfileOptionsSheet.js:74, 76` always fall back to `'#ef4444'`. Add the key to the theme or inline the colour?
13. **`PT/ProfileHeader.js:43`**: the handle is wrapped in an `RNBounceable` with no `onPress` (it bounces and does nothing; the chevron next to it is commented out). Intended?
14. **Failure logging**: VPS:93, 210, 286, 295, 505, 537 use `console.log` on real failure paths. Convert to `console.warn` (visible as yellow boxes in development) or leave?
15. **Blocked view** (VPS:333-350): header only, with `toMessages` and `onOpenOptions` replaced by no-ops, so a blocked viewer cannot report or block back from here. Intended?
