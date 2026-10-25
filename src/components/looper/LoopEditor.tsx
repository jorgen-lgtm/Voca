'use client'

import { motion } from 'framer-motion'
import type { RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'

interface LoopEditorProps {
  loop: RecordedLoop
  isPlaying: boolean
  onVolumeChange: (volume: number) => void
  onTranspose: (semitones: number) => void
  onDelete: () => void
  onClose: () => void
}

export function LoopEditor({
  loop,
  isPlaying,
  onVolumeChange,
  onTranspose,
  onDelete,
  onClose,
}: LoopEditorProps) {
  const canEdit = !isPlaying

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-4 w-full max-w-xs shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getInstrumentConfig(loop.instrumentType).icon}</span>
          <div>
            <div className="font-medium text-white">{getInstrumentConfig(loop.instrumentType).name}</div>
            <div className="text-xs text-gray-400">{loop.notes.length} notes</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
        >
          ✕
        </button>
      </div>

      {!canEdit && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm text-center">
          ⏸️ Stop playback to edit
        </div>
      )}

      {/* Volume */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Volume</span>
          <span className="text-sm font-medium text-white">{Math.round((loop.volume ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={(loop.volume ?? 1) * 100}
          onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
          disabled={!canEdit}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
        />
        <div className="flex justify-between mt-2 gap-2">
          <button
            onClick={() => onVolumeChange(0)}
            disabled={!canEdit}
            className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            🔇 Mute
          </button>
          <button
            onClick={() => onVolumeChange(0.5)}
            disabled={!canEdit}
            className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            50%
          </button>
          <button
            onClick={() => onVolumeChange(1)}
            disabled={!canEdit}
            className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            100%
          </button>
        </div>
      </div>

      {/* Transpose (not for drums) */}
      {loop.instrumentType !== 'drums' && (
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Transpose</div>
          <div className="flex gap-2">
            <button
              onClick={() => onTranspose(-12)}
              disabled={!canEdit}
              className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="-1 octave"
            >
              ⬇️ Oct
            </button>
            <button
              onClick={() => onTranspose(-1)}
              disabled={!canEdit}
              className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="-1 semitone"
            >
              -1
            </button>
            <button
              onClick={() => onTranspose(1)}
              disabled={!canEdit}
              className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="+1 semitone"
            >
              +1
            </button>
            <button
              onClick={() => onTranspose(12)}
              disabled={!canEdit}
              className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="+1 octave"
            >
              ⬆️ Oct
            </button>
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={!canEdit}
        className="w-full py-2.5 text-sm bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors text-white disabled:opacity-50"
      >
        🗑️ Delete track
      </button>
    </motion.div>
  )
}
