import type { InstrumentType, MidiNote } from './database'

export interface AudioEngineState {
  isInitialized: boolean
  isRecording: boolean
  isPlaying: boolean
  currentBeat: number
  tempo: number
  loopLength: number
}

export interface PitchDetectionResult {
  frequency: number | null
  clarity: number
  midiNote: number | null
  noteName: string | null
}

export interface RecordedLoop {
  id: string
  instrumentType: InstrumentType
  notes: MidiNote[]
  duration: number
  color: string
  volume: number
  // For memo recordings (raw audio)
  audioBlob?: Blob
  audioUrl?: string
}

export interface AudioEngineConfig {
  tempo: number
  loopBars: number
  inputDeviceId?: string
}

export type AudioEngineEvent =
  | { type: 'INIT_SUCCESS' }
  | { type: 'INIT_ERROR'; error: string }
  | { type: 'RECORDING_START' }
  | { type: 'RECORDING_STOP'; notes: MidiNote[] }
  | { type: 'PITCH_DETECTED'; pitch: PitchDetectionResult }
  | { type: 'BEAT_UPDATE'; beat: number }
  | { type: 'LOOP_START' }
  | { type: 'LOOP_END' }

