## Instagram-Style Feed Prompt

Codex, upgrade the Feed experience so it behaves like Instagram’s For You timeline instead of a strict “following only” list.

### Context
- Feed UI + FlatList live in `frontend/screens/1_Feed.js`; it depends on `useFilteredFeed` (`frontend/helper/useFilteredFeed.js`).
- Posts come from Firestore’s posts collection (`backend/posts/createPost.js` schema).
- Explore data is already fetched through `retrieveUserExploreFeed` (`frontend/screens/4_Explore.js`, `backend/retrieveUserExploreFeed.js`).
- User interactions (likes, saves, comments, shares) touch `usePostFooterInteractions` and related backend helpers.

### Requirements
1. **Instrumentation & signals**
   - Create a lightweight client helper that logs every meaningful action (like, comment, save, share, profile tap, “show less”) into a batched Firestore document (e.g., `userSignals/{uid}`).
   - Store per-account affinity counters (e.g., `likesPast7dByUid`, `dmCountByUid`), per-topic stats derived from workout metadata (muscles hit, template names), and negative signals (skips, hides).
   - Expose a hook to read those aggregates when ranking.

2. **Candidate generation buckets**
   - **Following**: keep current `onSnapshot` listener but capture affinity data so we can score posts from people I follow and DM.
   - **High-affinity non-followed**: find accounts I recently interacted with via likes/comments/DMs saved in `userSignals` or via two-hop data (followers of my follows that show high overlap).
   - **Topical/trending**: use `global.exploreFeedPosts` (already hydrated in `initUserFeed`) plus a Firestore query for high engagement posts in the last 24h; tag each post with workout topics (legs, push, macros) so we can match to my stats/preferences.
   - **Live workouts**: reuse `currentWorkout` snapshots already being merged in `useFilteredFeed` (`liveMapRef`) so active sessions can be injected with a boost.

3. **Scoring model (deterministic heuristic for now)**
   - For each candidate compute:
        ```
        affinityScore = weighted sum of (isFollowing, mutualFollowers, DM count, recent likes/comments/saves)
        engagementScore = sigmoid(like/comment/save velocity normalized by follower count)
        recencyScore = expDecay(hoursSinceCreated)
        topicalScore = cosineSimilarity(postWorkoutTags, viewerRecentWorkoutTags)
        noveltyPenalty = downRank(duplicateAuthorOrTopicShownThisSession)
        score = 0.35*affinity + 0.25*engagement + 0.2*recency + 0.15*topical - 0.1*noveltyPenalty
        ```
   - Add small boosts for live workouts or newly-followed accounts.

4. **Feed assembly & UX**
   - Replace `useFilteredFeed` with a new hook (e.g., `usePersonalizedFeed`) that merges all buckets, sorts by score, and enforces pacing rules (e.g., 4 followed posts, 1 suggested, repeat; ensure no more than 2 back-to-back suggested posts; respect private/blocked via existing `filtersRef`).
   - Keep the existing “Personal” toggle but rename it to “Following”; add a “For You” tab that uses the ranked mix by default.
   - Surface UI affordances (“Not Interested”, “Follow”, “Add to routine”) that write back to `userSignals` for future iterations.

5. **Safeguards & fallbacks**
   - If personalization data is missing or the query fails, fall back to today’s chronological following feed.
   - Always exclude blocked users (already enforced in `useFilteredFeed`) and private accounts the viewer shouldn’t see.
   - Respect limited data: don’t recommend someone twice in fewer than N posts, don’t surface suggested posts older than 48h unless `engagementScore` is exceptional.

6. **Validation plan**
   - Add unit tests for the scoring helper (pure functions) and for the bucket mixer to ensure ratio rules hold.
   - Provide a debug screen to inspect top scoring features per post for tuning.
   - Ship behind a remote flag so we can compare engagement metrics.

### Deliverables
- New hook + helpers under `frontend/helper` or `frontend/screens/feed/hooks` for ranking, plus a backend helper (or Cloud Function) to fetch/vend suggested posts when data should live server-side.
- Updated Feed screen/UI to toggle between Following and For You, wiring `FlatList` data to the new hook.
- Telemetry utilities shared with Explore so trending logic stays consistent.

### Manual Trending Controls
- Maintain a dedicated Firestore collection (e.g., `globalTrendingPosts`) that backend/admin tools can manipulate manually.
- Posts placed in this collection should receive a large base score boost and bypass some pacing limits so they appear in most users’ For You feeds quickly.
- Add guardrails (max display duration, duplication checks, respect blocks/privacy) but otherwise treat these as high-priority injections.

### Feed Pacing / Composition Rules
- During the first screenful (~15–20 items) enforce a heavy “friends-first” ratio (e.g., 4 following posts for each suggested/trending post) so users see familiar content immediately.
- After the initial block, flip the ratio so ~80–90% of remaining slots are filled with trending/suggested posts, still mixing in a following post every few items to keep things grounded.
- Ensure no creator, topic, or manual trending post appears twice within a short window unless explicitly boosted.

---

## Clips Feature Prompt (Lightweight)

Add support for short, portrait-only posts (“Clips”) without changing downstream surfaces beyond media sizing.

### UX Flow
- In the existing Make Post modal, add a third option under “Add media” labeled `Add Clip (vertical video)`.
- Tapping it pushes a `New Clip` screen that mirrors the regular New Post UI but enforces:
  - Single video selection.
  - Video duration < 90 seconds.
  - Aspect ratio ≥ 9:16 (portrait). Reject non-compliant videos with a toast.
- Provide an `Edit Clip` screen (same layout as edit post) for updating the selected clip/caption. Clips reuse all existing caption/location/tag inputs.
- Cancel/save/draft flows behave exactly like current posts; no extra tabs or profile sections.

### Data & Upload
- Store clips in `posts` with `type: 'clip'` and `media[0].isClip = true`.
- Upload pipeline ensures portrait transcoding (max 1080x1920, H.264/AAC, <25 MB) and stores a cover frame.
- Editing a clip reopens the clip editor with the original clip preloaded.

### Consumption
- Feed, comments, likes, etc. treat clips like normal posts; only difference is the client renders the media using portrait dimensions when `type === 'clip'`.

### Testing
- Add unit coverage for video validation (duration/aspect ratio) and metadata stamping.
- Exercise navigation from Make Post → New Clip and Edit Clip flows to ensure parity with normal posts.
