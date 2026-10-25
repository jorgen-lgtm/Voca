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

  // Remove notes that are too quiet or too short (noise)
  const cleanupNotes = useCallback((notes: MidiNote[]): MidiNote[] => {
    return notes.filter(note => 
      note.duration >= 0.08 &&  // Minimum 80ms
      note.velocity > 30        // Minimum velocity
    )
  }, [])

  // Remove outlier notes (likely noise/errors)
  const removeOutliers = useCallback((notes: MidiNote[]): MidiNote[] => {
    if (notes.length < 3) return notes
    
    const sorted = [...notes].sort((a, b) => a.startTime - b.startTime)
    const result: MidiNote[] = []
    
    for (let i = 0; i < sorted.length; i++) {
      const note = sorted[i]
      const prev = i > 0 ? sorted[i - 1] : null
      const next = i < sorted.length - 1 ? sorted[i + 1] : null
      
      // Check if this note is an outlier (too far from neighbors)
      const prevDiff = prev ? Math.abs(note.pitch - prev.pitch) : 0
      const nextDiff = next ? Math.abs(note.pitch - next.pitch) : 0
      
      // If both neighbors exist and this note jumps > octave from both, likely noise
      if (prev && next && prevDiff > 12 && nextDiff > 12) {
        continue // Skip this note
      }
      
      // If note is very short and jumps far, likely noise
      if (note.duration < 0.12 && (prevDiff > 7 || nextDiff > 7)) {
        continue // Skip this note
      }
      
      result.push(note)
    }
    
    return result
  }, [])

  // Consolidate repeated notes into longer notes
  const consolidateNotes = useCallback((notes: MidiNote[]): MidiNote[] => {
    if (notes.length < 2) return notes
    
    const sorted = [...notes].sort((a, b) => a.startTime - b.startTime)
    const result: MidiNote[] = []
    
    let i = 0
    while (i < sorted.length) {
      const currentNote = { ...sorted[i] }
      let j = i + 1
      
      // Look for consecutive similar notes
      while (j < sorted.length) {
        const nextNote = sorted[j]
        const gap = nextNote.startTime - (currentNote.startTime + currentNote.duration)
        const pitchDiff = Math.abs(nextNote.pitch - currentNote.pitch)
        
        // Merge if same pitch (or very close) and small gap
        if (pitchDiff <= 2 && gap < 0.2 && gap > -0.1) {
          // Extend duration
          currentNote.duration = (nextNote.startTime + nextNote.duration) - currentNote.startTime
          // Use the more common pitch
          if (pitchDiff > 0) {
            currentNote.pitch = nextNote.duration > currentNote.duration ? nextNote.pitch : currentNote.pitch
          }
          j++
        } else {
          break
        }
      }
      
      result.push(currentNote)
      i = j
    }
    
    return result
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
    
    // Step 1: Remove very short/quiet notes (noise)
    notes = cleanupNotes(notes)
    
    // Step 2: Remove outlier notes (likely errors)
    notes = removeOutliers(notes)
    
    // Step 3: Consolidate repeated similar notes
    notes = consolidateNotes(notes)
    
    // Step 4: Smooth melody (merge short notes)
    if (options.smooth !== false) {
      notes = smoothMelody(notes)
    }
    
    // Step 5: Snap to scale
    if (options.snapToScale) {
      notes = snapToScale(
        notes, 
        options.rootNote ?? 60, 
        options.scale ?? 'pentatonic' // Use pentatonic for cleaner sound
      )
    }
    
    // Step 6: Quantize to grid
    if (options.quantize !== false) {
      notes = quantizeNotes(
        notes, 
        tempo, 
        options.quantizeGrid ?? 0.25
      )
    }
    
    // Step 7: Final cleanup - remove any remaining short notes
    notes = notes.filter(n => n.duration >= 0.1)
    
    setIsLoading(false)
    
    return {
      ...loop,
      notes,
    }
  }, [cleanupNotes, removeOutliers, consolidateNotes, smoothMelody, snapToScale, quantizeNotes])

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
    removeOutliers,
    consolidateNotes,
    enhanceLoop,
    enhanceAllLoops,
    detectKey,
  }
}
