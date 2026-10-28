# Voca Beta Launch Readiness Report

Review date: 2026-10-28. Owner: Jörgen Andersson.

**Overall: CRITICAL — do not invite beta users to the current production release yet.**
This is a review branch, not a release approval. No PR has been merged, no production deployment made, no remote database changed, no secret or budget changed, and no paid AI request made during this review.

## Source and compatibility

Main remains `713dc970e7bc1f9d945ae7f84014849c70595914`. Production was independently verified as `aa04f286ac8ea857b17495d5c64f13e84f8f11f3` (`dpl_BR9gjcjJn7hFZGtWtNzyyABFu6Br`). Main does not yet contain the deployed ring, voice or ad-pause fixes. Review branches are based on the deployed commit so these are preserved.

Only root AGENTS.md was found. It references the installed Next.js guides. Local dependencies/guides could not be installed because the environment proxy is unavailable and the npm cache is incomplete. No new Next.js API conventions were introduced. Local transpilation is not a replacement for Next build/typecheck.

| Existing PR | Source review | Verification and remaining work |
|---|---|---|
| [#18](https://github.com/jorgen-lgtm/Voca/pull/18) | READY for redirect helper | External, protocol-relative and backslash destinations tested through actual callback handler with mocked exchange. Real OAuth, cookies and error recovery NEEDS TESTING. |
| [#19](https://github.com/jorgen-lgtm/Voca/pull/19) | NEEDS TESTING / incomplete alone | UPDATE policy removed, but INSERT policy remains. #22 also restricts client INSERT/DELETE and preserves trusted signup trigger. Migration is unapplied: BLOCKED on owner approval and inspection of actual policies. |
| [#20](https://github.com/jorgen-lgtm/Voca/pull/20) | NEEDS TESTING | Client beta entitlement unlocks features, but limits helpers still depend on callers passing Pro. #22 applies beta centrally. Anonymous/Free/Pro browser flows need verification. |
| [#21](https://github.com/jorgen-lgtm/Voca/pull/21) | NEEDS TESTING | Atomic monthly update is sound under row locking; daily-limit exception rolls it back but original guard reports 503 instead of 429. #22 maps 429, catches thrown auth/DB failures, disables SDK retries and hard-blocks transcription. Database and provider activation remain BLOCKED. |

Vercel READY was independently observed for all four original head commits (including #19), and each has a successful Preview Comments check. These statuses do not test database policies or end-to-end login/music creation. Their file sets do not conflict directly, but merging them onto old main alone omits current production fixes.

## Review changes

- [#22 — security/beta integration](https://github.com/jorgen-lgtm/Voca/pull/22): reviewed combination of #18–21 plus entitlement INSERT restriction, central free-beta limits, verified server-authenticated AI access, fail-closed handling, daily 429, zero SDK retries, 15-second provider timeout, bounded input/output and hard-disabled paid transcription.
- [#23 — consistent project snapshots](https://github.com/jorgen-lgtm/Voca/pull/23): replace append-only saves with an atomic owner/RLS-checked RPC using stable track IDs, row locking, optimistic revisions and request idempotency; save tempo, allow empty existing-project snapshots, preserve local editor on saving/error, reuse created project on retry, and add current instrument enum values without deleting legacy values. Memo saving is explicitly blocked rather than falsely succeeding.
- Audio follow-up: initialize output separately from microphone input, initialize synths before loaded-project playback/keyboard use, preserve actual short-loop period and loaded master duration, dispose drum-bus effects, export drums on MIDI channel 10. Includes combined regression and disposable SQL tests.

These PRs are stacked: production branch → #22 → #23 → audio follow-up. #22 is a consolidated review alternative, not a request to blindly merge both original PRs and all copies. Review/choose the integration path before any main merge. No merge is authorized by this handover.

## Test evidence

Local `node scripts/check-beta.cjs`: **READY**, 67 assertions covering actual redirect/guard/API handlers with mocked external services, free-beta helpers, project-save adapter, MIDI header/drum channel and audio output/loop period/disposal with mocked nodes. No real auth account, microphone, OpenAI or remote database was used.

Local `npm ci --offline --ignore-scripts`: BLOCKED (`ENOTCACHED`). Git clone: BLOCKED (proxy port 8080 unreachable). Local build/lint: BLOCKED (`next`/`eslint` missing). Docker socket access denied; no local multi-session PostgreSQL server was available.

Combined preview verification is run by `node scripts/verify-beta-build.cjs`. It installs a pinned test-only PGlite package into the disposable build, runs application regressions, installed-YIN tests and real migration SQL in an in-memory PostgreSQL-compatible engine, reports lint separately, then runs Next build/TypeScript. It does not access any remote database or provider.

**Pending final preview results:** record actual outcomes here after the build. PGlite serializes queries: queued `Promise.all` stress is not independent-session lock-contention verification.

## Security and cost status

| Area | Status | Evidence / release condition |
|---|---|---|
| Server AI identity | READY in review code | `getUser`, confirmed email and non-anonymous user required; mock rejection tests. No client Pro/admin claim authorizes a paid call. |
| Disabled/config/DB failure | READY in review code | No successful reservation means no paid call; mock tests cover false/error/throw/missing config. |
| Daily/monthly ledger | NEEDS TESTING | Conditional UPDATE and transaction rollback reviewed; disposable SQL tests scheduled. Independent PostgreSQL/Supabase sessions still required. |
| 200 SEK/month actual provider spend | BLOCKED | App reservations are not invoices. Dedicated project/key, enforced provider hard limit (not just alert), FX/tax/lag headroom and activation approval not verified. |
| Reservation amount | NEEDS TESTING before activation | $0.02 per bounded gpt-4o melody call, <=300 output tokens, no retries; current pricing must be rechecked. Never refund failed calls automatically. |
| Paid transcription | READY as disabled | HTTP route returns 503 even if a legacy enable flag is present. No duration decoder has been verified; do not enable. |
| API key in client | READY for reviewed imports | OpenAI/service-role references remain in server route/guard modules. No secret values read or printed. Final bundle scan recommended before release. |
| Existing production AI routes | CRITICAL if key configured | Production does not yet contain #21/#22 auth/budget guards. No live paid probe was made. Do not expose paid endpoints until approved guarded release. |
| Database entitlements | BLOCKED | Migration/policies must be inspected and applied with approval, then tested with ordinary accounts. Source changes alone do not secure the live DB. |

OpenAI supports distinct alerting and enforced spending controls; verify which one is active for the actual project. [Official spend limits guide](https://platform.openai.com/docs/guides/spend-limits). No external configuration was changed.

The visible music-assistant/quantize/suggestion tools inspected in the app are local deterministic functions and continue without OpenAI. Paid server suggestions fail gracefully when unavailable; real authenticated outage UI flows still need browser tests.

## Remaining functional risks

| Risk | Status | Next action |
|---|---|---|
| Snapshot RPC not deployed | BLOCKED | Review/approve migration and backup/rollback plan in correct DB; validate existing data/schema before applying. Missing RPC fails safely and preserves the session. |
| Memo audio is not durable | CRITICAL for claims of saved voice projects | Current DB representation loses raw Blob audio. New save rejects Memo instead. Approve durable storage design or clearly exclude Memo persistence from beta promises. |
| Multi-tab/concurrent saves | NEEDS TESTING | Stale revisions rejected in code; execute true two-session tests in approved staging. Lost response can require reopening separately; never discard local edits automatically. |
| Save all tracks / delete project / signup | NEEDS TESTING | Disposable SQL/adapter checks cover parts; real account create→open→edit→save→reload→delete flow has not been run. No existing user data was touched. |
| Tempo changes on existing recordings | NEEDS TESTING | MIDI timings and loop durations use absolute seconds. Transport/metronome tempo changes do not time-stretch recordings. Define/verify intended behavior before promising live tempo adaptation. |
| Long held notes/live monitoring | NEEDS TESTING | Existing live monitor uses short attack/release; playback currently caps note length at two seconds. Listening tests and musical expectations required. |
| Memo versus Tone loop sync | NEEDS TESTING | Memo uses HTMLAudioElement looping, separately from Tone transport; drift/background behavior is unverified. |
| Account state/cookies | NEEDS TESTING | No real signup, OAuth, expiry, signout or refresh test. Profile fetch inside async auth callback is an existing area to exercise for SDK deadlocks/races. |
| Legacy pad/lead data | NEEDS TESTING | Enum values retained to prevent destructive migration; UI mapping for historical instruments must be checked against actual data. |

## Mobile compatibility

**Physical iPhone tests performed in this review: 0.** Desktop browser/WebKit microphone tests: 0. Mocked audio/pointer tests and synthetic waveform tests are not iPhone tests.

Required device matrix: iPhone Safari + Mac Safari, then Chrome. Test allow/deny/revoke microphone; keyboard/loaded-project playback with mic denied; record/stop/re-record; instrument change; short and held notes; loops of different durations; tempo/metronome; ring tap/drag/delete; screen lock/background/return; route navigation cleanup; viewport/keyboard layout; MIDI download and re-import into a music editor. Compare a short sung phrase against Memo; record actual device/browser versions and results.

## Decision

**CRITICAL overall / not ready for unrestricted beta.** A private review preview with paid AI disabled is appropriate for authorized testing; it is not production launch approval.

Owner decisions required only after review: approve selected merge path; approve remote DB migrations and staging test scope; verify provider hard cap/FX budget before any paid activation; decide Memo persistence/exclusion; approve eventual production release. Existing mandate does not authorize these actions. No budget increase is proposed.
