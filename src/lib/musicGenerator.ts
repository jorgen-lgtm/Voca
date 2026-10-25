// Music Generator - AI Producer's musical suggestions
import type { MidiNote } from '@/types/database'
import type { InstrumentType } from '@/types/database'
import type { RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'

// Pentatonic scale for melodies (always sounds good)
const PENTATONIC = [0, 2, 4, 7, 9]

// Common chord progressions (as scale degrees)
const PROGRESSIONS = {
  pop: [0, 5, 3, 4],      // I - vi - IV - V
  rock: [0, 3, 4, 4],     // I - IV - V - V
  sad: [5, 3, 4, 0],      // vi - IV - V - I
  happy: [0, 4, 5, 3],    // I - V - vi - IV
}

// Generate a basic drum pattern
export function generateDrumPattern(
  duration: number,
  tempo: number,
  style: 'basic' | 'busy' | 'minimal' = 'basic'
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const totalBeats = Math.floor(duration / beatLength)
  
  const KICK = 36
  const SNARE = 38
  const HIHAT = 42
  
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatLength
    
    // Kick on 1 and 3
    if (beat % 4 === 0 || beat % 4 === 2) {
      notes.push({ pitch: KICK, velocity: 100, startTime: time, duration: 0.1 })
    }
    
    // Snare on 2 and 4
    if (beat % 4 === 1 || beat % 4 === 3) {
      notes.push({ pitch: SNARE, velocity: 90, startTime: time, duration: 0.1 })
    }
    
    // Hi-hats
    if (style === 'basic' || style === 'busy') {
      // 8th notes
      notes.push({ pitch: HIHAT, velocity: 60, startTime: time, duration: 0.05 })
      if (style === 'busy') {
        notes.push({ pitch: HIHAT, velocity: 40, startTime: time + beatLength / 2, duration: 0.05 })
      }
    } else if (style === 'minimal') {
      // Only on beats
      if (beat % 2 === 0) {
        notes.push({ pitch: HIHAT, velocity: 50, startTime: time, duration: 0.05 })
      }
    }
  }
  
  return notes
}

// Generate a bass line
export function generateBassLine(
  duration: number,
  tempo: number,
  rootNote: number = 36, // C2
  style: 'simple' | 'groovy' | 'walking' = 'simple'
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const totalBeats = Math.floor(duration / beatLength)
  const progression = PROGRESSIONS.pop
  
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatLength
    const chordIndex = Math.floor((beat / 4) % progression.length)
    const baseNote = rootNote + progression[chordIndex]
    
    if (style === 'simple') {
      // Root notes on beat 1 of each bar
      if (beat % 4 === 0) {
        notes.push({ pitch: baseNote, velocity: 100, startTime: time, duration: beatLength * 2 })
      }
    } else if (style === 'groovy') {
      // Syncopated pattern
      if (beat % 4 === 0) {
        notes.push({ pitch: baseNote, velocity: 100, startTime: time, duration: beatLength * 0.8 })
      } else if (beat % 4 === 2) {
        notes.push({ pitch: baseNote + 7, velocity: 80, startTime: time + beatLength * 0.5, duration: beatLength * 0.5 })
      }
    } else if (style === 'walking') {
      // Walking bass
      const walkNotes = [0, 2, 4, 5]
      const walkNote = baseNote + walkNotes[beat % 4]
      notes.push({ pitch: walkNote, velocity: 90, startTime: time, duration: beatLength * 0.9 })
    }
  }
  
  return notes
}

