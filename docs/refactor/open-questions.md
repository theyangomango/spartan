# Open questions from the October 2026 refactor

Behaviours the audit flagged as probably wrong but left unchanged because fixing them would alter what users see or what is written. Line numbers refer to the code before the refactor.


Q1. useWorkoutManager.js:161 uses `computeRankProgressFromData` without importing it, so rank fields are never
    written when a workout is finished (the error is caught). The run leaves this exactly as it is. Add the import
    (starts writing rank to three user docs)?
Q2. 1_Feed.js: the level-up modal can never show on the Feed and the mute choice is not remembered, both because of
    declaration order (E1, E2). Fix or delete the dead plumbing?
Q3. MacroTracking.js calls an undefined `haptic` (import deleted in commit c994d2f2). The run deletes the dead
    calls; restore haptics on the barcode button and "Edit Goals" instead?
Q4. The friend-workout viewer (FeedWorkoutViewerSheet -> SpectatingWorkoutModal, and the UserStats viewer overlay)
    has been unreachable for several commits; the run removes its inert mounts (X-3) and keeps the four files
    loadable. Delete them (with utils/scale.js and the six viewer styles), or is "tap a workout to preview it"
    coming back?
Q5. Explore route (App.js:1586) and DeleteAccount route (App.js:1625) are registered but nothing navigates to them.
    Remove, park, or keep? (Explore keeps about 2,500 lines alive, with known crashes E5-E7 and feed-social E2-E3;
    its remaining dead hooks/effects/JSX were left in place. DeleteAccount.js never resets its in-flight flag on
    the "no uid" path.)
Q6. FeedSnapshotCard tab row / "Your Body" card and the FeedHeader logo and plain-title variants are hidden by every
    caller since commit 066bcf77. Delete those modes?
Q7. Rank-up queue: `dequeueRankPromotion()` plus a local `slice(1)` skips a step on multi-level promotions
    (ExercisesSection.js:355-358, 1_Feed.js:427-430), and two LevelUpTransition instances listen to one queue.
Q8. Nine in-screen `<Footer>` elements always render null because of `global.__USE_GLOBAL_FOOTER`. Remove them and
    the flag?
Q9. Stale closures that would need a dependency added: MuscleGroupExercises.js:554 (`completedWorkouts`),
    UserStatsProgressPreview.js:1254 (`metricMeta`), ExerciseLog `areEqual` ignoring `exerciseIndex`. Apply?
Q10. Weight save reports success when `updateDoc` returns false (not-found / permission-denied) in both weight
    screens. Show an error?
Q11. Chart tooltip: a tap during the 200 ms fade-out is lost (PS E2; same pattern in ED and UP). Fix?
Q12. ExerciseDetail: `completedWorkoutsSignature` samples the oldest 40 workouts; the unit resolver differs from the
    other screens (exact 'kg' only); `edges` on react-native's SafeAreaView is ignored. Intended?
Q13. ProfileLoggedFoodsScreen passes the entry without its key, so edits from "Logged Food Items" are discarded;
    swipe-to-delete right after changing day targets the previous day; the meals index is not invalidated on
    account switch (macro-screens E.3-E.5).
Q14. PostUploadOptionsScreen: editing a post drops `aspectRatio` / `isClip` of already-uploaded media;
    ImageCropperModal uses an undefined `styles.blockMask`; ClipBuilder rollback and permission edge cases.
Q15. ProfileWorkoutsAndPostsScreen: other users' profile refresh always fails (reads usersPrivate) and posts beyond
    the first chunk are dropped (E4, E5).
Q16. Auth: `additionalUserInfo` does not exist in the modular SDK (isNewUser always null); `auth/invalid-credential`
    is not mapped; Google code is exchanged twice. Fix any of these?
Q17. Notifications: scroll-to-top effect is a no-op on a SectionList; double haptic on follow notifications;
    Decline follow request UI is gone (backend/user/declineFollowRequest.js becomes unreferenced).
Q18. Share sheet can never open (ShareBottomSheet / ShareModal are stubs). Keep for a future feature?
Q19. Messages: `initChat` appends to the legacy `users/{uid}` doc; the group-chat sheet never closes
    programmatically; reaction and create-chat failures are unhandled rejections; best-effort calls without
    `.catch` (also useGroupViewing.js:189, EditProfileModal.js:63). Add catches?
