'use client'

import { useState, useCallback } from 'react'
import type { MidiNote } from '@/types/database'

interface MelodySuggestion {
  notes: MidiNote[]
  description: string
}

export function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestMelody = useCallback(async (
    notes: MidiNote[],
    tempo: number,
    style?: string
  ): Promise<MelodySuggestion | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suggest-melody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, tempo, style }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get suggestion')
      }

      const suggestion = await response.json()
      return suggestion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const smoothMelody = useCallback((notes: MidiNote[]): MidiNote[] => {
    if (notes.length < 2) return notes

    const smoothed: MidiNote[] = []
    let i = 0

    while (i < notes.length) {
      const currentNote = notes[i]
      let j = i + 1

      while (
        j < notes.length &&
        notes[j].pitch === currentNote.pitch &&
        notes[j].startTime - (notes[j - 1].startTime + notes[j - 1].duration) < 0.1
      ) {
        j++
      }

      if (j > i + 1) {
        const lastNote = notes[j - 1]
        smoothed.push({
          pitch: currentNote.pitch,
          velocity: currentNote.velocity,
          startTime: currentNote.startTime,
          duration: (lastNote.startTime + lastNote.duration) - currentNote.startTime,
        })
      } else {
        smoothed.push(currentNote)
      }

      i = j
    }

    return smoothed
  }, [])

  const quantizeNotes = useCallback((
    notes: MidiNote[],
    tempo: number,
    gridSize: number = 0.25
  ): MidiNote[] => {
    const beatDuration = 60 / tempo
    const gridDuration = beatDuration * gridSize

    return notes.map(note => ({
      ...note,
      startTime: Math.round(note.startTime / gridDuration) * gridDuration,
      duration: Math.max(
        gridDuration,
        Math.round(note.duration / gridDuration) * gridDuration
      ),
    }))
  }, [])

  return {
    isLoading,
    error,
    suggestMelody,
    smoothMelody,
    quantizeNotes,
  }
}