// Generate a melody
export function generateMelody(
  duration: number,
  tempo: number,
  rootNote: number = 60, // C4
  style: 'simple' | 'catchy' | 'ambient' = 'catchy'
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const totalBeats = Math.floor(duration / beatLength)
  
  let currentNote = rootNote
  let lastDirection = 1
  
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatLength
    
    if (style === 'simple') {
      // Simple quarter notes
      if (beat % 2 === 0) {
        const scaleIndex = Math.floor(Math.random() * PENTATONIC.length)
        const note = rootNote + PENTATONIC[scaleIndex]
        notes.push({ pitch: note, velocity: 80, startTime: time, duration: beatLength * 1.5 })
      }
    } else if (style === 'catchy') {
      // More rhythmic with variation
      if (beat % 4 === 0 || beat % 4 === 2 || (beat % 8 === 3)) {
        // Move up or down in scale
        const direction = Math.random() > 0.4 ? lastDirection : -lastDirection
        const scaleIndex = PENTATONIC.findIndex(n => (currentNote - rootNote) % 12 === n)
        let newIndex = scaleIndex + direction
        
        if (newIndex < 0) {
          newIndex = 0
          lastDirection = 1
        } else if (newIndex >= PENTATONIC.length) {
          newIndex = PENTATONIC.length - 1
          lastDirection = -1
        } else {
          lastDirection = direction
        }
        
        const octaveShift = Math.floor((currentNote - rootNote) / 12) * 12
        currentNote = rootNote + octaveShift + PENTATONIC[newIndex]
        
        // Keep in range
        if (currentNote > rootNote + 12) currentNote -= 12
        if (currentNote < rootNote - 5) currentNote += 12
        
        const noteDuration = beat % 4 === 0 ? beatLength * 1.5 : beatLength * 0.8
        notes.push({ pitch: currentNote, velocity: 75 + Math.random() * 20, startTime: time, duration: noteDuration })
      }
    } else if (style === 'ambient') {
      // Long sustained notes
      if (beat % 8 === 0) {
        const scaleIndex = Math.floor(Math.random() * 3)
        const note = rootNote + PENTATONIC[scaleIndex]
        notes.push({ pitch: note, velocity: 60, startTime: time, duration: beatLength * 6 })
      }
    }
  }
  
  return notes
}

// Generate chords/pads
export function generateChords(
  duration: number,
  tempo: number,
  rootNote: number = 48, // C3
  style: 'simple' | 'arpeggiated' = 'simple'
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const barLength = beatLength * 4
  const totalBars = Math.floor(duration / barLength)
  const progression = PROGRESSIONS.pop
  
  for (let bar = 0; bar < totalBars; bar++) {
    const time = bar * barLength
    const chordIndex = bar % progression.length
    const chordRoot = rootNote + progression[chordIndex]
    
    // Major triad (or adjust for minor)
    const chord = [chordRoot, chordRoot + 4, chordRoot + 7]
    
    if (style === 'simple') {
      // Whole note chords
      chord.forEach(note => {
        notes.push({ pitch: note, velocity: 60, startTime: time, duration: barLength * 0.9 })
      })
    } else if (style === 'arpeggiated') {
      // Arpeggiated
      const arpPattern = [0, 1, 2, 1]
      for (let beat = 0; beat < 4; beat++) {
        const noteIndex = arpPattern[beat]
        notes.push({ 
          pitch: chord[noteIndex], 
          velocity: 70, 
          startTime: time + beat * beatLength, 
          duration: beatLength * 0.8 
        })
      }
    }
  }
  
  return notes
}

// Suggestion types
export interface MusicSuggestion {
  type: 'drums' | 'bass' | 'melody' | 'chords'
  name: string
  description: string
  instrument: InstrumentType
  generate: (duration: number, tempo: number) => MidiNote[]
}

