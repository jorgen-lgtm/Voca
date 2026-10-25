'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RecordButton } from './RecordButton'
import { LoopRing } from './LoopRing'
import { InstrumentSelector } from './InstrumentSelector'
import { TransportControls } from './TransportControls'
import { PitchDisplay } from './PitchDisplay'
import { ExportModal } from './ExportModal'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import type { InstrumentType } from '@/types/database'
import type { RecordedLoop } from '@/types/audio'

interface LooperCanvasProps {
  onSave?: (loops: RecordedLoop[], tempo: number) => void
  isPro?: boolean
  initialLoops?: RecordedLoop[]
  initialTempo?: number
}

export function LooperCanvas({ onSave, isPro = false, initialLoops, initialTempo = 120 }: LooperCanvasProps) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  
  const { isLoading: aiLoading, suggestMelody, smoothMelody, quantizeNotes } = useAIAssistant()
  
  const {
    state,
    currentPitch,
    loops,
    currentInstrument,
    initializeAudio,
    startRecording,
    stopRecording,
    togglePlayback,
    deleteLoop,
    clearAllLoops,
    setTempo,
    cycleInstrument,
    setCurrentInstrument,
    toggleMetronome,
  } = useAudioEngine({ tempo: initialTempo, loopBars: 4, initialLoops })

  const handleSave = () => {
    if (onSave && loops.length > 0) {
      onSave(loops, state.tempo)
    }
  }

  const handleExport = () => {
    if (loops.length > 0) {
      setShowExportModal(true)
    }
  }

  const handleSwipeInstrument = (loopId: string, direction: 'left' | 'right') => {
    const instruments: InstrumentType[] = ['drums', 'bass', 'synth', 'piano', 'pad', 'lead']
    const loop = loops.find((l) => l.id === loopId)
    if (!loop) return

    const currentIndex = instruments.indexOf(loop.instrumentType)
    let newIndex: number

    if (direction === 'right') {
      newIndex = (currentIndex + 1) % instruments.length
    } else {
      newIndex = (currentIndex - 1 + instruments.length) % instruments.length
    }

    console.log(`Change instrument for loop ${loopId} to ${instruments[newIndex]}`)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4">
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          HumWeave
        </motion.div>

        <div className="flex items-center gap-2">
          {loops.length > 0 && (
            <>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5 ${
                  showAIPanel 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={clearAllLoops}
                className="px-3 py-1.5 text-sm bg-gray-800/80 rounded-full text-gray-300 hover:bg-gray-700/80 transition-colors"
              >
                Clear All
              </motion.button>
            </>
          )}
        </div>
      </div>

      <PitchDisplay pitch={currentPitch} isRecording={state.isRecording} />

      <AnimatePresence>
        {showAIPanel && loops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-4 right-4 z-20 flex justify-center"
          >
            <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-4 max-w-sm w-full">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium text-white">AI Assistent</span>
              </div>
              
              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={aiLoading}
                  onClick={async () => {
                    const allNotes = loops.flatMap(l => l.notes)
                    const result = await suggestMelody(allNotes, state.tempo)
                    if (result) {
                      setAiSuggestion(result.description)
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-left hover:border-purple-400/50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-white text-sm">Föreslå melodi</div>
                  <div className="text-xs text-gray-400">AI föreslår nästa noter</div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAiSuggestion('Melodin har jämnats ut!')
                  }}
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600/30 text-left hover:border-gray-500/50 transition-colors"
                >
                  <div className="font-medium text-white text-sm">Jämna ut melodi</div>
                  <div className="text-xs text-gray-400">Slå ihop korta noter</div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAiSuggestion('Noter kvantiserade till takt!')
                  }}
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600/30 text-left hover:border-gray-500/50 transition-colors"
                >
                  <div className="font-medium text-white text-sm">Kvantisera</div>
                  <div className="text-xs text-gray-400">Snäpp noter till takten</div>
                </motion.button>
              </div>

              {aiSuggestion && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 p-2 rounded-lg bg-green-500/20 border border-green-500/30 text-sm text-green-300"
                >
                  {aiSuggestion}
                </motion.div>
              )}

              {aiLoading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-purple-400 text-sm">
                  <motion.div
                    className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  AI tänker...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-center my-8">
        <motion.div
          className="absolute rounded-full border border-gray-700/30"
          style={{ width: 320, height: 320 }}
          animate={{
            borderColor: state.isRecording
              ? ['rgba(239,68,68,0.3)', 'rgba(239,68,68,0.6)', 'rgba(239,68,68,0.3)']
              : 'rgba(55,65,81,0.3)',
          }}
          transition={{
            duration: 1,
            repeat: state.isRecording ? Infinity : 0,
          }}
        />

        {loops.map((loop, index) => (
          <LoopRing
            key={loop.id}
            loop={loop}
            index={index}
            isPlaying={state.isPlaying}
            tempo={state.tempo}
            onSwipeLeft={() => handleSwipeInstrument(loop.id, 'left')}
            onSwipeRight={() => handleSwipeInstrument(loop.id, 'right')}
            onDelete={() => deleteLoop(loop.id)}
          />
        ))}

        <RecordButton
          isRecording={state.isRecording}
          isInitialized={state.isInitialized}
          onPress={startRecording}
          onRelease={stopRecording}
          onInitialize={initializeAudio}
        />
      </div>

      <InstrumentSelector
        currentInstrument={currentInstrument}
        onSelect={setCurrentInstrument}
        onCycle={cycleInstrument}
      />

      <div className="flex items-center gap-3 mb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMetronome}
          disabled={!state.isInitialized}
          className={`p-3 rounded-full transition-all ${
            state.metronomeEnabled
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
              : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Metronom"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </motion.button>
        {state.metronomeEnabled && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-amber-400"
          >
            {state.tempo} BPM
          </motion.span>
        )}
      </div>

      <TransportControls
        isPlaying={state.isPlaying}
        tempo={state.tempo}
        hasLoops={loops.length > 0}
        onTogglePlay={togglePlayback}
        onTempoChange={setTempo}
        onSave={handleSave}
        onExport={handleExport}
        isPro={isPro}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        loops={loops}
        tempo={state.tempo}
        isPro={isPro}
      />

      <motion.div
        className="absolute bottom-4 text-center text-xs text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {state.isInitialized ? (
          state.isRecording ? (
            <>
              <span className="text-red-500">●</span> Recording...
              {state.metronomeEnabled && ' • 🎧 Använd hörlurar'}
            </>
          ) : (
            <>
              <span className="text-green-500">●</span> Audio ready •{' '}
              {loops.length} {loops.length === 1 ? 'loop' : 'loops'}
              {state.metronomeEnabled && ' • 🎧 Hörlurar rekommenderas'}
            </>
          )
        ) : (
          'Tap the button to enable audio'
        )}
      </motion.div>
    </div>
  )
}
