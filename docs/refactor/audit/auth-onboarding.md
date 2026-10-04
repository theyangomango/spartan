# Audit: partition "auth-onboarding" (15 files, 2096 lines)

All 15 files were read completely. Every file is byte-identical to its copy in SPX/baseline (checked with `diff -q`).
Line numbers are those of the files as they are now. Paths are relative to the project root
`/Users/yangbai/Desktop/Projects/spartan`.

Indentation per file (keep it, rule 6): 2 spaces in `frontend/auth/*`, `frontend/components/auth/*`,
`0.2_NewUserCreation.js`, `0.4_CreateUsername.js`; 4 spaces in `0.0_SignUp.js`, `0.1_LogIn.js`,
`0.3_UserLogInCredentials.js`, `NoInternet.js`, `index.js`. All files use single quotes.

Machine findings: every ESLint finding in SPX/findings/auth-onboarding.md was reproduced with
`SPX/tools/lint.sh` and verified against the code (details in section B). knip reported no unused exports
and that is correct at the import level, but one export is unreachable at run time (B1).

---------------------------------------------------------------------------------------------------

## A. Module map

| File | Purpose | Exports | Imported by |
|---|---|---|---|
| `frontend/auth/appleAccount.js` (71) | Exchanges an Apple credential for a Firebase session, then asks `prepareProfileForAuth` whether a handle is still needed | `signInWithAppleCredential` (named) | `frontend/components/auth/AppleAuthButton.js:4` only |
| `frontend/auth/googleAccount.js` (60) | Same for Google tokens | `signInWithGoogleResponse` (named) | `frontend/components/auth/GoogleAuthButton.js:4` only |
| `frontend/auth/completeSocialSignup.js` (68) | Deferred social sign-up: signs in with stored provider tokens and finalises the profile after a handle is chosen | `completePendingSocialSignup` (named) | `frontend/screens/0.4_CreateUsername.js:21` only. Unreachable at run time, see B1 |
| `frontend/auth/useAppleAuth.js` (67) | Hook: availability check plus nonce generation and `AppleAuthentication.signInAsync` | default `useAppleAuth` -> `{ signIn, isAvailable }` | `frontend/components/auth/AppleAuthButton.js:3` only |
| `frontend/auth/useGoogleAuth.js` (192) | Hook: resolves client ids / redirect URI, runs the PKCE code flow, exchanges the code, fetches the Google profile. Module side effect `WebBrowser.maybeCompleteAuthSession()` at line 8 | default `useGoogleAuth` -> `{ signIn, loading, isConfigured }` | `frontend/components/auth/GoogleAuthButton.js:3` only |
| `frontend/components/auth/AuthButton.js` (62) | Presentational bounceable button with optional left icon | default `AuthButton` | `AppleAuthButton.js:6`, `GoogleAuthButton.js:5`, `0.0_SignUp.js:13`, `0.1_LogIn.js:14` |
| `frontend/components/auth/AppleAuthButton.js` (97) | "Continue with Apple" button; renders nothing when Apple sign-in is unavailable | default `AppleAuthButton` | `0.0_SignUp.js:15`, `0.1_LogIn.js:16` |
| `frontend/components/auth/GoogleAuthButton.js` (97) | "Continue with Google" button | default `GoogleAuthButton` | `0.0_SignUp.js:14`, `0.1_LogIn.js:15` |
| `frontend/screens/0.0_SignUp.js` (234) | Guest landing screen (route `SignUp`): Google / Apple / "Sign up" plus terms links and a "Log in" footer | default `SignUp` | `frontend/screens/index.js:4` |
| `frontend/screens/0.1_LogIn.js` (222) | Route `LogIn`: Google / Apple / "Log in with Email / Phone" | default `LogIn` | `frontend/screens/index.js:5` |
| `frontend/screens/0.2_NewUserCreation.js` (290) | Route `NewUserCreation`: name + email-or-phone + password + username form; creates the Firebase user and finalises the profile | default `NewUserCreation` | `frontend/screens/index.js:6` |
| `frontend/screens/0.3_UserLogInCredentials.js` (232) | Route `UserLogInCredentials`: identifier + password login; resolves usernames through the `resolveLoginIdentifier` callable | default `UserLogInCredentials` | `frontend/screens/index.js:7` |
| `frontend/screens/0.4_CreateUsername.js` (258) | Route `CreateUsername`: handle picker shown to social sign-ups that have no handle | default `CreateUsername` | `frontend/screens/index.js:8` |
| `frontend/screens/NoInternet.js` (94) | Full-screen offline notice rendered by App.js as an absolute overlay | default `NoInternet` | `frontend/screens/index.js:37`; rendered at `App.js:1733` |
| `frontend/screens/index.js` (37) | Barrel of 32 screen re-exports | 32 named re-exports | `App.js:38-71` (all 32 names), `frontend/navigation/MainTabs.js:4` (`Feed, MacroTracking, Competition, Profile`) |

Outside-partition modules this partition depends on: `frontend/hooks/useAuthProviderFlow.js` and
`frontend/hooks/useAuthBackgroundSource.js` (helpers-hooks), `frontend/helper/scaleSize.js` (helpers-hooks),
`frontend/services/userProfileService.js`, `frontend/state/authStatusController.js`, `frontend/theme/mfpDark.js`,
`firebase.config.js` (app-shell), `frontend/utils/usernameRegistration.js` (utils-logic).
No PARKED, TOOLING or functions/ file imports anything from this partition (repo-wide grep for every export name).