// Get available suggestions based on current tracks
export function getSuggestions(currentInstruments: InstrumentType[]): MusicSuggestion[] {
  const suggestions: MusicSuggestion[] = []
  const has = (i: InstrumentType) => currentInstruments.includes(i)
  
  // Always suggest drums if not present
  if (!has('drums')) {
    suggestions.push({
      type: 'drums',
      name: 'Enkel trumlåt',
      description: 'Kick, snare och hi-hat i standardtakt',
      instrument: 'drums',
      generate: (d, t) => generateDrumPattern(d, t, 'basic'),
    })
  }
  
  // Suggest bass if drums exist but no bass
  if (!has('bass')) {
    suggestions.push({
      type: 'bass',
      name: 'Groovy baslinje',
      description: 'Synkoperad bas som driver låten framåt',
      instrument: 'bass',
      generate: (d, t) => generateBassLine(d, t, 36, 'groovy'),
    })
  }
  
  // Suggest melody if no melodic instrument
  if (!has('piano') && !has('synth') && !has('guitar')) {
    suggestions.push({
      type: 'melody',
      name: 'Catchy melodi',
      description: 'En enkel melodi som fastnar',
      instrument: 'piano',
      generate: (d, t) => generateMelody(d, t, 60, 'catchy'),
    })
  }
  
  // Suggest pads/chords for fuller sound
  if ((has('drums') || has('bass')) && !has('strings') && !has('organ')) {
    suggestions.push({
      type: 'chords',
      name: 'Stråkackord',
      description: 'Mjuka ackord som fyller ut ljudbilden',
      instrument: 'strings',
      generate: (d, t) => generateChords(d, t, 48, 'simple'),
    })
  }
  
  // If we have basics, suggest synth lead
  if (has('drums') && has('bass') && !has('synth')) {
    suggestions.push({
      type: 'melody',
      name: 'Synth-lead',
      description: 'En elektronisk lead-melodi',
      instrument: 'synth',
      generate: (d, t) => generateMelody(d, t, 67, 'catchy'),
    })
  }
  
  return suggestions
}

// Create a loop from a suggestion
export function createLoopFromSuggestion(
  suggestion: MusicSuggestion,
  duration: number,
  tempo: number
): RecordedLoop {
  const notes = suggestion.generate(duration, tempo)
  const config = getInstrumentConfig(suggestion.instrument)
  
  return {
    id: crypto.randomUUID(),
    instrumentType: suggestion.instrument,
    notes,
    duration,
    color: config.color,
    volume: 0.8, // Slightly lower than recorded tracks
  }
}

// ============================================
// MELODY DEVELOPMENT FUNCTIONS
// Work with user's recorded melody
// ============================================

// Analyze a melody to find its characteristics
export function analyzeMelody(notes: MidiNote[]): {
  rootNote: number
  range: { min: number; max: number }
  averagePitch: number
  rhythm: 'fast' | 'medium' | 'slow'
  keyNotes: number[] // Most common notes
} {
  if (notes.length === 0) {
    return {
      rootNote: 60,
      range: { min: 60, max: 72 },
      averagePitch: 66,
      rhythm: 'medium',
      keyNotes: [60, 64, 67],
    }
  }
  
  const pitches = notes.map(n => n.pitch)
  const min = Math.min(...pitches)
  const max = Math.max(...pitches)
  const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length
  
  // Count pitch occurrences to find key notes
  const pitchCounts: Record<number, number> = {}
  for (const p of pitches) {
    const pitchClass = p % 12
    pitchCounts[pitchClass] = (pitchCounts[pitchClass] || 0) + 1
  }
  
  // Sort by frequency and get top 3
  const sortedPitches = Object.entries(pitchCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([p]) => parseInt(p))
  
  // Estimate root note (most common or lowest of top 3)
  const rootPitchClass = Math.min(...sortedPitches)
  const rootNote = Math.floor(avg / 12) * 12 + rootPitchClass
  
  // Analyze rhythm
  const avgDuration = notes.reduce((a, n) => a + n.duration, 0) / notes.length
  const rhythm = avgDuration < 0.2 ? 'fast' : avgDuration > 0.5 ? 'slow' : 'medium'
  
  return {
    rootNote,
    range: { min, max },
    averagePitch: Math.round(avg),
    rhythm,
    keyNotes: sortedPitches.map(pc => Math.floor(avg / 12) * 12 + pc),
  }
}

