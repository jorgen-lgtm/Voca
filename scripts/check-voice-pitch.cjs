const assert = require('node:assert/strict')
const { VoicePitchTracker } = require('../src/lib/voice-pitch.ts')

function frame(frequency, sampleRate, noise = 0, dc = 0) {
  let seed = 27
  return Float32Array.from({ length: 4096 }, (_, i) => {
    seed = (1664525 * seed + 1013904223) >>> 0
    const t = i / sampleRate
    return dc + 0.08 * Math.sin(2 * Math.PI * frequency * t)
      + 0.025 * Math.sin(4 * Math.PI * frequency * t)
      + noise * (seed / 2 ** 32 - 0.5)
  })
}
function feed(tracker, frequency, sampleRate, from, until) {
  let result
  for (let time = from; time < until; time += 0.02) {
    result = tracker.update(frame(frequency, sampleRate, .005, .02), sampleRate, frequency, time)
  }
  return result
}
for (const sampleRate of [44100, 48000]) {
  for (const midi of [36, 48, 57, 60, 61, 62, 69, 76, 83]) {
    const tracker = new VoicePitchTracker()
    const frequency = 440 * 2 ** ((midi - 69) / 12)
    assert.equal(feed(tracker, frequency, sampleRate, 0, .2).midiNote, midi)
  }
  const tracker = new VoicePitchTracker()
  feed(tracker, 440, sampleRate, 0, .2)
  // Short octave error must not become a note; real sustained octave must.
  assert.equal(tracker.update(frame(880, sampleRate), sampleRate, 880, .2).midiNote, 69)
  assert.equal(feed(tracker, 440, sampleRate, .22, .4).midiNote, 69)
  assert.equal(feed(tracker, 880, sampleRate, .4, .6).midiNote, 81)
  // Chromatic notes and semitone changes are preserved, not snapped to a scale.
  assert.equal(feed(tracker, 440 * 2 ** (-8 / 12), sampleRate, .6, .85).midiNote, 61)
  assert.equal(feed(tracker, 440 * 2 ** (-7 / 12), sampleRate, .86, 1.1).midiNote, 62)
  const silence = new Float32Array(4096)
  assert.equal(tracker.update(silence, sampleRate, null, 1.12).midiNote, 62)
  assert.equal(tracker.update(silence, sampleRate, null, 1.3), null)
  tracker.reset()
  assert.equal(tracker.update(frame(440, sampleRate), sampleRate, 440, 2), null)
  feed(tracker, 440, sampleRate, 2, 2.2)
  for (let t = 2.2; t < 3; t += .02) {
    const frequency = 440 * 2 ** ((.4 * Math.sin(t * 2 * Math.PI * 5)) / 12)
    assert.equal(tracker.update(frame(frequency, sampleRate), sampleRate, frequency, t).midiNote, 69)
  }
  // Loud aperiodic noise must not be mistaken for a confident candidate.
  tracker.reset()
  let seed = 42
  const noise = Float32Array.from({ length: 4096 }, () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return .2 * (seed / 2 ** 32 - .5)
  })
  for (let t = 0; t < .5; t += .02) assert.equal(tracker.update(noise, sampleRate, 440, t), null)
}
console.log('PASS: voice tracker at 44.1/48 kHz: pitches, chromatic steps, vibrato, brief octave errors, true octave changes, silence/dropout, reset, noisy harmonics/DC and unpitched noise')
console.log('These tests supply YIN candidates; real microphone/YIN accuracy and Safari latency still require recorded-voice and device tests.')