Barrel check (`frontend/screens/index.js`): each of the 32 exported names is imported by `App.js:38-71` and used
exactly once there as `component={X}` or `<X` (counted per name); none is unused. No file imports the
partition's screens by direct path, so the barrel is the single import path.

---------------------------------------------------------------------------------------------------

## B. Verified dead code

### B1. Remove (verified)

| # | Identifier | Kind | Location | Evidence / exact action |
|---|---|---|---|---|
| 1 | `TouchableOpacity` | unused import | `frontend/screens/NoInternet.js:2` | Not referenced in the file. Remove from the import list. |
| 2 | `onRetry` prop | prop with no effect | `NoInternet.js:25`, default at `:43` | Destructured, never used; no retry control is rendered (JSX is lines 30-38). Remove from the signature and from defaultProps. App.js still passes it (G2); extra props are ignored, so order of the two edits does not matter. |
| 3 | `connectionLabel`, `lastCheckedLabel` | computed, never read | `NoInternet.js:26-27` | Assigned by `useMemo`, never rendered. Remove both lines. |
| 4 | `capitalize`, `formatNetworkType`, `formatLastChecked` | functions only used by #3 | `NoInternet.js:7-10`, `:12-16`, `:18-23` | Only callers are lines 15, 26, 27. No other definition or use repo-wide. Remove. |
| 5 | `networkType`, `lastChecked` props | props with no effect | `NoInternet.js:25`, defaults `:45-46` | Only feed #3. Remove. |
| 6 | `useMemo` | import unused after #3 | `NoInternet.js:1` | Becomes `import React from 'react';`. |
| 7 | `NoInternet.defaultProps` | block unnecessary after #2/#5 | `NoInternet.js:42-47` | Only `style: null` would remain; `[styles.root, undefined]` and `[styles.root, null]` flatten identically and App.js always passes `style` (`App.js:1737`). Remove the whole block. Resulting signature: `export default function NoInternet({ style }) {`. |
| 8 | `styles.metaText`, `styles.actionButton`, `styles.actionLabel` | unused StyleSheet keys | `NoInternet.js:75-81`, `:82-88`, `:89-93` | Not referenced. Remove. (`theme.muted` is then unused in this file; `ts` and `scaleSize` are still used by `title`/`subtitle`/`iconCircle`.) |
| 9 | `Octicons` | unused import | `frontend/screens/0.3_UserLogInCredentials.js:4` | Not referenced. Line becomes `import { Feather } from '@expo/vector-icons';`. |
| 10 | `resolvedType` | variable assigned, never read | `0.3_UserLogInCredentials.js:57`, `:66`, `:69`, `:75` | Four writes, zero reads. Delete all four lines. Line 75's right-hand side is pure (`data.resolvedType \|\| data.type \|\| (loginEmail.endsWith(...) ? ... : ...)`), so nothing else changes. |
| 11 | `styles.helpIcon` | unused StyleSheet key | `0.3_UserLogInCredentials.js:171-173` | Not referenced (no help icon is rendered). Remove. |
| 12 | `ensure` | variable assigned, never read | `frontend/screens/0.2_NewUserCreation.js:86` | Keep the call, drop the binding: `await finalizeUserProfile({`. |
| 13 | `emailInputRef` | ref attached, `.current` never read | `0.2_NewUserCreation.js:27` (creation), `:138` (`ref={emailInputRef}`) | Only two occurrences in the file. Remove both; `useRef` then leaves the import at line 2 (`import React, { useState } from 'react';`). |
| 14 | `pendingSocialAuth` branch in CreateUsername | unreachable branch | `frontend/screens/0.4_CreateUsername.js:27` (param read), `:28` (`resolvedProfile`), `:68-74` (branch), `:85` (deps), `:21` (import) | The route param `pendingSocialAuth` is never supplied. Repo-wide `grep pendingSocialAuth` finds only this file and `frontend/hooks/useAuthProviderFlow.js:16-27`, where it is read from `result?.pendingSocialAuth`; `result` is the object returned by `signInWithAppleCredential` (`appleAccount.js:53-60`) or `signInWithGoogleResponse` (`googleAccount.js:52-59`) spread by the buttons (`AppleAuthButton.js:54`, `GoogleAuthButton.js:49`), and neither returns that key. The only other navigation to `CreateUsername` is `App.js:207-213`, which does not pass it. App.js has no deep-link (`linking`) config. Git history confirms a leftover: commit `b46d84b1` ("after handle") added `pendingSocialAuth` to both account modules, commit `fb80a37c` ("auth", same day) removed it from them and left the consumers. Action: delete line 21, line 27, line 28; replace lines 68-76 with the single statement `await claimHandle(normalized, pendingProfile \|\| undefined);` (keep its 6-space indent inside `try`); deps at line 85 become `[handle, navigation, nextRoute, pendingProfile, saving]` (the two removed names no longer exist, so this is not a lint-silencing change). |
| 15 | `completePendingSocialSignup` and the whole file | export only used by #14 | `frontend/auth/completeSocialSignup.js:1-68` | After #14 nothing imports the file. Do not delete it (rule 8): list `frontend/auth/completeSocialSignup.js` under "files that can now be deleted". Its private helpers `signInWithGoogle` (`:7-13`), `signInWithApple` (`:15-25`) and `appleProvider` (`:5`) go with it. |
| 16 | `loading` state of `useGoogleAuth` | state set, never read | `frontend/auth/useGoogleAuth.js:99` (state), `:116` (`setLoading(true)`), `:186-188` (`finally { setLoading(false); }`), `:191` (returned) | The only consumer destructures `{ signIn, isConfigured }` (`GoogleAuthButton.js:19`) and keeps its own `busy` state. Remove the state, both setters, the then-empty `finally` block, `loading` from the return object, and `useState` from the import at line 1. Effect: two fewer re-renders of `GoogleAuthButton`; nothing reads the value. Low risk, but this file is otherwise fragile (H1): touch only these lines. |
| 17 | `activeClientId` | `useMemo` that only forwards | `useGoogleAuth.js:101-103`, used at `:145` and in deps `:189` | `useMemo(() => effectiveClientId, [effectiveClientId])` returns its input. Replace both uses with `effectiveClientId`, delete lines 101-103, drop `useMemo` from the import at line 1. `effectiveClientId` is a string, so the callback identity behaves the same. |
| 18 | `tokens.scope`, `tokens.expiresIn` | returned fields never read | `useGoogleAuth.js:179-180` | The return value of `signIn` goes only to `signInWithGoogleResponse({ profile, tokens })` (`GoogleAuthButton.js:45-48`), which reads `tokens.idToken` and `tokens.accessToken` only (`googleAccount.js:23`, `:27`). Removing the two lines is safe; optional. |
| 19 | `disabled` prop of `AppleAuthButton` / `GoogleAuthButton` | prop no caller passes | `AppleAuthButton.js:16`, `:75`; `GoogleAuthButton.js:16`, `:72` | Callers: `0.0_SignUp.js:72-85`, `0.1_LogIn.js:87-100`; none passes `disabled`. Remove the prop; `disabled={busy}` and `disabled={busy \|\| !isConfigured}` respectively. Zero behaviour change. |
| 20 | `!isAvailable` branch inside `AppleAuthButton.onPress` | unreachable branch | `AppleAuthButton.js:39-46` | When `isAvailable` is false the component returns `null` (`:63-65`), so the `onPress` closure created in that render is never attached to a button; when it is true the branch is skipped. `useAppleAuth.signIn` has its own guard (`useAppleAuth.js:35-37`). Removing lines 39-46 also removes the only use of `Platform` (import at `:2`) and `isAvailable` from the deps at `:61` (still used at `:63`). Optional; low risk. |