// Generate a bass line that follows a melody
export function generateBassFromMelody(
  melodyNotes: MidiNote[],
  duration: number,
  tempo: number
): MidiNote[] {
  const analysis = analyzeMelody(melodyNotes)
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const bassOctave = 2 // Bass in octave 2
  
  // Group melody notes by beat to find chord roots
  const beatsMap: Record<number, number[]> = {}
  for (const note of melodyNotes) {
    const beat = Math.floor(note.startTime / beatLength)
    if (!beatsMap[beat]) beatsMap[beat] = []
    beatsMap[beat].push(note.pitch % 12)
  }
  
  // Generate bass notes on strong beats
  const totalBeats = Math.floor(duration / beatLength)
  let lastBassNote = analysis.rootNote % 12
  
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatLength
    
    // Play on beats 1 and 3 (or every beat for faster rhythms)
    const playBass = analysis.rhythm === 'fast' 
      ? true 
      : (beat % 2 === 0)
    
    if (playBass) {
      // Find what melody notes are around this beat
      const melodyPitches = beatsMap[beat] || beatsMap[beat - 1] || [lastBassNote]
      
      // Choose bass note - prefer root, fifth, or follow melody
      let bassNote = melodyPitches[0] ?? lastBassNote
      
      // Sometimes use fifth below for movement
      if (beat % 4 === 2 && Math.random() > 0.5) {
        bassNote = (bassNote + 7) % 12 // Fifth
      }
      
      const fullBassNote = bassOctave * 12 + bassNote
      lastBassNote = bassNote
      
      notes.push({
        pitch: fullBassNote,
        velocity: 90,
        startTime: time,
        duration: analysis.rhythm === 'fast' ? beatLength * 0.8 : beatLength * 1.5,
      })
    }
  }
  
  return notes
}

// Generate drums that match a melody's rhythm
export function generateDrumsFromMelody(
  melodyNotes: MidiNote[],
  duration: number,
  tempo: number
): MidiNote[] {
  const analysis = analyzeMelody(melodyNotes)
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const totalBeats = Math.floor(duration / beatLength)
  
  const KICK = 36
  const SNARE = 38
  const HIHAT = 42
  
  // Find where melody has notes (for hi-hat pattern)
  const melodyBeats = new Set(
    melodyNotes.map(n => Math.floor(n.startTime / beatLength))
  )
  
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatLength
    
    // Kick on 1 and 3
    if (beat % 4 === 0 || beat % 4 === 2) {
      notes.push({ pitch: KICK, velocity: 100, startTime: time, duration: 0.1 })
    }
    
    // Snare on 2 and 4
    if (beat % 4 === 1 || beat % 4 === 3) {
      notes.push({ pitch: SNARE, velocity: 90, startTime: time, duration: 0.1 })
    }
    
    // Hi-hats follow melody rhythm or steady 8ths
    if (analysis.rhythm === 'fast') {
      // 16th notes
      for (let i = 0; i < 4; i++) {
        const velocity = i === 0 ? 70 : 40
        notes.push({ 
          pitch: HIHAT, 
          velocity, 
          startTime: time + (i * beatLength / 4), 
          duration: 0.03 
        })
      }
    } else {
      // 8th notes, accent where melody has notes
      const hasNote = melodyBeats.has(beat)
      notes.push({ pitch: HIHAT, velocity: hasNote ? 70 : 50, startTime: time, duration: 0.05 })
      notes.push({ pitch: HIHAT, velocity: 35, startTime: time + beatLength / 2, duration: 0.03 })
    }
  }
  
  return notes
}

// Generate harmony/chords based on melody
export function generateHarmonyFromMelody(
  melodyNotes: MidiNote[],
  duration: number,
  tempo: number,
  instrument: 'strings' | 'piano' | 'organ' = 'strings'
): MidiNote[] {
  const analysis = analyzeMelody(melodyNotes)
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  const barLength = beatLength * 4
  const totalBars = Math.ceil(duration / barLength)
  
  // Build chords based on melody's key notes
  const root = analysis.rootNote % 12
  
  // Simple chord progression based on detected key
  const chordRoots = [root, (root + 5) % 12, (root + 7) % 12, root]
  
  for (let bar = 0; bar < totalBars; bar++) {
    const time = bar * barLength
    const chordRoot = chordRoots[bar % chordRoots.length]
    
    // Build triad in the octave below melody
    const octave = Math.floor(analysis.averagePitch / 12) - 1
    const baseNote = octave * 12 + chordRoot
    
    // Major triad (or could detect minor from melody)
    const chord = [baseNote, baseNote + 4, baseNote + 7]
    
    // Strings/organ: sustained chords
    // Piano: could arpeggiate
    if (instrument === 'piano') {
      // Arpeggiate
      chord.forEach((note, i) => {
        notes.push({
          pitch: note,
          velocity: 60,
          startTime: time + i * (beatLength / 2),
          duration: barLength - i * (beatLength / 2),
        })
      })
    } else {
      // Sustained pad
      chord.forEach(note => {
        notes.push({
          pitch: note,
          velocity: instrument === 'strings' ? 50 : 60,
          startTime: time,
          duration: barLength * 0.95,
        })
      })
    }
  }
  
  return notes
}

