// Shared gain staging: MIDI velocity and track volume remain independent controls.
export const PIANO_OUTPUT_DB = -6
export const MASTER_LIMIT_DB = -1
export const recordingOutputDb = (microphoneEnabled: boolean) => microphoneEnabled ? -6 : 0

export function noteGain(velocity: number = 100, trackVolume: number = 1): number {
  const midi = Number.isFinite(velocity) ? Math.max(0, Math.min(127, velocity)) : 0
  const volume = Number.isFinite(trackVolume) ? Math.max(0, Math.min(1, trackVolume)) : 0
  return midi / 127 * volume * 0.8
}
