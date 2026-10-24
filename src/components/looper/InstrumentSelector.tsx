'use client'

import { motion } from 'framer-motion'
import type { InstrumentType } from '@/types/database'

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType
  onSelect: (instrument: InstrumentType) => void
  onCycle: (direction: 'next' | 'prev') => void
}

const INSTRUMENTS: { type: InstrumentType; icon: string; label: string; color: string }[] = [
  { type: 'drums', icon: '🥁', label: 'Drums', color: '#ef4444' },
  { type: 'bass', icon: '🎸', label: 'Bass', color: '#f97316' },
  { type: 'synth', icon: '🎹', label: 'Synth', color: '#8b5cf6' },
  { type: 'piano', icon: '🎼', label: 'Piano', color: '#3b82f6' },
  { type: 'pad', icon: '🌊', label: 'Pad', color: '#10b981' },
  { type: 'lead', icon: '🎺', label: 'Lead', color: '#ec4899' },
]

export function InstrumentSelector({
  currentInstrument,
  onSelect,
  onCycle,
}: InstrumentSelectorProps) {
  const currentIndex = INSTRUMENTS.findIndex((i) => i.type === currentInstrument)
  const current = INSTRUMENTS[currentIndex]

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      <div className="flex items-center gap-4">
        <motion.button
          onClick={() => onCycle('prev')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        <motion.div
          key={currentInstrument}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-800/60 border border-gray-700/50"
        >
          <motion.span
            className="text-3xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3 }}
          >
            {current.icon}
          </motion.span>
          <div className="text-left">
            <div className="font-medium text-white">{current.label}</div>
            <div className="text-xs text-gray-400">Swipe to change</div>
          </div>
          <div
            className="w-3 h-3 rounded-full ml-2"
            style={{ backgroundColor: current.color }}
          />
        </motion.div>

        <motion.button
          onClick={() => onCycle('next')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      <div className="flex gap-1.5 mt-2">
        {INSTRUMENTS.map((instrument, index) => (
          <motion.button
            key={instrument.type}
            onClick={() => onSelect(instrument.type)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              index === currentIndex
                ? 'scale-125'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            style={{
              backgroundColor: index === currentIndex ? instrument.color : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}
