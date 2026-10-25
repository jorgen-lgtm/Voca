import type { MidiNote } from '@/types/database'
import type { RecordedLoop } from '@/types/audio'

const TICKS_PER_BEAT = 480
const MIDI_HEADER = [0x4d, 0x54, 0x68, 0x64]
const MIDI_TRACK_HEADER = [0x4d, 0x54, 0x72, 0x6b]

function writeVariableLength(value: number): number[] {
  const bytes: number[] = []
  let v = value

  bytes.push(v & 0x7f)
  while ((v >>= 7) > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
  }

  return bytes
}

function write16bit(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff]
}

function write32bit(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ]
}

function secondsToTicks(seconds: number, tempo: number): number {
  const beatsPerSecond = tempo / 60
  return Math.round(seconds * beatsPerSecond * TICKS_PER_BEAT)
}

function createTrackData(notes: MidiNote[], tempo: number, channel: number = 0): number[] {
  const events: Array<{ tick: number; data: number[] }> = []

  events.push({
    tick: 0,
    data: [0xff, 0x51, 0x03, ...write32bit(Math.round(60000000 / tempo)).slice(1)],
  })

  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime)

  for (const note of sortedNotes) {
    const startTick = secondsToTicks(note.startTime, tempo)
    const endTick = secondsToTicks(note.startTime + note.duration, tempo)

    events.push({
      tick: startTick,
      data: [0x90 | channel, note.pitch, note.velocity],
    })

    events.push({
      tick: endTick,
      data: [0x80 | channel, note.pitch, 0],
    })
  }

  events.sort((a, b) => a.tick - b.tick)

  const trackData: number[] = []
  let lastTick = 0

  for (const event of events) {
    const deltaTick = event.tick - lastTick
    trackData.push(...writeVariableLength(deltaTick))
    trackData.push(...event.data)
    lastTick = event.tick
  }

  trackData.push(...writeVariableLength(0))
  trackData.push(0xff, 0x2f, 0x00)

  return trackData
}

export function exportLoopsToMidi(loops: RecordedLoop[], tempo: number): Uint8Array {
  const trackCount = loops.length
  const format = trackCount > 1 ? 1 : 0

  const header = [
    ...MIDI_HEADER,
    ...write32bit(6),
    ...write16bit(format),
    ...write16bit(trackCount),
    ...write16bit(TICKS_PER_BEAT),
  ]

  const tracks: number[][] = []

  loops.forEach((loop, index) => {
    const trackData = createTrackData(loop.notes, tempo, index % 16)
    const trackChunk = [...MIDI_TRACK_HEADER, ...write32bit(trackData.length), ...trackData]
    tracks.push(trackChunk)
  })

  const totalLength = header.length + tracks.reduce((sum, track) => sum + track.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  for (const byte of header) {
    result[offset++] = byte
  }
  for (const track of tracks) {
    for (const byte of track) {
      result[offset++] = byte
    }
  }

  return result
}

export function downloadMidiFile(midiData: Uint8Array, filename: string = 'humweave-export.mid') {
  const blob = new Blob([new Uint8Array(midiData)], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportLoopsToJson(loops: RecordedLoop[], tempo: number): string {
  return JSON.stringify(
    {
      version: '1.0',
      tempo,
      loops: loops.map((loop) => ({
        id: loop.id,
        instrumentType: loop.instrumentType,
        duration: loop.duration,
        notes: loop.notes,
      })),
    },
    null,
    2
  )
}

export function downloadJsonFile(json: string, filename: string = 'humweave-export.json') {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
