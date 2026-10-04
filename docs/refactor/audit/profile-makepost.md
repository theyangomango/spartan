# Audit: partition "profile-makepost" (10 files, 4203 lines)

All line numbers are the files as they are now (identical to SPX/baseline for all ten files; verified with `diff -q`).
Files read completely, top to bottom: 10 of 10.

Abbreviations (all under `frontend/components/5_Profile/MakePost/` unless a path is given)
- PUO = PostUploadOptionsScreen.js (1694)   - CB = ClipBuilderScreen.js (882)   - SP = SelectPhotosScreen.js (618)
- ICM = ImageCropperModal.js (225)   - ZC = ZoomCropper.js (164)   - PHM = PostHonestyModal.js (52)
- PP = PreviewPhoto.js (163)   - PBS = PreviewPhotosBottomSheet.js (102)   - PPM = PreviewPhotosModal.js (150)   - C250 = compressUnder250KB.js (143)
- SFP = frontend/components/1_Feed/SimpleFeedPost.js (partition feed-post)
- FEED = frontend/screens/1_Feed.js, PWAPS = frontend/screens/ProfileWorkoutsAndPostsScreen.js, USEDS = frontend/components/2_Competition/UserStats/UserStatsExerciseDetailScreen.js

Legend
- T1 = unconditionally dead (no input can reach it, or the value is never read). Remove.
- T2 = unreachable only because every current sender of a route param / prop passes a fixed shape. Removing it is behaviour-preserving today but narrows a navigation contract, so it is gated on an owner answer (section I). Default if no answer: KEEP T2, do T1.

---

## A. Module map

| File | Purpose | Exports | Importers |
|---|---|---|---|
| PUO | Root-stack screen `PostOptions`: compose or edit a post. Caption input with a 10-line limit (hidden measuring Text), square media carousel with per-slide video controls, "Keep It Honest" confirm modal, image compression + upload, `createPost` / `updateDoc('posts')`, optimistic feed post and `global.userData.posts` append. | default `PostOptionsScreen` (:126; imported under the name `PostUploadOptionsScreen`) | `App.js:73` (route at `App.js:1675-1677`). Reached by route name from FEED:1072, FEED:1469, FEED:1471, PWAPS:837, USEDS:683 (`navigateOneWay`), `frontend/screens/5_Profile.js:81` (dead trigger, G4), `frontend/logic/useWorkoutManager.js:1324` (inside an unused function, G3), SP:222, CB:467. |
| CB | Root-stack screen registered twice: `NewClip` (`initialParams.mode = 'new'`: pick one video of at most 90 s, upload it and create a `type: 'clip'` post directly) and `EditClip` (`mode = 'edit'`: hand clip + caption on to `PostOptions`). | default `ClipBuilderScreen` (:57) | `App.js:74` (routes at `App.js:1629-1651` and `App.js:1652-1674`). Reached from FEED:1064 (`EditClip`), FEED:1478 / :1480 (`NewClip`), PWAPS:829, USEDS:672, PUO:956. |
| SP | Root-stack screen `SelectPhotos`: media-library grid in a bottom sheet, preview gallery of the selection, clear / crop, returns the selection to `PostOptions`. | default `SelectPhotosScreen` (:70) | `App.js:72` (route at `App.js:1628`). Reached only from PUO:922. |
| ICM | Full-screen crop modal (square crop box anchored on the preview area). Images are cropped with ImageManipulator; videos return a normalised `cropRect`. | default `ImageCropperModal` (:12) | SP:8 (rendered SP:493-502). |
| ZC | Pinch + pan image (reanimated shared values, RNGH gestures) with an imperative `getTransform()`. | default `ZoomCropper` (forwardRef, :8 / :164) | ICM:4 (rendered ICM:165-173). |
| PHM | "Keep It Honest" confirmation modal. | default `PostHonestyModal` (:8) | PUO:19 (rendered PUO:1421-1425). |
| PP | One grid cell: image, or video thumbnail (module-level thumbnail cache) with duration badge; selection ring + order badge. | default `React.memo(PreviewPhoto, comparator)` (:91-97) | PPM:6 (rendered PPM:23-32). |
| PBS | `@gorhom/bottom-sheet` wrapper (two snap points) around the grid; pre-paginates when expanded. | default `React.memo(PreviewPhotosBottomSheet)` (:80) | SP:7 (rendered SP:471-492). |
| PPM | The 3-column `BottomSheetFlatList` grid with pagination triggers and the "Allow More Photos" pill. | default `PreviewPhotosModal` (:150) | PBS:4 (rendered PBS:65-75). |
| C250 | Two-pass (plus emergency third pass) image resize/compress to a target size. | named `compressUnder250KB` (:31) | PUO:18 (called PUO:398-405). |

No PARKED, TOOLING or functions/ file imports anything from this partition (`grep -rn "MakePost/"` over the repo: only `App.js:72-74` and intra-partition imports). No string-based or dynamic `require` of these files.

Outgoing dependencies (unchanged by this audit): `backend/helper/makeID`, `backend/storage/uploadResumableNative`, `backend/posts/createPost`, `backend/helper/firebase/{arrayAppend,updateDoc,readDoc}`, `frontend/theme/mfpDark`, `frontend/utils/{haptics,profilePhoto,userRefs,userDataEvents,optimisticFeedPosts}`, `frontend/components/common/{CroppedVideo,DismissableTextInput}`, `frontend/helper/scaleSize`, `navigationRef` (lazy `require`, PUO:1262, CB:135).

Top-level layout of the three big files (for section D)
- PUO: imports 1-27; `screenWidth`/`scale` 29-30; `scaleSize` 32-34; `composeHorizontalPadding`/`avatarSize`/`headerBottomPadding`/`MAX_CAPTION_LINES` 36-39; `formatClockTime` 41-46; `mediaSignatureFor` 48-59; `normalizeMediaSelectionEntry` 61-111; `normalizeMediaList` 113-122; `isRemoteUri` 124; component 126-1429; `HIT_SLOP` 1431; `styles` 1433-1694.
- CB: imports 1-20; `SCREEN_WIDTH`/`scale`/`scaleSize`/`MAX_DURATION`/`composeHorizontalPadding`/`avatarSize` 22-27; `formatClockTime` 29-34; `normalizeClipEntry` 36-55; component 57-664; `styles` 666-882.
- SP: imports 1-13; `scaledSize`/`FEED_ASPECT_RATIO`/`MEDIA_TYPES` 15-17; `normalizeSelectionEntry` 19-53; `normalizeInitialSelection` 55-68; component 70-505; `styles` 507-618.

