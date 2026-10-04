# Audit: partition "app-shell" (24 files, 4507 lines)

Read-only audit. All 24 files were read top to bottom. Every working-tree file of the partition is byte-identical to
`SPX/baseline/<path>` (checked with `diff -q`), so the line numbers below are valid for both.

Abbreviations
- APP = `App.js`, FTR = `frontend/components/Footer.js`, FLBS = `frontend/components/FollowListBottomSheet.js`
- UPS = `frontend/services/userProfileService.js`, ABS = `frontend/components/3_Workout/NewWorkout/ActiveWorkoutBottomSheet.js` (workout-active)
- "grep" always means: repo-wide over `*.js/*.jsx/*.cjs/*.mjs`, excluding `node_modules`, `ios`, `.git`. Hits inside DEAD files were discarded.

Machine findings that turned out to be FALSE (do not act on them)
- `firebase.config.js: app` "unused": used by `backend/storage/uploadResumableNative.js:8` (`require('../../firebase.config').app`, LIVE). KEEP.
- `navigationRef.js: navigateRoot` "unused": used through `require()` at APP:653, 708, 757, 817 and `frontend/components/1_Feed/Notifications/NotificationsModal.js:199`. KEEP.
- `frontend/theme/mfpDark.js: MFP_DARK` "unused": used through `require('../../theme/mfpDark').MFP_DARK` at `frontend/components/2_MacroTracking/QuickAddModal.js:210, 226, 230, 236, 239`. KEEP until that file switches to the default import (G3).

---------------------------------------------------------------------------------------------------

## A. Module map

| File (lines) | Purpose | Exports | Importers |
|---|---|---|---|
| `App.js` (1822) | Entry component: font preload, splash gating, auth hydration (`onAuthStateChanged`), `global.userData` subscription to `usersPublic/usersPrivate`, push registration + notification deep links, presence, network banner, rest-reminder modal, root navigator with all 36 routes, global overlays (Footer, ActiveWorkoutBottomSheet, WorkoutExperiencePortal, WorkoutInviteOverlay) | default `App` | `node_modules/expo/AppEntry.js` (package.json `main`) |
| `babel.config.js` (8) | Babel preset + reanimated plugin (TOOLING) | CJS function | Metro/Babel |
| `metro.config.js` (8) | Expo Metro config, `unstable_enablePackageExports` (TOOLING) | CJS config | Metro |
| `firebase.config.js` (39) | Firebase app/Firestore/Storage/Functions/Auth singletons (RN persistence) | named `app`, `db`, `storage`, `functions`, `auth` | 95 import sites across LIVE and PARKED (`LeaderboardsSection.js:34` uses `db`); `app` only via `backend/storage/uploadResumableNative.js:8` |
| `fonts.js` (273) | Imports 15 `@expo-google-fonts/*` families and exposes them as one map for `useFonts` | named `customFonts` | APP:26 only |
| `navigationRef.js` (52) | Root navigation container ref + imperative helpers | named `navigationRef`, `navigateRoot`, `navigateOneWay`, `jumpToTab` | APP:13 (+6 lazy `require`s); FTR:6; OUTSIDE: `frontend/screens/ExerciseDetail.js:26`, `sections/ProgressSection.js:34`, `UserStats/UserStatsExerciseDetailScreen.js:13`, `UserStats/UserStatsModal.js:20`, `3_Workout/WorkoutExperiencePortal.js:7`, `NewWorkout/ActiveWorkoutModal.js:53`, `NewWorkout/ActiveWorkoutBottomSheet.js:18`, and by `require()`: `frontend/logic/useWorkoutManager.js:1322`, `1_Feed/Notifications/NotificationsModal.js:199, 204, 212`, `5_Profile/MakePost/PostUploadOptionsScreen.js:1262`, `5_Profile/MakePost/ClipBuilderScreen.js:135` |
| `frontend/components/Footer.js` (565) | Bottom tab bar (4 tabs + workout action button) and the "Start Workout" prompt sheet. Rendered once as a global overlay by APP; the in-screen instances return `null` (see E1) | default `React.memo(Footer, comparator)`; named `FOOTER_HIDE_OFFSET` (no importer) | APP:79, 1721; OUTSIDE (all render it WITHOUT `isOverlay`, so it renders nothing): `screens/5_Profile.js:8/199`, `screens/1_Feed.js:38/1804`, `screens/MacroTracking.js:7/1018`, `screens/ProfileLoggedFoodsScreen.js:15/297`, `screens/4_Explore.js:18/310`, `screens/2_Competition.js:16/357`, `screens/ProfileWorkoutsAndPostsScreen.js:17/1102`, `screens/4.1_ViewProfile.js:3/347/434` |
| `frontend/components/FollowListBottomSheet.js` (268) | Full-height sheet listing users (followers / following / likes) | default | OUTSIDE: `screens/5_Profile.js:10`, `screens/1_Feed.js:37`, `screens/ProfileWorkoutsAndPostsScreen.js:20`, `screens/4.1_ViewProfile.js:16`, `UserStats/UserStatsExerciseDetailScreen.js:15`. All pass exactly `isVisible, setIsVisible, title, users, navigation` |
| `frontend/components/ProfileCard.js` (135) | Selectable user row with gradient avatar ring and check circle | default | OUTSIDE: `1_Feed/SharePost/ShareModal.js:5` (`user,onSelect,isSelected`), `1.1_Messages/CreateGroupChatModal.js:4` and `3_Workout/NewWorkout/Group/GroupModal.js:6` (+ `baseBg, selectedBg`). Not to be confused with `1_Feed/FeedHeader/ProfileCard.js` |
| `frontend/components/UnderMealList.js` (41) | Maps meal entries to `MealItemCard` | default | OUTSIDE: `2_MacroTracking/MealsSection.js:4/54` (only caller; passes every prop except that `compact` is constant false, see B14) |
| `frontend/components/WorkoutInviteOverlay.js` (76) | Animated top banner for incoming group-workout invites | default | APP:84, 1707 |
| `frontend/navigation/MainTabs.js` (36) | Bottom-tab navigator (Feed, MacroTracking, Competition, Profile) with hidden tab bar | default `React.memo(MainTabs)` | APP:80, 1488 |
| `frontend/pfpCache.js` (103) | Memory + AsyncStorage cache of profile-photo download URLs | named `getPfpUrl`, `preloadPfps`, `clearPfpCache` | OUTSIDE: `frontend/helper/usePFPs.js:3` (`getPfpUrl` only) |
| `frontend/polyfills/base64.js` (35) | `atob`/`btoa` polyfill (side effect) | none | APP:6 |
| `frontend/providers/SafeAreaProviderWithStableInsets.js` (51) | `SafeAreaProvider` whose context never reports a zero inset | default | APP:86, 1405, 1426 |
| `frontend/screens/FeedScreen.js` (3) | One-line forwarder `export { default } from './1_Feed'` | default | OUTSIDE: `frontend/screens/index.js:12` only |
| `frontend/services/userProfileService.js` (444) | Profile bootstrap for auth (`prepareProfileForAuth`, `finalizeUserProfile`), handle/name updates through callables with Firestore fallbacks, join-date backfill. 2-space indent | named `backfillJoinDate`, `ensureUserProfile` (stub), `setUserHandle` (stub), `prepareProfileForAuth`, `finalizeUserProfile`, `updateUserHandle`, `updateUserName` | APP:34; OUTSIDE: `auth/appleAccount.js:3`, `auth/googleAccount.js:3`, `auth/completeSocialSignup.js:3`, `utils/usernameRegistration.js:1`, `screens/ChangeUsername.js:20`, `screens/ChangeName.js:19`, `screens/0.2_NewUserCreation.js:18` |
| `frontend/state/authStatusController.js` (43) | Module-level bridge so screens can call App's pending-handle logic | named `registerAuthStatusController`, `markPendingHandle`, `clearPendingHandle`, `refreshAuthStatus`, `getPendingHandle` | APP:35; OUTSIDE: `screens/0.4_CreateUsername.js:20` (`refreshAuthStatus`), `hooks/useAuthProviderFlow.js:2` (`markPendingHandle`, `clearPendingHandle`) |
| `frontend/state/footerSuppressionStore.js` (40) | zustand store: set of keys that hide the footer | default hook; named `setFooterSuppressed`, `clearFooterSuppression` | APP:81; OUTSIDE: `screens/5_Profile.js:16`, `screens/ProfileLoggedFoodsScreen.js:20`, `screens/ProfileWorkoutsAndPostsScreen.js:28`, `screens/4.1_ViewProfile.js:21` (`clearFooterSuppression`), `2_MacroTracking/MacroGoalsSheet.js:23` (`setFooterSuppressed`) |
| `frontend/state/messagesCache.js` (108) | Module-level cache of chats + latest messages with listeners | named `getMessagesCache`, `getLatestByCidCache`, `subscribeMessagesCache`, `clearMessagesCache`, `hydrateMessagesCache`, `mergeLatestBatchIntoCache`, `setMessagesPreloadState`, `getMessagesPreloadState` (all used) | OUTSIDE: `logic/messagesPreloader.js:12`, `screens/1.1_Messages.js:22`, `screens/feed/hooks/useFeedUserData.js:7`, `helper/initUserFeed.js:5` |
| `frontend/state/notificationsStore.js` (192) | zustand store + Firestore listener/pager for `usersPrivate/{uid}/notifications` | named `useNotificationsStore`, `ensureNotificationsListener`, `stopNotificationsListener`, `loadMoreNotifications`, `updateNotificationEvent`, `markAllNotificationsReadLocal`, `getNotificationsState`; default = `useNotificationsStore` | APP:83; OUTSIDE: `screens/Notifications.js:12-15`, `1_Feed/Notifications/NotificationsModal.js:11-16` (both use the NAMED hook) |
| `frontend/state/workoutStore.js` (60) | zustand store for the active workout sheet. 2-space indent | named `WORKOUT_SHEET_STATES`, `useWorkoutStore`; default = `useWorkoutStore` | FTR:5; OUTSIDE: `logic/useWorkoutManager.js:24`, `3_Workout/WorkoutExperiencePortal.js:5`, `NewWorkout/hooks/useWorkoutEditing.js:3`, `NewWorkout/ActiveWorkoutBottomSheet.js:16`, `workout/workoutActions.js:1` (all use the DEFAULT hook) |
| `frontend/theme/headerMetrics.js` (56) | Cached header sizing shared by Profile/ViewProfile/Macro headers | named `getUnifiedHeaderMetrics`, `getUnifiedHeaderSafeAreaOffset` | OUTSIDE: `screens/MacroTracking.js:24`, `ViewProfile/ViewProfileHeader.js:8`, `5_Profile/ProfileTop/ProfileHeader.js:8`, `2_MacroTracking/MacroStreakBadge.js:8`, `2_MacroTracking/DateHeader.js:8` |
| `frontend/theme/mfpDark.js` (49) | Dark palette | default `MFP_DARK`; named `MFP_DARK` | about 120 files via `import theme from`; PARKED files via `import theme` and `require(...).default` (CreateTribeModal, JoinTribeModal, LeaderboardCard, LeaderboardPanel, ManageTribeModal, Podium, TribeComparisonModal, TribeMenu, LeaderboardsSection, SelectExerciseModal/styles); named export only via `QuickAddModal.js` `require` |