### B2. Constant or currently-unreachable, recommended KEEP

| Identifier | Location | Why it is constant | Why keep |
|---|---|---|---|
| `hasAnyClientId` / `isConfigured` (always `true`) | `useGoogleAuth.js:37`, guard `:106-108`, returned `:191`; consumers `GoogleAuthButton.js:39-42`, `:58-60`, `:72` | `baseConfig.iosClientId` falls back to the hard-coded `DEFAULT_CLIENT_IDS.ios` (`:10-12`, `:22`), so `fallbackClientId` (`:27-30`) is always a non-empty string. The "Google setup required" label and both "not configured" errors can never appear. | It is a configuration guard that becomes live the moment the hard-coded default is removed. Owner decision (I4). |
| `...(baseConfig.iosClientId \|\| fallbackClientId ? {...} : {})` and the android twin | `useGoogleAuth.js:92-97` | Same reason: both conditions are always truthy. | Part of the fragile request config (H1). |
| `isUsingExpoProxy && !isStandaloneLike` | `useGoogleAuth.js:62` (and `:49`) | `isUsingExpoProxy` already implies `!isStandaloneLike`. | H1. |
| `useProxy` options | `useGoogleAuth.js:66`, `:118-120` | expo-auth-session 5.4.0 no longer reads `useProxy` anywhere (`grep useProxy node_modules/expo-auth-session/build` is empty; `makeRedirectUri` signature has no such option). | H1; a library upgrade or downgrade changes the meaning. |
| `Alert.alert` fallback when `onError` is not a function; `typeof onSuccess === 'function'` guard | `AppleAuthButton.js:22-34`, `GoogleAuthButton.js:22-34` | Both callers always pass `onSuccess` and `onError`. | Removing would make a future caller that omits `onError` swallow errors; cheap defensive default. |
| `iconColor = theme.textPrimary` default | `AuthButton.js:10` | The only caller that passes `icon` also passes `iconColor` (`AppleAuthButton.js:71-72`). | Default parameter, harmless. |
| `label="Continue with Google"` / `"Continue with Apple"` at call sites | `0.0_SignUp.js:73`, `:80`; `0.1_LogIn.js:88`, `:95` | Same strings as the components' `DEFAULT_LABEL`. | Explicit at the call site; removing is churn. |
| `if (__DEV__) console.log('[GoogleAuth]', ...)` | `useGoogleAuth.js:70-83` | Dev-only config dump, runs on every render of the hook. | Behind `__DEV__` and evidently intentional (briefing rule). See I5. |
| `isNewUser === false ? false : (...)` | `appleAccount.js:47`, `googleAccount.js:46` | `isNewUser` is always `null` (E2), so the first arm never runs. | Removing it would cement a bug whose intended fix is an owner decision (I1). |

