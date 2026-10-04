# Audit: partition "feed-social" (15 files, 4223 lines)

Base directory for every path below unless a longer path is given: `frontend/components/1_Feed/`.
All 15 files were read completely; all are byte-identical to `SPX/baseline` (line numbers are current).
`SPX/tools/lint.sh` on the four folders: 0 errors, 45 warnings, all matching `SPX/findings/feed-social.md`.

Two facts that shape everything below (both verified by grep over the whole repo):

1. **`Posts/Post.js` has exactly one caller**, `frontend/components/4_Explore/ExpandedExploreList.js:93`, which is rendered only by `frontend/screens/4_Explore.js:303`. The route `Explore` is registered (`App.js:1586`) but nothing navigates to it (`grep -E "navigate(Root|OneWay)?\(['\"]Explore|jumpToTab\(['\"]Explore"` = 0 hits; the only mention is a commented line at `frontend/screens/4.1_ViewProfile.js:301`; there is no linking config). So `Post.js`, `PostHeader.js`, `PostFooter.js`, `PostFooterInfoPanel.js`, `PostMediaCarousel.js`, `animConfig.js` are statically LIVE but unreachable at runtime. The real feed uses `SimpleFeedPost` via `PostListItem`.
2. **`FeedFocusContext` has no Provider anywhere** (`FeedFocusProvider`, `useFeedFocus`, `usePostFocus` are referenced only inside `frontend/screens/feed/hooks/FeedFocusContext.js`). `Post.js:296` therefore always receives the context default object.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| `Comments/CommentCard.js` (310) | One comment / reply row: avatar, handle, time, report dots, Reply, like heart + count | default `CommentCard` | `Comments/CommentsModal.js:18` only |
| `Comments/CommentsBottomSheet.js` (269) | gorhom BottomSheet hosting the comment list + input; writes new comments / replies to `posts/{pid}`, sends notifications | default `CommentsBottomSheet`; named `COMMENTS_BOTTOM_SHEET_TOP_OFFSET` (no external importer) | outside partition: `frontend/screens/1_Feed.js:35`, `frontend/screens/ProfileWorkoutsAndPostsScreen.js:19`, `frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js:12`, `frontend/components/4_Explore/ExpandedExploreList.js:18` |
| `Comments/CommentsInputRow.js` (87) | Avatar + text input + send button row | default `CommentsInputRow` | `Comments/CommentsBottomSheet.js:7` only |
| `Comments/CommentsModal.js` (217) | `BottomSheetFlatList` of `CommentCard`s; like/unlike comment writes; report sheet | default `CommentsModal` | `Comments/CommentsBottomSheet.js:6` only |
| `Notifications/NotificationCard.js` (730) | One notification row: avatar, text, follow-back / accept-invite / accept-request actions, colour helpers, styles | default `NotificationCard` | `Notifications/NotificationsModal.js:5` only |
| `Notifications/NotificationsModal.js` (408) | SectionList of notifications grouped by time and filter; accept invite / follow request handlers | default `NotificationsModal`; named `NOTIFICATION_FILTERS` | outside partition: `frontend/screens/Notifications.js:8` (both exports) |
| `Posts/Post.js` (755) | Legacy "focusable" post card (media carousel + header + footer + tone analysis) | default `React.memo(Post, areEqual)` | outside partition: `frontend/components/4_Explore/ExpandedExploreList.js:15` only |
| `Posts/PostFooter.js` (237) | Like / comment / save buttons over the media + info panel | default `PostFooter` (forwardRef) | `Posts/Post.js:21` only |
| `Posts/PostFooterInfoPanel.js` (197) | "Liked by ..." / caption strip | default `PostFooterInfoPanel` | `Posts/PostFooter.js:13` only |
| `Posts/PostHeader.js` (211) | Avatar, handle, workout chip, page dots | default `React.memo(PostHeader, areEqual)` | `Posts/Post.js:20` only |
| `Posts/PostMediaCarousel.js` (206) | Horizontal paged FlatList of image / video slides | default `React.memo(PostMediaCarousel)` (forwardRef) | `Posts/Post.js:23` only |
| `Posts/animConfig.js` (6) | `FOCUS_ANIM_MS`, `FOCUS_EASING` | both named | `Posts/PostFooter.js:15` only |
| `Posts/hooks/usePostFooterInteractions.js` (340) | Like / save mutations, viewer snapshot, button hit-testing | default hook | `Posts/PostFooter.js:17`; outside partition: `frontend/components/1_Feed/SimpleFeedPost.js:26` (uses `isLiked, assignButtonRef, handlePressLikeButton, pressComment, handlePressSaveButton, isSaved`, lines 893-904) |
| `SharePost/ShareBottomSheet.js` (104) | BottomSheet wrapper for the share list | default `memo(ShareBottomSheet)` | outside partition: `frontend/screens/1_Feed.js:36`, `frontend/components/4_Explore/ExpandedExploreList.js:20` |
| `SharePost/ShareModal.js` (146) | Search + list of followed users + "Share" button (stub: sends nothing) | default `ShareModal` | `SharePost/ShareBottomSheet.js:14` only |

No file in the partition is imported by a PARKED file, TOOLING or `functions/`.

---

## B. Verified dead code

Tier 1 = provable from the code, removal is behaviour-preserving, do it. Tier 2 = inert only because of how the single caller uses the component; leave unless the owner answers question I-1.

### Tier 1

