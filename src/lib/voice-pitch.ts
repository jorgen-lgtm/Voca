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
    if (frequency && Number.isFinite(frequency) && frequency >= 65 && frequency <= 1200 && rms >= 0.004) {
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
    if (!frequency || !Number.isFinite(frequency) || clarity < 0.8) {
      this.candidate = null
      if (now - this.lastVoiced <= 0.07) return this.held
      this.held = null
      return null
    }
    this.lastVoiced = now
    const exactMidi = 69 + 12 * Math.log2(frequency / 440)
    // Stay on the held note through normal tuning drift/vibrato.
    const midiNote = this.held && Math.abs(exactMidi - this.held.midiNote) < 0.7
      ? this.held.midiNote : Math.round(exactMidi)
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