Nothing in this partition is used only by PARKED files.
There is no commented-out code in the partition; the only comments are `0.3_UserLogInCredentials.js:26` and
`index.js:1-2`, both explanatory. The only `console.*` call is the `__DEV__` one above.

---------------------------------------------------------------------------------------------------

## C. Duplication

### C1. `HANDLE_FIELDS` + `resolveHandle` (3 definitions; semantically identical)
- `frontend/auth/appleAccount.js:9` and `:11-22`
- `frontend/auth/googleAccount.js:7` and `:9-20` (byte-identical to the Apple copy: `diff` of apple 9-22 vs google 7-20 is empty)
- `frontend/services/userProfileService.js:14` (`HANDLE_KEYS`) and `:16-28` (app-shell partition)

Comparison: the key arrays have the same nine strings in the same order. The auth copies return
`value.trim()` when `typeof value === 'string' && value.trim()`; the service copy computes `trimmed = value.trim()`
and returns it when truthy. Same result for every input (non-objects skipped, non-strings skipped, whitespace-only
skipped, first hit wins in the same source and key order).
(`functions/scripts/seedSuggestedUsersFromVerified.js:22` has an unrelated `resolveHandle(data)`; leave it.)

Canonical home: `frontend/services/userProfileService.js`, which both auth modules already import
(`appleAccount.js:3`, `googleAccount.js:3`), so no new edge and no cycle. Needs `export` added at
`userProfileService.js:16` (G3). Then delete `appleAccount.js:9-22` and `googleAccount.js:7-20` and extend the
existing import to `{ prepareProfileForAuth, resolveHandle }`.

### C2. Post-sign-in block in the two account modules (identical apart from two tokens)
- `frontend/auth/appleAccount.js:45-60`
- `frontend/auth/googleAccount.js:44-59`

`diff` shows exactly two differing lines: the last argument of `resolveHandle(...)` (`credential` vs `profile`) and
`provider: 'apple'` vs `'google'`. Optional extraction into one helper in a new `frontend/auth/providerSignIn.js`
taking `{ user, isNewUser, profilePayload, extraSource, provider }`. This is a small rewrite, not a verbatim move:
low risk, modest gain (about 14 lines). Recommended only if C1 is done at the same time; otherwise leave.

Observation (do not act on it, see I2): given the documented shapes of the Apple credential and the Google userinfo
response, the local `resolveHandle` call and the `publicProfile` patch (`appleAccount.js:46-51`,
`googleAccount.js:45-50`) recompute what `prepareProfileForAuth` already did
(`userProfileService.js:248-254`), so `requiresHandle` always equals `!!prepared?.requiresHandle`.

### C3. Width-375 scale helper (not the shared `scaleSize`)
Definitions of `Math.round(n * (windowWidth / 375))`:
- `frontend/screens/0.0_SignUp.js:20-26`
- `frontend/screens/0.1_LogIn.js:20-26`
- `frontend/screens/0.3_UserLogInCredentials.js:10-16`
- outside the partition: `frontend/components/ViewProfile/ViewProfileRowButtons.js:12-17`,
  `frontend/components/5_Profile/MakePost/PostUploadOptionsScreen.js:29-34`,
  `frontend/components/5_Profile/MakePost/ClipBuilderScreen.js:22-24` (arrow form),
  `frontend/components/5_Profile/EditProfile/EditProfileModal.js:12-17` (named `wScale`),
  `frontend/components/1_Feed/FeedHeader.js:35-38` (named `s`)

All eight are identical in behaviour (window width read once at module load, same rounding).
They are NOT the same as `frontend/helper/scaleSize.js:21-23` (base 390, min of the width and height ratios) nor as
its `hs` (`:28`, base 390). Never replace a local copy with the default `scaleSize`: every pixel value would change.

Canonical home: a new named export in `frontend/helper/scaleSize.js` (G4), for example
`export const scaleW375 = (n) => Math.round(n * (SCREEN_WIDTH / 375));`. To avoid touching every call line
(rule 6), import it under the local name: `import { scaleW375 as scaleSize } from '../helper/scaleSize';` and delete
the local `scale` / `scaleSize` declarations. In `0.0_SignUp.js` and `0.1_LogIn.js` the `Dimensions` import then
becomes unused (remove it); in `0.3_UserLogInCredentials.js` `Dimensions` is still needed for `screenHeight`
(`:10`, used at `:176`), so keep `const { height: screenHeight } = Dimensions.get('window');`.

### C4. SignUp vs LogIn (jscpd: 0.0:48-62 == 0.1:55-69, 0.0:134-158 == 0.1:142-166, 0.0:206-226 == 0.1:194-214)
JSX: the `ImageBackground` + `SafeAreaView` opening (`0.0_SignUp.js:54-62`, `0.1_LogIn.js:61-68,77`), the
Google/Apple button pair (`0.0:72-85`, `0.1:87-100`; differ only in `busyText`) and the footer
(`0.0:108-113`, `0.1:110-115`).
Styles (`diff` of `0.0:119-232` vs `0.1:121-220`): identical keys `background`, `backgroundImage`, `safeArea`,
`heroSection`, `heroTitle`, `heroSubtitle`, `actions`, `errorText`, `googleButton`, `appleButton`, `primaryButton`,
`primaryButtonText` (only a trailing comma differs at `0.0:205`), `footer`, `footer_regular_text`;
`log_in_text` (`0.0:227-231`) and `sign_up_text` (`0.1:215-219`) have identical bodies. Real differences:
`inner.paddingTop` 92 vs 70; the module constants `HERO_MARGIN_BOTTOM` (`0.0:28` = scaleSize(40); `0.1:32-35`
computed) and `ACTIONS_MARGIN_TOP` (16 vs 12) that feed `heroSection` and `actions`; `backButton` only in LogIn;
the four `agreement*` keys only in SignUp.

