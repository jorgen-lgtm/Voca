# Voca free-beta: OpenAI cost guard (manual activation)

This PR does **not** change production, the live database, or OpenAI billing limits.

## Safety defaults

- All paid AI endpoints fail closed unless `AI_SPEND_GUARD_ENABLED=true` AND the budget, Supabase and database RPC are configured.
- The API verifies the current user via Supabase `auth.getUser()` before reserving usage.
- Each request is reserved **atomically** in Supabase before calling OpenAI: melody 2 US cents, at most 10/user/day; transcription 100 US cents, at most 2/user/day.
- Reservations are not refunded on OpenAI failure. This is intentionally conservative.
- Transcription is additionally disabled unless `AI_TRANSCRIPTION_ENABLED=true`. Keep false for the first beta. File size alone cannot reliably bound audio duration.
- The application cap is a conservative request-reservation ceiling, **not an exact API invoice cap**. A single call could cost more than its estimate, and other uses of the same API project are outside this code.

## Activation checklist (requires Jörgen's approval)

1. Create a dedicated OpenAI API project/key for Voca, with no other workloads sharing the key.
2. Set an organization/project **hard enforceable spend limit** appropriate to the approved 200 SEK/month, allowing for SEK/USD conversion, FX variation, tax and billing lag. Configure alerts at 50% and 80%. Provider enforcement can lag.
3. In the correct Supabase project, inspect existing policies, back up schema, then manually apply `supabase/migrations/20261028_ai_spend_reservations.sql`.
4. In Vercel server-side environment (never `NEXT_PUBLIC_` for secrets), set:
   - `OPENAI_API_KEY` (dedicated project)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `AI_MAX_MONTHLY_MICROUSD` to a conservative USD amount **below** 200 SEK at the current rate. For example, USD 15 = `15000000` micro-USD **only if FX review confirms it fits**. No default is provided.
   - `AI_SPEND_GUARD_ENABLED=true`
   - Leave `AI_TRANSCRIPTION_ENABLED` unset/false.
5. Test unauthenticated 401, missing config 503, SQL missing 503, valid authenticated melody, daily quota 429, and concurrent requests against the monthly cap.
6. Verify Vercel build/lint, OpenAI project usage, Supabase RLS, and iPhone behavior before merging or deploying.
7. Monitor actual OpenAI usage; reservations are intentionally not substituted for provider spend reporting.

## Emergency stop

Set `AI_SPEND_GUARD_ENABLED=false` in the deployed environment and redeploy, or revoke the dedicated API key. Do not rely on emailed alerts alone.