| # | Identifier | Kind | Location | Evidence |
|---|---|---|---|---|
| 1 | `useMemo` | unused import | `Comments/CommentCard.js:1` | 1 occurrence in file |
| 2 | `KeyboardAvoidingView`, `Platform` | unused imports | `Comments/CommentsBottomSheet.js:2` | 1 occurrence each |
| 3 | `dynamicStyles = useMemo(() => dynamicStylesDefault, [])` | wrapper that only forwards a module constant | `Comments/CommentsBottomSheet.js:38` (uses at 167, 213) | constant factory, empty deps; replace the two uses with `dynamicStylesDefault` and drop the hook |
| 4 | `onFocus={() => { }}`, `onBlur={() => { }}` | no-op props | `Comments/CommentsBottomSheet.js:207-208`; received at `Comments/CommentsInputRow.js:49-50`, forwarded at `:72-73` | sole caller passes no-ops; `BottomSheetTextInput` (`node_modules/@gorhom/bottom-sheet/src/components/bottomSheetTextInput/BottomSheetTextInput.tsx`) does `if (onFocus) onFocus(args)`, so absent == no-op. Remove both ends |
| 5 | `export` keyword on `COMMENTS_BOTTOM_SHEET_TOP_OFFSET` | unused export (binding is used in-file at 187) | `Comments/CommentsBottomSheet.js:18` | repo grep: only this file |
| 6 | `useBottomSheetInput: useBottomSheetInputProp = true` | prop no caller passes (always `true`) | `Comments/CommentsInputRow.js:57`, used `:79` | only caller `CommentsBottomSheet.js:203-214` does not pass it. Replace with literal `useBottomSheetInput` on the `DismissableTextInput` |
| 7 | `FlatList` | unused import | `Comments/CommentsModal.js:11` | 1 occurrence |
| 8 | `LinearGradient` import + commented-out badge JSX | unused import / commented-out code | `Notifications/NotificationCard.js:6`, `:559-575` | only uses are inside the comment block. Also fix the now-stale comment `{/* avatar + type badge */}` at `:544` |
| 9 | lucide import `Heart, MessageCircle, AtSign, UserPlus, Activity, Check, Flame`; `iconByType`; `IconCmp` | unused import / dead locals | `Notifications/NotificationCard.js:5`, `:367-378`, `:380`, `:397`, `:414` | `IconCmp` is only referenced in the commented block (ESLint 414:9) |
| 10 | `accent2Hex` / `accent2`; `BRAND_ACCENT_LIGHT` | dead locals / constant | `Notifications/NotificationCard.js:383`, `:399`, `:416`; `:117` | `accent2` never read (ESLint 416:9); `BRAND_ACCENT_LIGHT` only feeds `accent2Hex` |
| 11 | `badgeBg` | dead local | `Notifications/NotificationCard.js:384`, `:401`, `:417` | ESLint 417:9; only use is in the commented block |
| 12 | `styles.pfpIconBadge`, `styles.pfpIconBadgeInner` | unused StyleSheet keys | `Notifications/NotificationCard.js:638-655`, `:656-663` | only referenced in the commented block |
| 13 | `cardBg` + `cardStyles.push({ backgroundColor: cardBg })` | redundant constant | `Notifications/NotificationCard.js:386`, `:400`, `:418`, `:442` | `cardBg` is always `theme.surface`, which `styles.card` already sets (`:620`); `firstCard`/`lastCard` do not set a background. Optional, zero visual change |
| 14 | `<>...</>` around a single `Pressable` | unnecessary fragment | `Notifications/NotificationCard.js:519`, `:535` | one child |
| 15 | `onDeclineFollowRequest` prop | prop the receiver never reads | passed at `Notifications/NotificationsModal.js:312`; `NotificationCard` signature `:138-145` has no such prop (0 occurrences in NotificationCard.js) | see 16 |
| 16 | `handleDeclineFollowRequest` + `declineFollowRequest` import | function only reachable through dead prop 15 | `Notifications/NotificationsModal.js:140-181`, `:10` | only use is line 312. After removal `backend/user/declineFollowRequest.js` has no importer (see G-6, I-3) |
| 17 | `loadMore` | wrapper that only forwards | `Notifications/NotificationsModal.js:219-221`, used `:331` | `loadMoreNotifications` (`frontend/state/notificationsStore.js:99`) takes no arguments; pass it directly to `onEndReached` |
| 18 | `bounce`, `B_IN`, `B_OUT`, `B_FRICTION` | unused function + its constants | `Posts/Post.js:467-480`, `:31-33` | ESLint 468:11; constants used only inside `bounce`. Keep `scale` (`:310`, `:635`) as is: it becomes a constant 1 transform; removing it is optional and not worth the risk |
| 19 | `DEBUG_SHOW_TONE_OVERLAY` and everything behind it | constant-false feature flag | `Posts/Post.js:35`; `debugHeaderOverlayStyle` `:343-354`; `debugFooterOverlayStyle` `:356-367`; JSX `:653-668`; `styles.debugToneOverlay` `:747-753` | flag is a literal `false`; both memos return `null` at their first line |
| 20 | commented-out effect; stale note | commented-out code | `Posts/Post.js:619-621`; `:604` | |
| 21 | `const { pfp } = data;` + `url={pfp}` + `image={pfp}` | dead local feeding two props nobody reads | `Posts/Post.js:288`, `:674`, `:684`; `url` param at `Posts/PostHeader.js:15` | `PostHeader` never uses `url` (ESLint 15:5); `PostFooter` signature (`Posts/PostFooter.js:24-34`) has no `image` |
| 22 | `Easing` | unused import | `Posts/PostFooter.js:7` | 1 occurrence |
| 23 | `opacityAnim` chain | state that is written but never read | created `Posts/PostFooter.js:35`; animated by effect `:53-63`; passed `:174`; received and ignored at `Posts/PostFooterInfoPanel.js:35` (ESLint 35:38) | the Animated.Value is attached to no view, so the timing animation has no observable effect. Removing it makes these unused too: imports `useEffect`, `useRef`, `Animated` (`PostFooter.js:6-7`), the `animConfig` import (`:15`), props `isSomePostFocused` / `isUnfocusing` (`PostFooter.js:30-31`; passed at `Post.js:686-687`), and `ctxUnfocusGestureActive` (`Post.js:294`). `Posts/animConfig.js` then has no importer (list under "files that can now be deleted") |
| 24 | `styles.profilePicture3` + third ternary arm | unreachable branch | `Posts/PostFooterInfoPanel.js:175-178`, `:122-124` | `visibleLikes = likes.slice(0, 2)` (`:66`), so `index` is only 0 or 1 |
| 25 | `TouchableOpacity`, `ts` | unused imports | `Posts/PostHeader.js:2`, `:5` | 1 occurrence each |
| 26 | `onError={() => { /* comment only */ }}` | no-op handler | `Posts/PostHeader.js:44-46` | empty body. Optional |
| 27 | `flatListRef` | ref attached but never read | `Posts/PostMediaCarousel.js:68`, `:183` | 2 occurrences: declaration and `ref=` |
| 28 | identical branches in `pressComment` / `pressShare` | always-equivalent condition | `Posts/hooks/usePostFooterInteractions.js:271-274`, `:280-283` | both arms call the same function. Removing the `if` is behaviour-identical; leaving `interactionsEnabled` in the deps arrays keeps callback identity exactly as today |
| 29 | `base || {}` | always-truthy | `Posts/hooks/usePostFooterInteractions.js:30` | `base` is always an object |
| 30 | `useCallback`, `View`, `BottomSheetBackdrop`, `Dimensions`, `width`, `height` | unused imports / locals | `SharePost/ShareBottomSheet.js:5`, `:7`, `:13`, `:11`, `:18` | `BottomSheetBackdrop` only in the commented block; `Dimensions` only feeds the unused `width/height` |
| 31 | commented-out `renderBackdrop` and `backdropComponent` | commented-out code | `SharePost/ShareBottomSheet.js:30-41`, `:68` | |
| 32 | `BlurView`, `Dimensions`, `TouchableOpacity` | unused imports | `SharePost/ShareModal.js:1`, `:3` | 1 occurrence each |
| 33 | `styles.flatlistContainer` (empty object) + `contentContainerStyle={styles.flatlistContainer}` | no-op style | `SharePost/ShareModal.js:126-127`, `:81` | empty style. Optional |
| 34 | noise comments | stale notes | `Comments/CommentsModal.js:20` ("Import the scaleSize utility"), `SharePost/ShareBottomSheet.js:15` (same), `Notifications/NotificationsModal.js:223` ("reference FriendsActivitySheet": no such file exists), `Posts/PostFooter.js:101` ("like, comment, share": there is no share button) | |
| 35 | misplaced JSDoc | stale note | `Comments/CommentsModal.js:41-45` sits above `currentUser`/`buildLikeEntry` (`:46-54`) instead of `handleLikeComment` (`:56`) | move the doc block down or delete it |