Recommendation: optional, low risk. Move the entries that are identical and constant-free (`background`,
`backgroundImage`, `safeArea`, `heroTitle`, `heroSubtitle`, `errorText`, `googleButton`, `appleButton`,
`primaryButton`, `primaryButtonText`, `footer`, `footer_regular_text`, plus one link-text entry) verbatim into a new
`frontend/components/auth/authLanding.styles.js` that uses the same width-375 scale (C3), and spread it into each
screen's `StyleSheet.create`. Do not merge the two screens into one component: that is a rewrite with no tests.
If C3 is not done, skip C4 (the shared module would need its own copy of the scale helper).

### C5. CreateUsername vs ChangeUsername vs ChangeName (profile partition owns the latter two)
- StyleSheet: `frontend/screens/0.4_CreateUsername.js:149-256` is byte-identical to
  `frontend/screens/ChangeUsername.js:132-239` (`diff` shows only the `export default` line). Against
  `frontend/screens/ChangeName.js:143-247` the only difference is one key: `usernamePrefix` (0.4:216-221) vs
  `inputIcon` (`{ marginRight: scaleSize(8) }`). All three import the same `scaleSize` and `theme`.
- Imports `0.4:1-18` == `ChangeUsername.js:1-18` == `ChangeName.js:1-18`.
- Component skeleton (helperText memo, background hook, `onSubmit` shape, whole JSX tree): `0.4:33-38,48-51,53-66`
  vs `ChangeUsername.js:28-33,43-46,48-60`; JSX `0.4:89-146` vs `ChangeUsername.js:74-129` vs `ChangeName.js:78-140`
  (titles, subtitle, CTA label, input adornment and submit action differ).
- Strings: the helper sentence appears at `0.4:35`, `ChangeUsername.js:30`, `0.2_NewUserCreation.js:174`; the regex
  error at `0.4:61`, `ChangeUsername.js:56`, `0.2_NewUserCreation.js:69`, `userProfileService.js:359`.

Recommendation: share the StyleSheet only. New module `frontend/screens/handleForm.styles.js` containing lines
`0.4:149-256` moved verbatim plus the `inputIcon` entry from ChangeName, default-exporting the sheet; the three
screens import it as `styles` (G5). An unused key in a consumer has no effect, so the result is visually identical.
A shared screen component for the three would be a rewrite (medium risk); not recommended in this pass.

### C6. AppleAuthButton vs GoogleAuthButton
`AppleAuthButton.js:8-37` and `GoogleAuthButton.js:8-37` are the same apart from names and the Alert title; the
`onPress` bodies (`:36-61` vs `:36-56`) share the busy / try / catch / finally skeleton. Extracting a hook would be a
rewrite of two 97-line files that work; leave. `DEFAULT_BUSY_LABEL = 'Signing in…'` is defined in both (`:9`) and is
never the visible value because both callers pass `busyText`; leave.
Also `handleSuccess({ provider: 'apple', ...result })` (`AppleAuthButton.js:54`) and the Google twin (`:49`) set a key
that `result` already carries with the same value (`appleAccount.js:59`, `googleAccount.js:58`); harmless, leave.

### C7. NewUserCreation vs UserLogInCredentials styles: NOT duplicates
`0.2_NewUserCreation.js:190-288` and `0.3_UserLogInCredentials.js:152-230` look alike (`container`, `iconContainer`,
`backIcon`, `title`, `input`, `footerContainer`, `errorText`), but 0.2 uses the shared `scaleSize` (base 390, min
axis) while 0.3 uses the local width-375 one, and several values differ (`iconContainer.top`, `formWrapper.paddingTop`,
`formContainer.alignItems`). Leave both.

### C8. Handle validation constants (cross-partition, for information)
`USERNAME_REGEX` (`frontend/utils/usernameRegistration.js:3`) == `HANDLE_REGEX`
(`frontend/services/userProfileService.js:13`) == `HANDLE_REGEX` (`functions/index.js:34`, cannot be shared).
`sanitizeHandle` (`usernameRegistration.js:5-8`) has the same body as the inline expression at
`userProfileService.js:357` (identical for the non-empty trimmed string it receives there).
`usernameRegistration.js` imports `userProfileService.js`, so the service cannot import it back without a cycle; a
leaf module would be needed. Owners: utils-logic / app-shell.

