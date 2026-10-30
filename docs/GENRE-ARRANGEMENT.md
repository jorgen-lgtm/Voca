# Genre and external music AI

The producer panel offers Pop, Rock, Hip-hop, House, Jazz and Ambient. Users
choose a genre or ask external AI to suggest one from their MIDI notes and
tempo. AI can create drums, bass, harmony or a complementary melody, or rework
an existing MIDI track in the selected genre. A manual genre is enforced in the
response validator. Auto is a creative suggestion, not a reliable classification.

Each result is a one-bar, four-beat motif (1–8 notes), repeated across the source
loop's duration. It is a short arrangement variant, not whole-song audio
generation or mastering. The source track is retained. The user explicitly adds
the variant as a new track, then listens, mutes or removes tracks with the normal
looper controls. Changing the source or tempo invalidates a pending result.
The genre selection itself is session-only; generated MIDI notes save normally.
Memo audio is excluded. Only MIDI pitches/timing/velocity and tempo go to the
external provider after the user presses the external-AI button.

The local-pattern button uses explicit genre presets and makes no provider call.
It is labeled separately and never impersonates external AI. If external AI is
disabled, over quota or unavailable, errors leave all tracks unchanged; there is
no silent local fallback. Six drum presets differ musically, including swing,
four-on-the-floor, syncopated and sparse patterns. Existing producer actions
remain available alongside the new panel.

## Activation (not performed by this feature change)

The new endpoint is `/api/genre-arrangement`. It preserves the installed OpenAI
SDK and existing auth/budget path, with no provider or SDK migration. It requires
`OPENAI_GENRE_MODEL` (server-only) in addition to the existing OpenAI key and
spend-guard configuration. No model is assumed or enabled by default: verify
current model availability, JSON support, 300-token output compatibility and
pricing before choosing one. The existing 20,000-microUSD reservation must cover
the chosen bounded call with adequate headroom; it is not an invoice cap.

It shares `authorizeAiRequest('melody')` and the same per-user/day and monthly
ledger with the existing melody endpoint. It never creates a separate quota.
Every paid attempt requires successful atomic reservation; failures are not
refunded. Requests are bounded to 16 KiB, 64 notes and 60 seconds; responses to
eight validated MIDI tuples and 300 output tokens. There are no SDK retries and
the provider timeout is 15 seconds. Drum pitches are restricted to the kit's MIDI
mapping. Truncated, wrong-genre or malformed responses are rejected.

The production AI ledger was inspected on 2026-10-30: both tables have RLS,
no anon/authenticated table access, and only service_role can execute the reservation
function. The user requested external AI with a USD 20 monthly application budget.
Activation uses AI_MAX_MONTHLY_MICROUSD=20000000 and AI_SPEND_GUARD_ENABLED=true
in production; no keys are retrieved or changed. The application reserves USD 0.02
before each attempt (at most 1,000 monthly attempts across both endpoints), and
allows 10 melody/genre requests per verified user per UTC day. Failed attempts
retain reservations. This controls this application, not other uses of the provider
key or the provider invoice. Provider-side project limits cannot be independently
verified through the connected tools. GPT-4o documentation inspected on this date
lists USD 2.50/million input and USD 10/million output tokens; bounded MIDI input
and 300 output tokens fit within the conservative reservation. Transcription
remains disabled. Aborting the browser wait does not refund a server reservation
or guarantee that an already-started provider request is canceled.

## Verification

`node scripts/check-genre.cjs` uses Node 24's built-in TypeScript type erasure and
executes the actual validation/rendering modules and API route with a mocked
provider. It covers presets and loop bounds, manual/automatic genre contracts,
input limits, no provider call on guard rejection, shared quota, retry/timeout
settings and malformed/truncated/provider-error cases. The build runs this test
before Next.js/TypeScript. These checks do not verify real provider quality,
browser audio playback or physical iPhone behavior.