Not dead, keep: `console.log` at `Notifications/NotificationCard.js:346`, `:359` and `Notifications/NotificationsModal.js:83`, `:135` (and `:178` if 16 is not removed) are error-path logs inside `catch`, not tracing. `console.warn` calls in `usePostFooterInteractions.js:176`, `:200`, `:211`, `:251` are failure paths.

### Tier 2 (inert today; do NOT remove without the owner's answer to I-1)

| # | Identifier | Location | Why it is inert |
|---|---|---|---|
| T1 | `Post` props `focusModeSV`, `interactiveUnfocusSV`, `forceRoundedBottomOnFocus`, `fadeInOnFocus`, `openLikesSheet`, `toViewProfile`, `openViewWorkoutModal`, `shouldPlay`, `highlightPid`, `highlightSignal`, `programFocusPid`, `programFocusSignal` | `Posts/Post.js:269-286` | the only caller (`ExpandedExploreList.js:93-104`) passes `data, index, isFocused, handleFocusPost, isSomePostFocused, openCommentsModal, openShareModal` plus `onSwipeUnfocus`, which `Post` does not accept |
| T2 | context fallbacks `ctx*` | `Posts/Post.js:289-302` | no Provider exists; `isFocused`, `isSomePostFocused`, `handleFocusPost` are always passed as props, the two shared values are always `null`. The `\|\| {}` at `:296` can never apply (context default is an object) |
| T3 | focus-fade effect, highlight effect + overlay, program-focus effect, `roundedBottomStyle`, `interactiveFadeStyle` | `Posts/Post.js:414-434`, `:436-446` + `:706-710`, `:448-465`, `:398-412`, `:606-617` | driven only by T1 props / null shared values: early-return or constant output |
| T4 | `Post` imperative handle, `handleFooterTapFromOverlay`, `footerRef`, `carouselRef` | `Posts/Post.js:583-602`, `:509-512`, `:313`, `:312` | caller attaches no ref to `Post` |
| T5 | `PostFooter` imperative handle (`toggleLike, ensureLike, isLiked, pressLike, pressComment, pressShare, pressSave, handleTapAt`) | `Posts/PostFooter.js:65-74` | only `handleTapAt` is read (`Post.js:510-511`), and only from T4 |
| T6 | `PostMediaCarousel` imperative handle + `extDragActiveRef` | `Posts/PostMediaCarousel.js:108-119`, `:71` | only reached through T4; `hSwipeUpdate` is an empty function |
| T7 | hook members `ensureLike`, `pressShare`, `handleTapAt`, and the `'share'` entry in `buttons` | `Posts/hooks/usePostFooterInteractions.js:229-232`, `:278-285`, `:287-326`, `:294`, `:302` | `SimpleFeedPost` does not destructure them; `PostFooter` only exposes them through T5. No component ever registers a `'share'` button ref. `assignButtonRef`/`buttonRefs` (`:37`, `:109-116`) are written by both consumers but read only by `handleTapAt` |
| T8 | `handleTouchHeader` chain | `Comments/CommentsBottomSheet.js:80-83`, `:194`; `Comments/CommentsModal.js:25`, `:145`, `styles.header` `:202-210` | the `Pressable` has `height: 0` and no hitSlop, so `onTouchStart` cannot fire. Not statically provable; see I-5 |

