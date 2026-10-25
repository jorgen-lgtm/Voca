'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PitchDetectionResult } from '@/types/audio'

interface PitchDisplayProps {
  pitch: PitchDetectionResult | null
  audioLevel?: number
  isRecording: boolean
  isDrumMode?: boolean
  isVoiceMode?: boolean
  lastDrumType?: 'kick' | 'snare' | 'hihat' | null
}

const DRUM_INFO = {
  kick: { emoji: '🦶', name: 'KICK', color: 'from-red-500 to-orange-500', hint: 'Säg "BUM"' },
  snare: { emoji: '👏', name: 'SNARE', color: 'from-yellow-500 to-amber-500', hint: 'Säg "TSH"' },
  hihat: { emoji: '🔔', name: 'HI-HAT', color: 'from-cyan-500 to-blue-500', hint: 'Säg "TSS"' },
}

export function PitchDisplay({ pitch, audioLevel = 0, isRecording, isDrumMode, isVoiceMode, lastDrumType }: PitchDisplayProps) {
  if (!isRecording) return null

  // Voice/Speech mode UI
  if (isVoiceMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-20 left-0 right-0 flex justify-center"
      >
        <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-gray-800/80 backdrop-blur-sm border border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="text-2xl">🗣️</span>
            <span className="font-medium">Tal-läge</span>
          </div>
          
          {/* Audio level visualization */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-10">
              {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((threshold, i) => (
                <motion.div
                  key={i}
                  className={`w-2 rounded-sm ${
                    audioLevel >= threshold 
                      ? 'bg-cyan-400' 
                      : 'bg-gray-600'
                  }`}
                  style={{ height: `${(i + 1) * 4}px` }}
                  animate={{ 
                    opacity: audioLevel >= threshold ? 1 : 0.3,
                  }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>
            
            {pitch?.noteName ? (
              <motion.span
                key={pitch.noteName}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-cyan-300 ml-3"
              >
                {pitch.noteName}
              </motion.span>
            ) : (
              <span className="text-gray-400 ml-3">...</span>
            )}
          </div>
          
          <div className="text-xs text-gray-400 text-center max-w-xs">
            Prata och variera rösten - melodin följer din intonation!
            <br />
            <span className="text-cyan-400/70">↗️ Röst upp = ton upp • ↘️ Röst ner = ton ner</span>
          </div>
        </div>
      </motion.div>
    )
  }

  if (isDrumMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-20 left-0 right-0 flex justify-center"
      >
        <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-gray-800/80 backdrop-blur-sm border border-gray-700/50">
          <div className="flex items-center gap-6">
            {(['kick', 'snare', 'hihat'] as const).map((drum) => {
              const info = DRUM_INFO[drum]
              const isActive = lastDrumType === drum
              return (
                <motion.div
                  key={drum}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                    isActive 
                      ? `bg-gradient-to-br ${info.color} shadow-lg` 
                      : 'bg-gray-700/50'
                  }`}
                  animate={{
                    scale: isActive ? 1.2 : 1,
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <span className="text-2xl">{info.emoji}</span>
                  <span className={`text-xs font-bold mt-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {info.name}
                  </span>
                </motion.div>
              )
            })}
          </div>
          
          <div className="flex gap-4 text-xs text-gray-500">
            <span>🦶 Lågt ljud</span>
            <span>👏 Klapp</span>
            <span>🔔 Väsljud</span>
          </div>
        </div>
      </motion.div>
    )
  }

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
          ) : (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-3">
                {/* Audio level meter */}
                <div className="flex items-end gap-0.5 h-8">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                    <motion.div
                      key={i}
                      className={`w-1.5 rounded-full ${
                        audioLevel >= threshold 
                          ? i < 2 ? 'bg-green-500' : i < 4 ? 'bg-yellow-500' : 'bg-red-500'
                          : 'bg-gray-600'
                      }`}
                      style={{ height: `${(i + 1) * 6}px` }}
                      animate={{ 
                        opacity: audioLevel >= threshold ? 1 : 0.3,
                        scaleY: audioLevel >= threshold ? [1, 1.1, 1] : 1
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-400">
                  {audioLevel > 0.1 ? 'Lyssnar...' : 'Nynna eller sjung'}
                </span>
              </div>
              {audioLevel < 0.05 && (
                <span className="text-xs text-amber-400">
                  🎤 Inget ljud - kontrollera mikrofonen
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
