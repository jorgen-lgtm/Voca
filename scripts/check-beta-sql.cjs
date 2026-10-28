// Local, disposable PostgreSQL-compatible WASM database only. Never connects to Supabase.
const { PGlite } = require('@electric-sql/pglite')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
async function main() {
  const db = new PGlite()
  const a = '10000000-0000-4000-8000-000000000001', b = '10000000-0000-4000-8000-000000000002'
  const project = '20000000-0000-4000-8000-000000000001', track = '30000000-0000-4000-8000-000000000001'
  let checks = 0
  const check = (actual, expected) => { assert.equal(typeof expected === "number" ? Number(actual) : actual, expected); checks++ }
  const denied = async fn => { await assert.rejects(fn); checks++ }
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;`)
  // uuid-ossp is not needed by the app logic; use built-in UUID generation in this fixture.
  await db.exec(read('supabase/schema.sql').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '').replaceAll('uuid_generate_v4()', 'gen_random_uuid()'))
  await db.exec(read('supabase/migrations/20261028_restrict_profile_updates.sql'))
  await db.exec(read('supabase/migrations/20261028_ai_spend_reservations.sql'))
  await db.exec(read('supabase/migrations/20261028_project_snapshots.sql'))
  await db.exec(`GRANT SELECT ON public.users TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.projects,public.tracks TO authenticated;
    INSERT INTO auth.users VALUES ('${a}', 'a@test.invalid'), ('${b}', 'b@test.invalid');
    SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${a}',false);`)
  await denied(() => db.exec(`UPDATE public.users SET pro_status=true WHERE id='${a}'`))
  await denied(() => db.exec(`INSERT INTO public.users(id,email,pro_status) VALUES ('${a}','spoof@test.invalid',true)`))
  await denied(() => db.exec(`SELECT public.reserve_ai_request('${a}','melody',20000,100000,10)`))
  await db.exec(`INSERT INTO public.projects(id,user_id,title) VALUES ('${project}','${a}','Fixture');`)
  const data = [{ id: track, instrument_type: 'piano', midi_data: { notes: [{ pitch: 60, velocity: 100, startTime: 0, duration: .5 }], duration: 2, volume: .7 }, is_muted: false }]
  const save = (tracks, revision, request, tempo = 135) => db.query('SELECT public.save_project_snapshot($1,$2::jsonb,$3,$4,$5) AS revision', [project, JSON.stringify(tracks), tempo, revision, request])
  check((await save(data, 0, '40000000-0000-4000-8000-000000000001')).rows[0].revision, 1)
  check((await save(data, 0, '40000000-0000-4000-8000-000000000001')).rows[0].revision, 1) // retry same request
  check((await save(data, 1, '40000000-0000-4000-8000-000000000002')).rows[0].revision, 2) // repeated save
  check((await db.query('SELECT count(*)::int AS n FROM public.tracks')).rows[0].n, 1)
  check((await db.query('SELECT tempo FROM public.projects')).rows[0].tempo, 135)
  await denied(() => save([], 0, '40000000-0000-4000-8000-000000000003')) // stale tab
  await denied(() => save([{ ...data[0], instrument_type: 'not-an-instrument' }], 2, '40000000-0000-4000-8000-000000000004'))
  check((await db.query('SELECT count(*)::int AS n FROM public.tracks')).rows[0].n, 1) // no destructive partial save
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${b}',false)`)
  await denied(() => save([], 2, '40000000-0000-4000-8000-000000000005'))
  check((await db.query('SELECT count(*)::int AS n FROM public.projects')).rows[0].n, 0)
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${a}',false)`)
  check((await save([], 2, '40000000-0000-4000-8000-000000000006')).rows[0].revision, 3)
  check((await db.query('SELECT count(*)::int AS n FROM public.tracks')).rows[0].n, 0)

  await db.exec('RESET ROLE; SET ROLE service_role;')
  const reserve = (id = a, daily = 10, cap = 100000) => db.query('SELECT public.reserve_ai_request($1,$2,20000,$3,$4) AS allowed', [id, 'melody', cap, daily])
  const attempts = await Promise.all(Array.from({ length: 30 }, (_, i) => reserve(i % 2 ? a : b)))
  check(attempts.filter(r => r.rows[0].allowed).length, 5)
  await db.exec('RESET ROLE;')
  check((await db.query('SELECT reserved_microusd::int AS n FROM public.ai_monthly_reservations')).rows[0].n, 100000)
  await db.exec('TRUNCATE public.ai_monthly_reservations,public.ai_daily_reservations; SET ROLE service_role;')
  await reserve(a, 2); await reserve(a, 2)
  await denied(() => reserve(a, 2))
  await db.exec('RESET ROLE;')
  check((await db.query('SELECT reserved_microusd::int AS n FROM public.ai_monthly_reservations')).rows[0].n, 40000) // exception rolled month back
  check((await db.query('SELECT requests FROM public.ai_daily_reservations')).rows[0].requests, 2)
  await db.close()
  console.log(`PASS SQL: ${checks} checks, real migrations in disposable PGlite: profile/RPC permissions, snapshot retries/conflicts/rollback/ownership/tempo, daily rollback and monthly ceiling.`)
  console.log('LIMIT: PGlite serializes submitted queries. Promise.all is queued stress, NOT independent PostgreSQL-session lock contention. Live Supabase/multi-session races remain NEEDS TESTING.')
}
main().catch(err => { console.error(err); process.exitCode = 1 })