Call-site props (for "props nobody passes")
- `Footer`: APP:1721-1730 passes `currentScreenName, navigation, isOverlay, isHiddenByFocus, overlayProgressSV, visibilityProgressSV, disableInteractions, workoutSheetProgressSV`. The 9 in-screen call sites pass only `currentScreenName, navigation` (+ `key` in `1_Feed.js:1804`).
- `WorkoutInviteOverlay`: APP:1707 `enabled`.
- `MainTabs`: rendered by the root stack (`route` only).
- `SafeAreaProviderWithStableInsets`: APP:1405, 1426 `initialMetrics`.

---------------------------------------------------------------------------------------------------

## B. Verified dead code

"Evidence" = the grep that was run and what it returned. Nothing in this section is used by a PARKED file unless marked KEEP.

### B1. Remove (verified, no owner decision needed)

| # | Identifier | Kind | Location | Evidence / exact action |
|---|---|---|---|---|
| 1 | `ensureUserProfile`, `setUserHandle` | exported stubs that only `throw` | UPS:223-225, 227-229 | grep `ensureUserProfile\b`, `setUserHandle\b`: only the callable-name strings at UPS:8-9 and the Cloud Functions in `functions/index.js:756, 1582` (different runtime). No importer. Delete both functions (this also clears the two `no-unused-vars` findings). |
| 2 | `preloadPfps` | unused export | `frontend/pfpCache.js:77-95` | grep `preloadPfps`: definition only. Delete; then `FastImage` import (line 2) is unused, delete it too. |
| 3 | `clearPfpCache` | unused export | `frontend/pfpCache.js:97-102` | grep: definition only. Delete with its comment (line 97). |
| 4 | `getPendingHandle` | unused export | `frontend/state/authStatusController.js:37-42` | grep `getPendingHandle`: this definition and the method App registers (APP:256). Delete the function AND the `getPendingHandle: () => pendingHandleRef.current,` entry at APP:256 (its only reader is the deleted function). |
| 5 | `getNotificationsState` | unused export | `frontend/state/notificationsStore.js:189` | grep: definition only. Delete. |
| 6 | `export default useNotificationsStore` | duplicate export of one binding | `notificationsStore.js:191` | All three importers use the named form (see A). Delete the default export. |
| 7 | `export` on `useWorkoutStore` | duplicate export of one binding | `frontend/state/workoutStore.js:13` | All six importers use the default form. Change `export const useWorkoutStore` to `const useWorkoutStore`; keep line 59. |
| 8 | `set` / `get` creator params | unused parameters | `notificationsStore.js:16` (`(set) =>`), `workoutStore.js:13` (`(set, get) =>`) | Not referenced. `createWithEqualityFn(() => ({ ...initialState }))` and `(set) =>` respectively. |
| 9 | `patchWorkout` | store action nobody calls | `workoutStore.js:36-42` | grep `patchWorkout`: definition only (workout-active G3 agrees). Delete. |
| 10 | `CommonActions`, `TabActions` | unused imports | `navigationRef.js:1` | Not referenced. Import becomes `{ createNavigationContainerRef }`. |
| 11 | `payload.target` | field never read | `navigationRef.js:25` | `payload` is read only as `payload.params` / `payload.transition` (line 34). Optional: drop the `target,` line; nothing else changes. |
| 12 | `SCREEN_H`, `scale`, `s` (+ `Dimensions` import) | unused locals | FLBS:16-18, import at FLBS:2 | `s` is never called (ESLint 18:7); `scale` and `SCREEN_H` only feed `s`. Delete lines 16-18 and `Dimensions` from the import. |
| 13 | `height` (+ `Dimensions` import), `SIZES.cardRadius`, commented-out `// borderRadius: SIZES.cardRadius,`, `styles.tickCircle` | unused local / constant / commented code / unused style | `ProfileCard.js:14` and import at :2; :29; :108; :128-131 | `height` never read; `cardRadius` is referenced only by the commented line 108; `tickCircle` not referenced. Delete all four. |
| 14 | `compact` prop of `UnderMealList` | constant-false prop | `UnderMealList.js:17, 31` | Only caller `MealsSection.js:54-64` forwards its own `compact`, which no caller of MealsSection passes (macro-components B1/G4). Remove here in the same step in which macro-components removes it from MealsSection/MealItemCard; harmless to leave if they do not. |
| 15 | `weightIconColor`, `COLORS.actionIcon`, `COLORS.actionIconActive`, `COLORS.hairline` | unused local / palette entries | FTR:176; FTR:24, 25; FTR:21 | `weightIconColor` never read (ESLint 176:11); `actionIcon*` are read only by it; `COLORS.hairline` has no reader (`grep "COLORS\.hairline" Footer.js`: none). Delete. (`actionCircleActive` equals `actionCircle` but IS read at FTR:177; leave.) |
| 16 | Footer tracing | `console.log` / `console.time` | FTR:199, 200, 208, 212, 213, 217, 218 | Pure tracing on the success path. Delete the seven statements; control flow (the `return`s at 209, 214) stays. |
| 17 | `navParams` | no-op alias | FTR:126 | `typeof params === 'undefined' ? undefined : params` is `params`. Replace the single use at FTR:130 with `params` and delete the line. |
| 18 | `export` on `FOOTER_HIDE_OFFSET` | unused export (binding is used locally at FTR:170) | FTR:14 | grep `FOOTER_HIDE_OFFSET`: Footer.js only. Drop the `export` keyword. |
| 19 | `global.__userDocHydrated` | write-only global | APP:499, 530, 944, 981 | grep `serDocHydrated`: App.js only, never read. Delete the four statements. |
| 20 | `global.__setStickyElementsSuppressed` | global hook nobody calls | APP:424-441 | grep `StickyElements`: App.js plus an unrelated prop `suppressStickyElements={false}` at ABS:298. Callers that need suppression import `setFooterSuppressed` directly (`MacroGoalsSheet.js:23`). Reduce the effect to its only live part: `useEffect(() => () => { clearFooterSuppression(); }, []);`. Then `setFooterSuppressed` is unused in APP:81; drop it from that import. |
| 21 | Feed "post focus" overlay plumbing | global hooks nobody calls, state that is therefore constant | APP:149 (`isFeedPostFocused`), 160 (`feedOverlayProgressSV`), 333-336, 448-466, 468-482; prop passes APP:1713, 1714, 1725, 1726; dependency entries `isFeedPostFocused, feedOverlayProgressSV` at APP:341 | grep `[Ff]eedOverlay` outside App.js: no hit. `global.__setFeedOverlayHidden`, `global.__setFeedOverlayProgress` and the UI-runtime `global.__feedOverlayProgressSV` are never called/read, so `isFeedPostFocused` is always `false` and the shared value is always `1`. Footer (`overlayProgressSV?.value ?? (isHiddenByFocus ? 0 : 1)`, FTR:165) and ABS (`:178`, `:276-277`) compute exactly the same values when the props are omitted. App-only removal: delete the state, the shared value, the unreachable block 333-336, both effects, the four prop passes, and the two dependency entries (they are removed because the identifiers disappear, not to silence a lint). Then `runOnUI` is unused in APP:18. The component-side props (`isHiddenByFocus`/`overlayProgressSV` in Footer, `hideForFocus`/`overlayProgressSV` in ABS) can stay in this pass (they touch worklets); see G6. Confidence that it is dead: high. Because it retires three `global.*` names, record it in the report. |
| 22 | `typeof current === 'function'` branches | unreachable | APP:924-925, 1140-1141 | `unsubRef.current` is only ever assigned `null` (930, 1146) or `{ public, private }` (1070). Delete the branches (keep the two optional calls). |
| 23 | `mounted` flag in the expo-notifications loader | unreachable guard | APP:567, 571, 588 | Line 571 runs synchronously right after 567; nothing asynchronous reads `mounted`. Delete the variable, the guard, and the cleanup `return`. |
| 24 | Empty `if` body | no-op branch | APP:865-867 | `if (!tryNavigateToPendingChat()) { /* comment */ }`. Keep the call for its side effect: `tryNavigateToPendingChat(); // if navigation is not ready yet, the retry effect below picks it up`. |
| 25 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` | stale directive for a rule that does not exist here | APP:569 | Produces the ESLint "Definition for rule ... not found" error. Delete the comment line. |
| 26 | Stale notes | comments | APP:108 (contradicts 105-106), 551 (describes code that is not below it), 1078, 1411-1412; `babel.config.js:5` (`// Add this line`); `firebase.config.js:1, 8, 10` (SDK boilerplate); `pfpCache.js:1` and the `// ← adjust path` at :5; `UnderMealList.js:1`; `fonts.js:254, 262` (`// Your existing fonts`, `// New fonts`); APP:143 says `frontend/fonts.js`, the file is `./fonts.js` | Delete or correct. Keep the "why" comments (APP:3, 5, 10-11, 94, 96, 104, 110, 113, 115, 646, 1033, 1080, 1362, 1377, 1390, 1402). |
| 27 | `iconTop`, `iconBox`, `logoPadTop`, `baseHeaderHeight`, `focusedHeaderOffset`, `focusedHeaderHeight` | computed and returned, never read | `frontend/theme/headerMetrics.js:20-22, 24-29, 37-39, 41-43` | The five consumers read only `centerH, iconSize, marginTop, paddingBottom, paddingH, paddingTop` and `safeAreaOffset` (grep `METRICS\.` in the five files). `FeedHeader.js` has its own local `METRICS` and does not import this module. Delete the computations and return keys; then `s` is used only for `paddingBottom = s(0)` and `centerH = s(40)` (keep). |
| 28 | `chipBg`, `groupAmber` | palette keys nobody reads | `frontend/theme/mfpDark.js:37, 43-44` | grep `\bchipBg\b`: only a LOCAL `chipBg` key in `screens/MacroTracking.js:52`; grep `\bgroupAmber\b`: definition only. No spread / computed access of the theme anywhere (`...theme`, `theme[`: no hit). Not used by PARKED files. Safe to delete. |