---

## C. Duplication

| # | Cluster | Locations | Identical? | Recommendation |
|---|---|---|---|---|
| C1 | `Pfp` avatar component | `Comments/CommentCard.js:20-36`; `Posts/PostFooterInfoPanel.js:17-33` (jscpd clone); `frontend/components/1.1_Messages/MessageCard.js:77-89` | CommentCard vs PostFooterInfoPanel: identical render for every input (placeholder is `{ backgroundColor: '#EEE' }` inline vs `styles.pfpPlaceholder`, same value). MessageCard differs: placeholder `theme.field` | New `frontend/components/common/Pfp.js` holding CommentCard's lines 20-36 verbatim; import it in both partition files; then delete `styles.pfpPlaceholder` (`PostFooterInfoPanel.js:179-181`). Leave MessageCard alone (different colour) |
| C2 | "does this likedUsers entry belong to uid" matcher | `Comments/CommentCard.js:54-60`; `Comments/CommentsModal.js:62-68`; `Comments/CommentsModal.js:95-101` | Same body; the uid is `viewerUid` (`global?.userData?.uid`) in the first and `currentUser.uid` (`(global?.userData \|\| {}).uid`) in the others: same value | Optional: one helper `(entry, uid) => boolean` in a new `Comments/commentLikes.js`. It is a small rewrite (callback body + a parameter), so only do it if the three call sites are replaced mechanically |
| C3 | like-entry object `{ uid, handle, name, pfp, pfpVersion }` | `Comments/CommentsModal.js:48-54`; `Posts/hooks/usePostFooterInteractions.js:159-165` | Same field expressions, different sources (`global.userData` vs the `viewer` state copy, `uid` via `getViewerUid` fallback) | Leave both |
| C4 | live-post predicate `Boolean(x?.isLive \|\| x?.liveWorkout \|\| (typeof x?.pid === 'string' && x.pid.startsWith('workout:live')))` | `Posts/PostFooter.js:79-83`; `Posts/hooks/usePostFooterInteractions.js:131-135`; `frontend/components/1_Feed/SimpleFeedPost.js:281-287`; `frontend/screens/1_Feed.js:1184-1188` | Identical for every input | Canonical home `frontend/utils/livePostMeta.js` (already owns the `workout:live` prefix, line 68): add `export const isLivePost = (post) => ...`. Cross-partition (G-3) |
| C5 | `clamp` | `Posts/Post.js:56`; `Notifications/NotificationCard.js:59-62`; `frontend/utils/macroRecommendations.js:42`; `frontend/screens/MuscleGroupExercises.js:84`; `frontend/helper/estimateWorkoutCalories.js:87`; `shared/hexagon/computeHexagonCore.js:182` (+ three local closures elsewhere) | Post / macroRecommendations / MuscleGroupExercises / computeHexagonCore: identical for every input. estimateWorkoutCalories differs when `min > max`. NotificationCard differs: defaults `(0, 1)` and `NaN -> min` | No canonical module exists. If the plan creates one (for example `frontend/utils/math.js`), Post's can use it; NotificationCard's must stay separate |
| C6 | timestamp to millis | `Notifications/NotificationsModal.js:224-230` (`toMillis`); inline at `Notifications/NotificationCard.js:258-260`; canonical `frontend/utils/date.js:6-18` (about 20 more definitions repo-wide, e.g. `frontend/utils/friends.js:4`, `SimpleFeedPost.js:61`) | Partly. Versus `utils/date.js`: same result for number, Firestore Timestamp, `{seconds}`, string, null/undefined. Differs only for a `Date` instance (`Date.parse(date)` drops milliseconds) and for a `toMillis()` that throws (date.js catches). Notification timestamps come straight from Firestore docs (`notificationsStore.js:76`), so neither case occurs | Safe to import `toMillis` from `frontend/utils/date.js` in both files. Minimum: hoist the local one to module scope (F-1) |
| C7 | hex colour helpers | `Notifications/NotificationCard.js:57-114` (`HEX_LENGTHS, clamp, normalizeHex, hexToRgba, componentToHex, mixHex, withAlpha`); `frontend/components/2_Competition/rankBadgeLevelHelpers.js:9` (`normalizeHex`), `:28` (`hexToRgb`), `:60` (`withAlpha`); `frontend/utils/muscleTierColors.js:34` (`hexToRgba`); `frontend/components/2_Competition/sections/ExercisesSection.js:90` (`withAlpha`); `frontend/components/2_MacroTracking/MacroStreakBadge.js:22` (`withAlpha`) | NOT identical. NotificationCard `normalizeHex` requires `#`, keeps 8-digit alpha, expands 4-digit; rankBadge accepts no `#`, strips alpha, validates characters. NotificationCard `withAlpha` returns `rgba(r,g,b,a)` and returns the input unchanged when unparseable; rankBadge returns `rgba(r, g, b, a)` with a white fallback; ExercisesSection returns an 8-digit hex string; muscleTierColors `hexToRgba` returns a string, NotificationCard's returns an object | Do not merge. Same names, different contracts |
| C8 | `normalizeUserRef` | `Notifications/NotificationCard.js:126-136`; `frontend/utils/userRefs.js:35-44`; `backend/helper/userRefs.js:37-46` | NOT identical. Local one always returns an object, reads only `u.uid`, and sets `pfp`/`photoURL`/`image` from `resolvePhotoURL`; the shared ones return `null` without a uid and return `{uid, handle, name, pfp}` | Leave. (The two shared copies have identical bodies but their `coerceUid` key lists differ: frontend adds `docId`, `_id`, `objectID`) |
| C9 | `readUid` vs `coerceUid` | `Notifications/NotificationCard.js:119-124`; `frontend/utils/userRefs.js:19-33` | NOT identical (`readUid` does not trim and reads only `.uid`) | Leave |
| C10 | optimistic follow-state write to `global.userData` | `Notifications/NotificationCard.js:187-216`; `frontend/components/ViewProfile/ViewProfileRowButtons.js:65-92` (jscpd clone) | NOT identical: entries matched with `readUid(entry)` vs `String(x?.uid \|\| x?.id \|\| x)` | Leave both |
| C11 | wid matcher callback | `Notifications/NotificationCard.js:300-305` and `:308-313` | Identical | Optional local `const matchesWid = (entry) => ...` inside `evaluate` |
| C12 | accept / decline follow-request handlers; `removeByUid` | `Notifications/NotificationsModal.js:88-138` vs `:140-181` (jscpd); `:119` vs `:171` | Same skeleton | Resolved by deleting the dead decline handler (B-16) |
| C13 | header / footer tone effects | `Posts/Post.js:514-547` vs `:549-581` | Same logic, different key prefix / rect / setter | Leave as two effects; move both verbatim if the hook in D-2 is extracted |
| C14 | filled / outline SVG pairs | `Comments/CommentCard.js:163-177` vs `:179-193`; `Posts/PostFooter.js:141-153` vs `:155-167` | Differ only in `fill` / `stroke` | Leave (collapsing is a rewrite of JSX for no behavioural gain) |
| C15 | `hitSlop` literal | `Posts/PostFooter.js:107`, `:124`, `:138` | Identical | Optional module constant |
| C16 | viewer snapshot build; `safePostOwnerUid`; like/unlike payload + catch | `Posts/hooks/usePostFooterInteractions.js:25-30` vs `:52-56`; `:130` vs `:254`; `:169-183` vs `:193-207` | Near-identical (initial state stores `uid` raw, `capture` stores `String(uid)`) | Leave (H-5) |
| C17 | `measureInWindow` / `measure` fallback | `Posts/Post.js:496-502` vs `:590-597` | Same pattern, different callbacks | Leave |
| C18 | reply / comment notification payloads | `Comments/CommentsBottomSheet.js:111-120` vs `:132-141` | Differ in `type` and `uid` (`currentUser.uid` vs `String(...)`) | Leave |

