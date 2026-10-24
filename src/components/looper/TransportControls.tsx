'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface TransportControlsProps {
  isPlaying: boolean
  tempo: number
  hasLoops: boolean
  onTogglePlay: () => void
  onTempoChange: (tempo: number) => void
  onSave?: () => void
  isPro?: boolean
}

export function TransportControls({
  isPlaying,
  tempo,
  hasLoops,
  onTogglePlay,
  onTempoChange,
  onSave,
  isPro = false,
}: TransportControlsProps) {
  const [showTempoSlider, setShowTempoSlider] = useState(false)

  return (
    <div className="flex flex-col items-center gap-4 mt-6 w-full max-w-sm">
      <div className="flex items-center justify-center gap-4 w-full">
        <motion.button
          onClick={() => setShowTempoSlider(!showTempoSlider)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-mono text-sm">{tempo} BPM</span>
        </motion.button>

        <motion.button
          onClick={onTogglePlay}
          disabled={!hasLoops}
          whileHover={{ scale: hasLoops ? 1.05 : 1 }}
          whileTap={{ scale: hasLoops ? 0.95 : 1 }}
          className={`flex items-center justify-center w-14 h-14 rounded-full ${
            hasLoops
              ? isPlaying
                ? 'bg-gradient-to-br from-orange-500 to-red-500'
                : 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gray-700/50 cursor-not-allowed'
          } transition-all`}
        >
          {isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>

        <motion.button
          onClick={onSave}
          disabled={!hasLoops}
          whileHover={{ scale: hasLoops ? 1.05 : 1 }}
          whileTap={{ scale: hasLoops ? 0.95 : 1 }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
            hasLoops
              ? isPro
                ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 border-purple-500/50 text-white'
                : 'bg-gray-800/60 border-gray-700/50 text-gray-300 hover:text-white'
              : 'bg-gray-800/30 border-gray-700/30 text-gray-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm">Export</span>
          {!isPro && hasLoops && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
              PRO
            </span>
          )}
        </motion.button>
      </div>

      {showTempoSlider && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="w-full px-4"
        >
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/60 border border-gray-700/50">
            <span className="text-xs text-gray-400 w-8">40</span>
            <input
              type="range"
              min={40}
              max={240}
              value={tempo}
              onChange={(e) => onTempoChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs text-gray-400 w-8">240</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
