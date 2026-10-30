import type { MidiNote, InstrumentType } from '@/types/database'

export const MUSIC_GENRES = {
  pop: 'Pop', rock: 'Rock', hiphop: 'Hip-hop', house: 'House', jazz: 'Jazz', ambient: 'Ambient',
} as const
export type MusicGenre = keyof typeof MUSIC_GENRES
export const ARRANGEMENT_PARTS = {
  drums: { label: 'Trummor', instrument: 'drums' },
  bass: { label: 'Bas', instrument: 'bass' },
  harmony: { label: 'Ackord', instrument: 'strings' },
  melody: { label: 'Kompletterande melodi', instrument: 'synth' },
} as const satisfies Record<string, { label: string; instrument: InstrumentType }>
export type ArrangementPart = keyof typeof ARRANGEMENT_PARTS
export interface GenreRequest {
  genre: MusicGenre | 'auto'
  part: ArrangementPart
  action: 'generate' | 'improve'
  tempo: number
  duration: number
  notes: MidiNote[]
}
export interface GenrePlan {
  genre: MusicGenre
  description: string
  // MIDI pitch, start beat, length in beats, velocity. A four-beat motif.
  motif: [number, number, number, number][]
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export const isMusicGenre = (v: unknown): v is MusicGenre => typeof v === 'string' && Object.hasOwn(MUSIC_GENRES, v)
export const isArrangementPart = (v: unknown): v is ArrangementPart => typeof v === 'string' && Object.hasOwn(ARRANGEMENT_PARTS, v)
const finite = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

export function parseGenreRequest(value: unknown): GenreRequest {
  if (!record(value) || !(value.genre === 'auto' || isMusicGenre(value.genre))
    || !isArrangementPart(value.part) || (value.action !== 'generate' && value.action !== 'improve')
    || !finite(value.tempo, 40, 240) || !finite(value.duration, 0.25, 60)
    || !Array.isArray(value.notes) || value.notes.length > 64
    || ((value.genre === 'auto' || value.action === 'improve') && value.notes.length === 0)
    || !value.notes.every(n => record(n) && Number.isInteger(n.pitch) && finite(n.pitch, 0, 127)
      && finite(n.startTime, 0, value.duration as number) && finite(n.duration, 0.001, 60)
      && finite(n.velocity, 1, 127))) throw new Error('Ogiltigt musikunderlag. Välj ett MIDI-spår (högst 64 noter och 60 sekunder).')
  return value as unknown as GenreRequest
}

export function parseGenrePlan(value: unknown, request: GenreRequest): GenrePlan {
  if (!record(value) || !isMusicGenre(value.genre)
    || (request.genre !== 'auto' && value.genre !== request.genre)
    || typeof value.description !== 'string' || value.description.length > 240
    || !Array.isArray(value.motif) || value.motif.length < 1 || value.motif.length > 8
    || !value.motif.every(n => Array.isArray(n) && n.length === 4
      && Number.isInteger(n[0]) && finite(n[0], 0, 127)
      && (request.part !== 'drums' || [36, 38, 42, 46].includes(n[0]))
      && finite(n[1], 0, 3.999) && finite(n[2], 0.03125, 4) && finite(n[3], 1, 127)
      && Number.isInteger(n[3]))
    || !value.motif.some(n => n[1] * 60 / request.tempo < request.duration)) throw new Error('AI-förslaget kunde inte valideras. Dina spår är oförändrade.')
  return value as unknown as GenrePlan
}

export function renderGenrePlan(plan: GenrePlan, request: GenreRequest): MidiNote[] {
  parseGenreRequest(request)
  // Revalidate on the client too; never trust an HTTP response or imported plan.
  parseGenrePlan(plan, request)
  const beat = 60 / request.tempo
  const notes: MidiNote[] = []
  for (let bar = 0; bar * 4 * beat < request.duration; bar++) {
    for (const [pitch, start, length, velocity] of plan.motif) {
      const startTime = (bar * 4 + start) * beat
      if (startTime >= request.duration) continue
      notes.push({ pitch, velocity, startTime, duration: Math.min(length * beat, request.duration - startTime) })
    }
  }
  return notes.sort((a, b) => a.startTime - b.startTime)
}

export function genrePrompt(request: GenreRequest): string {
  return JSON.stringify({
    task: request.action === 'improve' ? 'Rework this track in the requested genre; keep its recognizable musical idea.' : 'Create a complementary four-beat motif fitting the source.',
    genre: request.genre, allowedGenres: Object.keys(MUSIC_GENRES), part: request.part,
    tempo: request.tempo,
    source: request.notes.map(n => [n.pitch, Number((n.startTime * request.tempo / 60).toFixed(3)), Number((n.duration * request.tempo / 60).toFixed(3)), n.velocity]),
    output: 'JSON only: {"genre":"allowed genre ID","description":"short Swedish musical explanation","motif":[[MIDI pitch,start beat,length beats,velocity]]}. 1-8 motif notes. Start beats >=0 and <4; length 0.03125-4; integer velocity 1-127. Drums ONLY MIDI 36 kick,38 snare,42 closed hat,46 open hat. Auto means choose a plausible suggested genre, not a definitive classification. Manual genre must be returned unchanged.',
  })
}

export function localGenrePlan(request: GenreRequest): GenrePlan {
  parseGenreRequest(request)
  if (request.genre === 'auto') throw new Error('Välj en genre för det lokala mönstret, eller låt extern AI föreslå en.')
  const genre = request.genre
  const swing = genre === 'jazz' || genre === 'hiphop' ? 0.17 : 0
  const beats = genre === 'ambient' ? [0, 2] : genre === 'house' ? [0.5, 1.5, 2.5, 3.5] : [0, 1 + swing, 2, 3 + swing]
  const root = request.notes[0]?.pitch ?? 60
  let motif: GenrePlan['motif']
  if (request.part === 'drums') {
    motif = genre === 'house' ? [[36, 0, .15, 105], [36, 1, .15, 100], [36, 2, .15, 105], [36, 3, .15, 100], [42, .5, .1, 70], [42, 1.5, .1, 65], [42, 2.5, .1, 70], [46, 3.5, .1, 65]]
      : genre === 'ambient' ? [[36, 0, .15, 65], [42, 2, .1, 40]]
      : genre === 'hiphop' ? [[36, 0, .15, 105], [36, 2.5, .15, 95], [38, 1, .15, 100], [38, 3, .15, 100], [42, .67, .1, 65], [42, 1.67, .1, 55], [42, 2.67, .1, 65], [42, 3.67, .1, 55]]
      : genre === 'jazz' ? [[36, 0, .15, 65], [38, 3, .15, 55], [42, 0, .1, 70], [42, 1, .1, 60], [42, 1.67, .1, 50], [42, 2, .1, 70], [42, 3, .1, 60], [42, 3.67, .1, 50]]
      : [[36, 0, .15, 105], [36, genre === 'rock' ? 2.5 : 2, .15, 100], [38, 1, .15, 100], [38, 3, .15, 100], [42, 0, .1, 65], [42, 1, .1, 55], [42, 2, .1, 65], [42, 3, .1, 55]]
  } else if (request.part === 'bass') {
    const bassRoot = 36 + root % 12
    motif = beats.map((b, i) => [bassRoot + (genre === 'jazz' ? [0, 4, 7, 9][i % 4] : i % 2 ? 7 : 0), b, genre === 'ambient' ? 1.8 : .45, 85])
  } else if (request.part === 'harmony') {
    const chordRoot = 48 + root % 12
    motif = [0, 4, 7, ...(genre === 'jazz' ? [11] : [])].map(p => [chordRoot + p, genre === 'house' ? .5 : 0, genre === 'ambient' ? 4 : 1.5, 65])
  } else {
    motif = beats.map((b, i) => [request.notes[i % (request.notes.length || 1)]?.pitch ?? [60, 64, 67, 69][i % 4], b, genre === 'ambient' ? 1.8 : .5, 80])
  }
  return parseGenrePlan({ genre, motif, description: `${MUSIC_GENRES[genre]}: lokalt grundmönster. Lyssna och justera efter din låt.` }, request)
}
