# Reconstructed candidate: platform contract

This is reconstructed candidate r2 from older retrieved Sites source, NOT the original 1.0.7 artifact. Source: current online miniTool documentation retrieved again on 2026-11-10, `https://miniapp-sandbox.xiaohongshu.com/minitool/doc`, sections 3.3, 3.6–3.7, 3.15 and 3.17. Online document overrides skill baseline. The platform module has 23 offline mocked tests; the complete project has 128 passing tests, including 46 real-bundle VM integration tests. No real native API validation, rankings, sharing, follow actions, upload, publishing, or Mac work were performed. Follow/ranking capabilities were already used in r1; they are not newly introduced capabilities in r2.

## Parent integration

Import from `dist/platform.js`, then bundle into the single classic-script ES2017 build. Construct one timer, leaderboard and fastest store per page session. All platform functions accept optional `{platform}` dependency; `createPlatform({getXhs})` defaults to window.xhs. Do not provide mock adapters in the shipping build.

1. On intentional Start (not initial page render), call `timer.start(practiceBoolean)`.
2. Call `timer.sample()` on every active animation frame, even when engine movement is zero. Timer is elapsed real time, not integrated simulation time.
3. On explicit pause/resume call `timer.setPaused(true/false)`; on document visibility transitions call `timer.setHidden(document.hidden)`. These flags suppress foreground gap detection only, never subtract elapsed time. Call before future animation processing on resume. Both setters sample the previous interval first, so the long hidden/paused interval is accepted on resume.
4. At the FIRST actual engine `sleeping` transition call `const result = timer.finishSleeping()`. Subsequent calls return the same frozen result. Call `leaderboard.submitRun(result)` and `fastestStore.record(result)` once at this transition; the leaderboard also deduplicates concurrent/repeated calls per runId. Do not submit on a timer threshold or merely opening rewards.
5. Display `elapsedMs`, and if `invalidReason` is present explicitly say the current round does not qualify. Practice rounds never qualify. `timer.invalidate(reason)` can mark engine-invalid intervals before sealing.
6. On rank button click use `await leaderboard.load('all')` (also supports month/week/day). Render loading immediately. Only status `ready` contains authoritative `rows`, `mine`, `empty`; other states carry `message`. Insert nickname/message as textContent, never raw HTML.
7. A response with `hideEntry: true` means remove the online ranking action, and retain an explanatory disabled label or status text so the reason remains visible. Do not keep invoking on 1005. `getRestriction()` supplies the latched restriction. 10003 also latches for this session, with whitelist-specific explanation.
8. Call `fastestStore.load()` for the local personal record. This is NOT an online rank. Key remains `sleep-expert-fastest-ms-v2`, JSON numeric milliseconds. Native Storage requires a confirmed client version >=9460 (9.46.0), using synchronous launch options or the official asynchronous fallback, and both getStorage/setStorage functions. Unknown/older versions, version-query failure or missing methods use browser localStorage when available. A native read/write failure stays an explicit failure; it is not silently presented as a successful fallback write. `record(result)` reports saved/ready/skipped/error; don't show saved on error.
9. On user's Share click generate a card and pass its PNG/JPEG/WebP base64 data URI to `shareGoodnight(dataURI)`. Render its returned message. `publish_flow_completed` is not proof of public publication or successful moderation.
10. Use `getFollowStatus()` to refresh a button and `followAuthor()` only from its click. Disable the button during pending calls and when followStatus is 1 or 2. No author ID/config is required or allowed: platform binds the miniTool author. State -1 is failure even when the API resolved. Cancellation and daily limits have separate states. For followAuthor, code 10003 means a confirmation flow is still pending, not a leaderboard whitelist rejection. This context-specific handling does not change ranking code 10003.

## Timer validity and boundaries

`start`, `sample`, `setPaused`, `setHidden`, `finishSleeping`, `invalidate`, `getState` return frozen snapshots (or null before starting). A finished run has `runId`, `elapsedMs`, `practice`, `finished`, `eligible`, and `invalidReason`.

Default thresholds: foreground non-paused frame gap >5000ms => frame_gap; negative/non-finite clock => clock_invalid; wall/monotonic delta disagreement >2000ms => clock_discontinuity; zero or >1,000,000,000ms final duration => duration_out_of_range. All are invalid, not silently clamped into ranked results. Pauses/background elapsed count normally if both clocks stay coherent. If a device suspends its monotonic clock during background, the resulting disagreement conservatively invalidates this round; show that explanation rather than claiming a verified time. This is not a server anti-cheat protocol. When performance.now is unavailable wall time is used and detection of forward clock manipulation is limited. Parent may inject clocks/thresholds for tests only.

## Official ranking semantics

- Requires client 9.51+ (buildVersion /1000 floored >=9510), beta whitelist, upload-time 用户头像昵称授权. Missing bridge, method, version or failed APIs never generate a fake leaderboard.
- Board is numeric **2**. Submit `score = -elapsedMs / 1000`, retaining fractional seconds. Backend descending score becomes ascending elapsed time. Existing board2 must use these same units. Positive/zero or malformed returned scores are rejected instead of shown as plausible times.
- `submitScore({board:2,score})` returns historical best score. Calls are once per run, including errors/uncertain outcomes. 2004 is uncertain and is never resubmitted. Subsequent rank queries can show actual server state, but do not assert that a specific unknown write succeeded.
- `getRankList({board:2,period})` returns data rows `{rank,score,nickname}`. Do NOT send limit. Nicknames are platform-supplied; null fallback 小红薯. There is no documented avatar field and no self-collected profile.
- `getMyRank({board:2,period})`: EXACT => integer rank 1–500 with score; OVER_LIMIT => display 500+ without consuming score/rank; NO_SCORE => no score this period; NOT_PARTICIPATING => not participating.
- 2002 receives bounded 500/1000/2000/4000ms backoff, then not_ready, never an empty list. Only data:[] means true empty. Successful queries cache 30 seconds, dedupe concurrent loads. Successful submission clears cache.
- API and nickname data remain session memory only; local storage persists the user's numeric fastest duration only. No network fetch, external resources, bridge bypass, profile scraping or direct auth API.

## Current online changes relevant here versus bundled API baseline

The baseline snapshot predates official followAuthor/getFollowStatus and beta ranking APIs. Current online text explicitly documents these, with 9.51+ and whitelist/upload authorization constraints. Parent owns any user-facing change announcement. Existing postNote is not a new capability and success remains a publish-flow event, not moderation approval.

## Validation still required

Run creator-platform simulator, Android physical-device scan and iOS physical-device scan on the same final ZIP after user authorization. Verify 9.51+ account/whitelist/upload authorization, 1005 UI, genuine board2 round trip, no-score/500+ display, share cancellation, moderation wording, follow cancellation/frequency cap, OS pause/background clock behavior, and Chrome 61 runtime/CSS compatibility. Desktop browser tests and offline mocks are not platform acceptance.