---

## D. Decomposition plans (files over about 500 lines)

### D-1. `Notifications/NotificationCard.js` (730 lines)

Do the Tier-1 removals first (B-8 to B-14, about 70 lines), then move:

1. **`Notifications/NotificationCard.styles.js`**: `styles` (`:607-729`, minus the two dead keys). Needs `StyleSheet`, `scaleSize`, `theme`. Export default. No blockers.
2. **`Notifications/notificationColors.js`**: `HEX_LENGTHS` (`:57`), `clamp` (`:59-62`), `normalizeHex` (`:64-77`), `hexToRgba` (`:79-90`), `componentToHex` (`:92`), `mixHex` (`:94-106`), `withAlpha` (`:108-114`). Export only `mixHex` and `withAlpha` (the only ones the component uses). Pure, no imports. Do not merge with other colour helpers (C7).
3. **`Notifications/notificationCardUtils.js`**: `ellipsize` (`:23-27`), `getDisplayMessage` (`:29-54`), `readUid` (`:119-124`), `normalizeUserRef` (`:126-136`, needs `resolvePhotoURL`). Pure.
4. **`Notifications/useNotificationFollowState.js`** (custom hook, optional): `followState`/`followBusy` state (`:148-149`), `targetUid` (`:153`), `deriveFollowState` (`:155-171`), the two effects (`:173-177`, `:179-185`), `applyFollowStateToGlobal` (`:187-216`), `handleFollowToggle` (`:218-255`). Input `item`; returns `{ followState, followBusy, handleFollowToggle }`. Body moves verbatim; only the function wrapper and return are new.
5. **`Notifications/useWorkoutInviteExpired.js`** (custom hook, optional): `inviteExpired` state (`:150`) + effect (`:277-337`). Inputs `{ item, showAcceptAction, inviteAccepted, inviteWid }` (the effect reads `item?.uid` at `:284` and in its deps `:337`, so pass `item` to keep the body verbatim); returns `inviteExpired`. Needs `doc`, `onSnapshot`, `db`.

Stays: the component (`:138-605`), `BRAND_ACCENT` (`:116`), the palette memo, the three action JSX blocks. After 1-3: about 440 lines; after 4-5: about 280.

Blockers: none hard. 4 and 5 change the relative order of hooks inside the component (all unconditional, so legal). `handleAcceptInvite` (`:339-350`) reads `inviteExpired`, so call hook 5 before it. Steps 1-3 are low risk; 4-5 medium.

### D-2. `Posts/Post.js` (755 lines)

Do the Tier-1 removals first (B-18 to B-21, B-23 leftovers: about 75 lines), then move:

