'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exportLoopsToMidi, downloadMidiFile, exportLoopsToJson, downloadJsonFile } from '@/lib/midi-export'
import type { RecordedLoop } from '@/types/audio'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  loops: RecordedLoop[]
  tempo: number
  isPro: boolean
}

export function ExportModal({ isOpen, onClose, loops, tempo, isPro }: ExportModalProps) {
  const [exporting, setExporting] = useState(false)

  const handleExportMidi = async () => {
    if (!isPro) return

    setExporting(true)
    try {
      const midiData = exportLoopsToMidi(loops, tempo)
      downloadMidiFile(midiData, `loop-station-${Date.now()}.mid`)
    } catch (error) {
      console.error('Export failed:', error)
    }
    setExporting(false)
    onClose()
  }

  const handleExportJson = () => {
    setExporting(true)
    try {
      const json = exportLoopsToJson(loops, tempo)
      downloadJsonFile(json, `loop-station-${Date.now()}.json`)
    } catch (error) {
      console.error('Export failed:', error)
    }
    setExporting(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Export Project</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <motion.button
                  onClick={handleExportMidi}
                  disabled={!isPro || exporting}
                  whileHover={{ scale: isPro ? 1.02 : 1 }}
                  whileTap={{ scale: isPro ? 0.98 : 1 }}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    isPro
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50 hover:border-purple-400'
                      : 'bg-gray-700/30 border-gray-600/30 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isPro ? 'bg-purple-500/20' : 'bg-gray-600/20'
                      }`}>
                        <svg className={`w-5 h-5 ${isPro ? 'text-purple-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div>
                        <div className={`font-medium ${isPro ? 'text-white' : 'text-gray-400'}`}>
                          Export as MIDI
                        </div>
                        <div className="text-sm text-gray-500">
                          Standard MIDI file (.mid)
                        </div>
                      </div>
                    </div>
                    {!isPro && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                        PRO
                      </span>
                    )}
                  </div>
                </motion.button>

                <motion.button
                  onClick={handleExportJson}
                  disabled={exporting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 rounded-xl bg-gray-700/30 border border-gray-600/50 hover:border-gray-500 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-600/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        Export as JSON
                      </div>
                      <div className="text-sm text-gray-500">
                        Project data file (.json)
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              {!isPro && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <div className="font-medium text-white mb-1">
                        Unlock MIDI Export
                      </div>
                      <div className="text-sm text-gray-400 mb-3">
                        Upgrade to Pro to export your loops as standard MIDI files compatible with any DAW.
                      </div>
                      <button className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                        Learn more →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
