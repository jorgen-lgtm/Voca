'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { InstrumentType } from '@/types/database'
import { INSTRUMENTS, getInstrumentConfig } from '@/config/instruments'

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType
  onSelect: (instrument: InstrumentType) => void
  onCycle: (direction: 'next' | 'prev') => void
  loadingInstruments?: Set<InstrumentType>
}

export function InstrumentSelector({
  currentInstrument,
  onSelect,
  onCycle,
  loadingInstruments = new Set(),
}: InstrumentSelectorProps) {
  const [showAll, setShowAll] = useState(false)
  const current = getInstrumentConfig(currentInstrument)
  const isLoading = loadingInstruments.has(currentInstrument)

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

        <motion.button
          key={currentInstrument}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors cursor-pointer"
        >
          <motion.span
            className="text-3xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3 }}
          >
            {current.icon}
          </motion.span>
          <div className="text-left">
            <div className="font-medium text-white flex items-center gap-2">
              {current.name}
              {isLoading && (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="text-xs"
                >
                  ⏳
                </motion.span>
              )}
            </div>
            <div className="text-xs text-gray-400">{current.description}</div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: current.color }}
            />
            <motion.svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: showAll ? 180 : 0 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </motion.button>

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

      {/* Instrument dots */}
      <div className="flex gap-1.5 mt-2">
        {INSTRUMENTS.map((instrument) => {
          const isActive = instrument.type === currentInstrument
          const loading = loadingInstruments.has(instrument.type)
          
          return (
            <motion.button
              key={instrument.type}
              onClick={() => onSelect(instrument.type)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isActive ? 'scale-125' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              style={{
                backgroundColor: isActive ? instrument.color : undefined,
              }}
              title={instrument.name}
            >
              {loading && (
                <motion.div
                  className="w-full h-full rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ backgroundColor: instrument.color }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Expanded instrument grid */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden w-full max-w-md"
          >
            <div className="grid grid-cols-4 gap-2 p-4 bg-gray-800/80 rounded-2xl border border-gray-700/50 mt-2">
              {INSTRUMENTS.map((instrument) => {
                const isActive = instrument.type === currentInstrument
                const loading = loadingInstruments.has(instrument.type)
                
                return (
                  <motion.button
                    key={instrument.type}
                    onClick={() => {
                      onSelect(instrument.type)
                      setShowAll(false)
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-gray-700/80 to-gray-800/80 border-2'
                        : 'bg-gray-700/40 hover:bg-gray-700/60 border border-transparent'
                    }`}
                    style={{
                      borderColor: isActive ? instrument.color : 'transparent',
                    }}
                  >
                    <span className="text-2xl mb-1 relative">
                      {instrument.icon}
                      {loading && (
                        <motion.span
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                      )}
                    </span>
                    <span className={`text-xs ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>
                      {instrument.name}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full mt-1"
                      style={{ backgroundColor: instrument.color, opacity: isActive ? 1 : 0.4 }}
                    />
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
