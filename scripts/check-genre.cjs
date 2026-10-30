// Node 24's type erasure runs the actual modules with a mocked provider: no API spend.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { stripTypeScriptTypes } = require('node:module')
function load(file, mocks = {}) {
  let source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))
  const names = [...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(m => m[1])
  source = source.replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g, (_, names, id) => `const {${names}} = require('${id}')`)
    .replace(/import (\w+) from ['"]([^'"]+)['"];?/g, (_, name, id) => `const ${name} = require('${id}')`)
    .replace(/\bexport /g, '')
  const loaded = { exports: {} }
  vm.runInThisContext(`(function(require,module){${source}\nmodule.exports = {${names.join(',')}};})`, { filename: file })(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    throw new Error(`Unexpected dependency ${id}`)
  }, loaded)
  return loaded.exports
}

async function main() {
  let checks = 0
  const check = fn => { fn(); checks++ }
  const g = load('src/lib/genre-arrangement.ts')
  const request = { genre: 'pop', part: 'drums', action: 'generate', tempo: 120, duration: 8, notes: [{ pitch: 64, startTime: 0, duration: .5, velocity: 100 }] }
  const plan = { genre: 'pop', description: 'Popgroove', motif: [[36, 0, .1, 100], [38, 1, .1, 90]] }
  check(() => assert.equal(g.parseGenreRequest(request), request))
  for (const bad of [null, {}, { ...request, genre: 'metal' }, { ...request, genre: '__proto__' }, { ...request, part: 'toString' }, { ...request, tempo: NaN }, { ...request, duration: Infinity }, { ...request, duration: 61 }, { ...request, notes: Array(65).fill(request.notes[0]) }, { ...request, genre: 'auto', notes: [] }, { ...request, action: 'improve', notes: [] }, { ...request, notes: [{ ...request.notes[0], velocity: 128 }] }]) {
    check(() => assert.throws(() => g.parseGenreRequest(bad)))
  }
  const signatures = new Set()
  for (const genre of Object.keys(g.MUSIC_GENRES)) {
    for (const part of Object.keys(g.ARRANGEMENT_PARTS)) {
      const input = { ...request, genre, part }
      const local = g.localGenrePlan(input)
      const notes = g.renderGenrePlan(local, input)
      check(() => assert.ok(notes.length > 0 && notes.every(n => n.startTime >= 0 && n.startTime < input.duration && n.duration > 0 && n.startTime + n.duration <= input.duration)))
      if (part === 'drums') {
        check(() => assert.ok(notes.every(n => [36, 38, 42, 46].includes(n.pitch))))
        signatures.add(JSON.stringify(local.motif))
      }
    }
  }
  check(() => assert.equal(signatures.size, 6))
  for (const tempo of [40, 240]) for (const duration of [.25, 1.17, 60]) {
    const input = { ...request, tempo, duration, notes: [] }
    check(() => assert.ok(g.renderGenrePlan(plan, input).every(n => n.startTime + n.duration <= duration && n.duration > 0)))
  }
  for (const bad of [null, { ...plan, genre: 'jazz' }, { ...plan, motif: [] }, { ...plan, motif: [[60, 0, .1, 90]] }, { ...plan, motif: [[36, 4, .1, 90]] }, { ...plan, motif: [[36, 0, -.1, 90]] }, { ...plan, motif: [[36, 0, .1, 128]] }, { ...plan, motif: [[36, 0, .1, NaN]] }, { ...plan, description: 'x'.repeat(241) }]) {
    check(() => assert.throws(() => g.parseGenrePlan(bad, request)))
  }
  check(() => assert.equal(g.parseGenrePlan({ ...plan, genre: 'jazz' }, { ...request, genre: 'auto' }).genre, 'jazz'))
  check(() => assert.throws(() => g.localGenrePlan({ ...request, genre: 'auto' })))
  const frozen = JSON.stringify(request)
  g.renderGenrePlan(plan, request)
  check(() => assert.equal(JSON.stringify(request), frozen))

  let calls = 0, reservations = 0, blocked = null, options, sent, providerError = false
  let completion = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }] }
  class Provider {
    constructor(config) { options = config }
    chat = { completions: { create: async input => { calls++; sent = input; if (providerError) throw new Error('secret provider message'); return completion } } }
  }
  const json = (body, options = {}) => ({ status: options.status ?? 200, body })
  const route = load('src/app/api/genre-arrangement/route.ts', {
    'next/server': { NextResponse: { json } }, openai: Provider,
    '@/lib/genre-arrangement': g,
    '@/lib/ai-spend-guard': { authorizeAiRequest: async feature => { assert.equal(feature, 'melody'); reservations++; return blocked } },
  })
  const previous = { key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_GENRE_MODEL }
  try {
    process.env.OPENAI_API_KEY = 'test-only-not-a-secret'
    process.env.OPENAI_GENRE_MODEL = 'test-model'
    const post = body => route.POST({ text: async () => typeof body === 'string' ? body : JSON.stringify(body) })
    for (const body of ['{', null, { ...request, genre: 'not-allowed' }]) {
      check(() => assert.equal(calls, 0))
      const response = await post(body)
      check(() => assert.equal(response.status, 400))
    }
    check(() => assert.equal((reservations), 0))
    check(() => assert.equal((calls), 0))
    check(() => assert.equal((sent), undefined))
    const large = await post('x'.repeat(16385))
    check(() => assert.equal(large.status, 413))
    delete process.env.OPENAI_GENRE_MODEL
    check(() => assert.equal((reservations), 0))
    const missing = await post(request)
    check(() => assert.equal(missing.status, 503))
    check(() => assert.equal(reservations, 0))
    process.env.OPENAI_GENRE_MODEL = 'test-model'
    for (const status of [401, 403, 429, 503]) {
      blocked = json({ error: 'blocked' }, { status })
      const response = await post(request)
      check(() => assert.equal(response.status, status))
      check(() => assert.equal(calls, 0))
    }
    blocked = null
    const response = await post(request)
    check(() => assert.equal(response.status, 200))
    check(() => assert.equal(response.body.genre, 'pop'))
    check(() => assert.equal(calls, 1))
    check(() => assert.equal(options.maxRetries, 0))
    check(() => assert.equal(options.timeout, 15000))
    check(() => assert.equal(sent.max_completion_tokens, 300))
    check(() => assert.equal(JSON.parse(sent.messages[1].content).genre, 'pop'))
    completion.choices[0].message.content = JSON.stringify({ ...plan, genre: 'rock' })
    check(() => assert.equal(g.isMusicGenre('rock'), true))
    const mismatch = await post(request)
    check(() => assert.equal(mismatch.status, 503))
    completion.choices[0].finish_reason = 'length'
    const truncated = await post(request)
    check(() => assert.equal(truncated.status, 503))
    providerError = true
    const failed = await post(request)
    check(() => assert.equal(failed.status, 503))
    check(() => assert.ok(!JSON.stringify(failed.body).includes('secret provider message')))
  } finally {
    for (const [name, value] of [['OPENAI_API_KEY', previous.key], ['OPENAI_GENRE_MODEL', previous.model]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value
    }
  }
  console.log(`PASS genre: ${checks} checks; presets, MIDI bounds, genre contract, input validation, quota rejection and provider failures. Provider mocked: no paid request.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