Q20. useWorkoutManager: the store subscription never fires (zustand `subscribe` takes one argument); at mount an
    empty store clears the remote `currentWorkout`; usersPrivate totals are incremented twice per finished workout;
    `leaveWorkoutGroup` is skipped after a finish with logged work. Intended?
Q21. Rest timer: after "+15s" the notification is scheduled for the cumulative total; after a remount it cannot be
    cancelled. Fix?
Q22. `__DEV__` `[perf]` logging in the workout sheet and manager: keep or remove with `perfNow`?
Q23. Dead global writes (`__showWorkoutReminderForWid`, `openCurrentWorkoutSignal`, `userData.currentWorkouts`),
    the write-only `setIsVisible` chain, `persistWorkout`, the constant `enabled` prop of the workout portal, and
    the per-second `setTimer` store write: remove?
Q24. communityStats.js computes values nothing reads, costs Firestore reads on every user-doc snapshot and gates
    app readiness. Remove the module and its gate?
Q25. `coercePrivacyMode` always returns "global" and FeedWorkoutViewerSheet's stats privacy filter is a no-op. Is
    per-workout privacy retired?
Q26. backend/workouts: `wid: undefined` makes delete/update throw for id-less legacy workouts; editing an old
    workout re-dates it to the edit day; delete and update rebuild stats differently (`toMillis`, `setDay`).
Q27. functions/: three callables have no client caller (`computeHexagonStats`, `getTribeComparisonScores`,
    `appendWorkoutSets`; the last one always failed after writing, the run fixes its return line);
    `extractLatestWeight` iterates the wrong variable; live likes/comments never carry over to the auto post (key
    formats differ); handle/name propagation defects E-1..E-6 (double replacement, missing boundary, key-agnostic
    replacement, shared mutable config, over-broad name scope); unauthenticated paths in `deleteOwnAccount`,
    `submitModerationReport`, `resolveLoginIdentifier`.
Q28. fatsecretClient.js held a FatSecret consumer key and secret in a commented block (removed by this run, still
    in git history): rotate them? Is the generic `fatsecretMethod` function still wanted?
Q29. Which operator scripts are obsolete (resetUserContentByHandle, recomputeHexagonStandalone, setAllLastRanksToOne,
    the two codemods, removeWhiteExerciseBackgrounds, purgeLegacyData, the backend/admin simulate fork)?
Q30. May the two different `sanitizeWorkoutForRoute` fallbacks be unified (they differ only when a workout cannot be
    JSON-serialised)?
Q31. Small visual or text questions left untouched: SearchResultCard's invalid `'#rgba(...)'` fill; records value
    margin in the feed card; FollowListBottomSheet handle padding; `0:MM AM` at midnight in the chat list;
    `Nunito_500Medium` is not registered; hidden joint groups in the two muscle SVGs; unused fonts in fonts.js.
Q32. FoodSearchOverlay.js:1037 strips nothing from a scanned barcode (`/\\D/g` instead of `/\D/g`), so the local
    "Invalid barcode" branch can never run and the raw string goes to the server. Correct it? (Changes the message
    and saves a request for digit-less scans; needs a real camera to verify.)
Q33. FoodSearchOverlay's "Recent foods" list is rebuilt on every render of the overlay (a component defined during
    render); an open swipe row snaps shut on every keystroke. Hoist it? (Rows would then keep their swipe state;
    the list keys fall back to the row index when an entry has no id.)
Q34. Declaration-order residuals left in place because moving them would add a live dependency: SimpleFeedPost's
    report callbacks keep the owner uid/handle of the render in which the caption or post id last changed;
    ProfileWorkoutsAndPostsScreen's focus refresh does not re-run when `canViewContent` flips. Fix (declare first)?
Q35. The Babel preset lowers `const` to `var`; several screens rely on that (a value read above its declaration).
    The stable cases are fixed by this run; if the transform profile ever changes (for example `hermes-stable`),
    Q2 and Q34 become crashes. Worth fixing before upgrading React Native?

---------------------------------------------------------------------------------------------------------------------