1. **`Posts/postMediaTone.js`**: constants `HEADER_RECT_*`, `FOOTER_RECT_*` (`:37-51`), `MEDIA_LIGHTNESS_THRESHOLD`, `PATCH_RESIZE_TARGET` (`:53-54`), `clamp` (`:56`), `makeToneKey` (`:58-63`), `computeHeaderRectNormalized` (`:65-78`), `computeFooterRectNormalized` (`:80-93`), `getImageDimensions` (`:95-107`), `computeCropRect` (`:109-157`), `extractUsableColor` (`:159-184`), `parseColorString` (`:186-215`), `srgbToLinear` (`:217-221`), `computeLuminance` (`:223-227`), `analyzePatchLightness` (`:229-261`). Exports: `makeToneKey`, `computeHeaderRectNormalized`, `computeFooterRectNormalized`, `analyzePatchLightness`. Imports that move with it: `Image`, `Dimensions`, `expo-image-manipulator`, `react-native-image-colors`.
   Blocker: `computeCropRect` uses module constants `W` and `AR` (`:114-115`), which the component and `styles` also use (`:27-28`, `:328`, `:349-352`, `:650`, `:732-743`). Redefine the two lines (`const { width: W } = Dimensions.get("window"); const AR = 1;`) in the new module, exactly as `PostMediaCarousel.js:13` already does for `W`; do not rename.
2. **`Posts/hooks/usePostMediaTone.js`** (optional): `isLightHeader`/`isLightFooter` state (`:316-317`), `toneCacheRef`/`tonePendingRef` (`:319-320`), `resolveTone` (`:369-396`), both tone effects (`:514-581`). Inputs `{ currentMediaUri, currentMediaType, headerRect, footerRect }`; returns `{ isLightHeader, isLightFooter }`. Clean seam: nothing else reads the refs or `resolveTone`.

Stays: `W`, `AR`, `BORDER`, the component, `areEqual`, `styles` (26 lines that depend on `W`/`AR`/`BORDER`; not worth a styles file).
After 1: about 455 lines; after 2: about 350.

Do not touch while moving: the two `useAnimatedStyle` worklets, `areEqual`, the program-focus effect (H-1, H-2).

Value caveat: this file is runtime-unreachable (see header and I-1). Step 1 is cheap and safe; step 2 is only worth doing if the owner keeps Explore.

### Not over 500 but structurally worth a move

`Notifications/NotificationsModal.js` (408): hoist the pure time helpers `:223-279` (`toMillis`, `startOfToday`, `startOfYesterday`, `startOfWeekSunday`, `startOfLastWeek`, `minusMonths`, `minusYears`, `groupByTime`) to module scope above the component, or into `Notifications/notificationGrouping.js`. They close over nothing in the component. This also resolves the exhaustive-deps warning at `:296` without touching the deps array. Note the parameter `ts` (`:224`) and the local `const ts` (`:260`) shadow the `ts` import from `scaleSize` (`:6`); that stays legal after hoisting within the same file, and disappears if they go to their own module.

---

## E. Latent bugs

None of these meet the "unambiguous, fix now" bar; all are recorded for the owner (section I) unless marked.

| # | Bug | Location | Minimal fix | Confidence |
|---|---|---|---|---|
| E1 | `listRef.current?.scrollToOffset?.(...)` is called on a `SectionList` ref. `SectionList` has no `scrollToOffset` (RN 0.73 `Libraries/Lists/SectionList.js` exposes `scrollToLocation`, `recordInteraction`, `flashScrollIndicators`, `getScrollResponder`, `getScrollableNode`, `setNativeProps`), so the "scroll to top when a new notification arrives" effect silently does nothing | `Notifications/NotificationsModal.js:42-48` | `listRef.current?.getScrollResponder?.()?.scrollTo?.({ y: 0, animated: false })`. This would start scrolling where today nothing happens, so it changes behaviour: do not apply without sign-off | high that it is a no-op |
| E2 | `Post` calls `toViewProfile(index)` and `openViewWorkoutModal(index)` unguarded, and its only caller passes neither: tapping the avatar/handle or the workout chip throws `TypeError` | `Posts/Post.js:677-678`; caller `frontend/components/4_Explore/ExpandedExploreList.js:93-104` | `toViewProfile?.(index)` / `openViewWorkoutModal?.(index)` turns a crash into a no-op; intended behaviour (navigate) is unknown. Screen is unreachable today | high |
| E3 | `PostFooterInfoPanel` opacity is `focusP * (1 - unfocusP)` with `focusModeSV?.value ?? 0`; `Post` always passes `null`, so the panel is permanently invisible (yet still pressable, `pointerEvents='auto'`) | `Posts/PostFooterInfoPanel.js:82-92`, `:103`; `Posts/Post.js:688-689` | none without design intent | high |
| E4 | Share sheet in the Feed can never open: no component calls `pressShare` / `onPressShare` (T7), and even if it did, `setShareBottomSheetExpandFlag((flag) => !flag)` with `shareSheetVisible ? flag : false` only produces `true` on every other open, while `ShareBottomSheet` expands only on a truthy flag. `setShareBottomSheetCloseFlag` is never called | `frontend/screens/1_Feed.js:444-445`, `:755-766`, `:1782-1793`; `SharePost/ShareBottomSheet.js:44-55` | owner decision (I-2) | high |
| E5 | `handleSend`: when `replyingToIndex` points at a missing comment the message is dropped from `comments`, but `updateDoc`, `incrementDocValue('commentCount')` and the owner notification still run. Replies also notify `target.uid` even when that is the sender | `Comments/CommentsBottomSheet.js:104-127` | unclear | medium (edge case) |
| E6 | `onChange(index < 0)` and `onClose` both call `closeSheet`, so `onDismiss` fires twice per close. All current `onDismiss` handlers are idempotent | `Comments/CommentsBottomSheet.js:74-78`, `:179`, `:182` | leave (H-3) | high |
| E7 | `handleTapAt` returns `handled` synchronously, but `measureInWindow` callbacks run later, so it always returns `false`. The only (inert) caller ignores the value | `Posts/hooks/usePostFooterInteractions.js:298-325` | leave | high |
| E8 | `data.uid === global.userData.uid` is evaluated outside the `try` and without optional chaining; throws if `global.userData` is unset. `viewerUid` (`:52`) and `isViewerAuthor` (`:91`) already exist but use string coercion, so swapping changes semantics | `Comments/CommentCard.js:75` | leave | low |
| E9 | Search filter does `user.handle.toLowerCase()`; throws for following entries without `handle` (plain uid strings). `followingUsers` can be `undefined` when `global.userData.following` is missing | `SharePost/ShareModal.js:18-19`, `:31-33` | unreachable today (E4) | medium |
| E10 | Double haptic on follow-type notifications: `withStrongPress(onPressCard)` plus `hapticStrong()` in the handler | `Notifications/NotificationCard.js:542`; `Notifications/NotificationsModal.js:197` | owner decision | medium that it is unintended |

