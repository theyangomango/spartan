# Audit: partition "messages-chat" (15 files, 4092 lines)

All 15 files were read completely. Working tree == SPX/baseline for every file of the partition (checked with `diff -q`), so every line number below is valid for both.
ESLint re-run on the partition reproduces the machine findings exactly (2 errors, 20 warnings). knip reported no unused exports; confirmed (each file has exactly one default export and every one is imported).

Legend: "Chat" = frontend/screens/1.2_Chat.js, "Messages" = frontend/screens/1.1_Messages.js.

---------------------------------------------------------------------------------------------------

## A. Module map

| File | Purpose | Exports | Imported by |
|---|---|---|---|
| backend/messages/createChat.js (73) | Normalises participants, writes `messages/{cid}` (setDoc), then calls registerChatParticipants (errors logged, not thrown). | default `createChat(creatorUID, users, cid)` | Messages:7; **outside partition:** frontend/screens/4.1_ViewProfile.js:11 |
| backend/messages/registerChatParticipants.js (25) | Thin client for callable Cloud Function `registerChatParticipantsAction` (functions/index.js:1467). | default `registerChatParticipants({cid, participants})` | createChat.js:2; Chat:29; **outside:** backend/getUserFeed.js:8 |
| backend/messages/sendMessageV2.js (111) | Sanitises sender/media/reply, `addDoc` to `messages/{cid}/content`, then `updateDoc` `messages/{cid}` (lastMessageText/lastMessageAt). Rejects video media. | default `sendMessageV2(payload)` | Chat:28 only |
| backend/messages/toggleReactionV2.js (18) | Read-modify-write of `reactions[emoji]` uid array on one message doc. | default `toggleReactionV2({cid, messageId, emoji, uid})` | Chat:30 only |
| frontend/components/1.1_Messages/CreateGroupChatBottomSheet.js (71) | @gorhom BottomSheet wrapper (94% snap) around CreateGroupChatModal. | default (React.memo) | Messages:6 only |
| frontend/components/1.1_Messages/CreateGroupChatModal.js (272) | Following list with search + multi-select, "Create Group" button calling `initChat(selectedUsers)`. | default | CreateGroupChatBottomSheet.js:4 only |
| frontend/components/1.1_Messages/MessageCard.js (342) | One row of the conversations list (avatars, verified handles, preview, time). | default | Messages:4 only |
| frontend/components/1.1_Messages/MessagesHeader.js (249) | Header: back chevron, create-group icon, All/Group segmented control with animated slider. | default | Messages:5 only |
| frontend/components/1.2_Chat/ChatHeader.js (290) | Chat header: back chevron, 1 or 2 stacked avatars, verified handles, tap-to-profile for 1:1. | default | Chat:22 only |
| frontend/components/1.2_Chat/MediaViewerModal.js (166) | Full-screen image/video lightbox animating from an anchor rect. | default | Chat:26 only |
| frontend/components/1.2_Chat/MessageInput.js (257) | Composer: blocked notice, reply chip, attachment strip, picker button, text input, send button. | default | Chat:24 only |
| frontend/components/1.2_Chat/MessageItem.js (531) | One message row: grouping, reply preview, bubble/media tiles, reactions badge, swipe-revealed timestamps (reanimated). | default | Chat:23 only |
| frontend/components/1.2_Chat/ReactionPopover.js (238) | Anchored overlay with emoji reaction bar + action menu. | default | Chat:25 only |
| frontend/screens/1.1_Messages.js (562) | Conversations list screen; hydrates/subscribes the messages cache, creates/opens chats (`initChat`). | default `Messages` | **outside:** frontend/screens/index.js:13 (-> App.js:1589 route "Messages") |
| frontend/screens/1.2_Chat.js (887) | Chat thread screen: live messages, send (text+images), reactions/reply/copy/report, swipe gestures, date chips. | default `Chat` | **outside:** frontend/screens/index.js:14 (-> App.js:1595 route "Chat") |

Route contract seen from outside the partition (must not change):
- "Chat" params written by callers: `{ data, index, usersExcludingSelf }` (Messages:278-282), `{ data, usersExcludingSelf }` (Messages:371, 393, 418; 4.1_ViewProfile.js:261), `{ cid, data, usersExcludingSelf }` (App.js:683-688). App.js:658-659 also READS `route.params.data.cid || route.params.cid` of the current Chat route.
- "Messages" params written by callers: `{ userData, messages }` (frontend/screens/feed/hooks/useFeedUserData.js:94-97) or none (useFeedUserData.js:102, frontend/components/1_Feed/FeedHeader.js:700).
- Messages navigates to `'Feed'` with `{ messages: chats }` (Messages:264); useFeedUserData.js:86-90 reads it.

---------------------------------------------------------------------------------------------------

## B. Verified dead code

Nothing in this partition is used by a PARKED file, so there are no KEEP-for-PARKED items. (PARKED ManageTribeModal.js:39 shares only the lazy `require("expo-clipboard")` pattern, not code.)

### B1. Unused bindings / imports (ESLint-confirmed, re-verified by reading)
| Identifier | Kind | Location | Evidence / action |
|---|---|---|---|
| `ts` | named import | CreateGroupChatModal.js:6 | never referenced in file. Change to `import scaleSize from "../../helper/scaleSize";` |
| `rankTierKey` + `resolveRankTierKey` import | local const + import | MessageCard.js:98, :14 | assigned, never read. `resolveRankTierKey` (frontend/utils/resolveRankTierKey.js) is pure (reads global in try/catch, no writes) so dropping the call is safe; the import then becomes unused -> remove line 14. |
| `rankTierKey` + `resolveRankTierKey` import | local const + import | ChatHeader.js:41, :13 | same as above. |
| `node` + `findNodeHandle` import | local const + import | MessageItem.js:172, :8 | `findNodeHandle(containerRef.current)` result unused; the measure call on :173 uses the ref directly. Remove line 172 and `findNodeHandle,` from the import. |
| `ACCENT` | module const | ReactionPopover.js:8 | never referenced. |
| `bottomInset` | local const | Chat:510 | never referenced (the same expression is inlined at Chat:760). Remove lines 510 (and the blank line after). |
| `index` | renderItem param | Chat:685 | `({ item, index })` -> `({ item })`. |
| `hydrationAttemptedRef` | ref set, never read | Messages:35 (decl), :52 (write) | only two occurrences in the repo. Remove both; `useRef` then becomes unused in Messages:1 -> drop from the import. |
| `COLORS.surface`, `COLORS.primary` | object keys | Chat:74 | only `bg, hairline, text, subtext, field` are read (Chat:806, 836-881). Remove the two keys (optional, cosmetic). |