### B2. Dead once another partition lands its own cleanup (coordinate)

| # | Identifier | Location | Depends on |
|---|---|---|---|
| 1 | `networkType` state, `lastNetworkCheck` state, `handleRetryNetwork`, and the three props passed to `NoInternet` | APP:155, 156, 284-285, 291-292, 295-299, the `.catch` body at 347, props at 1734-1736 | `frontend/screens/NoInternet.js:25-38` destructures `onRetry`, `networkType`, `lastChecked` but renders none of them (auth-onboarding B1 #2-#5, G2). Passing them is already without effect, so App can drop them independently. After that `evaluateNetworkState` keeps only the `isOffline` update and the mount effect's `.catch` becomes `() => {}`. Caveat: `setLastNetworkCheck(Date.now())` currently forces one root re-render per network event; removal changes render cadence only (nothing depends on it; the two effects with non-reactive deps at APP:902 and 1298 get their re-renders from auth/user state). |
| 2 | `timer` field and `setTimer` action | `workoutStore.js:16, 47-50` | Written once per second by `useWorkoutManager.js:309-311`, read by nobody (workout-active G3). Remove here only together with their removal of `setTimerString`. |
| 3 | `export { MFP_DARK }` | `mfpDark.js:48` | Becomes unused when `QuickAddModal.js` stops using `require(...).MFP_DARK` (G3). |
| 4 | `frontend/screens/FeedScreen.js` (whole file) | file | Becomes unreferenced when `frontend/screens/index.js:12` points at `./1_Feed` (G2). Do not delete; list under "files that can now be deleted". |
| 5 | `isOverlay` prop, `globalOverlayEnabled`, `global.__USE_GLOBAL_FOOTER` | FTR:32, 111-114; APP:443-446, 1724 | Dead only if the nine in-screen `<Footer>` renders are removed (G5 / I3). |

### B3. Verified unreachable, but removal needs the owner (rule 1 protects route names)

- Root route `Explore` (APP:48, 1586): no `navigate('Explore')` anywhere (only a commented line at `screens/4.1_ViewProfile.js:301`); no `linking` config on the container.
- Root route `DeleteAccount` (APP:65, 1625): no navigation to it anywhere; `Settings.js:143-178` deletes through an `Alert`.
- 10 font families and most weights in `fonts.js` (see I4).

### B4. KEEP (looks unused, is not)

- `firebase.config.js` `app`, `navigationRef.js` `navigateRoot`, `mfpDark.js` `MFP_DARK` (see the list of false findings at the top).
- `mfpDark.js` default export and every key other than `chipBg`/`groupAmber`: used by PARKED files through `import theme` and `require(...).default` (`.surface`, `.field`, `.bg`, `.textPrimary`, `.textSecondary`, `.accentBlue`).
- `firebase.config.js` `db`: used by PARKED `LeaderboardsSection.js:34`.
- UPS fallbacks `ensureUserProfileFallback` (53-164), `setUserHandleFallback` (166-201), `setDisplayNameFallback` (382-417): defensive paths for `functions/not-found`; keep.
- The explicit side-effect imports APP:1-6.
- `global.logout` (used by `screens/Settings.js:29, 84`, `screens/DeleteAccount.js:19`), `global.triggerRestReminder` (`NewWorkout/hooks/useRestTimer.js:154`), `global.__markAuthBackgroundReady` (`hooks/useAuthBackgroundSource.js:6`), `global.__lastKnownUid` (`utils/userRefs.js:71-89`, `hooks/useUserDoc.js:77, 102`), `global.__USE_GLOBAL_FOOTER` (FTR:111).

---------------------------------------------------------------------------------------------------

## C. Duplication

### C1. `resolveHandle` + handle-key list (3 definitions, semantically identical)
- UPS:14 (`HANDLE_KEYS`) and UPS:16-28
- `frontend/auth/appleAccount.js:9` (`HANDLE_FIELDS`) and `:11-22`
- `frontend/auth/googleAccount.js:7` and `:9-20`
The key arrays are the same nine strings in the same order. Bodies differ only in form (`const trimmed = value.trim(); if (trimmed) return trimmed;` versus `if (value.trim()) return value.trim();`): identical result for every input (non-object sources skipped, first non-blank string wins, `''` otherwise). `functions/scripts/seedSuggestedUsersFromVerified.js:22` and `functions/shared/deleteUserAndContent.js:862` are different functions; leave.
Canonical home: UPS (both auth modules already import from it). Action here: add `export` to `function resolveHandle` (UPS:16). The auth-onboarding implementer deletes the copies (their C1/G3).

### C2. Handle regex and sanitiser (identical, but an import cycle blocks sharing)
- UPS:13 `HANDLE_REGEX = /^[a-z0-9_.]{6,20}$/` and the inline sanitiser at UPS:357
- `frontend/utils/usernameRegistration.js:3` `USERNAME_REGEX` (same regex) and `:5-8` `sanitizeHandle` (same expression; additionally returns `''` for falsy input, which UPS:354-356 has already excluded)
- `functions/index.js:34` (other runtime; cannot be shared)
`usernameRegistration.js` imports UPS (`finalizeUserProfile`), so UPS cannot import it back. Sharing needs a new leaf module (for example `frontend/utils/handleFormat.js`) that both import, with `usernameRegistration.js` re-exporting the two names for its three screen importers. Low value; do it only if utils-logic agrees, otherwise leave both.

### C3. Stable safe-area insets (identical)
- `frontend/providers/SafeAreaProviderWithStableInsets.js:11-33` (inside `StableInsetsBridge`)
- `frontend/hooks/useStableSafeAreaInsets.js:10-32` (helpers-hooks)
Same hooks in the same order (`useSafeAreaInsets`, `useRef`, `useEffect`, `useMemo`), same expressions, same dependency arrays. Canonical home: the hook. Replace bridge lines 11-33 with `const stableInsets = useStableSafeAreaInsets();` and trim the provider's imports to `React`, `SafeAreaProvider`, `SafeAreaInsetsContext`. No change in the hook file.

### C4. `NewClip` / `EditClip` screen options (identical)
APP:1633-1650 == APP:1656-1673 (jscpd 1632-1653 / 1655-1676). Hoist one module-level `const CLIP_MODAL_OPTIONS = Platform.select({...})` (the `Platform.select` result is constant) and use it for both. `PostOptions` (1678-1700) differs (gesture flags, Android `presentation`); leave.

### C5. Rest-reminder "acknowledge and dismiss" (4 copies inside APP)
The statement `try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch { }` followed by `setRestReminderVisible(false)` appears at APP:1420-1421 (inside `handleOpenWorkoutFromReminder`), 1746, 1748 and 1756 (three identical inline lambdas). Define one `const dismissRestReminder = () => { ...; setRestReminderVisible(false); };` next to `handleOpenWorkoutFromReminder` (after the early return is fine, it is a plain function), use it for the three handlers, and call it from `handleOpenWorkoutFromReminder` after `openActiveWorkout()`. Byte-for-byte the same statements in the same order.

### C6. User-doc unsubscribe (2 copies inside APP)
`cleanupSubscriptions` (APP:921-931) and the inline block at APP:1138-1147 do the same thing. They live in two different effects, so sharing needs a small component-level helper that only touches `unsubRef` (for example `const releaseUserDocSubscriptions = useCallback(() => {...}, [])` declared before the first effect that uses it, or a module-level function taking the ref). After B1 #22 each copy is 5 lines; sharing is optional.

### C7. Timer-clear idiom (15 copies inside APP)
`if (ref.current) { try { clearTimeout(ref.current); } catch { } ref.current = null; }` at APP:523-526, 724-727, 730-733, 747-750, 774-777, 786-789, 835, 844, 905-908, 912-915, 1119-1122, 1123-1126, 1129-1132, 1134-1137, 1185-1188. A module-level `const clearTimerRef = (ref) => { ... }` is behaviour-identical. Optional; the gain is about 30 lines, the cost is 15 edits in a fragile file. If done, do it as its own commit-sized step.

### C8. Other in-file repeats in APP (leave, noted for completeness)
- Notification-response subscription removal: 895-900 and 1155-1161.
- Haptic + vibrate pair: 1103-1104 (unthrottled, inside `triggerRestReminder`) and 1216-1217 (`buzzOnce`, throttled). Not identical in effect; leave.
- Double-`requestAnimationFrame` splash hide: 1369-1373 and 1382-1386.
- "current route" read: 1040 and 1229-1234 (and a variant at 656-657).
- `soundsOn` test (`global?.userData?.settings?.sounds !== false`): APP:1101, 1242, 1288 (and 1042 on `mergedData`); also `screens/1.2_Chat.js:672`, `NewWorkout/hooks/useRestTimer.js:71, 148`. A shared `isSoundEnabled()` would be identical for the three `global` forms, but it spans three partitions for a one-liner; leave.

### C9. UPS: local mirror of a name change (2 copies)
UPS:407-415 (fallback) and UPS:433-441 (callable path) both patch `global.userData.displayName/name` and emit. The paths are mutually exclusive. Could be one `applyLocalName(name)` helper; optional.

### C10. Not duplicates (checked, leave both)
- `frontend/theme/headerMetrics.js:8-46` versus the local `METRICS` in `frontend/components/1_Feed/FeedHeader.js:47-60`: same shape, different numbers (`paddingTop scaleSize(4)` / `paddingBottom s(0)` / `centerH s(40)` here; `s(0)` / `s(4)` / `s(46)` there).
- `frontend/pfpCache.js:41-75` versus `backend/storage/getPFP.js:4-8`: getPFP probes `.png` only and does not cache.
- `normalizeUser` FLBS:21-35: only definition in app code.
- Clamp-to-[0,1] expressions (APP:458, FTR:160, FTR:168): two of them are inside worklets; do not extract.
- Module is reached through three access paths: `import theme from`, `require(...).default`, `require(...).MFP_DARK` (same object, `mfpDark.js:47-48`). Only the last one can be normalised now (G3); the `require(...).default` sites are PARKED.

---------------------------------------------------------------------------------------------------

## D. Decomposition plans

### D1. `App.js` (1822 lines)

Layout today: imports 1-86; module constants and start-up side effects 88-140; `App` 142-1771 (state/refs 143-178; pending-handle/auth status 180-269; footer visibility 271-281, 301-341, 362-366; network 283-299, 343-360; auth-background gate 368-422; global hooks 424-482; auth listener 484-549; notification module + deep-link navigation 555-917; user-doc subscription and push token 919-1076; safety timer 1080-1085; rest reminder 1088-1111; logout cleanup 1113-1190; community stats 1192-1209; `buzzOnce` 1211-1218; foreground notification listener 1220-1268; unread watcher 1270-1298; presence 1300-1336; readiness and splash 1338-1400; loading return 1402-1409; main return 1425-1770); `restStyles` 1773-1821.

Recommended extractions (all are moves; do them after the B1/B2 removals so that dead code is not moved):

| New module | What moves (current lines) | What it needs | Stays in App | Blockers / notes |
|---|---|---|---|---|
| `frontend/navigation/RootNavigator.js` exporting `default function RootNavigator({ isAccountReady, uid })` | `RootStack` creation with its comment (96-97); the screen imports (38-71 except `NoInternet`, 72-74) and `MainTabs` (80); the whole `<RootStack.Navigator> ... </RootStack.Navigator>` JSX (1435-1704) as the function's return value; `CLIP_MODAL_OPTIONS` from C4 | `React`, `Platform`, `Dimensions`, `createNativeStackNavigator`, `createStackNavigator, CardStyleInterpolators, TransitionSpecs` | `<NavigationContainer ref onReady onStateChange><RootNavigator isAccountReady={isAccountReady} uid={uidRef.current} /></NavigationContainer>`; `import { NoInternet } from './frontend/screens'` | The JSX closes over exactly two things: `isAccountReady` (1437, 1438) and `uidRef.current` (1489, 1508); replace the latter by the `uid` prop, nothing else. Keep `id="ROOT"` (used by `navigation.getParent('ROOT')`, e.g. FLBS:83), the `key`, and `initialRouteName` on the Navigator. Do NOT wrap in `React.memo` (today the navigator re-renders with every App render; keep that). `createStackNavigator()` then runs during the import phase instead of at APP:97, still before `enableScreens(true)` at APP:105, exactly like `MainTabs.js:6` already does. After the move APP no longer needs `Dimensions`, `createNativeStackNavigator`, `createStackNavigator`, `CardStyleInterpolators`, `TransitionSpecs`, the screen imports (except `NoInternet`) or `MainTabs`; `Platform` is still used at APP:117 and 577. Risk: low-medium. |
| `frontend/components/RestReminderModal.js` exporting `default function RestReminderModal({ visible, onDismiss, onOpen })` | The `<Modal> ... </Modal>` JSX (1741-1767) and `restStyles` (1773-1821) | `Modal, View, Text, Pressable, StyleSheet, Platform`, `Ionicons, MaterialCommunityIcons`, `rs, ts`, `theme` | State, refs, `global.triggerRestReminder` effect, `dismissRestReminder` (C5), `handleOpenWorkoutFromReminder`. App renders `<RestReminderModal key={`rest-reminder-${restReminderKey}`} visible={restReminderVisible} onDismiss={dismissRestReminder} onOpen={handleOpenWorkoutFromReminder} />` | The `key` must stay on the element App renders, so the modal is remounted per reminder as today. `onRequestClose`, the overlay `Pressable` and the Dismiss button all receive `onDismiss`. After the move APP no longer needs `Modal, View, Text, Pressable`, `Ionicons, MaterialCommunityIcons`, `rs, ts`; check each before trimming the imports (`StyleSheet` is still used at 1737, `Platform` at 577, `Entypo, FontAwesome` at 90-91). Risk: low. |
| `frontend/hooks/useNetworkStatus.js` exporting `default function useNetworkStatus()` returning `{ isOffline }` (or the full set if B2 #1 is not applied) | State 154 (and 155-156 if kept), `evaluateNetworkState` 283-293, `handleRetryNetwork` 295-299 (if kept), the effect 343-360 | `expo-network`, `useCallback, useEffect, useState` | `const { isOffline } = useNetworkStatus();` | No shared refs or closures with the rest of App. Effect order relative to others is irrelevant (it only sets its own state). Risk: low. |
| `frontend/hooks/usePresenceSync.js` exporting `default function usePresenceSync(uidRef, isAuthenticated, userReady)` | `appStateStatusRef` (172) and the effect 1300-1336 with its dependency array `[isAuthenticated, userReady]` unchanged | `AppState`, `serverTimestamp`, the `updateDoc` helper (static import, see F2) | One call at the position of the old effect | Only shared input is `uidRef`. Keep the cleanup's `uidRef.current === uid` check and the `removeEventListener` fallback verbatim. Risk: low. |
| (optional) `frontend/navigation/footerRoutes.js` | `FOOTER_MAIN_SCREENS`, `FOOTER_ROUTE_TAB_OVERRIDES` (99-102), `getActiveTabNameFromState` (128-140) | none | `handleNavigationStateUpdate` imports them | Pure. 20 lines; do it only if it reads better. |
| (optional) `frontend/hooks/useCommunityStatsReady.js` | State 152 and effect 1192-1209 | `initCommunityStats` | `const communityStatsReady = useCommunityStatsReady(isAuthenticated, userReady);` | Independent. Note `refreshCommunityStats` (APP:984) stays in App. |

Expected result: about 1822 - 310 (navigator + screen imports) - 76 (modal + styles) - 30 (network) - 38 (presence) - about 120 (section B) = roughly 1250 lines.

What must NOT be split in this pass, and why:
- Module-level start-up code 94-124 (`global.userData` default, `enableScreens/enableFreeze`, `SplashScreen.preventAutoHideAsync`, LogBox/TextInput defaults). It runs after every import has been evaluated. Moving it into an imported module would run it earlier, in particular `global.userData = global.userData || {}` (APP:95) would then exist while other modules' top-level code runs. Leave in place.
- Pending-handle/auth status (180-269) + auth listener (484-549) + logout cleanup (1113-1190) + user-doc subscription (919-1076) + notification deep links (555-917) + buzz/unread/foreground listeners (1211-1298) + rest reminder state. These share about 25 refs (`uidRef`, `pendingHandleRef`, `unsubRef`, `notificationsRef`, `notifResponseSubRef`, `notifUnsubRef`, `pendingChat*`, `pendingFeed*`, `pendingNotifications*`, `prevUnread*`, `lastBuzzAtRef`, `lastNotificationBuzzAtRef`, `restReminderCycleRef`, `restAckRef`, `logoutCleanupRef`, `logoutResetTimerRef`, `prevMessagesSigRef`, ...) and `logoutCleanupRef.current` (1114-1182) resets nearly all of them. Turning them into hooks would mean inventing a `reset()` contract per hook, which is a rewrite, not a move. Effect ORDER is also load-bearing (H3).
- The splash/readiness block 1338-1409 together with the auth-background gate 368-422 (H5).

### D2. `frontend/components/Footer.js` (565 lines)

| New module | What moves | Notes |
|---|---|---|
| `frontend/components/Footer.styles.js` | `FOOTER_BASE_HEIGHT`, `FOOTER_HIDE_OFFSET` (13-14), `COLORS` (16-27, minus the B1 #15 entries), `styles` (428-554). Export `FOOTER_HIDE_OFFSET`, `COLORS` named and `styles` default. Needs `StyleSheet`, `scaleSize`, `theme`. | `FOOTER_HIDE_OFFSET` is captured by the worklet at FTR:170; a number imported from another module is captured the same way. `styles` depends on `FOOTER_BASE_HEIGHT` and `COLORS`, so they move together. |
| (optional) `frontend/components/StartWorkoutPrompt.js` | The `<Modal> ... </Modal>` JSX at 352-421, as a presentational component with props `backdropOpacity`, `translateY`, `onStart`, `onCancel`. It uses `styles`, `COLORS.actionCircle`, `theme.textSecondary`, `scaleSize`, `MaterialCommunityIcons`, `RNAnimated`. | The state and animation (`isWorkoutPromptVisible`, `startPromptAnim`, `openStartPrompt`, `closeStartPrompt`, the two interpolations; FTR:59-110) stay in Footer because `handleWorkoutPromptStart` (221-225) and `handleWeightPressIn` (231-238) close over them. The `isWorkoutPromptVisible ? ... : null` condition stays in Footer. |

Order of work: first the hook-order fix (E1), then section B, then the moves. Result: about 420 lines (about 350 with the optional prompt).
What stays: the component, its hooks, the tab JSX (249-350) and the memo comparator (557-564).

---------------------------------------------------------------------------------------------------

## E. Latent bugs with minimal fixes

E1. **FTR:111-114: early `return null` in the middle of the hook list** (17 `rules-of-hooks` errors for FTR:142-240). This path is taken at runtime: `global.__USE_GLOBAL_FOOTER` is set by APP:443-446 in App's first commit (the loading tree, before the navigator exists), and nine call sites in eight screens render `<Footer>` without `isOverlay`, so each of those instances runs the hooks at 39-110 and then returns. It works only because the flag never flips during an instance's life.
Fix (recommended, smallest that does not add work): keep the component body as it is minus lines 111-114, rename it (for example `FooterBar`), and add a gate that carries the check:
```js
const Footer = (props) => {
    const globalOverlayEnabled = Boolean(global?.__USE_GLOBAL_FOOTER);
    if (!props.isOverlay && globalOverlayEnabled) {
        return null;
    }
    return <FooterBar {...props} />;
};
```
and keep `export default React.memo(Footer, <same comparator>)`. Effect: the null-rendering in-screen instances no longer run the module-prefetch effect (39-58) or allocate the prompt animation; the overlay instance (mounted whenever `authChecked && isAuthenticated`, APP:1720) runs the same prefetch, and `import()` of an already loaded module is a no-op. Alternative (4-line move): put lines 111-114 directly above `return (` at FTR:247; that makes the null instances subscribe to the workout store and create reanimated hooks they do not need. Either is behaviour-preserving on screen; the gate is preferred. Confidence: high.

E2. **FLBS:186 and FLBS:230: duplicate StyleSheet key `handle`.** The later one wins, so `styles.handle` is the TEXT style (font family/size/colour/letter spacing). It is used for the handle text (FLBS:119, correct) and as the sheet's `handleStyle` (FLBS:142), where those text properties do nothing on a `View`. The `paddingVertical: scaleSize(12)` of the first definition has never been applied.
Fix that preserves what is rendered today: delete the first definition (FLBS:186-188). Leave `handleStyle={styles.handle}` as it is (removing the prop is equivalent, but that is a separate judgement). Do NOT rename the first key to "restore" the padding: that would change the sheet's handle height (I5). Confidence: high.

E3. **APP:569: eslint-disable for an undefined rule** (B1 #25). Delete the comment. Confidence: high.

E4. **`frontend/navigation/MainTabs.js:23`: `detachInactiveScreens: false` inside `screenOptions`.** In `@react-navigation/bottom-tabs` 6.6.1 this is a Navigator prop (`src/types.tsx:287`, read in `src/views/BottomTabView.tsx:41`), not a screen option, so the line has no effect and inactive tabs ARE detached by default. Do not "fix" it by moving it to the Navigator (that changes native screen attachment for all four tabs). Leave the line, or delete it as a no-op; see I6. Confidence that it is a no-op: high.

E5. **Not bugs to fix here, recorded as open questions**: APP:1014 early `return` (I7), APP:1378-1388 splash effect dependencies (I8), APP:1076 `[isAuthenticated]` versus a uid change (I9), `Nunito_500Medium` (I10), `pfpCache.js:13-15` hydrate race (I11).

---------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Issue | Location | Fix | Risk |
|---|---|---|---|---|
| F1 | Hooks after a conditional return | FTR:111-114 | See E1 | low |
| F2 | Lazy `require()` of modules that are already loaded and have no import cycle | `require('./navigationRef')` at APP:653, 708, 743, 757, 764, 817 (APP:13 already imports it statically; `navigationRef.js` imports only `@react-navigation/native`); `require('./backend/helper/firebase/updateDoc').default` at APP:488, 1009, 1025, 1307 (that module imports only `firebase/firestore` and `firebase.config`, both already imported by APP:27-28) | `import { navigationRef, navigateRoot, jumpToTab } from './navigationRef';` and `import updateDoc from './backend/helper/firebase/updateDoc';` (no clash: APP does not import `updateDoc` from `firebase/firestore`). Delete the six/four `require` lines; `navObj` at 653-657 becomes `navigationRef`. The surrounding `try/catch` blocks stay. Guards such as `navigateRoot && navigateRoot(...)` (688, 714, 758), `jumpToTab && jumpToTab(...)` (710), `!jumpToTab \|\| !jumpToTab('Feed')` (818), `navigateRoot?.('Feed')` (819) can stay as written or lose the always-true half. Keep `require('expo-notifications')` at APP:570 lazy (APP:10-11 explains why). | low |
| F3 | Mixed `React.useCallback` / `useCallback` | APP:647, 1364 | Use the imported `useCallback` | none |
| F4 | Identifier shadowing | Local `const Notifications = ...` at APP:570, 850, 1156, 1223 shadows the imported `Notifications` SCREEN (APP:56, used at 1592); local `navigationRef` at APP:743, 764 shadows the import (disappears with F2) | Optional rename of the local to `NotificationsModule`; purely cosmetic | low |
| F5 | Component defined during render, with hooks inside | FLBS:100-128 `FollowRow` (calls `usePfp`, `useUserVerified`); used at FLBS:159 | Hoist to module level as `const FollowRow = ({ item, onPress }) => ...` (replace `onPressUser(item)` at FLBS:107 by `onPress(item)`) and render `<FollowRow item={item} onPress={onPressUser} />`. Today every render of the sheet creates a new component type, so every row unmounts/remounts (its `usePfp` state restarts from the fallback URI). After hoisting rows keep their state across parent renders: same final pixels, fewer remounts. This is the one item in F that changes mount behaviour; apply it, and name it in the report. | low-medium |
| F6 | Inline component props recreated per render | FLBS:160 `ItemSeparatorComponent={() => <View style={styles.sep} />}`; FLBS:159 `renderItem`; FLBS:98 `keyExtractor` | Hoist the separator to a module-level component; `keyExtractor` can move to module level unchanged (keep the `Math.random()` fallback, see H) | low |
| F7 | Trivial forwarding wrapper | `ProfileCard.js:17` `const s = (n) => scaleSize(n);` | Replace `s(` by `scaleSize(` at lines 21-29, 115, 121 and delete the wrapper. Do NOT touch the double scaling (`scaleSize(s(12))`, `scaleSize(SIZES.handleFont)` etc. at 61, 65, 69, 78, 81, 90, 95, 115, 121): it is what is on screen today. | low |
| F8 | Trivial alias | `WorkoutInviteOverlay.js:8` `const AnimatedView = Animated.View;` | Optional: use `Animated.View` directly | none |
| F9 | Duplicate import statements of one module | APP:1 + 22 (`react-native-gesture-handler`), APP:4 + 18 (`react-native-reanimated`) | LEAVE. The bare imports must be the first statements of the entry file; the lint rule cannot express that. | n/a |
| F10 | Import grouping | APP:7-36 mixes react, react-native, expo, navigation, firebase and local modules | Regroup only if the import block is being rewritten anyway (after D1 it shrinks a lot). Never move lines 1-6. | low |
| F11 | State declared between effects | APP:555-565 (refs), 1089-1093, 1338, 1363 | Leave. Moving `useState`/`useRef` lines is legal but buys nothing and makes the diff harder to review. | n/a |
| F12 | `useCallback` whose body reads identifiers declared later in the component | APP:301-341 reads `pendingNotificationsNavRef` (564) and `scheduleNotificationsNavigation` (783) | Works (called only after render; Babel emits `var`). Do not reorder; if `handleNavigationStateUpdate` is ever moved, keep both in scope. The `exhaustive-deps` warning at 341 is informational: `scheduleNotificationsNavigation` is stable (`attemptNavigateToNotifications` has `[]` deps). | n/a |
| F13 | Effects without cleanup | FTR:62-73 and FLBS:57-63 start a `requestAnimationFrame` they never cancel; FLBS:93 `setTimeout(() => setIsVisible(false), 0)` | Harmless one-frame callbacks on refs/setters; leave. | n/a |
| F14 | Non-reactive values in dependency arrays | APP:902 (`notificationsRef.current`), APP:1298 (`global?.userData?.uid`), FLBS:54 (`JSON.stringify(users)`) | LEAVE (rule: never change a dependency array to silence a warning; see H4). | n/a |
| F15 | Indentation | APP:1425-1771 (the main `return` is at column 0-4); FLBS:56-63 (2-space block) | Leave unless the lines are moved by D1; moved JSX may be re-indented as part of the move. | n/a |
| F16 | Unused catch binding | `firebase.config.js:32` `catch (error)`; `pfpCache.js:22, 35, 59, 90` `catch (e)` | Optional: `catch {` | none |

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

Outbound (changes needed in other partitions)

G1. auth-onboarding, `frontend/auth/appleAccount.js:9-22`, `frontend/auth/googleAccount.js:7-20`: after UPS exports `resolveHandle` (C1), delete the local `HANDLE_FIELDS` + `resolveHandle` and import it from `../services/userProfileService`. (Their audit already plans this: auth-onboarding C1/G3.)

G2. auth-onboarding, `frontend/screens/index.js:12`: change to `export { default as Feed } from './1_Feed';`. Then `frontend/screens/FeedScreen.js` has no importer and goes on the "can now be deleted" list (also requested by feed-screen and auth-onboarding G6).

G3. macro-components, `frontend/components/2_MacroTracking/QuickAddModal.js:210, 226, 230, 236, 239`: replace the five inline `require('../../theme/mfpDark').MFP_DARK` by one top-level `import theme from '../../theme/mfpDark';` (same object). After that `export { MFP_DARK };` (`mfpDark.js:48`) can be removed (B2 #3). Their audit lists this as F5.

G4. workout-active, `frontend/logic/useWorkoutManager.js:309-311` (+ calls at 320, 326, 334): when `setTimerString` is removed there, remove `timer`/`setTimer` from `workoutStore.js` in the same step (B2 #2). `patchWorkout` can go immediately (B1 #9).

G5. feed-screen, macro-screens, profile, ladder-and-weight (optional, owner decision I3): the nine in-screen `<Footer currentScreenName=... navigation={navigation} />` renders (`screens/5_Profile.js:199`, `1_Feed.js:1804`, `MacroTracking.js:1018`, `ProfileLoggedFoodsScreen.js:297`, `4_Explore.js:310`, `2_Competition.js:357`, `ProfileWorkoutsAndPostsScreen.js:1102`, `4.1_ViewProfile.js:347, 434`) always render `null`. If they and their imports are removed (and `footerKey` in `screens/feed/hooks/useFeedUserData.js:11, 107` / `1_Feed.js:359`), Footer can drop `isOverlay`, the gate from E1 and `global.__USE_GLOBAL_FOOTER` (B2 #5). Until then the gate stays.

G6. workout-active, ABS:47, 178, 276-277, 378-379 (optional, after B1 #21): `hideForFocus` and `overlayProgressSV` are then passed by nobody; they evaluate to `false` and `1`. Removing them edits a worklet (ABS:178), so treat it as a separate, reviewed step; the same applies to Footer's `isHiddenByFocus`/`overlayProgressSV` (FTR:33-34, 153-155, 165, 559-560).

G7. feed-social / profile-makepost / workout-active (optional consistency): the same unnecessary lazy `require` of `navigationRef` exists at `1_Feed/Notifications/NotificationsModal.js:199, 204, 212`, `5_Profile/MakePost/ClipBuilderScreen.js:135`, `5_Profile/MakePost/PostUploadOptionsScreen.js:1262`, `logic/useWorkoutManager.js:1322`. A static import is equivalent (no cycle: `navigationRef.js` imports nothing local).

G8. workout-tracking, `3_Workout/NewWorkout/Group/GroupModal.js:283`: `fontFamily: "Nunito_500Medium"` names a font that `fonts.js` never registers (it imports Nunito 200/300/400/600/700/800/900 only), so that text falls back to the system font. Do not change it in the refactor (it would change rendering); see I10.

G9. backend-shared, `backend/storage/uploadResumableNative.js:8`: `const app = require('../../firebase.config').app;` directly below a static import of the same module (line 6). Could become `import { storage, app } from '../../firebase.config';`. Either way `app` stays exported.

Inbound (requests other audits addressed to this partition; all accepted)

- auth-onboarding G2: stop passing `onRetry`, `networkType`, `lastChecked` to `NoInternet` (B2 #1). G3: export `resolveHandle`; delete the two throwing stubs and `getPendingHandle` (C1, B1 #1, #4).
- macro-components G4: drop `compact` from `UnderMealList` together with their change (B1 #14).
- workout-active G3: `patchWorkout`, `timer`, `setTimer` (B1 #9, B2 #2). G4 (the `setIsVisible` chain through `workoutStore.js:24`): owner question on their side; no change here. G10 and workout-rest G.9: the dynamic imports at FTR:44-45 reference `./3_Workout/NewWorkout/SelectExercise/SelectExerciseModal` and `./3_Workout/NewWorkout/ActiveWorkoutModal` by path; those files must stay at their paths, and if Footer code is moved to a file in another folder these strings must be adjusted.
- workout-rest G.4: only if they remove the constant `enabled` prop from `WorkoutExperiencePortal`, change APP:1709 to `<WorkoutExperiencePortal uid={uidRef.current} />` in the same step. G.6 (optional): export the initial `sheetHandlers` object from `workoutStore.js:17-27` so `WorkoutExperiencePortal.js:12-23` need not mirror it; note the mirror has one extra key (`persistWorkout`), so this is only identical after they remove that key.
- messages-chat G-6: do not change `messagesCache.js` emit timing, copy semantics or export names (nothing in this audit does). G-7: APP:658-659 and 683-688 must keep the Chat params `cid`, `data`, `usersExcludingSelf`, and APP:1595-1611 must keep `gestureEnabled: false` on iOS.
- feed-screen: `Explore` route (B3, I2). feed-cards G.8: `headerMetrics.js` reads only `paddingHorizontal` (14) and `iconSize` (19) from `getFeedHeaderStyles`, so it does not block removing `logoTextFontSize` there.

---------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

H1. **APP:1-6 import order.** `react-native-gesture-handler` first, then `expo-dev-client`, `react-native-reanimated`, then the base64 polyfill before anything that loads Firebase Storage. Never reorder, merge or "dedupe" these.

H2. **APP:94-124 module-level start-up code** runs after all imports are evaluated: `global.userData` default (95), `enableScreens/enableFreeze` (105-106), `SplashScreen.preventAutoHideAsync()` (111), LogBox filter and `TextInput.defaultProps.keyboardAppearance` (114-124). Keep it in App.js, in this order.

H3. **Effect order inside `App` is load-bearing.**
- The loader effect 566-589 sets `notificationsRef.current`; the response-listener effect 849-902 and the mount-only foreground-listener effect 1221-1268 read it in the same commit and return early if it is null. Both must stay BELOW the loader, and the foreground listener has `[]` deps, so it never gets a second chance.
- `logoutCleanupRef.current` is installed by the effect 1113-1190 and invoked from the auth listener created by the effect 484-549.
- `buzzOnce` (1212) is a plain per-render function captured by effects at 920, 1221, 1271; it only touches refs, so the stale capture is harmless. Do not convert it into something that reads state.
Any extraction that changes the relative order of these effects changes behaviour.

H4. **Dependency arrays that look wrong but must not be "fixed"**: APP:341, 902 (`notificationsRef.current` makes the response-listener effect re-run once on the first re-render after mount, re-reading `getLastNotificationResponseAsync`; `lastHandledNotifIdRef` dedupes), 1076 (`[isAuthenticated]` only; the effect reads `uidRef.current`, `buzzOnce`, `notificationsRef`), 1190, 1268 (`[]`), 1298 (`global?.userData?.uid`, re-evaluated on each App render), 1336; FLBS:54.

H5. **Splash and readiness gating, APP:1338-1409.** Two return trees (1403-1409 and 1425-1770) deliberately share the same outer elements (`SafeAreaProviderWithStableInsets` > `GestureHandlerRootView` with `onLayout`) so the root view is not remounted when `appReady` flips; `onLayoutRootView` (1364-1375), the effect 1378-1388 and the 4.5 s fallback 1391-1400 interact through `authBackgroundReadyRef`. The `authBackgroundReady` STATE (153) is read only by the no-op sync effect 402-406 but its setter causes re-renders; leave all of it byte-for-byte (I8). The hooks all sit above the early return at 1403; keep it that way.

H6. **Navigator identity**: `key={isAccountReady ? 'auth' : 'guest'}` and `initialRouteName` (APP:1437-1438) remount the whole stack on login/logout; `initialParams` read `uidRef.current` at render (1489, 1508); `id="ROOT"` is looked up by screens. The per-route options (1439-1474, 1490-1504, 1514-1534, 1540-1565, 1598-1610, 1633-1700) encode iOS/Android transition behaviour; move them verbatim.

H7. **Worklets**: FTR:157-162 (`useDerivedValue`), FTR:164-173 and 189-191 (`useAnimatedStyle`), APP:468-482 (`runOnUI`, removed by B1 #21). Do not change captured variables or arithmetic. Footer's z-index/elevation `2147483647` (FTR:434-435, 489) and the dead-zone responder (FTR:344-349) are intentional.

H8. **Footer memo comparator (FTR:557-564)** ignores `navigation` and `isOverlay` on purpose; App passes `navigationRef.current`, which changes identity from `null` to the container. Keep the comparator on the exported component.

H9. **Footer press handling**: tabs navigate on `onPressIn` (FTR:255, 282, 314, 325); the Home re-tap writes `global.scrollFeedToTopSignal/Handled` (FTR:262-268), which `screens/1_Feed.js:1239-1243, 1337-1340` consume. Leave.

H10. **`frontend/polyfills/base64.js`**: bit-twiddling polyfill installed as a side effect; do not reformat or "modernise".

H11. **`firebase.config.js:27-36`**: `initializeAuth` in `try`, `getAuth` in `catch` covers double initialisation on fast refresh. Config literals (11-18) and the `"us-central1"` region (25) are part of the backend contract.

H12. **Module-level mutable state**: `pfpCache.js:8-12, 27` (`mem`, `pending`, `hydrated`, `saveTimer`; AsyncStorage key `"pfpCache.v1"` at :10 and the cache key format `${uid}@${version}` at :43); `notificationsStore.js:20-23` (`activeUid`, `unsubscribe`, `lastDoc`, `hasLoadedMore`); `messagesCache.js:1-5`; `authStatusController.js:1-2` (`pendingCache` is replayed to a controller that registers later, :6-8); `headerMetrics.js:6` (`cachedMetrics`, computed from `Dimensions` on first use, which is at import time of its consumers); UPS:203 (`joinDateBackfillAttempted`). Keep semantics and timing.

H13. **UPS Firestore shapes**: collection names (`usersPublic`, `usersPrivate`, `users`, `userHandles`), field names and the `defaultRank` object (UPS:90-101), callable names (UPS:8-10) and error strings shown to users (UPS:183, 359). 2-space indentation in this file and in `workoutStore.js`, `authStatusController.js`, `navigationRef.js`, `base64.js`: keep.

H14. **`SafeAreaProviderWithStableInsets.js:28-33`** reads a ref inside `useMemo` during render by design (the ref trails by one commit). C3 replaces the body by the identical hook; do not "correct" the pattern.

H15. **`ProfileCard.js`** sizes are scaled twice in several places (F7). **FLBS:98** `Math.random()` key fallback only triggers for entries without a uid; leave.

H16. **Expo push**: the literal `projectId` at APP:1022 equals `app.json:52`; the Android channel settings (577-583) and the handler (573-575) are behaviour. Leave.

H17. **`MainTabs.js:18-25`** `screenOptions` (`lazy: false`, `unmountOnBlur: false`, `freezeOnBlur: true`): all four tabs mount eagerly and stay mounted; many screens rely on that.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

I1. Feed post-focus overlay (B1 #21): `global.__setFeedOverlayHidden`, `__setFeedOverlayProgress`, `__feedOverlayProgressSV` have no caller. Was the "hide footer while a feed post is focused" feature removed for good? If yes, the Footer/ABS props can go too (G6).

I2. Routes `Explore` (APP:1586, screen `frontend/screens/4_Explore.js`) and `DeleteAccount` (APP:1625, `frontend/screens/DeleteAccount.js`) are registered but nothing navigates to them. Remove the routes (and list the screens for deletion) or keep them for a planned return?

I3. Nine in-screen `<Footer>` elements always render nothing because of `global.__USE_GLOBAL_FOOTER` (G5). Remove them and the flag?

I4. `fonts.js` loads 15 families (202 font files) before the splash hides, but the app references only 17 names: `Outfit_400Regular/500Medium/600SemiBold/700Bold/800ExtraBold/900Black`, `Nunito_600SemiBold/700Bold/800ExtraBold`, `Poppins_500Medium/600SemiBold/700Bold`, `Mulish_500Medium/700Bold/800ExtraBold`, `Inter_600SemiBold/700Bold` (grep of every `*_NNNWeight` token outside `fonts.js`; no dynamic `fontFamily`). Lato, SourceSansPro, Roboto, Montserrat, OpenSans, Merriweather, PlayfairDisplay, Raleway, WorkSans, FiraSans are never referenced. Trimming `fonts.js` to the used set removes about 235 lines and shortens start-up; it changes start-up timing and is therefore left for the owner to approve. (`package.json` stays untouched either way.)

I5. FLBS: should the sheet handle have the `paddingVertical: scaleSize(12)` of the overwritten first `handle` style (E2)? Today it does not.

I6. `MainTabs.js:23`: `detachInactiveScreens: false` has no effect where it is (E4). Intended as a Navigator prop?

I7. APP:1014 `if (!wantsPush) return;` leaves `mergeAndApply` entirely, so on a real device with push disabled the "vibrate on new unread message" block (1033-1049) never runs and `prevUnreadMsgRef` is never updated. Intended?

I8. APP:1378-1388: the splash-hide effect does not depend on `authBackgroundReady`, so when the auth background becomes ready AFTER `appReady && hasLaidOut`, nothing hides the splash until the 4.5 s fallback (1339-1343, 1391-1400). The state at APP:153 looks like it was meant to trigger that effect. Add it to the dependency array?

I9. APP:919-1076 depends on `[isAuthenticated]` only. If Firebase ever switches users without an intermediate signed-out state (507-521 handles that case by running the logout side effects), `isAuthenticated` stays `true`, the effect does not re-run and no user-doc subscription exists for the new uid. Reachable in practice?

I10. `Nunito_500Medium` is used (`GroupModal.js:283`) but not registered in `fonts.js` (G8). Register it, or switch that style to a registered weight?

I11. `pfpCache.js:13-15`: `hydrated = true` is set before the AsyncStorage read finishes, so calls that arrive during hydration miss the persisted cache and hit Storage. Store the hydrate promise instead?

I12. `global.__restCycleAck` (APP:1098, 1168, 1251, 1420, 1746, 1748, 1756) is read and written only in App.js, always together with `restAckRef`. Keep the global (it survives a remount of App) or use the ref alone?

I13. `mfpDark.js:9`: `card: '#47516A', // alias for surface` is not an alias (surface is `#17171cff`); only `2_MacroTracking/SearchResultCard.js:67` reads it. Comment or value wrong?

I14. UPS: `updateUserHandle` (352-380) re-implements the sanitiser/regex check that the calling screens already perform (C2). Keep both layers?
