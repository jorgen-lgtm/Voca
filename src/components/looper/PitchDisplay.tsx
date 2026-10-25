'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PitchDetectionResult } from '@/types/audio'

interface PitchDisplayProps {
  pitch: PitchDetectionResult | null
  isRecording: boolean
}

export function PitchDisplay({ pitch, isRecording }: PitchDisplayProps) {
  if (!isRecording) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-20 left-0 right-0 flex justify-center"
    >
      <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-gray-800/80 backdrop-blur-sm border border-gray-700/50">
        <AnimatePresence mode="wait">
          {pitch?.noteName ? (
            <motion.div
              key={pitch.noteName}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-4"
            >
              <motion.span
                className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.3,
                }}
              >
                {pitch.noteName}
              </motion.span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pitch.clarity * 100, 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round(pitch.frequency!)} Hz
                </div>
              </div>
            </motion.div>
          ) : pitch?.frequency ? (
            <motion.div
              key="detecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-gray-400"
            >
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-500/50 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((pitch.clarity || 0) * 100, 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-sm">Hold steady...</span>
            </motion.div>
          ) : (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-gray-400"
            >
              <motion.div
                className="flex gap-1"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
                <span className="w-1.5 h-6 bg-pink-500 rounded-full" />
                <span className="w-1.5 h-3 bg-purple-500 rounded-full" />
              </motion.div>
              <span className="text-sm">Sing or hum...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