### C9. Email pattern and phone-alias domain
`/^([^@\s]+)@([^@\s]+)\.([^@\s]+)$/` (`0.2_NewUserCreation.js:58`) and `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`
(`0.3_UserLogInCredentials.js:60`) accept the same strings (capture groups only). `'@phone.spartan.app'` is spelled out
at `0.2:81`, `0.3:68` (and `0.3:75`, removed by B1 #10). Two uses each inside one flow; a shared constants module is
not worth a new file. Leave.

### C10. Auth background fallback asset
`import authBackground from '../assets/AUTH_BACKGROUND.jpg'` (`0.0_SignUp.js:16`, `0.1_LogIn.js:17`) vs inline
`require('../assets/AUTH_BACKGROUND.jpg')` (`0.4_CreateUsername.js:92`, `ChangeUsername.js:77`, `ChangeName.js:81`);
`frontend/utils/authBackground.js:2` imports the same asset. Same Metro module id either way. Optional consistency
fix inside the partition: use the `import` form in `0.4_CreateUsername.js`. No behaviour change.

---------------------------------------------------------------------------------------------------

## D. Decomposition plans for files over about 500 lines

None. The largest file is `0.2_NewUserCreation.js` (290 lines). The only new modules worth creating are the
shared ones named in C3, C4 and C5.

---------------------------------------------------------------------------------------------------

## E. Latent bugs

| # | Location | Problem | Minimal fix | Confidence | Apply? |
|---|---|---|---|---|---|
| E1 | `frontend/components/auth/AuthButton.js:30` | `styles.text` is referenced but the StyleSheet (`:34-60`) has no `text` key, so the first element of the style array is `undefined`. | Replace `style={[styles.text, textStyle]}` with `style={textStyle}`. Rendering is identical (an `undefined` entry is ignored) and all four callers pass `textStyle`. | high | Yes (record it). Whether a base text style was intended is I8. |
| E2 | `frontend/auth/appleAccount.js:35`, `frontend/auth/googleAccount.js:30` | `userCredential.additionalUserInfo` does not exist in the modular Firebase SDK in use (firebase 10.14.1: `UserCredentialImpl` has only `user`, `providerId`, `_tokenResponse`, `operationType`; see `node_modules/@firebase/auth/dist/rn/index-2f66320e.js:5958-5964`). `isNewUser` is therefore always `null`: the `isNewUser === false` arm at `appleAccount.js:47` / `googleAccount.js:46` and the first test at `frontend/hooks/useAuthProviderFlow.js:14` never fire. | The API-correct form is `getAdditionalUserInfo(userCredential)?.isNewUser ?? null` (import from `firebase/auth`). | high that it is a bug | NO. The fix changes who is sent to CreateUsername (a returning user without a handle would no longer be asked). Open question I1. |
| E3 | `frontend/screens/0.3_UserLogInCredentials.js:92` | Only `auth/user-not-found` and `auth/wrong-password` map to "Invalid credentials". Current Firebase projects with email-enumeration protection answer `auth/invalid-credential`, which falls through to "Unable to sign in. Check your connection." | Add `\|\| code === 'auth/invalid-credential'` to the condition. | medium (depends on the project's Auth setting) | NO (user-visible text change). I6. |
| E4 | `frontend/auth/useGoogleAuth.js:85-98` with `:142-152` | The code is exchanged twice: manually at `:142` and again by the library's own effect, because `shouldAutoExchangeCode` defaults to true for a successful code result (`node_modules/expo-auth-session/build/providers/Google.js:178-209`). An authorization code is single-use, so the later request fails; the library's promise has no `.catch` (unhandled rejection). It works today only because the manual request is issued first. | Pass `shouldAutoExchangeCode: false` in the `useAuthRequest` config. | medium | NO (changes network behaviour of a flow that cannot be tested here). I7, H1. |
| E5 | `frontend/auth/useGoogleAuth.js:95-97` | On Android without `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` the iOS client id is passed as `androidClientId`. | None proposed. | low | NO. I9. |

No conditional hooks, no effects without cleanup, no duplicate object keys and no references to undefined
identifiers were found in the partition (lint confirms: 0 errors).

---------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

| # | Location | Issue | Fix | Risk |
|---|---|---|---|---|
| F1 | `0.3_UserLogInCredentials.js:155`, `:185`, `:196`, `:198`, `:214` | Inline `require('../theme/mfpDark').default.<key>` five times although `theme` is imported at `:5` and used in JSX (`:109`, `:120`, `:132`). Same module reached in two forms. | Replace with `theme.bg`, `theme.textPrimary`, `theme.field`, `theme.textPrimary`, `theme.primary`. Same module instance, same values. | none |
| F2 | `0.0_SignUp.js:63` | The inline style repeats `marginBottom: HERO_MARGIN_BOTTOM`, which `styles.heroSection` already sets (`:139`), and creates a new object each render. | Move `marginTop: CONTENT_OFFSET` into `styles.heroSection` and use `style={styles.heroSection}`. Same computed style. | very low |
| F3 | `0.0_SignUp.js:20-26`, `0.1_LogIn.js:20-26`, `0.3_UserLogInCredentials.js:10-16` | A local function named `scaleSize` that is not the shared `scaleSize` (different base). Easy to "fix" wrongly. | C3 (single named export, imported under the local alias). | low; needs G4 |
| F4 | `frontend/auth/useGoogleAuth.js:101-103`, `:99` | No-op `useMemo`; state nobody reads. | B1 #16 and #17. | low |
| F5 | `frontend/auth/useGoogleAuth.js:189` | `hasAnyClientId` (module constant) listed as a hook dependency (lint warning). | Harmless. The array is edited anyway by B1 #17 (`activeClientId` -> `effectiveClientId`); dropping `hasAnyClientId` in the same edit is acceptable, otherwise leave it (briefing: never edit a deps array only to silence the warning). | none |
| F6 | `frontend/screens/NoInternet.js:42-47` | `defaultProps` on a function component (deprecated pattern). | Removed by B1 #7. | none |
| F7 | `0.4_CreateUsername.js:92` | Inline `require` of an asset that sibling screens import statically. | C10. | none |
| F8 | `0.4_CreateUsername.js:33-36`, `:87` | `helperText` memo and `showSpinner = saving` alias are trivial. | Leave: `ChangeUsername.js:28-31,72` and `ChangeName.js:31-34,76` have the same lines; keep the three files parallel unless all are changed together. | n/a |
| F9 | Import grouping: `0.2_NewUserCreation.js:1-2`, `0.3_UserLogInCredentials.js:1-8`, `AuthButton.js:1-2` | A third-party import precedes `react`; in 0.3 the `theme` import sits between third-party imports. | Reorder only in files that are being edited anyway (0.2, 0.3, AuthButton all are). No functional effect; all are plain ES imports with no side-effect ordering. | none |
| F10 | `0.3_UserLogInCredentials.js:28` | The `keyboardDidHide` subscription is named `showSubscription`. | Cosmetic; leave (H4). | n/a |

Not issues: hooks in `AppleAuthButton.js` are all above the early `return null` (`:63`); `useAppleAuth.js:9-32`
and `0.3_UserLogInCredentials.js:27-37` clean up; no component is defined during another component's render; no
module is imported twice in any file.

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

| # | Target (partition) | Request |
|---|---|---|
| G1 | `frontend/hooks/useAuthProviderFlow.js:16-27` (helpers-hooks) | Remove the dead `pendingSocialAuth` constant and branch (never set by any sign-in result; see B1 #14). Independent of the CreateUsername edit: neither order breaks anything. Leave line 14's `result?.isNewUser === false` alone (E2 / I1). |
| G2 | `App.js:1733-1738` (app-shell) | Stop passing `onRetry`, `networkType`, `lastChecked` to `NoInternet` (it ignores them; B1 #2-#5). That leaves `handleRetryNetwork` (`App.js:295-299`), the `networkType` state (`:155`, written at `:291-292`) and the `lastNetworkCheck` state (`:156`, written at `:285`, `:298`, `:347`) with no reader. Caveat for app-shell: `setLastNetworkCheck(Date.now())` currently forces a root re-render on every network event; removing it changes render cadence only. |
| G3 | `frontend/services/userProfileService.js:16` (app-shell) | Add `export` to `function resolveHandle` so `appleAccount.js` and `googleAccount.js` can drop their copies (C1). Also for app-shell's own audit: the throwing stubs `ensureUserProfile` (`:223-225`) and `setUserHandle` (`:227-229`) have no importer anywhere, and `getPendingHandle` (`frontend/state/authStatusController.js:37-42`) has no importer either. |
| G4 | `frontend/helper/scaleSize.js` (helpers-hooks) | Add one named export for the width-375 scale (C3) so the three auth screens and the five other copies can import it. |
| G5 | `frontend/screens/ChangeUsername.js:132-239`, `frontend/screens/ChangeName.js:143-247` (profile) | Import the shared StyleSheet (C5) instead of the local copy. Agree on the module path first (`frontend/screens/handleForm.styles.js` proposed); whichever partition runs first creates it by moving `0.4_CreateUsername.js:149-256` verbatim and adding ChangeName's `inputIcon` entry. |
| G6 | `frontend/screens/FeedScreen.js` (feed-screen) | The file is a one-line forwarder (`export { default } from './1_Feed';`) whose only importer is `frontend/screens/index.js:12`. If feed-screen agrees, change the barrel line to `export { default as Feed } from './1_Feed';` and list `FeedScreen.js` as deletable. |
| G7 | `frontend/utils/usernameRegistration.js`, `frontend/services/userProfileService.js:13,357` (utils-logic / app-shell) | Information only: duplicated handle regex and sanitiser (C8); a leaf module is needed to avoid an import cycle. |

Nothing outside this partition needs to change for B1 #1-#13, #16-#20, E1, F1, F2.

---------------------------------------------------------------------------------------------------

## H. Fragile areas

1. `frontend/auth/useGoogleAuth.js` as a whole. Client-id and redirect resolution (`:46-68`), the `useAuthRequest`
   config (`:85-98`), the manual exchange (`:142-152`) and its race with the library's automatic exchange (E4).
   Limit edits to B1 #16-#18. Do not remove or "simplify" the `useProxy` options, the conditional spreads, the
   redundant `&& !isStandaloneLike`, or the `__DEV__` log. `WebBrowser.maybeCompleteAuthSession()` (`:8`) is a
   module-level side effect and must stay at module top.
2. `frontend/auth/useAppleAuth.js:40-53`: raw nonce -> SHA-256 -> `signInAsync`, with the raw nonce later handed to
   Firebase (`appleAccount.js:29-32`). Order and encodings must not change. `appleProvider`
   (`appleAccount.js:5`) is a module-level instance; keep it.
3. Sign-in sequencing against App.js. `App.js:507-538` runs `refreshAuthStatus` on every auth state change and the
   root navigator is re-keyed on `isAccountReady` (`App.js:1437-1438`). Keep the exact order of awaits and
   navigation calls in: `0.2_NewUserCreation.js:82-97` (create user -> updateProfile -> finalizeUserProfile -> reset
   with `params: { transition: 'none' }`), `0.3_UserLogInCredentials.js:83-85` (sign in -> reset without params),
   `0.4_CreateUsername.js:75-78` (claim -> `await refreshAuthStatus().catch(() => {})` -> reset), and
   `useAuthProviderFlow.js:29-48` (markPendingHandle before navigate). Route names and params are contract
   (`SignUp`, `LogIn`, `NewUserCreation`, `UserLogInCredentials`, `CreateUsername`, `Tabs`, `TermsOfService`,
   `PrivacyPolicy`).
4. `0.3_UserLogInCredentials.js:27-37` (Android-only refocus on `keyboardDidHide`) and the
   `TouchableWithoutFeedback onPress={() => { }}` wrapper at `:105`: both exist to keep the keyboard up. Leave.
5. Scale helpers: 0.0, 0.1 and 0.3 use the width-375 scale; 0.2, 0.4, NoInternet and `components/auth/*` use the
   shared min-axis one. Never swap one for the other (C3, C7). `0.1_LogIn.js:28-35` computes `HERO_MARGIN_BOTTOM`
   from constants that mirror a block no longer present in SignUp; the value still positions the hero, keep it.
6. Auth background: `ImageBackground` `source` / `defaultSource` (`0.0:55-56`, `0.1:62-63`, `0.4:91-92`) work with
   `useAuthBackgroundSource`, which signals the splash gate through `global.__markAuthBackgroundReady`
   (`frontend/hooks/useAuthBackgroundSource.js:4-10`, `App.js:413-418`). Keep both props.
7. `NoInternet.js`: uses `SafeAreaView` from `react-native` (not safe-area-context) and is mounted by App.js with
   `StyleSheet.absoluteFillObject` and `zIndex: 999`. Keep the JSX (`:30-38`) and the `style` prop untouched.
8. `frontend/screens/index.js`: the 32 export names are the import contract of `App.js:38-71` and
   `MainTabs.js:4`. Do not rename or reorder into anything that changes names.
9. `0.2_NewUserCreation.js:121`: the second, empty `<View style={styles.iconSide} />` is a layout spacer for
   `justifyContent: 'space-between'`; it is not dead.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

1. `isNewUser` is always `null` (E2). Should it be read with `getAdditionalUserInfo`? Doing so changes routing for
   returning users without a handle, so it was not applied.
2. `resolveHandle` in the two account modules repeats work `prepareProfileForAuth` already did (C2 observation).
   Is the second pass meant to catch anything the first cannot? If not it can be removed in a later, tested change.
3. Deferred social sign-up (`completeSocialSignup.js`, the `pendingSocialAuth` param): history shows it was
   switched off on the day it was added. Confirm it is abandoned so the file can be deleted (B1 #14-#15).
4. `isConfigured` is permanently true because of the hard-coded iOS client id (`useGoogleAuth.js:10-12`). Keep the
   "Google setup required" path as a guard, or drop it together with the default?
5. The dev-only `[GoogleAuth]` log prints on every render of the hook (`useGoogleAuth.js:70-83`). Keep?
6. Wrong-password logins may currently show "Unable to sign in. Check your connection." (E3). Map
   `auth/invalid-credential` to the "Invalid credentials" message?
7. Double Google code exchange (E4): set `shouldAutoExchangeCode: false`?
8. `AuthButton` has no base text style (E1). Was one intended? Today every caller supplies its own.
9. Android: Apple button is hidden and Google would use the iOS client id (E5). Is Android a target for these flows?
10. NoInternet lost its retry button and the "last checked / connection type" line but App.js still computes them
    (G2). Confirm they are not coming back.
11. `0.3_UserLogInCredentials.js:67-69`: an all-digit identifier of 8+ digits is treated as a phone number locally
    and never checked as a username, whereas the cloud function checks handles first
    (`functions/index.js:1773-1806`). Intended?
12. Passwords are `.trim()`med before sign-up and login (`0.2_NewUserCreation.js:43`,
    `0.3_UserLogInCredentials.js:47`). Intended?
13. `CreateUsername` receives a `uid` route param (`App.js:208`, `useAuthProviderFlow.js:20,38`) that the screen
    never reads. Left as is (route params are contract).

---------------------------------------------------------------------------------------------------

## Summary of the work order for this partition

Safe, self-contained edits: B1 #1-#13 (NoInternet, 0.3, 0.2), B1 #14-#15 (CreateUsername, completeSocialSignup
becomes deletable), B1 #16-#19 (useGoogleAuth, auth buttons), E1 (AuthButton), F1, F2, C10.
Optional: B1 #20, C2, C4.
Needs another partition first: C1 (G3), C3 (G4), C5 (G5), barrel line for Feed (G6).
Files that can be deleted afterwards (owner approval): `frontend/auth/completeSocialSignup.js`; with G6 also
`frontend/screens/FeedScreen.js`. `frontend/auth/socialAuthUtils.js` is already classified DEAD.
Estimated lines removable inside the partition: about 145 from dead code, about 40 more from C1 and C3, and about
165 more if C4 and C5 are done.