---

## B. Verified dead code

### B.0 Machine findings, verified

| Finding | Verdict |
|---|---|
| CB:353 `appendedOptimistically` assigned, never used | Confirmed (declared CB:348, assigned CB:353, no read). T1, see B.1#6 and E3. |
| ICM:208 `styles.center`, ICM:222 `styles.image` unused | Confirmed with a defined-vs-used script. T1. |
| PUO:4 `Ionicons` unused import | Confirmed (`grep -n Ionicons` PUO: only line 4). T1. |
| PUO:61 `index` param unused | Confirmed. T1 (B.1#2). |
| PUO:285 / SP:99 / ZC:79, 136, 153 exhaustive-deps | Informational. Do NOT change these arrays (H2, H7, H9). |
| PP:49 useless `return` | Confirmed. T1. |
| PPM:15 `images` unused | Confirmed; the whole prop chain is dead (B.1#12). |
| knip: no unused exports | Confirmed: every export has exactly the importer(s) listed in A. |
| jscpd CB:223-281 == PUO:460-518 | Confirmed, see C3 (tails differ). |
| jscpd SFP vs PUO (8 clones) | Confirmed, see C1, C4, C5. |
| jscpd ZC internal clones | Confirmed; worklet bodies, leave (C11). |

Also checked by script: no StyleSheet key is defined twice in any file; no unused keys other than the two in ICM; one key is USED BUT NOT DEFINED: `styles.blockMask` (ICM:178, ICM:179) -> E1.
No `console.log` tracing anywhere in the partition; every `console.warn` / `console.error` (PUO:407, 470, 518, 1085, 1127, 1144, 1238; CB:233, 281, 402, 442; PP:52; SP:272, 309) sits on a real failure path: keep all.

### B.1 T1 (unconditional)

1. PUO:4 `Ionicons` (import specifier). Evidence above.
2. PUO:61 parameter `index = 0` of `normalizeMediaSelectionEntry`: never read in the body (61-111). Remove the parameter and the second argument at PUO:117 (`idx`) and PUO:289 (`idx`); PUO:140 and PUO:264 already pass one argument. (`normalizeMediaList`'s `idx` at PUO:116 then becomes unused too: drop it from the callback signature.)
3. PUO:925-944, the "Switch to regular post?" alert inside `handleOpenSelectPhotos`. Proof: the callback has two call sites. PUO:1384 passes it only when `isClipMode` is false in that render (`isClipMode ? handleOpenClipBuilder : handleOpenSelectPhotos`), and `isClipMode` is in the dep array (PUO:947), so the closure sees the same value. PUO:1403 is inside the `hasMedia ? ... : ...` else-branch (PUO:1345 / 1399), i.e. `mediaList.length === 0` in that render, and `mediaList` is in the dep array. The guard `isClipMode && mediaList.length > 0` is false on both paths. Delete lines 925-944 only (keep `openPicker` and the final call at 946; keep the dep array as is).
4. PUO:959-977, the "Replace media with a clip?" alert inside `handleOpenClipBuilder`. Proof: single call site PUO:1384, taken only when `isClipMode` is true; guard is `!isClipMode && ...`. Consequences inside the same callback: PUO:951 `isClipMode ? 'EditClip' : 'NewClip'` is always `'EditClip'`; PUO:953 `isClipMode &&` is always true. Delete 959-977; simplifying 951/953 is optional (one-line rewrites). Keep the dep array at PUO:980.
5. PUO:181-183 `editingRouteImages`: a memo that returns `editingMediaEntries` when editing and `[]` otherwise, but `editingMediaEntries` is already `[]` when not editing (PUO:135) and both memos invalidate together. Used at PUO:205, 250, 252. Optional: alias (`const editingRouteImages = editingMediaEntries;`). Same identity behaviour. Low value; do it only if the area is touched.
6. CB:348 `let appendedOptimistically = false;` and CB:353 `appendedOptimistically = true;`: written, never read (the catch at CB:443 tests `previousPosts` instead). Delete both lines; see E3 before deciding whether to wire it instead.
7. CB:487 `isPosting ? "Saving..." : "Save"`: `isPosting` is only set by `postClip` (CB:342), which `handleSave` calls only when `!isEditing` (CB:463-466). In edit mode the label is always "Save". Optional simplification; harmless if left.
8. CB:641 and CB:815 `theme.error || "#EF4444"`: `frontend/theme/mfpDark.js` has no `error` key (and these are the only two `theme.error` reads in the repo), so the value is the literal. Optional; harmless if left (it documents the intended token).
9. ICM:208 `center`, ICM:222-224 `image` (StyleSheet keys, with the comment at 223). ICM:58 stale comment ("ImageZoom handles gestures; we track its transform via onMove": there is no ImageZoom and no onMove; the transform is read through `cropperRef`, ICM:63).
10. PP:49 `return;` (last statement of the `if`, nothing follows inside the `try`).
11. PBS:12 `bottomSheetRef` + PBS:52 `ref={bottomSheetRef}`: the ref is never read. Remove both and `useRef` from the import at PBS:1. PBS:58-59 `onClose={() => { }}`: no-op handler on an optional prop (`node_modules/@gorhom/bottom-sheet/src/components/bottomSheet/types.d.ts:272`); remove.
12. `images` prop chain: SP:473 `images={selectedItems}` -> PBS:11 (destructured) -> PBS:67 `images={images}` -> PPM:15 (destructured, never read). Remove at all four places. Re-render behaviour is unchanged: `selectedOrderMap` (SP:237-246) changes exactly when `selectedItems` changes, and `React.memo(PBS)` is defeated anyway by the inline `onRequestMoreAccess` (SP:480).
13. PPM:86-91 `shouldItemUpdate={...}`: not a prop of RN 0.73.6 `FlatList`/`VirtualizedList` nor of `@gorhom/bottom-sheet` 4.6.4 (`grep -rl shouldItemUpdate node_modules/react-native/Libraries node_modules/@react-native/virtualized-lists node_modules/@gorhom/bottom-sheet/src`: no hit). The function is never called.
14. SP:428 `displayName={false}` and SP:429 `showThumbs={false}`: not props of `react-native-awesome-gallery` 0.4.3 (`GalleryProps`, `node_modules/react-native-awesome-gallery/src/index.tsx:909-935`); they land in `...eventsCallbacks` (:960, :1085) and are never destructured (:150-179).
15. SP:15 `const scaledSize = (size) => scaleSize(size);`: pure forwarder to the default export of `frontend/helper/scaleSize.js` (single-argument function). 31 call sites in SP; `scaleSize` itself is already used directly at SP:530, 562, 580, 595, 616. Replace `scaledSize(` by `scaleSize(` and delete line 15. Same pattern in about 20 other files: follow the repo-wide decision (G6).
16. SP:523-524 `header_text_ctnr: {}` (empty style) and its use at SP:373. `<View style={{}}>` equals `<View>`. Optional.
17. SP:360-363 `activeSelection` / `canCropActive`: `canCropActive` is read only at SP:453 and SP:456, both inside `selectedPreviewItems.length > 0 && (...)` (SP:443), where `selectedItems` is non-empty and holds only non-null objects (SP:55-68, 189-198, 263-270), so it is always true there. Optional: delete 360-363 and reduce both expressions to `isGeneratingCrop`.
18. C250:122-126: both branches return `emergency.uri`. Collapse to a single `return emergency.uri;` and delete the then-unused `emergencyInfo` read (C250:122). The removed call is a side-effect-free `FileSystem.getInfoAsync(...).catch(() => null)`; result unchanged.

### B.2 T2 (dead only because of what the current senders pass) - default KEEP

1. PUO `editingPost` shape tolerance. All three senders build `{ pid, caption, mediaEntries, workoutName }` with `mediaEntries` always an array (FEED:1051-1056, PWAPS:816-821, USEDS:659-664; CB:472 only forwards that object). Therefore:
   - PUO:153-157 (`editingPost.media` fallback) never runs.
   - PUO:159-168 (`editingPost.images`) never runs.
   - PUO:185-186 `editingHasWorkoutPid` / `editingHasWorkoutObject` are always false; PUO:191-192 never return true.
   - PUO:232-235 `editingIsClip` is always false, so `useState(() => editingIsClip)` (PUO:236) always starts false; clip mode is only ever entered through the `clipMedia` param effect (PUO:262-277).
2. PUO `workout` route param: read at PUO:184; used at PUO:188, 921, 1018-1025, 1063, and forwarded back by SP:219-221. The only sender is `frontend/logic/useWorkoutManager.js:1324`, inside `postWorkout` (:1319-1326), which is returned (:1488) but used by no consumer (`grep -rn postWorkout`: those two lines only; the single consumer `frontend/components/3_Workout/WorkoutExperiencePortal.js:40-53` does not destructure it). See G3 / I3. Note that even with a sender, the workout would never be persisted: both `createPost` calls pass `null` as the workout argument (PUO:1228, CB:434); only the optimistic post carries it (PUO:1063).
3. String-entry and alternate-key tolerance in the normalisers: PUO:63-74, the `entry.url || entry.image || entry.path` alternates at PUO:76 and the alternate type keys PUO:79-84; SP:21-32, SP:34. No sender passes strings or those keys (senders: `images: []`, `images: mediaEntries` objects, SP:208-217 objects, PUO `mediaList` objects). Cheap boundary tolerance: KEEP.
4. ICM:129-132 (`headerTop` fallbacks) and ICM:149-150 (roiTop fallback): the only caller always passes a finite `headerOffset` (SP:95, SP:499) and a numeric `anchorTop` once the preview has laid out (SP:384-387, SP:498). KEEP (component API).
5. Defaults nobody relies on: C250:38-43 option defaults (the only caller passes all six, PUO:398-405); ZC:8 `maxScale = 6` (never passed); ICM:15 `aspectRatio = 1`, ICM:20 `mediaType = 'image'` (always passed, SP:496-497). KEEP.

### B.3 Not dead (checked because they look suspicious)
- PP comparator reads `prev.id` / `next.id` (PP:94): `id` is passed (PPM:25) although the component does not destructure it. Keep the prop.
- `selectionSourceRef` values `"editing"` / `"none"` (PUO:207-211, 251) are never compared; only `"user"` is (PUO:249). They are labels; leave.
- PUO:1431 `HIT_SLOP` is declared after the component but used at PUO:1278 / 1290: fine at runtime (module scope is initialised before first render).
- SP:97-99 calls `getInitialAssets` declared at SP:121: fine (the effect body runs after render).

---

## C. Duplication

C1. `formatClockTime(seconds)` - 3 copies, IDENTICAL.
PUO:41-46 == SFP:130-135 byte for byte; CB:29-34 differs only in quote characters. Canonical home: a shared util, e.g. `frontend/utils/formatClockTime.js` (same proposal as feed-post audit C4/G1). All three import it; no call-site change (PUO:766-767, CB:600-601).
NOT the same and must stay separate: PP:10-15 `formatDuration` (uses `Math.round`, so 59.6 s shows "1:00" where `formatClockTime` shows "0:59"); `frontend/components/3_Workout/NewWorkout/RestTimerModal.js:41-45` `formatTime` (no `Number()` coercion, no floor, no clamp at 0); `formatDuration(durationMs)` in SFP:102 / `frontend/screens/PastWorkoutScreen.js:112` (milliseconds to "1h 2m").

C2. Width-375 scaler - IDENTICAL in PUO and CB, and in 6 more files outside the partition.
PUO:29-34 (`scale = screenWidth / 375`, `function scaleSize(size) { return Math.round(size * scale); }`) and CB:22-24 (`const scaleSize = (value) => Math.round(value * scale)`) compute the same value for every input. Also identical in both files: `composeHorizontalPadding = scaleSize(18)` (PUO:36, CB:26) and `avatarSize = scaleSize(36)` (PUO:37, CB:27).
Same formula elsewhere: `frontend/screens/0.0_SignUp.js:20-26`, `frontend/screens/0.1_LogIn.js:20-26`, `frontend/screens/0.3_UserLogInCredentials.js:10-16`, `frontend/components/ViewProfile/ViewProfileRowButtons.js:12-17`, `frontend/components/5_Profile/EditProfile/EditProfileModal.js:12-17` (named `wScale`), `frontend/components/1_Feed/FeedHeader.js:36-38` (named `s`), `frontend/theme/headerMetrics.js:11-12` (named `s`, evaluated lazily inside `buildMetrics`).
This is NOT `frontend/helper/scaleSize.js` (baseline 390 x 844, min of both axes; its `hs` is 390-based): PUO and CB must not switch to it. SP, ICM, PHM, PP, PBS and PPM use the 390-based helper; that split inside the partition is existing behaviour and stays.
Canonical home: within the partition, a new `MakePost/composerLayout.js` (section D). If the coordinator introduces an app-wide width-375 helper (G2), `composerLayout.js` imports it instead of redefining it.

C3. `ensureVideoAsset` (PUO:460-542) vs `ensureClipVideoAsset` (CB:223-300) - PARTLY identical.
`diff` of the two bodies: identical except
- log tags: `'[PostUploadOptions] ...'` (PUO:470, 518) vs `'[ClipBuilder] ...'` (CB:233, 281);
- thrown text: `'Unable to resolve local video path for upload'` (PUO:524) vs `'Unable to resolve video file for upload'` (CB:287); both are only ever logged by the callers (PUO:1127, CB:442);
- size: `typeof info?.size === 'number' ? info.size : null` (PUO:528) vs `info?.size && Number.isFinite(info.size) ? info.size : null` (CB:291): differ only for a 0-byte file (0 vs null), which `uploadResumableNative` treats the same (`backend/storage/uploadResumableNative.js:51-58`: null triggers one extra `getInfoAsync`, both end with `effectiveSize` 0 and the resumable path);
- mime: PUO:530-534 honours `entry.mime` / `entry.mimeType` first; CB:292 does not. The PUO branch is unreachable today because the entries it receives come from `normalizeMediaSelectionEntry`, which does not copy those fields (PUO:93-108). For mp4 / mov / m4v both produce the same mime.
Verdict: same upload behaviour for every reachable input; observable differences are console text and the 0-byte edge. Per rule 4 do NOT merge in this refactor. Neither function captures component state (both are `useCallback(..., [])`), so each can be MOVED verbatim to module scope (section D, `videoUploadAsset.js`), which puts the two side by side for a later owner-approved merge (I12).

C4. Video slide controls, PUO vs SFP (feed-post audit C5 / G8) - PARTLY identical.
Identical logic: state/refs PUO:223-231 vs SFP:430-438; unmount timer cleanup PUO:579-584 vs SFP:496-501; `getControlsOpacityValue` PUO:586-591; `clearControlsHideTimeout` 593-599; `setControlsVisibility` 601-639; `toggleVideoPlayback` 641-654; `assignVideoRef` 660-666; `handleVideoProgress` 677-685; `beginScrub` 687-694; `handleScrubChange` 696-702 (SFP spells it with a temp variable); `finishScrub` 704-723; "show controls for the active slide" effect PUO:824-835 vs SFP:503-514.
Differences: `toggleVideoMute` (PUO:656-658 local only; SFP supports an external toggle); `handleVideoLoad` (PUO:668-675; SFP also counts media loads); reset on media change: PUO:301-315 additionally clears `videoRefs.current` and all pending hide timers and always re-mutes, SFP:458-477 does neither and has extra content-ready logic. (The feed-post audit says the reset exists in SFP only; PUO has its own, different one.)
Recommendation: same as feed-post: no shared hook in the first pass (stateful, timing-sensitive, untested). A PUO-local hook is described in D as an optional, medium-risk step.

C5. `mediaSignatureFor` - same name, DIFFERENT behaviour. PUO:48-59 vs SFP:173-194. For a string `uri` identical; for a missing uri PUO yields `'""'` (`JSON.stringify('')`) and SFP `""`; for a numeric uri PUO yields `"12"` and SFP `""`; SFP wraps stringify in try/catch. Leave both.

C6. Media-entry normalisers - all DIFFERENT, leave all.
- PUO:61-111 `normalizeMediaSelectionEntry`: type from 7 candidate keys via `includes('video')`; keeps `width`, `height`, `aspectRatio`, `isClip`; `assetId` falls back to null.
- SP:19-53 `normalizeSelectionEntry`: type is `entry.type === 'video'` only; synthesises `assetId` (`initial-${index}-${originalUri}`); drops width/height/aspectRatio/isClip.
- CB:36-55 `normalizeClipEntry`: uri precedence `localUri || uri || previewUri`, forces `type: 'video'`, `isClip: true`, `localUri` falls back to the uri even when remote, drops `cropRect`.
- `normalizeMediaEntry` in SFP:157, PWAPS:93, USEDS:30, `frontend/components/1.2_Chat/MessageItem.js:45`: four further variants (see feed-post audit C2).
Inside PUO: PUO:288-290 (`selectedImages.map(normalize).filter(Boolean)`) is equivalent for every input to `normalizeMediaList(selectedImages)` (PUO:113-122). Optional one-line reuse.

C7. Optimistic-post plumbing, PUO vs CB - similar, NOT identical; leave both.
- `global.userData.posts` append: PUO:1000-1010 vs CB:345-355 (same, minus the `!isEditing` guards).
- `addOptimisticFeedPost` payload: PUO:1053-1082 vs CB:361-399: same keys except PUO adds `workout`; media/images/type values differ.
- Rollback differs: PUO:1239-1241 vs CB:443-445 (E3).

C8. Remote-URL test: `isRemoteUri` (PUO:124) vs the inline `/^https?:\/\//i.test(fallbackUri)` at PUO:508 and CB:271. Equivalent for the truthy strings those sites receive. Only relevant if C3's functions end up in a module that can import the helper; otherwise leave.

C9. Composer JSX / style look-alikes, PUO vs CB - do not merge.
Avatar + caption row (PUO:1304-1343 vs CB:534-570), header (PUO:1277-1297 vs CB:496-526), video overlay (PUO:755-798 vs CB:591-632). StyleSheet entries `avatar_ctnr`, `avatar`, `avatar_placeholder`, `caption_text`, `video_slider_overlay`, `video_slider`, `video_time_row`, `video_time_text`, `video_controls_overlay`, `video_play_icon_wrap` have equal values in both files; `caption_ctnr` (PUO adds `position: 'relative'`), `video_mute_button`, all header styles and the FastImage `source` (CB adds `priority` / `cache`, CB:539-543) differ. Structure differs too (PUO wraps everything in the Pressable and animates the slider overlay).

C10. Video thumbnails: PP:45 and SP:302 both call `VideoThumbnails.getThumbnailAsync(uri, { time: 0 })` with different caching and error handling. Leave.

C11. ZC internal clones (ZC:47-55 == 63-72, ZC:60-70 == 118-127): bounds clamping repeated inside worklets. Leave (H7).

C12. `clamp`: ZC:36-39 is a worklet defined inside the component. Same arithmetic as `frontend/utils/macroRecommendations.js:42`, `frontend/screens/MuscleGroupExercises.js:84`, `frontend/components/1_Feed/Posts/Post.js:56`, `frontend/helper/estimateWorkoutCalories.js:87`, `shared/hexagon/computeHexagonCore.js:182`, but those are not worklets. Keep ZC's local.

C13. Platform quality defaults `0.72 / 0.68` and `0.62 / 0.58` appear in PUO:325-326 and C250:34-35. C250's copies are never used (B.2#5). Leave both.

C14. For information (outside the partition): the code that builds this partition's `editingPost` param is triplicated: FEED:977-1056 == PWAPS:738-821 == USEDS:585-664 (user-stats audit, `buildEditPostPayload`). If that helper is created its home should be `frontend/utils/`, and the payload shape must stay `{ pid, caption, mediaEntries, workoutName }` (G5).

---

## D. Decomposition plans

Suggested order: (1) T1 removals, (2) shared constants/utils and StyleSheets (pure moves, LOW risk), (3) hoist the two closure-free async helpers (LOW), (4) optional custom hooks in PUO (MEDIUM; skip if in doubt). Every original path keeps its default export, props and route behaviour.

### D.1 New shared modules in `frontend/components/5_Profile/MakePost/`

1. `composerLayout.js` (new, about 15 lines)
   - Moves from PUO: 29-34 (`screenWidth`, `scale`, `scaleSize`, with the comment), 36-38 (`composeHorizontalPadding`, `avatarSize`, `headerBottomPadding`), 1431 (`HIT_SLOP`).
   - Needs `import { Dimensions } from 'react-native';`. Exports: `screenWidth`, `scaleSize`, `composeHorizontalPadding`, `avatarSize`, `headerBottomPadding`, `HIT_SLOP`.
   - PUO imports all six (uses: `screenWidth` PUO:203; `scaleSize` in JSX and PUO:215; `headerBottomPadding` PUO:1282; `HIT_SLOP` PUO:1278, 1290). `MAX_CAPTION_LINES` (PUO:39) stays in PUO.
   - CB deletes CB:22-24 and CB:26-27 and imports `scaleSize`, `composeHorizontalPadding`, `avatarSize` (C2: identical values). `MAX_DURATION` (CB:25) stays. CB's local `headerBottomPadding` (CB:492) stays as is.
   - If G2 produces an app-wide width-375 helper, `composerLayout.js` re-exports it as `scaleSize`.
2. `postMediaUtils.js` (new, about 80 lines, no imports)
   - Moves from PUO: `mediaSignatureFor` 48-59, `normalizeMediaSelectionEntry` 61-111, `normalizeMediaList` 113-122, `isRemoteUri` 124. All pure.
   - `formatClockTime` (PUO:41-46, CB:29-34) goes to the shared util of C1 instead (or into this file if the coordinator creates no shared home; then SFP keeps its own copy).
3. `videoUploadAsset.js` (new, about 165 lines)
   - Moves PUO:460-542 as `export async function ensureVideoAsset(entry) { ... }` and CB:223-300 as `export async function ensureClipVideoAsset(entry) { ... }`. Only the first line (`const X = useCallback(async (entry) => {`) and last line (`}, []);`) of each change; bodies byte for byte. Imports: `* as MediaLibrary from 'expo-media-library'`, `* as FileSystem from 'expo-file-system'`, `makeID`.
   - Nothing blocks this: neither body reads component state, props or refs.
   - Follow-ups: PUO drops the `MediaLibrary` import (PUO:7; only use is PUO:468). CB drops `MediaLibrary` (CB:6) and `FileSystem` (CB:7); remove `ensureClipVideoAsset` from the dep array at CB:456 (a module binding there would be flagged as unnecessary). PUO's `sharePost` is a plain function, no dep array involved.
   - Do not merge the two functions (C3).

### D.2 PUO (1694 lines)

4. `PostUploadOptionsScreen.styles.js` <- PUO:1433-1694 (`styles`, 262 lines) as `export default StyleSheet.create({...})`. Imports: `StyleSheet`, `theme`, and `scaleSize`, `composeHorizontalPadding`, `avatarSize`, `headerBottomPadding` from `./composerLayout`. PUO then drops `StyleSheet` and `Dimensions` from PUO:2 (no other use in the component).
5. After steps 1-4 PUO is about 1250 lines. What remains is one component whose pieces share state:
   - `sharePost` (PUO:982-1270, 289 lines) closes over `isSharing`, `sharePromiseRef`, `caption`, `hasWorkoutAttachment`, `isEditing`, `editingPid`, `honestyVisible`, `mediaList`, `isClipMode`, `viewerUid`, `workoutParam`, `userImage`, `ensurePreparedAsset`, `navigation`, `isMountedRef` and three setters. No clean seam: leave in place (H3).
   - `renderMediaItem` (PUO:725-808) reads 12 values from the video-control state: leave in place.
   - Caption line-limit logic (state PUO:217-220, callbacks 841-902, JSX 1328-1341): `captionLastValidRef` is also written by the `clipCaption` effect (PUO:283) and `setCaption` is shared. Seam not clean: leave in place (H1).
6. Optional, MEDIUM risk - `usePreparedImageAssets.js` (hook; input `mediaList`, output `ensurePreparedAsset`)
   - Moves: `compressionCacheRef` PUO:221, `compressionPreset` 323-371, `ensurePreparedAsset` 373-458, pre-warm effect 544-557. Needs `Platform`, `FileSystem`, `ImageManipulator`, `compressUnder250KB`, `isRemoteUri`.
   - Seam is clean (one input, one output). Effect order changes only in that the pre-warm effect moves to the hook's call position; it does not interact with any other effect. The hook must be called after `mediaList` (PUO:287-291).
7. Optional, MEDIUM risk - `useComposerVideoControls.js` (hook; inputs `mediaFingerprint`, `mediaIndex`, `mediaList`)
   - Moves: state/refs PUO:223-231; `previousMediaFingerprintRef` + reset effect 299-315; timer cleanup 579-584; callbacks 586-723; active-slide effect 824-835.
   - Returns: `videoPauseState`, `areVideosMuted`, `videoDurations`, `videoProgress`, `videoControlsVisible`, `getControlsOpacityValue`, `toggleVideoPlayback`, `toggleVideoMute`, `assignVideoRef`, `handleVideoLoad`, `handleVideoProgress`, `beginScrub`, `handleScrubChange`, `finishScrub`.
   - Blockers / care: `mediaIndex` must stay in the screen (carousel handlers PUO:568-577 and dots PUO:1372-1381 use it), so the hook is called after PUO:297. Effect order shifts: the active-slide effect (now PUO:824) would run before the effects at PUO:317, 544, 810, 818 instead of after them. I found no interaction (they touch `isClipMode`, the compression cache, `isMountedRef`, `mediaIndex`), and the relative order of the three moved effects (301, 579, 824) is preserved, which matters for unmount (timers cleared, then controls hidden). Keep the 180 ms / 2000 ms constants and the per-index maps untouched (H5).
   - With 6 and 7 PUO lands near 925 lines. Going further would mean rewriting `sharePost` / `renderMediaItem`: not recommended.

Extraction risk for PUO: LOW for steps 1-4, MEDIUM for 6-7.

### D.3 CB (882 lines)

8. `ClipBuilderScreen.styles.js` <- CB:666-882 (217 lines). Imports `StyleSheet`, `theme`, `scaleSize`, `composeHorizontalPadding`, `avatarSize` (from `./composerLayout`). CB drops `StyleSheet` and `Dimensions` from CB:2.
9. Steps 1 (constants), C1 (`formatClockTime`) and 3 (`ensureClipVideoAsset`) apply. `normalizeClipEntry` (CB:36-55) may stay or move to `postMediaUtils.js`.
10. Result: about 570 lines, one component. Stays: collapse choreography (CB:126-160), `pickVideo`, `postClip` (CB:324-456), `handleSave`, JSX. Nothing else to split (H6).

Extraction risk: LOW.

### D.4 SP (618 lines)

11. `SelectPhotosScreen.styles.js` <- SP:507-618 (112 lines) plus `FEED_ASPECT_RATIO` (SP:16, exported; used by the styles at SP:535, 541 and by the screen at SP:496). Imports `StyleSheet`, `theme`, `scaleSize` from the helper. If B.1#15 is applied, the moved block uses `scaleSize(` throughout; otherwise the wrapper line SP:15 has to exist in both files. SP drops `StyleSheet` from SP:2.
12. Optional: `selectPhotosUtils.js` <- `normalizeSelectionEntry` SP:19-53, `normalizeInitialSelection` SP:55-68 (pure).
13. Result: about 455 lines. The component keeps all state (H9).

Extraction risk: LOW.

Files that can be deleted after this plan: none.

---

## E. Latent bugs

E1. ICM:178-179 use `styles.blockMask`, which has never existed (the two Views were introduced in commit c413e84e without a style; the script confirms "used but undefined"). Effect today: two transparent, non-absolute Views laid out in normal flow (heights `scaleSize(roiTop)` and `scaleSize(SCREEN_H - roiTop - ch)`, the second pushed down by `top`). They draw nothing. On iOS (old architecture) they are real views painted after the crop box, and where `scaleSize(roiTop) > roiTop` (devices larger than 390 x 844) the first one overlaps the top strip of the crop box and may take touches there. No behaviour-preserving fix exists: adding the style changes the UI, deleting the Views changes hit-testing. Confidence that this is a defect: high. Action: leave exactly as is and ask the owner (I1).

E2. PUO:1099-1101: when a media item is already remote (every item of an edited post that was not replaced), the upload step returns `{ index, uri, type, duration, cropRect }` without `isClip` and `aspectRatio`, and PUO:1152-1159 then writes `isClip: false` and `aspectRatio: null` to Firestore. Traced for "edit a clip's caption" (FEED:1064 -> CB edit mode -> CB:467-475 -> PUO): the stored `media[0].aspectRatio` (written by CB:420-428) becomes null and `isClip` false; `type: 'clip'` survives (PUO:1214), and the feed card then falls back to ratio 1 (SFP `baseMediaAspectRatio`). Minimal fix matching the evident intent: return `isClip: Boolean(item.isClip)` and `aspectRatio: item.aspectRatio || null` at PUO:1100. This changes what is written to Firestore, so it is outside rule 2: do NOT apply without owner sign-off (I2). Confidence that it is a bug: high.

E3. CB:443-445 restores `global.userData.posts` only when `previousPosts` is non-null, i.e. only when `posts` was an array before. If it was missing, the optimistic `[pid]` (CB:352) stays after a failed upload. PUO does it correctly with the flag (`appendedOptimistically` + `previousPosts ?? []`, PUO:1239-1241), and CB declares the same flag but never reads it (B.1#6): the port was left half-done. Minimal fix: `if (appendedOptimistically && global?.userData) { global.userData.posts = previousPosts ?? []; }`. It only changes the failure path for users without a `posts` array. Confidence: medium. Default for this refactor: delete the dead flag, keep behaviour, record I8.

E4. Clearing all media in the picker has no effect. SP `next()` always navigates with `images: serializedSelection` (SP:207-226), but PUO treats an empty array as "no incoming images" (PUO:173-179 returns null unless `length > 0`), so the previous selection stays. Looks unintended; the fix is a behaviour change. Record only (I6). Confidence: medium.

E5. CB:98-107 `ensurePermission`: after the first request `permissionRequested` is true and the function returns `true` even if access was denied, so the second tap opens the picker without permission. Record only (I7). Confidence: low-medium (the system picker may not need the permission).

E6. CB:179-182: a video whose duration is reported as 0 (unknown) is rejected with "Video too long". Record only (I7).

E7. ICM:28-37 never clears `imgSize` when `uri` changes. Between two crop sessions `uri` goes to null (SP:318, SP:500), which unmounts ZC, but `imgSize` survives, so the next session mounts ZC with the previous image's size until `getSize` answers. Cosmetic one-frame glitch at most. Leave.

E8. PUO:1272 leaves "Save" enabled while editing with an empty caption and no workout name; pressing it then shows "Caption required" (PUO:986-989). Intent unclear (I9).

E9. PUO:1126-1129 and PUO:1143-1146 swallow per-item upload failures (return null); the post is then created or updated without those items and without telling the user. Record only (I13).

E10. ZC:136: the pinch memo uses `minScale` / `maxScale` (ZC:96) but lists only `[width, height, baseWidth, baseHeight]`. Not a bug in practice: `minScale` (ICM:49-53) is a pure function of exactly those four values and `maxScale` is never passed. Do not touch (H7).

E11. CB:109-117 never sets `isMountedRef.current = true` on mount (PUO:810-816 does). Only matters under a development double-mount. Leave.

Not found: references to undefined identifiers (lint `no-undef` clean), duplicate object keys, hooks called conditionally, components defined during render.

---

## F. Best-practice issues worth fixing

| # | Where | Issue | Fix | Risk |
|---|---|---|---|---|
| F1 | PHM:44 | Inline `require('../../../helper/scaleSize').ts(20)` although the module is imported at PHM:5. | `import scaleSize, { ts } from '../../../helper/scaleSize';` and `scaleSize(ts(20))`. `ts` is a named export (`frontend/helper/scaleSize.js:54`). | None. |
| F2 | PUO:1262, CB:135 | Lazy `require('../../../../navigationRef')` inside handlers. `navigationRef.js` imports only `@react-navigation/native` (no cycle) and `App.js:13` already imports it statically. | Static `import { jumpToTab } from '../../../../navigationRef';`. Keep each try/catch and each site's semantics: PUO ignores the return value, CB falls back when it is false. | Low. |
| F3 | PUO:1-27, CB:1-20, SP:1-13 | Imports not grouped (third-party after local: PUO:7-8, 11-12; CB:13; SP:12), mixed quotes inside the block, stray blank line PUO:26. | Regroup (react, react-native, third-party, local) only in these three files, whose import blocks change anyway. None of the imports has side effects. | None. |
| F4 | PUO:1431 | Constant declared after the component that uses it. | Moves to `composerLayout.js` (D.1). | None. |
| F5 | PUO:841-844 | `formatMeasureValue` is a pure function wrapped in `useCallback(..., [])`. | Optional: hoist to module scope and drop it from the dep array at PUO:855. | Low. |
| F6 | PUO:460-542, CB:223-300 | Closure-free async helpers kept as hooks. | D.1 step 3. | Low. |
| F7 | ICM:113 | `catch (e)` with unused binding. | `catch {`. | None. |
| F8 | SP:15 and 31 call sites | Forwarding wrapper (B.1#15). | Per G6. | None. |
| F9 | PUO:126 | Default export is named `PostOptionsScreen`; file and import are `PostUploadOptionsScreen`. | Leave (only the dev-tools display name would change). | - |
| F10 | SP:229-235, SP:384-387, SP:480-490 | Values/handlers rebuilt every render make `React.memo(PBS)` ineffective and hand Gallery a new `data` array each time. | Leave: memoising changes how often Gallery and the bottom sheet re-render (H9). | - |
| F11 | SP:462, PP:72, PPM:70, PPM:105, ZC:157 | Inline style objects. | Leave (no rule requires it; avoids churn). | - |
| F12 | PUO:285, SP:99, ZC:79 / 136 / 153 | exhaustive-deps warnings. | Leave all (H2, H9, H7). | - |
| F13 | CB:576-644 | JSX indentation two levels off. | Leave unless the block is moved. | - |
| F14 | PUO:554 | Comment "Logged upstream" is inaccurate (the rejection from PUO:424 is not logged anywhere). | Leave or reword; no behaviour. | - |

No duplicate imports of one module, no duplicate default + named export, no conditional hooks in the partition.

---

## G. Cross-partition requests

G1. feed-post (SFP:130-135) + coordinator: create the shared `formatClockTime` (C1). This partition replaces PUO:41-46 and CB:29-34 with the import.
G2. Coordinator / helpers-hooks: decide whether an app-wide width-375 scaler is introduced (C2). Holders: PUO:29-34, CB:22-24, `frontend/screens/0.0_SignUp.js:20-26`, `0.1_LogIn.js:20-26`, `0.3_UserLogInCredentials.js:10-16`, `frontend/components/ViewProfile/ViewProfileRowButtons.js:12-17`, `frontend/components/5_Profile/EditProfile/EditProfileModal.js:12-17`, `frontend/components/1_Feed/FeedHeader.js:36-38`, `frontend/theme/headerMetrics.js:11-12`. If not, this partition uses its local `composerLayout.js`. Must not be folded into `helper/scaleSize.js`'s default (different baseline).
G3. workout-active (`frontend/logic/useWorkoutManager.js:1319-1326`, `:1488`): `postWorkout` is unused and is the only sender of the `PostOptions` `workout` param. If that partition removes it, tell this partition so the T2 items in B.2#2 can be scheduled (still subject to I3).
G4. profile (`frontend/screens/5_Profile.js:78-82`): reads `global.profileOpenSelectPhotosSignal`, which nothing in the repo writes (`grep -rn OpenSelectPhotos`), so the `navigate('PostOptions', { images: [] })` at :81 never runs. For that partition's dead-code list.
G5. feed-screen (FEED:962-1076), profile (PWAPS:721-841), user-stats (USEDS:569-692): these build the `editingPost` / `initialClip` / `editingContext` params. Whatever they refactor, the shapes must stay: `PostOptions` `{ images: mediaEntries, editingPost: { pid, caption, mediaEntries, workoutName } }`; `EditClip` `{ initialClip, initialCaption, editingContext: { editingPost } }`.
G6. Coordinator: repo-wide decision on `const scaledSize = (size) => scaleSize(size)` forwarders (feed-cards audit C.7). SP:15 follows it.
G7. messages-chat (`frontend/components/1.2_Chat/MessageItem.js:454`): same inline `require(...scaleSize).ts` pattern as PHM:44 (F1).
G8. feed-post G8 (shared video-controls hook): agreed to defer. If it is ever built, note PUO's different reset effect (C4).
G9. app-shell (`App.js:72-74`, `:1628-1677`): no change requested. Paths, default exports and the four route names (`SelectPhotos`, `NewClip`, `EditClip`, `PostOptions`) plus `initialParams.mode` stay as they are.

---

## H. Fragile areas

H1. PUO caption line limit (PUO:217-220, 841-902, 1328-1341). A hidden absolutely positioned Text is re-keyed with `measureState.nonce` to force `onTextLayout`; `measureRequestRef` carries a `'candidate'` / `'sync'` handshake; the effect at PUO:899-902 must skip while a candidate is pending; `captionLastValidRef` is also written at PUO:283. Do not reorder, memoise differently or extract.
H2. PUO route-param consumption (PUO:247-285). Effects run in this order: editing sync, `images`, `clipMedia`, `clipCaption`; each consumes its param and clears it with `navigation.setParams({ x: undefined })`; `selectionSourceRef` decides whether the editing sync may overwrite. If `images` and `clipMedia` arrive together the order decides the final clip mode. Do not reorder and do not "fix" the dep array at PUO:285.
H3. PUO `sharePost` (PUO:982-1270). Sequence: guards, `setIsSharing`, optimistic `global.userData.posts` mutation, `addOptimisticFeedPost`, `runShare()` started but not awaited, `requestAnimationFrame(exitScreen)`. Inside `runShare`: parallel uploads with per-item catch, Storage path `posts/${pid}-${id}.${ext}`, then either `readDoc` + caption-comment rewrite + `updateDoc('posts', pid, {...})` or `createPost(...)` followed by `Promise.allSettled([arrayAppend('usersPublic', uid, 'posts', pid), arrayAppend('global', 'posts', 'PIDs', pid)])`; rollback in the catch; `sharePromiseRef` / `isMountedRef` in the finally. Field names, paths and order are frozen. Move only as one block, if at all.
H4. PUO compression cache (PUO:221, 323-458, 544-557). Cache key `${sourceUri}::${preset.cacheKey}` with the `v2-` prefix, pending-promise sharing, purge of older keys for the same source, background pre-warm per media change. Count-dependent presets (targetKB 320 / 250 / 220 / 200).
H5. PUO video controls (PUO:579-723, 824-835): per-index timeout map, lazily created `Animated.Value`s, 180 ms fades, 2000 ms auto-hide, scrub state in a ref, `seek(value, 0)`. Same caveats as feed-post H3.
H6. CB collapse choreography (CB:126-160, 343, 440, 449): a 900 ms auto-collapse timer starts when posting begins; `collapseComposer` = `goBack()` then `requestAnimationFrame(exitToFeed)`; `hasCollapsedRef` makes it single-shot; the timer is cleared on failure. The upload continues after the screen is gone (`isMountedRef`, CB:452). Do not change timing or order.
H7. ZC, whole file: worklet closures, shared values, smoothing constants defined inside the component (ZC:21-23), `setAdjustedFocal` / `clamp` worklets, dep arrays at ZC:79, 136, 153. Do not hoist, dedupe, rename or touch the arrays.
H8. ICM crop maths (ICM:60-116: cover scale, dp-to-px conversion, clamping, integer rounding, normalised `cropRect`) and the frame placement (ICM:118-180: `roiTop`, `anchorTop`, header `onLayout`, the two `blockMask` Views of E1). Leave byte for byte.
H9. SP state machine: `selectedItemsRef` mirror for the async `toggleSelect` (SP:89, 101-103, 248-274); the mount effect with `[]` deps (SP:97-99; adding `getInitialAssets` would refetch on every permission change); `previewMetrics` -> `collapsedSheetHeight` -> PBS snap points (SP:353-358, PBS:14-19; a new snap point re-snaps the sheet); Gallery with index keys and `initialIndex={0}` (SP:390-435).
H10. Grid pagination and memoisation: three overlapping triggers in PPM (`onEndReached` PPM:39-41, `handleScroll` 43-51, `ensureFilled` 56-63) plus PBS:28-35, all guarded by `loading` / `hasNextPage` and by `fetchingRef` in SP:146-147; list tuning props PPM:81-85; PP's custom comparator (PP:91-97, ignores `asset`, `duration`, `onToggle`) relies on `toggleSelect` being stable (SP:274) and on the module-level `videoThumbnailCache` (PP:17).
H11. C250 cascade: order of passes, WEBP on Android / JPEG on iOS (C250:47-49), "missing size means accept" at C250:85. Only B.1#18 is safe.
H12. PUO vs helper `scaleSize`: PUO and CB scale by width / 375; the other eight files by min(width / 390, height / 844). Never swap one for the other.

---

## I. Open questions for the owner

I1. ICM:178-179 `styles.blockMask` does not exist (E1). Should the masks be removed, or implemented as intended (dark, absolutely positioned)? Until answered they stay untouched.
I2. Editing a post drops `aspectRatio` and `isClip` from media that is already uploaded (E2); after a caption edit a clip is stored with `aspectRatio: null`. Fix it (changes Firestore writes) or leave?
I3. Is "post a finished workout through the composer" (`PostOptions` `workout` param) retired? Its only sender is unused (G3), and even when sent the workout is never saved (`createPost(..., null, ...)`, PUO:1228). If retired, B.2#2 can go.
I4. May the `editingPost` tolerance for shapes no sender produces (`media`, `images`, `workoutPid`, `workout`, `type`; B.2#1) be removed?
I5. The two unreachable alerts (B.1#3, B.1#4) suggest a removed "add clip from the composer" entry point. Confirm they can be deleted (default: delete, they cannot run).
I6. Picker "next" with an empty selection keeps the old media (E4). Intended?
I7. CB: picker opens after a denied permission; 0-second videos are reported as "too long" (E5, E6). Intended?
I8. CB rollback after a failed clip upload does not undo the optimistic `posts` entry when the user had no `posts` array (E3). Apply the PUO behaviour?
I9. Editing with an empty caption: the Save button is enabled and then an alert refuses (E8). Intended?
I10. UI copy typo "Attatch Media (optional)" (PUO:1406). Rendered text, so not changed by the refactor.
I11. `compressUnder250KB` targets 200-320 KB (default 360), not 250. A rename would need a new file and export; left alone.
I12. Merge `ensureVideoAsset` and `ensureClipVideoAsset` into one function (unifying log tags, the error text and the 0-byte size rule)? (C3)
I13. Failed media uploads are dropped silently and the post is saved without them (E9). Intended?