// Generate a counter-melody that complements the original
export function generateCounterMelody(
  melodyNotes: MidiNote[],
  duration: number,
  tempo: number
): MidiNote[] {
  const analysis = analyzeMelody(melodyNotes)
  const notes: MidiNote[] = []
  const beatLength = 60 / tempo
  
  // Counter-melody plays when original melody rests, or harmonizes
  let lastMelodyEnd = 0
  
  for (const melodyNote of melodyNotes) {
    // If there's a gap, fill it
    if (melodyNote.startTime - lastMelodyEnd > beatLength * 0.5) {
      // Play a responding phrase
      const responseNote = melodyNote.pitch + (Math.random() > 0.5 ? 4 : 7) // Third or fifth above
      notes.push({
        pitch: Math.min(responseNote, analysis.range.max + 5),
        velocity: 65,
        startTime: lastMelodyEnd + beatLength * 0.25,
        duration: Math.min(melodyNote.startTime - lastMelodyEnd - beatLength * 0.3, beatLength),
      })
    }
    
    lastMelodyEnd = melodyNote.startTime + melodyNote.duration
  }
  
  // Fill end if needed
  if (duration - lastMelodyEnd > beatLength) {
    notes.push({
      pitch: analysis.rootNote + 12,
      velocity: 60,
      startTime: lastMelodyEnd + beatLength * 0.25,
      duration: beatLength * 2,
    })
  }
  
  return notes
}

// Types for melody-based suggestions
export interface MelodyDevelopment {
  type: 'bass' | 'drums' | 'harmony' | 'counter'
  name: string
  description: string
  instrument: InstrumentType
  generate: (melody: MidiNote[], duration: number, tempo: number) => MidiNote[]
}

// Get suggestions for developing a user's melody
export function getMelodyDevelopments(melodyLoop: RecordedLoop): MelodyDevelopment[] {
  const developments: MelodyDevelopment[] = []
  
  // Always offer bass
  developments.push({
    type: 'bass',
    name: 'Bas som följer melodin',
    description: 'En baslinje som passar din melodi',
    instrument: 'bass',
    generate: generateBassFromMelody,
  })
  
  // Always offer drums
  developments.push({
    type: 'drums',
    name: 'Trummor i samma känsla',
    description: 'Beat som matchar din melodis rytm',
    instrument: 'drums',
    generate: generateDrumsFromMelody,
  })
  
  // Offer harmony
  developments.push({
    type: 'harmony',
    name: 'Ackord under melodin',
    description: 'Stråkackord som stödjer melodin',
    instrument: 'strings',
    generate: (m, d, t) => generateHarmonyFromMelody(m, d, t, 'strings'),
  })
  
  // Offer counter-melody
  developments.push({
    type: 'counter',
    name: 'Svarande melodi',
    description: 'En andra stämma som svarar din melodi',
    instrument: 'synth',
    generate: generateCounterMelody,
  })
  
  return developments
}

// Create a loop from melody development
export function createLoopFromMelodyDevelopment(
  development: MelodyDevelopment,
  sourceLoop: RecordedLoop,
  tempo: number = 120
): RecordedLoop {
  const notes = development.generate(sourceLoop.notes, sourceLoop.duration, tempo)
  const config = getInstrumentConfig(development.instrument)
  
  return {
    id: crypto.randomUUID(),
    instrumentType: development.instrument,
    notes,
    duration: sourceLoop.duration,
    color: config.color,
    volume: 0.75,
  }
}