### B2. Props that no caller passes / no receiver reads
| Item | Location | Evidence / action |
|---|---|---|
| `handle={userData.handle}` | Messages:457 | MessagesHeader (MessagesHeader.js:27-32) destructures only `toFeedScreen, openCreateGroupChatBottomSheet, setScope, topInset`. Delete the prop at the call site. |
| `iconSize={scaleSize(19)}` | ChatHeader.js:131 | ChatHeaderHandle (ChatHeader.js:35) destructures only `participant, textStyle, containerStyle` and computes its own `iconSize` (:46). Delete the prop (do NOT start honouring it: that would change the icon size). |
| `onBoundsChange` prop and everything that only serves it | MessageItem.js:76 (prop), :136 `rowRef`, :137 `rowKey`, :362-374 `reportBounds`, :376-381 effect, :385 `ref={rowRef}`, :387 `onLayout={reportBounds}` | `grep -rn onBoundsChange` -> only MessageItem.js itself; the single caller (Chat:701-713) never passes it. With the prop undefined `reportBounds` returns at :363-366 without doing anything and the effect cleanup is a no-op. Remove all of it; then `useEffect, useCallback` leave the import on MessageItem.js:1. KEEP `collapsable={false}` on the row View (:386) so the native view hierarchy is unchanged. Risk: low. |
| `preserveTextAlignment` on ParticipantHandle | MessageCard.js:91 (param), :97 `preserveSlot`, :112 (forwarded), :208 (passed) | No-op: `preserveSlot = preserveTextAlignment && isVerified`, and VerifiedHandle only uses it as `shouldRenderIconSlot = isVerified || preserveTextAlignment` (common/VerifiedHandle.js:62) -> result is `isVerified` either way. Safe to remove all four lines. (VerifiedHandle's own prop stays: GroupMenu.js:38 uses it.) |
| `route.params.participants` | Chat:241 (read), :259 (dep) | No navigator passes `participants` (callers listed in section A). Always `[]`. Removing the third candidate list and the dep is behaviour-neutral. Confidence medium (route param; see I-6). |
| `route.params.returnTo` + Workout branch | Messages:258-263, import Messages:24 | `grep -rn returnTo` -> only Messages:259. `hint` is always undefined, so `openActiveWorkout()` is unreachable from this file and the import becomes unused. Confidence medium (route param; see I-6). |
| `index: key` param sent to Chat | Messages:280 | Chat never reads `params.index` (only in the commented-out line Chat:736). Navigation params are under hard rule 1 -> leave as is; listed for the owner (I-6). |
| `userData` param sent to Messages | feed/hooks/useFeedUserData.js:95 (other partition) | Messages reads only `route.params.messages` and `returnTo`. See G. |

### B3. Unreachable branches / constant conditions
| Item | Location | Evidence / action |
|---|---|---|
| "Friend" `<Text>` fallback | MessageCard.js:204, :211-215 | `isSingleConversation` means `usersExcludingSelf.length === 1`, so `participantsMeta[0]` is always an object. The inner ternary's else branch can never render. Replace by the `<ParticipantHandle>` alone. |
| `handlesLabel` / `hasHandles` / `primaryLabel` | ChatHeader.js:75, :96-97, :156 | The plain-Text branch (:154-158) renders only when `participantsMeta.length === 0`, where `handlesLabel === ""`, so `primaryLabel` is always `"Direct Message"`. Replace `{primaryLabel}` by the literal and delete the three consts. |
| `handleColor = theme.textPrimary` | MessageCard.js:99, ChatHeader.js:42 | constant alias used once each; inline (optional). |
| `if (!message) return;` | Chat:483 | `message = sheet.msg`, and Chat:458 already returned when `!sheet.msg`. |
| `keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}` | Chat:730 | both arms are 0 -> `keyboardVerticalOffset={0}`. |
| `.trim() || ""` | MessageCard.js:150-152 | `|| ""` is redundant (trim returns a string). Cosmetic. |
| `handle: handle || "Friend"` and `participant?.handle ?? "Friend"` | MessageCard.js:141, :92; ChatHeader.js:36 | handle is always a non-empty string by construction. Harmless defensive code; leave unless unifying (C-6). |
| `isVideo` badge in the attachment strip | MessageInput.js:66, :70-74, style `attachmentBadge` :155-163 | Chat.openPicker (Chat:366-373) filters out every asset whose type/mime contains "video", so `isVideo` is always false for the only caller. Data-dependent, not statically dead -> leave unless the owner confirms video is gone for good (I-7). |
| `directMessage` lookup | Chat:59-62 | No thrower produces an Error whose `message` equals one of the UPLOAD_ERROR_COPY strings (uploadMediaAssets.js:87-255 and sendMessageV2.js:38 all set `code`). Defensive; leave. |

### B4. Commented-out code, stale notes, tracing logs
| Item | Location | Action |
|---|---|---|
| Commented-out prop | Chat:736 `// toMessages={() => navigation.navigate("Messages", { message: data, index })}` | delete |
| Tracing log + handler | CreateGroupChatBottomSheet.js:13-15 (`handleSheetChanges` only logs), :41 `onChange={handleSheetChanges}` | delete the callback and the `onChange` prop (optional prop of BottomSheet). `useCallback` stays in use (renderBackdrop). |
| Duplicate comment line | Messages:113 (superseded by :114) | delete :113 |
| Stale path comments | MessagesHeader.js:1, ChatHeader.js:1, MediaViewerModal.js:1 (`...jsx` paths; files are `.js`) | delete or leave; cosmetic |
| Stale comments | ChatHeader.js:216 ("gutter(24)" but BACK_GUTTER is 18); MessageItem.js:240 ("NEW:"); MessagesHeader.js:179 ("no extra bubble; keep the pill clean") | cosmetic |
| Stale JSDoc | sendMessageV2.js:73 (`type: 'image'|'video'` although video is rejected at :37-41) | cosmetic |

KEEP (failure-path logging, not tracing): createChat.js:68; Messages:61 and :65 (behind `__DEV__`), :397, :411; Chat:256, :331; MessageItem.js:213.

### B5. StyleSheet keys
Checked every `styles.*` key of all 11 component/screen files by hand: no unused key. (Overridden-but-used values: Messages `cardsContent.paddingBottom` :534 is always overridden inline at :467; MessageItem `row.marginBottom` :424 overridden at :391; `reactionInline.top` :485 overridden at :299; `textSelf`/`textOther` :455-456 are identical; `avatarFallback` :430 and ChatHeader `pfpPh` :255 repeat the base backgroundColor. Leave: visual result identical, no gain worth the risk.)

---------------------------------------------------------------------------------------------------

## C. Duplication

### C-1. Chat timestamp -> millis (seconds heuristic `t < 1e12`)
- MessageItem.js:104-112 `toMillis` (defined inside the component, pure)
- Chat:604-612 `toMs` (defined inside the component, pure)
- MessageCard.js:36-47 `toMillis` (module level)

MessageItem vs Chat: **identical** (jscpd clone; same statements in the same order).
MessageCard: same results for every input EXCEPT the "no value" result is `null` instead of `0` (falsy input, unparsable string, unknown shape). Its only use is `const ms = toMillis(timestamp); if (!ms) return "";` (MessageCard.js:65-66), so swapping in the 0-returning version is behaviour-identical there. (Order of the `instanceof Date` test differs but a Date has neither `toMillis` nor `seconds`.)
These are the only three definitions in the repo with the `< 1e12` seconds heuristic (`grep "1e12"`). The ~30 other `toMillis`/`toMillisSafe` definitions (e.g. frontend/utils/date.js:6, frontend/utils/friends.js:4, NotificationsModal.js:224) return numbers unchanged and parse strings differently: **do not merge with those.**
Canonical home: new `frontend/utils/chatMessages.js` exporting `chatTimestampToMillis` (body of MessageItem.js:104-112 moved verbatim, dedented). Import in MessageItem, Chat, MessageCard.

### C-2. "Message time" = server timestamp with clientTs fallback
- Chat:618-622 `msgTimeMs(m)`
- MessageItem.js:114 and :115 (inline `toMillis(x?.timestamp) || Number(x?.clientTs) || 0`)
Identical (including `undefined` input -> 0). Canonical: `getMessageTimeMs` in the same new util; MessageItem uses it for `thisMs`/`nextMs`.

### C-3. Sender-uid fallback chain (`sender.uid ?? senderUid ?? fromUid ?? uid ?? userId ?? authorId ?? from.uid ?? author.uid`)
- MessageItem.js:79-88 (item, `?? null`)
- MessageItem.js:93-102 (next, `?? null`)
- Chat:425-434 (sheet.msg, `?? ''`)
- Chat:663-665 (newest, `?? null`)
Identical key order in all four. Canonical: `getMessageSenderUid(msg)` (returns null) in `frontend/utils/chatMessages.js`; Chat:424-434 becomes `getMessageSenderUid(msg) ?? ''` (same result).

### C-4. `getEpoch(chat)` for sorting conversations
- Messages:424-436 (inside component)
- backend/getUserFeed.js:226-234 (inside `getUserMessages`, other partition)
**Identical** statement for statement (differs only in quote style/line breaks). NOT the same as C-1 (numbers are returned unchanged, fallback `new Date(t).getTime()`): keep it a separate function. Canonical: new `backend/messages/getChatLatestEpoch.js` (frontend already imports from backend/messages; backend must not import from frontend). Low value/low risk; needs the owner of backend/getUserFeed.js (G-1). If that partition declines, just hoist Messages' copy to module scope.

### C-5. Participant normalisers: NOT identical, leave separate
- Chat:76-114 `normalizeParticipant`: handle = `raw.handle` if it is a string (even ""), else username; name = `raw.name` if string, else displayName, else handle.
- createChat.js:4-44 `normalizeParticipant`: handle = first NON-EMPTY of handle/username; display = first non-empty of **displayName, then name**; name/displayName = `display || handle`.
- backend/getUserFeed.js:10-28 `normalizeParticipantRef`: uid via `coerceUid`, `||` chains, no pfpVersion.
- functions/index.js `normalizeUserRefPayload` (server).
They differ for `{handle:"", username:"x"}`, for objects carrying both `name` and `displayName`, and in uid key lists. Do not deduplicate. Renaming one of the two same-named functions is optional.

### C-6. Verified handle wrapper component
- MessageCard.js:91-118 `ParticipantHandle`
- ChatHeader.js:35-60 `ChatHeaderHandle`
Differences: (a) `preserveTextAlignment` plumbing in MessageCard, which is a no-op (B2); (b) fallback font size `HANDLE_FONT` (= ts(12)) vs `ts(13)`, used only if the passed textStyle has no numeric fontSize; both call sites pass a style with fontSize (MessageCard `styles.handle` :293-300, ChatHeader `styles.nameText` :279-286), so the fallback never applies. After B1/B2 clean-up the two are behaviourally identical for every call site.
Canonical (optional, low risk): new `frontend/components/common/ParticipantHandle.js` with a `fallbackFontSize` prop defaulting to `ts(13)`; MessageCard passes `HANDLE_FONT` to stay exact. If the implementer prefers zero risk, just clean both in place.

### C-7. Handle sanitiser
- ChatHeader.js:27-33 `sanitizeHandle(user)`
- MessageCard.js:122-129 (inline in the `sanitizedHandles` memo)
**Identical** (handle string -> strip leading `@`s -> trim; else trimmed `name`; else "Friend"). Canonical: export `sanitizeHandle` next to the shared ParticipantHandle (or from `frontend/utils/chatMessages.js`) and use it in MessageCard's memo. Other `replace(/^@+/, "")` users in the repo (PastWorkoutScreen.js:556/611, SimpleFeedPost.js:1055/1061, FeedHeader/ProfileCard.js:25) have different fallbacks: do not merge.

### C-8. `participantsMeta` builders: similar, not identical
MessageCard.js:133-144 (adds `uid`, `user: usersExcludingSelf[idx] || {}`) vs ChatHeader.js:64-74 (`user` passed through raw). Leave.

### C-9. MessageInput send handlers
MessageInput.js:25-28 `handleSend` and :30-33 `handleSubmit` are byte-identical bodies. Keep one, use it for both `onPress` (:120) and `onSubmitEditing` (:113).

### C-10. Media tile list JSX
MessageItem.js:320-322 and :341-343 are the same `normalizedMedia.map(...)`. Optional: build once (`const mediaTiles = ...`) above `bubbleNode`. Do this only together with hoisting MediaTile (F-2).

### C-11. `normalizeMediaEntry`: NOT identical, leave
MessageItem.js:45-62 (precedence url > uri > image > photoURL > photoUrl > photo > path > src, trims, looks at `mimeType`, sets `url`, no `cropRect`) vs SimpleFeedPost.js:157, ProfileWorkoutsAndPostsScreen.js:93, UserStatsExerciseDetailScreen.js:30 (uri first, always add `cropRect`, no mimeType). Different outputs.

### C-12. Bottom-sheet boilerplate (jscpd 15 lines)
CreateGroupChatBottomSheet.js:9-33 vs frontend/components/5_Profile/EditProfile/EditProfileBottomSheet.js:6-30 (also DEAD ViewStatsBottomSheet). Same skeleton, different backdrop opacity (0.5 vs 0.6), styles and child. Not worth a shared abstraction; only remove the tracing `handleSheetChanges` in both (G-3).

### C-13. Following list + search state
CreateGroupChatModal.js:45-67 vs frontend/components/1_Feed/SharePost/ShareModal.js:13-36: same two effects, different selection logic (uid-based vs identity-based). Leave.

### C-14. `getDynamicStyles` breakpoints
CreateGroupChatModal.js:14-40 vs PARKED InfoPanel.js:9-39: same breakpoints, different payload. Leave (PARKED must not be edited).

### C-15. Blocked/blockedBy uid sets from global.userData
`new Set(ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked))` (+ the blockedBy twin): Messages:309-310, Chat:149-156, and outside the partition FeedHeader.js:258/274/341/384, 4.1_ViewProfile.js:202/217, useFilteredFeed.js:549-550, PARKED LeaderboardsSection.js:337/1328-1331. Candidate helpers `getBlockedUidList()` / `getBlockedByUidList()` in frontend/utils/userRefs.js (owned elsewhere; G-5). Within this partition the expressions are identical.

### C-16. Two `userRefs` modules (not owned here)
backend/helper/userRefs.js vs frontend/utils/userRefs.js: `normalizeUserRef`, `ensureUidArray`, `mergeUidSets` equal; `coerceUid` differs (frontend adds keys `docId`, `_id`, `objectID`). sendMessageV2.js:3 uses the backend one, Messages:25 and Chat:40 the frontend one. For the objects this partition passes (`{uid,...}`) both give the same result. Leave the imports as they are unless the owning partitions unify the modules.

### C-17. Small repeated literals (optional)
- Self sender object `{ uid, handle, pfp: userData.image, name }`: Messages:290-295, Chat:308-313.
- Reply snippet `x.text || (x.hasMedia ? "Media" : "")`: MessageInput.js:49, MessageItem.js:281.
- Back chevron button + `leftIcon` style: MessagesHeader.js:83-95/167-177 and ChatHeader.js:181-188/204-214 (identical style object). Could become a tiny shared `HeaderBackButton`, optional.

---------------------------------------------------------------------------------------------------

## D. Decomposition plans

### D-1. frontend/screens/1.2_Chat.js (887 lines) - extraction risk: medium

Top-level layout today: imports 1-40; gesture/attachment constants 42-47; `UPLOAD_ERROR_COPY` 49-54; `resolveUploadErrorMessage` 56-70; `AnimatedKeyboardAvoidingView` 72; `COLORS` 74; `normalizeParticipant` 76-114; `Chat` 116-833; `styles` 835-886.

Proposed modules (all in the existing feature folder `frontend/components/1.2_Chat/` unless noted):

1. `frontend/screens/1.2_Chat.styles.js` (about 60 lines)
   - `COLORS` (Chat:74) and `styles` (Chat:835-886), moved verbatim; export `styles` (default) and `COLORS` (named; Chat:806 uses `COLORS.text`).
   - Needs imports: StyleSheet, theme, scaleSize.
2. `frontend/components/1.2_Chat/chatUploadErrors.js` (about 25 lines)
   - `UPLOAD_ERROR_COPY` (49-54), `resolveUploadErrorMessage` (56-70). Pure. Export `resolveUploadErrorMessage`.
3. `frontend/utils/chatMessages.js` (new shared pure helpers, about 45 lines; see C-1..C-3)
   - `chatTimestampToMillis` <- MessageItem.js:104-112 / Chat:604-612 (`toMs`)
   - `dateKeyFromMs` <- Chat:613-617
   - `getMessageTimeMs` <- Chat:618-622 (`msgTimeMs`)
   - `getMessageSenderUid` <- the chain at Chat:425-433
   - These three Chat helpers are declared inside the component but close over nothing; hoisting them also resolves the exhaustive-deps warning at Chat:654 without touching the dep array `[messagesRaw, currentUid]`.
4. `frontend/components/1.2_Chat/useChatSwipeGestures.js` (about 95 lines)
   - Constants `W` (42), `MAX_REVEAL` (43, export it: Chat:710 passes it to MessageItem), `BACK_START_WIDTH` (44), `BACK_COMPLETE_DISTANCE` (45), `BACK_COMPLETE_VELOCITY` (46).
   - Hook body = Chat:524-601 verbatim (`revealSelf`, `revealOther`, `surfaceOffset`, `mode`, `handleEdgeBack`, `pan`); signature `useChatSwipeGestures(navigation)` returning `{ pan, revealSelf, revealOther }`.
   - Clean seam: the only closure inputs are `navigation` and the module constants. Keep `Gesture.Pan()` un-memoised exactly as now, keep every `"worklet"` directive and statement order.
5. `frontend/components/1.2_Chat/useChatParticipantRegistration.js` (about 95 lines) - optional
   - `normalizeParticipant` (76-114) + `registrationKeyRef` (146) + effect (217-259).
   - Signature `useChatParticipantRegistration({ chatCid, currentUid, users, headerUsersExcludingSelf })` with the dep array kept as `[chatCid, currentUid, users, headerUsersExcludingSelf]` (after dropping the never-passed `params.participants`, B2; or pass it through as a fifth field if the owner wants it kept).
   - Blocker to watch: the effect reads `global.userData` at run time (229-235): keep that verbatim.
6. Module-level hoists that stay in the screen file (no new file needed):
   - `Cell` (718-724) -> `const CellRenderer = React.forwardRef(...)` at module scope (no closure; F-3).
   - `isImageAsset` (366-372) -> module scope (pure).
   - Reaction options literal (814-819) -> `const REACTION_OPTIONS = [...]` at module scope.
   - `MAX_ATTACHMENTS` (47) stays (used by openPicker).
7. Optional pure extraction: body of the list-building memo (626-653) as `buildMessageListWithDateChips(messagesRaw, currentUid)` in `frontend/components/1.2_Chat/chatListUtils.js`; the `useMemo` in Chat keeps the same deps and just calls it.

What stays in Chat: route seeding (117-134), all state (135-143), blocked sets (149-156), `headerUsersExcludingSelf` (159-176), `toHeaderProfile` (178-202), `participantUids` (209-215), `isThreadBlocked` (261-266), chat-doc snapshot effect (269-275), `sendMessage` (284-336), `openPicker` (338-411), reaction/reply/copy/report handlers (418-504), `isGroup`/`pfpByUid` (513-521), list memo (625-654), auto-scroll/haptic effect (657-683), `renderItem` (685-715), JSX (726-832). Expected size after 1-6: about 600 lines; after 7: about 570.

Blockers / do not split further: `sendMessage`, `openPicker`, `handleAction` share six pieces of state (`text`, `pendingMedia`, `replyDraft`, `sheet`, `isThreadBlocked`, `chatCid`) and setters; pulling them into a hook would mean a wide parameter object and no real gain. Hook order: the new custom hooks must be called at the positions where their first hook is called today (registration effect after `participantUids`; gestures after `pfpByUid`) or anywhere consistent; there is no conditional hook in Chat.

### D-2. frontend/screens/1.1_Messages.js (562 lines) - extraction risk: medium

Layout today: imports 1-25; `Messages` 27-520 (state 28-35; cache subscription 37-43; focus preload 45-74; route-param hydration 77-111; live latest-message listeners 115-143; baseline usersPrivate listener 147-246; `toFeedScreen` 248-265; unread reset 268-275; `toChat` 277-283; `openCreateGroupChatBottomSheet` 285-287; `initChat` 289-419; early return 421; `getEpoch` 424-436; memos 438-449; insets 451-452; JSX 454-519); `styles` 522-561.

Proposed modules:
1. `frontend/screens/1.1_Messages.styles.js`: `styles` (522-561) verbatim. About 45 lines.
2. `frontend/components/1.1_Messages/useMessagesChats.js` (about 230 lines): state `chats` (30), `latestByCid` (31), `messagesLoading` (34) and the five effects 37-43, 45-74, 77-111, 115-143, 147-246, verbatim and in the same order. Signature `useMessagesChats(routeMessages)` where `routeMessages = route?.params?.messages`; returns `{ chats, setChats, latestByCid, setLatestByCid, messagesLoading }` (`initChat` needs both setters, Messages:356/359).
   - Inside the hook replace the three `route?.params?.messages` reads (78, 218, deps 111/246) by `routeMessages`: same value, same dep identity.
   - Effect order on mount is preserved if the screen calls the hook before the unread-reset `useFocusEffect` (268-275).
   - Do not alter the dep expression at :143 (H-3).
3. Module-scope hoists (in the screen file or `frontend/components/1.1_Messages/messagesUtils.js`): `getEpoch` (424-436; or the shared C-4 helper), `buildParticipantKey` (321-325, pure, closes over nothing).
4. `initChat` (289-419) stays in the screen: it closes over `userData`, `chats`, `navigation`, three setters and two nested closures (`usersMatchKey` uses `targetKey`; `ensureChatCached` uses the setters). Not a clean seam.

What stays: `scope`/sheet-visibility state, `toFeedScreen`, unread reset, `toChat`, `initChat`, memos, JSX. Expected size about 290 lines.

Mandatory while touching the file: fix the conditional hooks (E-1) by moving line 421 below line 449.

### D-3. frontend/components/1.2_Chat/MessageItem.js (531 lines) - extraction risk: low to medium

Layout: imports 1-20; `W`, `BUBBLE_MAX_W` 22-23; `pickString` 25-29; `resolveMediaUri` 31-43; `normalizeMediaEntry` 45-62; component 64-421; `styles` 423-530.

Proposed modules:
1. `frontend/components/1.2_Chat/MessageItem.styles.js`: `styles` (423-530) + `W`/`BUBBLE_MAX_W` (22-23; `styles.media` :460 needs it and the component uses it at :262/:271) -> export both `styles` (default) and `BUBBLE_MAX_W`. While moving, replace the inline `require('../../helper/scaleSize').ts(18)` (:454) by a normal `import scaleSize, { ts } from "../../helper/scaleSize"` (same function, same value). About 115 lines.
2. `frontend/components/1.2_Chat/chatMediaUtils.js`: `pickString`, `resolveMediaUri`, `normalizeMediaEntry` (25-62) verbatim; export `normalizeMediaEntry`. About 40 lines.
3. `frontend/components/1.2_Chat/MediaTile.js`: the nested component (178-226) hoisted to its own file with props `{ m, item, onOpenMedia, onOpenActions }` (the three names it currently closes over) and `styles` imported from the styles file. See F-2 for the behaviour note (it stops being re-mounted on every MessageItem render).
4. `toMillis` (104-112) -> shared `frontend/utils/chatMessages.js` (C-1).

What stays: sender/grouping logic, the four `useAnimatedStyle` worklets (140-168), `openActionsSheet`, reactions, `bubbleNode`, row JSX. Expected size about 270 lines.
Blocker: none structural. Keep the order of the hooks that remain (useMemo, useRef, 4x useAnimatedStyle).

---------------------------------------------------------------------------------------------------

## E. Latent bugs (with minimal fixes)

E-1. **Hooks called conditionally** - Messages:421 `if (!userData) return null;` precedes `useMemo` at :438 and :444 (ESLint rules-of-hooks errors). If `global.userData` flips between null and non-null across renders React throws "Rendered more/fewer hooks".
   Minimal fix: move line 421 to just after line 449 (after both memos, before `topInset`). Nothing between 28 and 449 dereferences `userData` at render time (`initChat` only when invoked; the memos use `chats`, `latestByCid`, `scope`). Confidence: high.

E-2. **Prop passed to a component that ignores it** - ChatHeader.js:131 `iconSize={scaleSize(19)}`. Fix: delete the prop (keeps today's rendering). Confidence: high that deletion is behaviour-preserving; the designer's intent (19pt icon for 1:1 chats?) is unknown -> I-8.

E-3. **try/catch around an un-awaited promise** - Messages:272 `try { updateDocMerge('usersPrivate', uid, { unreadMessagesCount: 0 }); } catch {}`. `updateDocMerge` (backend/helper/firebase/updateDoc.js) is async and re-throws for errors other than not-found/permission-denied, so a rejection escapes as an unhandled promise rejection. Minimal fix matching the evident "ignore failures" intent: `updateDocMerge(...).catch(() => {});`. Confidence: medium (pure error-path change; apply only if the owner accepts error-path edits).

E-4. **Unhandled rejection in reaction handler** - Chat:448-456 `handleReaction` awaits `toggleReactionV2` with no catch; ReactionPopover.js:162 calls it without awaiting. Offline/permission errors surface as unhandled rejections. No obvious intended UX (silent? alert?) -> do not fix; I-9. Confidence that it is a defect: medium.

E-5. **Unhandled rejection when chat creation fails** - Messages:414 `await createChat(...)` inside `initChat`, called from CreateGroupChatModal.js:154 without catch (ViewProfile wraps the same call in try/catch + Alert, 4.1_ViewProfile.js:289-297). Not unambiguous -> I-9.

E-6. **Possible crash on missing data** - CreateGroupChatModal.js:54-55 stores `global.userData.following` unchecked; :63-64 calls `followingUsers.filter(user => user.handle.toLowerCase()...)`. If `following` is undefined, or an entry has no `handle`, typing in the search box throws. Same code in ShareModal.js:18-33 (other partition). Minimal fix would be `Array.isArray(...) ? ... : []` and `String(user?.handle || "")`. Confidence that it can happen: low (following entries normally carry handle). Leave unless the owner wants it; I-4.

E-7. **Bottom sheet never collapses programmatically** - CreateGroupChatBottomSheet.js:29-33 only calls `expand()` when `isVisible` becomes true; when Messages sets it false after creating/opening a chat (Messages:370, 392, 417) the sheet stays expanded behind the pushed Chat screen and is still open (with the old selection) on return. Looks like a bug but the fix (`close()` on false) changes visible behaviour -> I-2. Confidence: medium.

E-8. **Write to the legacy collection** - Messages:406 `arrayAppend("users", selfUser.uid, "messages", ...)` while every reader uses `usersPrivate/{uid}.messages` (Messages:154-158, messagesPreloader) and ViewProfile writes `usersPrivate` (4.1_ViewProfile.js:282). The Cloud Function already writes the `usersPrivate` entries for all participants (functions/index.js:1547-1559 inside `registerChatParticipantsAction`, which starts at :1467). Firestore paths are frozen by hard rule 1 -> I-1. Confidence that it is unintended: medium.

No duplicate object keys, no references to undefined names, no missing effect clean-ups (all listeners/timers/rafs in Messages:37-43, 115-143, 147-246, Chat:269-275, useChatMessages are released) were found in this partition.

---------------------------------------------------------------------------------------------------

## F. Best-practice issues worth fixing

F-1. Conditional hooks in Messages (E-1). Risk of fix: very low.

F-2. Components defined during render:
   - MessagesHeader.js:63-77 `Chip`: closes over nothing but module-level `styles`/imports. Hoist to module scope above `MessagesHeader`. Effect: the two chips stop being unmounted/remounted on every header render (today each tap, and each parent re-render caused by a cache update, remounts the RNBounceable and cuts its bounce animation). Static UI identical. Risk: low.
   - MessageItem.js:178-226 `MediaTile` (contains its own `useRef`): closes over `item`, `onOpenMedia`, `onOpenActions`. Hoist with those as props (D-3.3). Effect: FastImage/Video tiles are no longer remounted on every Chat re-render (every keystroke re-renders the list because `renderItem` is not memoised). Static UI identical; a legacy video tile would keep its player state. Risk: low to medium; keep `key` expressions (:321, :342) unchanged.
   - Chat:718-724 `Cell` built in `useMemo(..., [])`: already stable; hoist to a module-level `React.forwardRef` for clarity (removes the lint warning). Risk: very low.

F-3. Pure functions re-created on every render; hoist to module scope (no closure captured): Chat:604-622 (`toMs`, `dateKeyFromMs`, `msgTimeMs`), Chat:366-372 (`isImageAsset`), MessageItem.js:104-112 (`toMillis`), Messages:424-436 (`getEpoch`), Messages:321-325 (`buildParticipantKey`). Risk: very low. Hoisting `msgTimeMs` removes the exhaustive-deps warning at Chat:654 with the dep array unchanged.

F-4. Duplicate import of the same module: MessageCard.js:2 and :11 both import from "react-native" -> merge `TouchableOpacity` into line 2. Risk: none.

F-5. Inline `require` where an import already exists: MessageItem.js:454 (`require('../../helper/scaleSize').ts`) while :20 imports the same module -> named import. Risk: none. (Chat:475 `require("expo-clipboard")` is deliberate lazy loading inside try/catch: keep, H-8.)

F-6. Import grouping: Chat:1-40 and Messages:1-25 interleave third-party (`firebase/firestore`, `expo-*`, gesture-handler, reanimated) with local imports; MessageCard.js:9-14 and CreateGroupChatBottomSheet.js:5-7 likewise. Regroup only in files that are being edited anyway (rule 6). Risk: none (no side-effect imports in these files).

F-7. Effects/memos keyed on `global.userData...`: CreateGroupChatModal.js:57, Chat:151 and :155. They "work" because the dep is re-evaluated on each render. Do NOT change the dep arrays (tools note + H-4). Informational only.

F-8. Redundant derived state: CreateGroupChatModal.js:47 `selectedHandles` is always `selectedUsers.map(u => u ? u.handle : '')` (:76). Could be derived during render; that is a rewrite, gain is small -> optional, risk low.

F-9. New array identity per render: Chat:119 `initialUsers` falls back to a fresh `[]` each render when the route has no `usersExcludingSelf`, which invalidates `headerUsersExcludingSelf` (:159-176), `participantUids` and re-runs the registration effect (guarded by `registrationKeyRef`, so no extra network call). All current callers pass an array, so this is latent. Optional fix: module constant `EMPTY_USERS = []`. Risk: very low.

F-10. Constant-condition/alias noise: Chat:730 (B3), Chat:133 `const usersExcludingSelf = initialUsers;` (alias), ChatHeader `toMessages` prop duplicates the `navigation.goBack()` fallback (:91-94; Chat:737 passes exactly `() => navigation.goBack()`). Simplifying the last one would touch a component contract for no gain: leave.

F-11. `React.useMemo` (ChatHeader.js:64) vs named hook imports elsewhere: style only; leave unless the file's import line is being edited.

F-12. O(n^2) index lookup: Chat:698 `messagesOnly.findIndex` per rendered row. Performance only; fixing means changing the memo's output shape -> out of scope for a behaviour-preserving pass.

---------------------------------------------------------------------------------------------------

## G. Cross-partition requests

G-1. backend/getUserFeed.js:226-234 (partition backend-shared): `getEpoch` is identical to Messages:424-436. If a shared `backend/messages/getChatLatestEpoch.js` is created (C-4), import it there too. Optional.

G-2. frontend/screens/feed/hooks/useFeedUserData.js:94-97 (feed-screen): passes `userData` to the "Messages" route; Messages never reads it. Owner decision whether to stop sending it (route params are frozen by rule 1, so default is: leave).

G-3. frontend/components/5_Profile/EditProfile/EditProfileBottomSheet.js:10-12 and :38 (profile): same tracing `console.log("handleSheetChanges", index)` handler as CreateGroupChatBottomSheet; remove in the same way for consistency.

G-4. frontend/components/common/VerifiedHandle.js (common-components): no change needed. If MessageCard stops passing `preserveTextAlignment` (B2), the prop still has one user (frontend/components/3_Workout/NewWorkout/Group/GroupMenu.js:38): keep it.

G-5. frontend/utils/userRefs.js / backend/helper/userRefs.js (owned elsewhere): (a) two near-identical modules, `coerceUid` key lists differ by three keys (C-16); (b) candidate shared helpers for the blocked/blockedBy uid lists used in 8+ files (C-15). This partition needs no change if they stay as they are.

G-6. frontend/logic/messagesPreloader.js (utils-logic) and frontend/state/messagesCache.js (app-shell): Messages depends on their exact semantics (`hydrateMessagesCache` emits synchronously to subscribers and returns a copy; `syncMessageListeners` attaches `limit(1)` listeners). Please do not change emit timing, copy semantics or exported names. See I-3 about the duplicate listeners.

G-7. App.js:658-659 and :683-688 (app-shell): reads/writes Chat params `cid`, `data.cid`, `usersExcludingSelf`. Chat must keep accepting exactly these. App.js:1595-1601 sets `gestureEnabled: false` for Chat on iOS because Chat implements its own back swipe (H-1): keep the pair consistent.

G-8. frontend/screens/4.1_ViewProfile.js:237-298 (profile): a second "find existing DM or create" flow using `createChat`; it differs from Messages.initChat (remote lookup, `usersPrivate` write, error alert). Not mergeable without behaviour change; no request beyond "keep calling `createChat(selfUid, participants, cid)` with the same signature".

G-9. frontend/helper/useChatMessages.js (helpers-hooks): Chat relies on it returning docs as `{ id, ...data }` newest-first. No change requested.

---------------------------------------------------------------------------------------------------

## H. Fragile areas (leave alone or handle with care)

H-1. Chat swipe gestures, Chat:523-601. Reanimated worklets inside a `Gesture.Pan()` that is rebuilt every render; four shared values with a small state machine (`mode` 0-4); thresholds from module constants; `runOnJS(handleEdgeBack)`. `surfaceOffset` is never bound to a style but IS read in `onEnd` (:577): not dead. iOS native back gesture is disabled for this route in App.js. If extracted (D-1.4) move the block verbatim; do not memoise, reorder callbacks or touch the `"worklet"` directives.

H-2. MessageItem animated styles, MessageItem.js:140-168. Four `useAnimatedStyle` worklets capture plain JS values (`isSelf`, `revealMax`, `item?._pending`) and the shared values passed as props. Keep hook order and bodies. `containerRef` (:135, :258) and `tileRef` (:179, :202) with `collapsable={false}` are needed for `measureInWindow` anchors of the popover and the lightbox.

H-3. Messages live-listener effect, Messages:115-143. Dep array is the computed string `chats.map(c => c.cid).join("|")`: this is what stops the effect from re-subscribing on every cache emit (each emit gives `chats` a new identity). Do not "fix" the exhaustive-deps warnings; do not add `chats`. The rAF batching (`bufferRef`, `raf`) and cancel in cleanup must stay.

H-4. `global.userData` in dependency arrays: Chat:151, :155; CreateGroupChatModal.js:57. Removing them (as ESLint suggests) would freeze the blocked sets / following list for the lifetime of the component.

H-5. Messages baseline listener, Messages:147-246. Order matters: `attach` is defined first, then the early `return () => {}` when the list was seeded by route or cache (:218-220), then a 100 ms poll for the uid (max 50 tries). The async snapshot callback writes the GLOBAL cache (`hydrateMessagesCache`, `syncMessageListeners`) after an `await` without re-checking `cancelled`; adding that check would change what ends up in the cache after unmount: leave.

H-6. Redundant-looking state sets after cache hydration, Messages:107-110, 160-163, 209-212, 355-359. `hydrateMessagesCache` already notifies the subscriber (:38-41), but the explicit `setChats/setLatestByCid` calls deliver different array instances and affect render batching: do not remove.

H-7. Chat FlatList configuration, Chat:744-776: `inverted`, custom `CellRendererComponent` with `overflow: 'visible'`, `removeClippedSubviews={false}`, `maintainVisibleContentPosition`, the `isNearBottomRef` threshold (80) and the auto-scroll/haptic effect (:657-683, with `latestSeenIdRef`/`firstMessageSeenRef`). Reaction badges render outside the bubble and are clipped if any of this changes.

H-8. Lazy `require("expo-clipboard")` inside try/catch, Chat:474-477 (same pattern in PARKED ManageTribeModal.js:39). A static import would load the native module at screen import time; keep lazy.

H-9. MediaViewerModal.js: hooks deliberately unconditional and the Modal always rendered (:20, :33, :94 comments); `closingRef` guards double close; scale is height-based on purpose (:87). ReactionPopover.js: all hooks precede the `if (!mounted) return null` (:66) and `mounted` is cleared only when the hide animation finishes (:61-63). Do not reorder.

H-10. `AnimatedKeyboardAvoidingView` (Chat:72, :727): wrapper created with `Animated.createAnimatedComponent` although no animated prop is passed. Replacing it by the plain component is probably equivalent but is a native-view change with keyboard timing implications: leave.

H-11. MessagesHeader slider geometry, MessagesHeader.js:20-25, :48-61, :212-227: the slider position is derived from chip width/margins; `useNativeDriver: true` spring. Hoisting `Chip` (F-2) must not touch these.

H-12. Firestore contracts: createChat.js:53-63 (document shape of `messages/{cid}`), sendMessageV2.js:92-107 (message shape, `serverTimestamp` + `clientTs`, then parent update; Cloud Functions trigger on these), toggleReactionV2.js (reactions map shape), registerChatParticipants payload `{cid, participants}` and function name. Field names, order of the two writes and error behaviour (createChat swallows registration errors; sendMessageV2 throws `VIDEO_NOT_ALLOWED`) must stay.

H-13. Pending-message flag: Chat:648-649 computes `_pending` and spreads `...m` AFTER it (`{ type: "msg", _pending: pending, ...m }`), so a doc field named `type` or `_pending` would win. Keep the spread order when extracting the list builder (D-1.7).

H-14. Messages `toChat(key, ...)` (Messages:277-283) indexes the unsorted `chats` array with `originalIndex` computed at :488; MessageCard keys include that index (:498). Keep both.

---------------------------------------------------------------------------------------------------

## I. Open questions for the owner

I-1. Messages:406 appends the new chat reference to the legacy `users/{uid}` document, while readers and ViewProfile use `usersPrivate/{uid}` and the Cloud Function already registers every participant there. Is the legacy write still wanted (it may simply fail on rules and log)? The comment at :403 says "every participant" but only self is written.

I-2. CreateGroupChatBottomSheet never closes when `isVisible` turns false (E-7): after creating a group the sheet is still open, with the previous selection, when the user comes back from Chat. Intended?

I-3. Messages:115-143 opens one listener per chat on the whole `content` sub-collection (no `limit`), while messagesPreloader already keeps a `limit(1)` listener per chat feeding the same cache. Is the screen-level listener still needed? Removing it would cut reads substantially but changes side-effect timing, so it was left.

I-4. CreateGroupChatModal: placeholder says "Search by handle or name" (:125) but the filter matches the handle only (:63-65) and assumes every following entry has a `handle` (E-6). Fix or keep?

I-5. Video in chat: sending is blocked (Chat:366-381, sendMessageV2.js:37-41, uploadMediaAssets) but rendering paths remain (MessageItem.js:203-215, MediaViewerModal.js:119-136, MessageInput.js:66-74). Keep them for legacy messages, or remove (which would also drop react-native-video from these files)?

I-6. Route params nobody sends or reads: `returnTo` (Messages:259-263, never sent), `participants` (Chat:241, never sent), `index` (Messages:280, never read), `userData` (useFeedUserData.js:95, never read). Proposed: remove the two dead reads (B2), leave the two dead writes. OK?

I-7. Failure-path logs use `console.log` (createChat.js:68; Messages:397, :411; Chat:256). Keep as is, or switch to `console.warn`? (Left unchanged: `console.warn` shows a LogBox toast in dev.)

I-8. ChatHeader.js:131 passes `iconSize={scaleSize(19)}` that is ignored (E-2). Was a larger verified badge intended for 1:1 headers?

I-9. Error UX for `handleReaction` (Chat:448) and `initChat` -> `createChat` (Messages:414): both can reject without any catch (E-4, E-5). Silent catch, or an Alert like ViewProfile's?

I-10. toggleReactionV2.js does a non-transactional read-modify-write; two users reacting at the same time can lose one reaction. Out of scope for a refactor; noted only.

---------------------------------------------------------------------------------------------------

## Suggested order of work for the implementer

1. Zero-risk deletions: B1, B4, the two dead props in B2 (Messages:457, ChatHeader.js:131), F-4, F-5, C-9.
2. E-1 (move Messages:421 below :449).
3. B2 `onBoundsChange` removal in MessageItem; B3 unreachable branches (MessageCard "Friend", ChatHeader `primaryLabel`, Chat:483, Chat:730); `preserveTextAlignment` no-op.
4. New `frontend/utils/chatMessages.js` (C-1, C-2, C-3) and the module-scope hoists (F-3).
5. Component hoists (F-2): Chip, Cell, MediaTile.
6. File splits (D-1, D-3, then D-2), moving line ranges verbatim.
7. Only with owner sign-off: `returnTo` / `participants` reads (I-6), E-3, anything in section I.

Estimated lines removable without behaviour change: about 130 (dead code about 75, de-duplication about 55).
