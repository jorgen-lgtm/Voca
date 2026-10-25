'use client'

import { useState, useCallback } from 'react'
import type { MidiNote } from '@/types/database'
import type { RecordedLoop } from '@/types/audio'

// Musical scales (semitones from root)
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
}

type ScaleType = keyof typeof SCALES

export function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false)

  // Quantize notes to a beat grid
  const quantizeNotes = useCallback((
    notes: MidiNote[],
    tempo: number,
    gridSize: number = 0.25 // 1/4 = quarter note, 0.125 = eighth note
  ): MidiNote[] => {
    const beatDuration = 60 / tempo
    const gridDuration = beatDuration * gridSize

    return notes.map(note => ({
      ...note,
      startTime: Math.round(note.startTime / gridDuration) * gridDuration,
      duration: Math.max(
        gridDuration * 0.9, // Slightly shorter than grid for separation
        Math.round(note.duration / gridDuration) * gridDuration
      ),
    }))
  }, [])

  // Snap notes to a musical scale
  const snapToScale = useCallback((
    notes: MidiNote[],
    rootNote: number = 60, // C4
    scale: ScaleType = 'major'
  ): MidiNote[] => {
    const scaleNotes = SCALES[scale]
    
    return notes.map(note => {
      const octave = Math.floor(note.pitch / 12)
      const noteInOctave = note.pitch % 12
      const rootInOctave = rootNote % 12
      
      // Find closest scale note
      let closestScaleNote = scaleNotes[0]
      let minDistance = 12
      
      for (const scaleNote of scaleNotes) {
        const absoluteNote = (rootInOctave + scaleNote) % 12
        const distance = Math.min(
          Math.abs(noteInOctave - absoluteNote),
          12 - Math.abs(noteInOctave - absoluteNote)
        )
        if (distance < minDistance) {
          minDistance = distance
          closestScaleNote = absoluteNote
        }
      }
      
      return {
        ...note,
        pitch: octave * 12 + closestScaleNote,
      }
    })
  }, [])

  // Merge very short notes and remove duplicates
  const smoothMelody = useCallback((notes: MidiNote[]): MidiNote[] => {
    if (notes.length < 2) return notes

    // Sort by start time
    const sorted = [...notes].sort((a, b) => a.startTime - b.startTime)
    
    const smoothed: MidiNote[] = []
    let i = 0

    while (i < sorted.length) {
      const currentNote = sorted[i]
      let endTime = currentNote.startTime + currentNote.duration
      let j = i + 1

      // Merge consecutive notes with same pitch
      while (j < sorted.length) {
        const nextNote = sorted[j]
        const gap = nextNote.startTime - endTime
        
        // If same pitch and small gap, merge
        if (nextNote.pitch === currentNote.pitch && gap < 0.15) {
          endTime = nextNote.startTime + nextNote.duration
          j++
        } else {
          break
        }
      }

      // Only keep notes longer than 0.05s
      const duration = endTime - currentNote.startTime
      if (duration >= 0.05) {
        smoothed.push({
          pitch: currentNote.pitch,
          velocity: currentNote.velocity,
          startTime: currentNote.startTime,
          duration: duration,
        })
      }

      i = j
    }

    return smoothed
  }, [])

  // Remove notes that are too quiet or too short
  const cleanupNotes = useCallback((notes: MidiNote[]): MidiNote[] => {
    return notes.filter(note => 
      note.duration >= 0.05 && 
      note.velocity > 20
    )
  }, [])

  // Apply all AI enhancements to a loop
  const enhanceLoop = useCallback((
    loop: RecordedLoop,
    tempo: number,
    options: {
      quantize?: boolean
      quantizeGrid?: number
      snapToScale?: boolean
      scale?: ScaleType
      rootNote?: number
      smooth?: boolean
    } = {}
  ): RecordedLoop => {
    setIsLoading(true)
    
    let notes = [...loop.notes]
    
    // Step 1: Clean up
    notes = cleanupNotes(notes)
    
    // Step 2: Smooth melody (merge short notes)
    if (options.smooth !== false) {
      notes = smoothMelody(notes)
    }
    
    // Step 3: Snap to scale
    if (options.snapToScale) {
      notes = snapToScale(
        notes, 
        options.rootNote ?? 60, 
        options.scale ?? 'major'
      )
    }
    
    // Step 4: Quantize to grid
    if (options.quantize !== false) {
      notes = quantizeNotes(
        notes, 
        tempo, 
        options.quantizeGrid ?? 0.25
      )
    }
    
    setIsLoading(false)
    
    return {
      ...loop,
      notes,
    }
  }, [cleanupNotes, smoothMelody, snapToScale, quantizeNotes])

  // Enhance all loops in a project
  const enhanceAllLoops = useCallback((
    loops: RecordedLoop[],
    tempo: number,
    options?: Parameters<typeof enhanceLoop>[2]
  ): RecordedLoop[] => {
    return loops.map(loop => {
      // Skip drums - they don't need melodic enhancement
      if (loop.instrumentType === 'drums') {
        // Just quantize drums
        return {
          ...loop,
          notes: quantizeNotes(loop.notes, tempo, 0.125), // 1/8 note grid for drums
        }
      }
      return enhanceLoop(loop, tempo, options)
    })
  }, [enhanceLoop, quantizeNotes])

  // Detect the most likely key/scale from notes
  const detectKey = useCallback((notes: MidiNote[]): { root: number; scale: ScaleType } => {
    if (notes.length === 0) return { root: 60, scale: 'major' }
    
    // Count occurrences of each pitch class
    const pitchCounts = new Array(12).fill(0)
    for (const note of notes) {
      pitchCounts[note.pitch % 12]++
    }
    
    // Find the most common pitch class as the likely root
    let maxCount = 0
    let likelyRoot = 0
    for (let i = 0; i < 12; i++) {
      if (pitchCounts[i] > maxCount) {
        maxCount = pitchCounts[i]
        likelyRoot = i
      }
    }
    
    // Check if it's more likely major or minor
    const majorThird = (likelyRoot + 4) % 12
    const minorThird = (likelyRoot + 3) % 12
    
    const scale: ScaleType = pitchCounts[minorThird] > pitchCounts[majorThird] ? 'minor' : 'major'
    
    return { root: 60 + likelyRoot, scale }
  }, [])

  return {
    isLoading,
    quantizeNotes,
    snapToScale,
    smoothMelody,
    cleanupNotes,
    enhanceLoop,
    enhanceAllLoops,
    detectKey,
  }
}
