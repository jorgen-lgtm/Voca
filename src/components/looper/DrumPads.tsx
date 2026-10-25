'use client'

import { motion } from 'framer-motion'

interface DrumPadsProps {
  isRecording: boolean
  lastDrumType: 'kick' | 'snare' | 'hihat' | null
  onDrumHit: (drumType: 'kick' | 'snare' | 'hihat') => void
}

const DRUMS = [
  { type: 'kick' as const, emoji: '🦶', label: 'KICK', color: 'from-red-600 to-red-800', activeColor: 'from-red-400 to-red-600' },
  { type: 'snare' as const, emoji: '👏', label: 'SNARE', color: 'from-amber-600 to-amber-800', activeColor: 'from-amber-400 to-amber-600' },
  { type: 'hihat' as const, emoji: '🔔', label: 'HI-HAT', color: 'from-cyan-600 to-cyan-800', activeColor: 'from-cyan-400 to-cyan-600' },
]

export function DrumPads({ isRecording, lastDrumType, onDrumHit }: DrumPadsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-gray-400 mb-2">
        {isRecording ? '🔴 Tap the drums!' : 'Start recording first'}
      </div>
      
      <div className="flex gap-4">
        {DRUMS.map((drum) => {
          const isActive = lastDrumType === drum.type
          
          return (
            <motion.button
              key={drum.type}
              onPointerDown={(e) => {
                e.preventDefault()
                if (isRecording) {
                  onDrumHit(drum.type)
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault()
                if (isRecording) {
                  onDrumHit(drum.type)
                }
              }}
              disabled={!isRecording}
              className={`
                relative w-24 h-24 rounded-2xl
                bg-gradient-to-br ${isActive ? drum.activeColor : drum.color}
                flex flex-col items-center justify-center
                shadow-lg transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-none select-none
              `}
              whileTap={{ scale: 0.9 }}
              animate={{
                scale: isActive ? 1.1 : 1,
                boxShadow: isActive 
                  ? '0 0 30px rgba(255,255,255,0.3)' 
                  : '0 10px 30px rgba(0,0,0,0.3)',
              }}
              transition={{ duration: 0.1 }}
            >
              <span className="text-3xl">{drum.emoji}</span>
              <span className="text-xs font-bold mt-1 text-white/90">{drum.label}</span>
              
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border-4 border-white/50"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
      
      <div className="text-xs text-gray-500 text-center max-w-xs">
        Tap the pads in time with the metronome to record drums
      </div>
    </div>
  )
}
