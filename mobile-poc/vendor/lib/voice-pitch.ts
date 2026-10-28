// Shared by the microphone gate and tracker so quiet, pitched input is not
// discarded before the detector gets a chance to inspect it.
export const VOICE_MIN_RMS = 0.0006
export const VOICE_YIN_SETTINGS = { threshold: 0.15, probabilityThreshold: 0.7 }

// pitchfinder's YIN initializes its first difference term to 1. On quiet,
// unscaled microphone input that can make the first tiny lag look periodic
// and produce an ultrasonic candidate. Center and normalize only the analysis
// copy; never change the recorded signal or playback volume.
export function detectVoiceFrequency(
  buffer: Float32Array,
  normalized: Float32Array,
  detector: (samples: Float32Array) => number | null,
): number | null {
  let mean = 0
  for (const sample of buffer) mean += sample
  mean /= buffer.length || 1
  let energy = 0
  for (const sample of buffer) energy += (sample - mean) ** 2
  const rms = Math.sqrt(energy / (buffer.length || 1))
  if (rms < VOICE_MIN_RMS || !Number.isFinite(rms)) return null
  for (let i = 0; i < buffer.length; i++) normalized[i] = (buffer[i] - mean) / rms
  return detector(normalized)
}

export interface VoicePitch {
  frequency: number
  midiNote: number
  clarity: number
}

// YIN supplies the candidate. Periodicity rejects loud but unpitched sounds;
// elapsed-time hysteresis keeps vibrato and brief tracking errors out of MIDI.
export class VoicePitchTracker {
  private held: VoicePitch | null = null
  private candidate: number | null = null
  private candidateSince = 0
  private lastVoiced = -Infinity

  reset() {
    this.held = null
    this.candidate = null
    this.lastVoiced = -Infinity
  }

  update(buffer: Float32Array, sampleRate: number, frequency: number | null, now: number): VoicePitch | null {
    let mean = 0
    for (const value of buffer) mean += value
    mean /= buffer.length || 1
    let energy = 0
    for (const value of buffer) energy += (value - mean) ** 2
    const rms = Math.sqrt(energy / (buffer.length || 1))
    let clarity = 0
    if (frequency && Number.isFinite(frequency) && frequency >= 65 && frequency <= 1200 && rms >= VOICE_MIN_RMS) {
      const lag = Math.round(sampleRate / frequency)
      let correlation = 0, left = 0, right = 0
      for (let i = 0; i < buffer.length - lag; i++) {
        const a = buffer[i] - mean, b = buffer[i + lag] - mean
        correlation += a * b
        left += a * a
        right += b * b
      }
      clarity = correlation / Math.sqrt(left * right || 1)
    }
    if (!frequency || !Number.isFinite(frequency) || clarity < 0.65) {
      this.candidate = null
      if (now - this.lastVoiced <= 0.07) return this.held
      this.held = null
      return null
    }
    this.lastVoiced = now
    const exactMidi = 69 + 12 * Math.log2(frequency / 440)
    // Stay on the held note through normal tuning drift/vibrato.
    const midiNote = this.held && Math.abs(exactMidi - this.held.midiNote) < 0.7
      ? this.held.midiNote
      : this.candidate !== null && Math.abs(exactMidi - this.candidate) < 0.75
        ? this.candidate : Math.round(exactMidi)
    if (this.held?.midiNote === midiNote) {
      this.candidate = null
      this.held = { frequency, midiNote, clarity }
      return this.held
    }
    if (this.candidate !== midiNote) {
      this.candidate = midiNote
      this.candidateSince = now
    }
    const settleTime = this.held && Math.abs(midiNote - this.held.midiNote) >= 12 ? 0.1 : 0.045
    if (now - this.candidateSince >= settleTime) {
      this.held = { frequency, midiNote, clarity }
      this.candidate = null
    }
    return this.held
  }
}