No undefined names, duplicate object keys or conditional hooks exist in the partition (lint: 0 errors).

---

## F. Best-practice issues worth fixing

| # | Issue | Location | Risk |
|---|---|---|---|
| F1 | Pure helpers recreated on every render and used inside a memo with deps `[events]` | `Notifications/NotificationsModal.js:223-279`, memo `:282-296` | low: hoist verbatim (see D) |
| F2 | Inline `require('../../../../navigationRef')` three times; the module is imported statically elsewhere (`frontend/components/Footer.js:6`, `ActiveWorkoutModal.js:53`, ...) and imports only `@react-navigation/native`, so there is no cycle to avoid | `Notifications/NotificationsModal.js:199`, `:204`, `:212` | low: one static `import { navigateRoot, navigationRef, jumpToTab } from '../../../../navigationRef'`; keep the surrounding `try/catch` blocks |
| F3 | Inline `require('../../../theme/mfpDark').default.surface` inside a StyleSheet | `Posts/Post.js:738` | low: static `import theme` like every sibling file |
| F4 | `React.useEffect` while other hooks are named imports | `Comments/CommentsModal.js:37` vs `:8` | none |
| F5 | Constants recomputed every render | `Notifications/NotificationCard.js:429-431` (`followingBg`, `followingBorder`, `followingText` depend on literals only) | low: hoist to module scope |
| F6 | State declared after the effect that uses its setter | `SharePost/ShareModal.js:16-24` | none functionally; moving `:23-24` above `:16` reorders hook slots consistently. Optional |
| F7 | Side effects (Firestore write, analytics, mutation of `data`) inside a `setState` updater | `Posts/hooks/usePostFooterInteractions.js:137-226` | high to change: leave (H-5) |
| F8 | `React.memo` defeated by inline closures; memo constant declared after the component | `Notifications/NotificationsModal.js:307-315`, `:354` | leave: stabilising the callbacks changes render timing |
| F9 | Animations started in effects without a stop on unmount | `Posts/Post.js:417-434`, `:437-446` | leave (harmless, unreachable) |
| F10 | Import grouping is mixed (local before third-party, stray blank lines) | `Comments/CommentCard.js:1-16`, `Posts/PostHeader.js:1-11`, `Posts/Post.js:19-25`, `SharePost/ShareModal.js:1-10` | none: regroup only in files already being edited. No module is imported twice in any partition file |
| F11 | Exhaustive-deps warnings | `Posts/Post.js:434`, `:446`, `:465`; `Posts/PostFooter.js:63` (goes away with B-23); `Posts/PostMediaCarousel.js:76`; `SharePost/ShareModal.js:21` | do not change any of these deps arrays |

No component is defined during another component's render; no hook is called conditionally.

---

## G. Cross-partition requests

1. **feed-screen, `frontend/components/4_Explore/ExpandedExploreList.js:99`**: remove `onSwipeUnfocus={handleBackPress}`; `Post` has no such prop. Same file does not pass `toViewProfile` / `openViewWorkoutModal` (E2) or any shared value (E3).
2. **feed-screen, `frontend/screens/feed/hooks/FeedFocusContext.js:17-39`**: `FeedFocusProvider`, `useFeedFocus`, `usePostFocus` have no users; the default export is used only by `Posts/Post.js:22`. Decide together with I-1.
3. **feed-post + feed-screen**: add `isLivePost(post)` to `frontend/utils/livePostMeta.js` and use it at `SimpleFeedPost.js:281-287`, `frontend/screens/1_Feed.js:1184-1188`, `Posts/PostFooter.js:79-83`, `Posts/hooks/usePostFooterInteractions.js:131-135` (C4).
4. **feed-post, `frontend/components/1_Feed/SimpleFeedPost.js:893-904`, `:1720-1738`**: it depends on the hook's return shape (`isLiked, assignButtonRef, handlePressLikeButton, pressComment, handlePressSaveButton, isSaved`). Any change to `usePostFooterInteractions` must keep those six. Its `onPressShareButton` argument (`:903`) and the three `assignButtonRef` refs feed only inert code (T7).
5. **feed-screen, `frontend/screens/1_Feed.js:445`**: `setShareBottomSheetCloseFlag` is never called; `shareBottomSheetCloseFlag` is a constant `false` (E4).
6. **`backend/user/declineFollowRequest.js`**: loses its only importer if B-16 is applied; add to "files that can now be deleted" (do not delete).
7. **`Posts/animConfig.js`** (this partition): loses its only importer if B-23 is applied; same list.
8. **messages partition, `frontend/components/1.1_Messages/MessageCard.js:77-89`**: third `Pfp` copy; keep unless the shared `common/Pfp.js` is given a placeholder option (not recommended, C1).
9. **whoever owns shared helpers**: `toMillis` canonical is `frontend/utils/date.js:6`; `clamp` has no canonical home yet (C5, C6).
10. `frontend/helper/getCommentCardStyles.js`, `getCommentsBottomSheetStyles.js`, `getPostFooterStyles.js` are each used by exactly one file of this partition (`CommentCard.js:5`, `CommentsBottomSheet.js:11`, `PostFooter.js:14`). No action; do not inline (file moves are not allowed and the values feed layout).

