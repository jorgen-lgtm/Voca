'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RecordButton } from './RecordButton'
import { LoopRing } from './LoopRing'
import { InstrumentSelector } from './InstrumentSelector'
import { TransportControls } from './TransportControls'
import { PitchDisplay } from './PitchDisplay'
import { ExportModal } from './ExportModal'
import { useAudioEngine } from '@/hooks/useAudioEngine'
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
          Loop Station
        </motion.div>

        {loops.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearAllLoops}
            className="px-3 py-1.5 text-sm bg-gray-800/80 rounded-full text-gray-300 hover:bg-gray-700/80 transition-colors"
          >
            Clear All
          </motion.button>
        )}
      </div>

      <PitchDisplay pitch={currentPitch} isRecording={state.isRecording} />

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
          <>
            <span className="text-green-500">●</span> Audio ready •{' '}
            {loops.length} loops recorded
          </>
        ) : (
          'Tap the button to enable audio'
        )}
      </motion.div>
    </div>
  )
}
