'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'

interface MiniKeyboardProps {
  isRecording: boolean
  onNotePlay: (midiNote: number) => void
  onNoteRecord?: (midiNote: number) => void
  baseOctave?: number
}

const WHITE_KEYS = [
  { note: 'C', offset: 0 },
  { note: 'D', offset: 2 },
  { note: 'E', offset: 4 },
  { note: 'F', offset: 5 },
  { note: 'G', offset: 7 },
  { note: 'A', offset: 9 },
  { note: 'B', offset: 11 },
  { note: 'C', offset: 12 },
]

const BLACK_KEYS = [
  { note: 'C#', offset: 1, position: 1 },
  { note: 'D#', offset: 3, position: 2 },
  { note: 'F#', offset: 6, position: 4 },
  { note: 'G#', offset: 8, position: 5 },
  { note: 'A#', offset: 10, position: 6 },
]

export function MiniKeyboard({ 
  isRecording, 
  onNotePlay, 
  onNoteRecord,
  baseOctave = 4 
}: MiniKeyboardProps) {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set())
  const [octave, setOctave] = useState(baseOctave)
  const recordingStartRef = useRef<Map<number, number>>(new Map())

  const baseMidi = (octave + 1) * 12 // C4 = MIDI 60

  const handleKeyDown = useCallback((offset: number) => {
    const midiNote = baseMidi + offset
    setActiveKeys(prev => new Set(prev).add(midiNote))
    onNotePlay(midiNote)
    
    if (isRecording && onNoteRecord) {
      recordingStartRef.current.set(midiNote, Date.now())
      onNoteRecord(midiNote)
    }
  }, [baseMidi, isRecording, onNotePlay, onNoteRecord])

  const handleKeyUp = useCallback((offset: number) => {
    const midiNote = baseMidi + offset
    setActiveKeys(prev => {
      const next = new Set(prev)
      next.delete(midiNote)
      return next
    })
    recordingStartRef.current.delete(midiNote)
  }, [baseMidi])

  const whiteKeyWidth = 36
  const blackKeyWidth = 24

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Octave controls */}
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (octave > 2) setOctave(octave - 1)
          }}
          className={`px-4 py-2 rounded-lg transition-colors font-medium ${
            octave <= 2 
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500'
          }`}
        >
          ◀ Oktav ner
        </button>
        <div className="px-4 py-2 bg-gray-800 rounded-lg">
          <span className="text-purple-400 font-bold">C{octave}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (octave < 6) setOctave(octave + 1)
          }}
          className={`px-4 py-2 rounded-lg transition-colors font-medium ${
            octave >= 6 
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500'
          }`}
        >
          Oktav upp ▶
        </button>
      </div>

      {/* Keyboard */}
      <div className="relative select-none touch-none">
        {/* White keys */}
        <div className="flex">
          {WHITE_KEYS.map((key, index) => {
            const midiNote = baseMidi + key.offset
            const isActive = activeKeys.has(midiNote)
            
            return (
              <motion.button
                key={`white-${index}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleKeyDown(key.offset)
                }}
                onPointerUp={() => handleKeyUp(key.offset)}
                onPointerLeave={() => handleKeyUp(key.offset)}
                className={`
                  relative h-24 rounded-b-lg border border-gray-600
                  flex items-end justify-center pb-1
                  transition-colors
                  ${isActive 
                    ? 'bg-purple-400 border-purple-500' 
                    : 'bg-white hover:bg-gray-100'
                  }
                `}
                style={{ width: whiteKeyWidth }}
                animate={{
                  y: isActive ? 2 : 0,
                  boxShadow: isActive 
                    ? 'inset 0 -2px 5px rgba(0,0,0,0.2)' 
                    : '0 4px 6px rgba(0,0,0,0.3)',
                }}
                transition={{ duration: 0.05 }}
              >
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {key.note}
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* Black keys */}
        <div className="absolute top-0 left-0 flex pointer-events-none">
          {BLACK_KEYS.map((key) => {
            const midiNote = baseMidi + key.offset
            const isActive = activeKeys.has(midiNote)
            const leftPosition = key.position * whiteKeyWidth - blackKeyWidth / 2
            
            return (
              <motion.button
                key={`black-${key.note}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleKeyDown(key.offset)
                }}
                onPointerUp={() => handleKeyUp(key.offset)}
                onPointerLeave={() => handleKeyUp(key.offset)}
                className={`
                  absolute h-14 rounded-b-md
                  pointer-events-auto
                  transition-colors
                  ${isActive 
                    ? 'bg-purple-600' 
                    : 'bg-gray-900 hover:bg-gray-800'
                  }
                `}
                style={{ 
                  width: blackKeyWidth, 
                  left: leftPosition,
                }}
                animate={{
                  y: isActive ? 2 : 0,
                  boxShadow: isActive 
                    ? 'inset 0 -2px 5px rgba(0,0,0,0.4)' 
                    : '0 4px 6px rgba(0,0,0,0.5)',
                }}
                transition={{ duration: 0.05 }}
              />
            )
          })}
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-400 flex items-center gap-1"
        >
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Spelar in - tryck på tangenterna!
        </motion.div>
      )}
    </div>
  )
}