---

## H. Fragile areas

1. **Reanimated worklets**: `Posts/Post.js:399-412` (`roundedBottomStyle`), `:608-617` (`interactiveFadeStyle`), `Posts/PostFooterInfoPanel.js:82-92`. They capture shared values and plain JS values with explicit deps. Do not restructure, do not replace `Reanimated.View` with `View`.
2. **Custom memo comparators**: `Posts/Post.js:716-725` and `Posts/PostHeader.js:95-110` deliberately ignore callback props (stale closures by design). If a prop is removed (B-21, B-23) nothing needs to change in them, but never add a prop the comparator should see without updating it. The program-focus effect (`Post.js:451-465`, 20 ms timeout, `lastProgramFocusHandledRef`) and `card: { marginBottom: -33 }` (`:731`) are tuned; leave.
3. **`CommentsBottomSheet` open/close**: two effects both call `expand()` and `setOpenSignal` (`:59-66`, `:68-72`), `index={isVisible ? 0 : -1}` (`:176`), `onChange` + `onClose` both dismiss (E6), `keyboardBehavior` / `keyboardBlurBehavior` / `topInset` (`:184-187`). Timing-sensitive with gorhom 4.6.4; change nothing here beyond B-2..B-5.
4. **Comment writes**: `handleSend` (`CommentsBottomSheet.js:85-148`) and the like handlers (`CommentsModal.js:56-108`) mutate `postData.comments` and its entries in place and write the whole array with `updateDoc("posts", pid, { comments })`. Callers rely on the in-place mutation to see the new comment. Field shapes must not change.
5. **`usePostFooterInteractions`**: side effects inside the `setIsLiked` updater guarded by `DOUBLE_TAP_GUARD_MS` (`:137-226`), in-place mutation of `data.likes` / `data.likeCount` (`:167-168`, `:191-192`), strict `item?.uid === uid` matching (`:100`, `:154`, `:187`). Shared with the live feed (`SimpleFeedPost`). Only B-28 / B-29 are safe.
6. **`NotificationCard` follow toggle**: optimistic state + direct `global.userData` mutation without `emitUserDataUpdate` (`:187-216`, `:226-254`); one Firestore `onSnapshot` per visible workout-invite card (`:319-336`). Move verbatim only.
7. **`PostFooter` sizes**: `fontSize: scaleSize(dynamicStyles.fontSize)` (`:210`, `:223`) scales a value `getPostFooterStyles` already scaled. It looks like a bug but it is the current visual result; do not "fix".
8. **`KeyboardAvoidingView` inside the sheet** (`Comments/CommentsModal.js:140-143`) and around the share sheet (`SharePost/ShareBottomSheet.js:58-62`): leave.
9. **`ShareModal.js:21` deps `[global.userData]`** and the mount-time `close()` effect in `ShareBottomSheet.js:44-48`: leave.
10. **Icon package**: `SharePost/ShareModal.js:4` imports `react-native-vector-icons/Ionicons` (a transitive dependency, not in package.json; also used by `frontend/components/ProfileCard.js:7`). Other files use `@expo/vector-icons`. They load different font assets; do not unify.
11. **Redundant `try { haptic(); } catch {}`** (`NotificationCard.js:220`, `:341`, `:354`; `CommentCard.js:95`; `usePostFooterInteractions.js:128`, `:265`): `strong()` already swallows errors, but defensive try/catch around native calls is on the keep list.

---

## I. Open questions for the owner

1. **Explore is unreachable.** Nothing navigates to the `Explore` route. Is it parked like Compete, or dead? If dead, these become deletable: `Posts/Post.js`, `PostHeader.js`, `PostFooter.js`, `PostFooterInfoPanel.js`, `PostMediaCarousel.js`, `animConfig.js` (1612 lines), plus `frontend/screens/feed/hooks/FeedFocusContext.js`, and the hook members in T7. If it stays, should the Tier-2 focus API (T1-T6) be stripped to what `ExpandedExploreList` actually uses?
2. **Share is a stub that can never open** (E4): `ShareModal.handlePressSend` (`SharePost/ShareModal.js:57-60`) only closes the sheet. Keep `ShareBottomSheet` / `ShareModal` (250 lines) and the Feed wiring for a future feature, or remove?
3. **Decline follow request**: the UI button is gone but the handler and `backend/user/declineFollowRequest.js` remain (B-15/16). Remove, or was the Decline button meant to come back?
4. **Notifications never scroll to top on a new event** (E1). Fix it (behaviour change) or delete the dead effect and `firstIdRef`?
5. **Zero-height header `Pressable`** in `CommentsModal` (T8): was tapping the sheet header meant to dismiss the keyboard? Today it cannot fire.
6. **Double haptic** on follow-type notification taps (E10): intended?
7. **`CommentsBottomSheet.handleSend` edge cases** (E5): should a reply to a vanished comment be dropped silently while still bumping `commentCount`, and should replying to your own comment notify you?
8. `Comments/CommentsModal.js:1-6` header carries a `TODO standardize component for backend functionality`. Keep as is?
