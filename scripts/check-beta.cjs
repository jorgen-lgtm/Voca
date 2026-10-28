const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
let assertions = 0
const check = (actual, expected) => { assert.equal(actual, expected); assertions++ }
function load(file, mocks = {}, env = {}) {
  const filename = path.join(root, file)
  let code
  try { code = require('typescript').transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: 1, target: 9 } }).outputText }
  catch { code = require('/opt/codex/cua_node/lib/node_modules/playwright/lib/transform/transform.js').transformHook(fs.readFileSync(filename, 'utf8'), filename).code }
  const exports = {}
  vm.runInNewContext(code, { exports, require(name) {
    if (name in mocks) return mocks[name]
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', mocks, env)
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts', mocks, env)
    throw new Error('Unmocked import: ' + name)
  }, process: { env }, console: { log() {}, warn() {}, error() {} }, TextEncoder, Request, Response, URL, Blob, crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout }, { filename })
  return exports
}
const NextResponse = { json: (body, options = {}) => Response.json(body, options), redirect: url => Response.redirect(String(url), 307) }
const next = { 'next/server': { NextResponse } }
async function main() {
  const callback = load('src/app/auth/callback/route.ts', { ...next, '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) } })
  for (const input of ['https://evil.example', '//evil.example', '/\\evil.example', '\n//evil.example']) {
    const result = await callback.GET(new Request('https://voca.example/auth/callback?code=ok&next=' + encodeURIComponent(input)))
    check(new URL(result.headers.get('location')).origin, 'https://voca.example')
  }
  check((await callback.GET(new Request('https://voca.example/auth/callback?code=ok&next=%2Fprojects%3Fx%3D1%23saved'))).headers.get('location'), 'https://voca.example/projects?x=1#saved')
  check((await callback.GET(new Request('https://voca.example/auth/callback'))).headers.get('location'), 'https://voca.example/auth/error')

  const configured = { AI_SPEND_GUARD_ENABLED: 'true', AI_MAX_MONTHLY_MICROUSD: '10000000', SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-a-key', NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid' }
  async function guard({ env = configured, user = { id: 'user', email_confirmed_at: '2026-01-01' }, result = { data: true, error: null }, throws = false, feature = 'melody' } = {}) {
    let calls = 0
    const api = load('src/lib/ai-spend-guard.ts', { ...next,
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => { if (throws) throw Error('unavailable'); return { data: { user }, error: null } } } }) },
      '@supabase/supabase-js': { createClient: () => ({ rpc: async (_name, args) => { calls++; check(args.p_user_id, 'user'); check(args.p_cost_microusd, 20000); return result } }) },
    }, env)
    return { response: await api.authorizeAiRequest(feature), calls }
  }
  for (const env of [{}, { ...configured, AI_MAX_MONTHLY_MICROUSD: 'NaN' }, { ...configured, AI_MAX_MONTHLY_MICROUSD: '0' }, { ...configured, SUPABASE_SERVICE_ROLE_KEY: '' }]) {
    const r = await guard({ env }); check(r.response.status, 503); check(r.calls, 0)
  }
  check((await guard({ user: null })).response.status, 401)
  check((await guard({ user: { id: 'user' } })).response.status, 403)
  check((await guard({ feature: 'transcription', env: { ...configured, AI_TRANSCRIPTION_ENABLED: 'true' } })).response.status, 503)
  check((await guard({ throws: true })).response.status, 503)
  check((await guard({ result: { data: false, error: null } })).response.status, 429)
  check((await guard({ result: { data: null, error: { code: 'P0001', message: 'AI_DAILY_LIMIT' } } })).response.status, 429)
  check((await guard({ result: { data: null, error: { code: '42883' } } })).response.status, 503)
  check((await guard()).response, null)

  let paidCalls = 0, options, blocked = true
  class FakeOpenAI {
    constructor(input) { options = input; this.chat = { completions: { create: async () => { paidCalls++; return { choices: [{ message: { content: JSON.stringify({ notes: [{ pitch: 60, startTime: 0, duration: .5 }] }) } }] } } } } }
  }
  const route = load('src/app/api/suggest-melody/route.ts', { ...next, openai: { default: FakeOpenAI, __esModule: true }, '@/lib/ai-spend-guard': { authorizeAiRequest: async () => blocked ? Response.json({}, { status: 503 }) : null } }, { OPENAI_API_KEY: 'test-only' })
  const request = body => new Request('https://voca.example/api/suggest-melody', { method: 'POST', body: JSON.stringify(body) })
  const melody = { notes: [{ pitch: 60, startTime: 0, duration: .5 }], tempo: 120 }
  check((await route.POST(request(melody))).status, 503); check(paidCalls, 0)
  check((await route.POST(request({ ...melody, notes: [{ pitch: 999 }] }))).status, 400); check(paidCalls, 0)
  blocked = false
  check((await route.POST(request(melody))).status, 200); check(paidCalls, 1); check(options.maxRetries, 0)
  const transcription = load('src/app/api/analyze-audio/route.ts', next, { AI_TRANSCRIPTION_ENABLED: 'true' })
  check((await transcription.POST()).status, 503)
  const limits = load('src/config/limits.ts')
  check(limits.getMaxLoops(false), Infinity); check(limits.getMaxProjects(false), Infinity); check(limits.getMaxExportsPerDay(false), Infinity); check(limits.shouldShowAds(false), false)

  const snapshot = load('src/lib/project-snapshot.ts')
  const loop = { id: 'track-a', instrumentType: 'piano', notes: [{ pitch: 60, startTime: 0, duration: .5, velocity: 100 }], duration: 2, volume: .4 }
  check(snapshot.buildProjectSnapshot('project', [loop])[0].id, loop.id)
  assert.throws(() => snapshot.buildProjectSnapshot('project', [loop, loop])); assertions++
  assert.throws(() => snapshot.buildProjectSnapshot('project', [{ ...loop, instrumentType: 'memo' }])); assertions++
  let rows = [], revision = 0, rpcCalls = 0, fail = false
  const hook = load('src/hooks/useProjects.ts', {
    react: { useState: value => [value, () => {}], useCallback: fn => fn, useMemo: fn => fn(), useRef: value => ({ current: value }) },
    '@/lib/supabase/client': { createClient: () => ({ rpc: async (name, args) => {
      rpcCalls++; check(name, 'save_project_snapshot'); check(args.p_expected_revision, revision)
      if (fail) return { data: null, error: { message: 'missing RPC', code: '42883' } }
      rows = args.p_tracks; revision++; return { data: revision, error: null }
    } }) },
    '@/config/instruments': { getInstrumentConfig: () => ({ color: 'red' }) },
  }).useProjects()
  check(await hook.saveLoopsToProject('project', [loop], 135), true)
  check(await hook.saveLoopsToProject('project', [loop], 135), true); check(rows.length, 1); check(rpcCalls, 2)
  fail = true
  check(await hook.saveLoopsToProject('project', [], 135), false); check(rows.length, 1)
  check(await hook.saveLoopsToProject('project', [{ ...loop, instrumentType: 'memo' }], 135), false); check(rows.length, 1)

  const midi = load('src/lib/midi-export.ts').exportLoopsToMidi([loop], 120)
  check(Buffer.from(midi.slice(0, 4)).toString(), 'MThd'); check(midi[11], 1)
  const drums = load('src/lib/midi-export.ts').exportLoopsToMidi([{ ...loop, instrumentType: 'drums' }], 120)
  check(drums.includes(0x99), true)
  let noteTriggers = 0
  const audioNodes = [], parts = [], effects = []
  class AudioNode {
    constructor() { this.volume = { value: 0, rampTo() {} }; this.disposals = 0; audioNodes.push(this) }
    connect() { return this } toDestination() { return this } set() {} start() {} stop() {} releaseAll() {}
    dispose() { this.disposals++ } triggerAttackRelease() { noteTriggers++ }
  }
  class Part extends AudioNode { constructor() { super(); parts.push(this) } }
  const transport = { bpm: { value: 120 }, position: 0, start() {}, stop() {}, scheduleRepeat: () => 1, clear() {} }
  const Tone = { start: async () => {}, getContext: () => ({ state: 'running' }), getTransport: () => transport, Part }
  for (const name of ['Volume', 'Synth', 'PolySynth', 'MonoSynth', 'MembraneSynth', 'NoiseSynth', 'MetalSynth', 'Compressor', 'Limiter', 'EQ3', 'Reverb', 'Filter']) Tone[name] = AudioNode
  const engine = load('src/hooks/useAudioEngine.ts', {
    react: { useState: value => [value, () => {}], useCallback: fn => fn, useRef: value => ({ current: value }), useEffect: fn => effects.push(fn) },
    tone: Tone, pitchfinder: {}, '@/config/instruments': { getInstrumentConfig: () => ({ color: 'red' }) },
  }).useAudioEngine({ initialLoops: [loop] })
  check(engine.masterLoopDuration, 2)
  await engine.startPlayback()
  check(parts.length, 1); check(parts[0].loopEnd, 2) // no forced four-second loop
  await engine.triggerNote(60)
  check(noteTriggers, 1) // output initialized without navigator/getUserMedia
  for (const cleanup of effects.map(fn => fn())) if (cleanup) cleanup()
  check(audioNodes.every(node => node.disposals === 1), true) // includes drum bus
  console.log(`PASS beta: ${assertions} assertions (actual callback/guard/routes, mocked services, beta limits, save adapter, MIDI header). No paid or remote DB calls.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
