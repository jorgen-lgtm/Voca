'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { RecordButton } from './RecordButton'
import { LoopRing } from './LoopRing'
import { LoopEditor } from './LoopEditor'
import { InstrumentSelector } from './InstrumentSelector'
import { TransportControls } from './TransportControls'
import { ResponsiveLoopStage } from './ResponsiveLoopStage'
import { PitchDisplay } from './PitchDisplay'
import { DrumPads } from './DrumPads'
import { MiniKeyboard } from './MiniKeyboard'
import { ExportModal } from './ExportModal'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { getMaxLoops, FREE_LIMITS } from '@/config/limits'
import { PRODUCER_PERSONA, getProducerTip, assessQuality } from '@/config/producer'
import { getSuggestions, createLoopFromSuggestion, getMelodyDevelopments, createLoopFromMelodyDevelopment } from '@/lib/musicGenerator'
import type { RecordedLoop } from '@/types/audio'

interface LooperCanvasProps {
  onSave?: (loops: RecordedLoop[], tempo: number) => void
  isPro?: boolean
  initialLoops?: RecordedLoop[]
  initialTempo?: number
}

export function LooperCanvas({ onSave, isPro = false, initialLoops, initialTempo = 120 }: LooperCanvasProps) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  
  const { isLoading: aiLoading, enhanceAllLoops, quantizeNotes } = useAIAssistant()
  
  const {
    state,
    currentPitch,
    audioLevel,
    audioError,
    lastDrumType,
    loops,
    currentInstrument,
    loadingInstruments,
    masterLoopDuration,
    loopProgress,
    initializeAudio,
    initializeOutput,
    startRecording,
    stopRecording,
    togglePlayback,
    deleteLoop,
    clearAllLoops,
    setTempo,
    cycleInstrument,
    setCurrentInstrument,
    toggleMetronome,
    toggleMetronomeAudio,
    setLoopVolume,
    transposeLoop,
    updateLoops,
    recordDrumHit,
    recordKeyboardNote,
    triggerNote,
    toggleMic,
    micEnabled,
  } = useAudioEngine({ tempo: initialTempo, loopBars: 4, initialLoops })

  const selectedLoop = loops.find(l => l.id === selectedLoopId)
  const maxLoops = getMaxLoops(isPro)
  const canAddMoreLoops = loops.length < maxLoops
  const loopsAtLimit = loops.length >= maxLoops

  const handleSave = () => {
    if (onSave && (loops.length > 0 || initialLoops !== undefined)) {
      onSave(loops, state.tempo)
    }
  }

  const handleExport = () => {
    if (loops.length > 0) {
      setShowExportModal(true)
    }
  }

  const handleEnhanceAll = () => {
    if (loops.length === 0) return
    const enhanced = enhanceAllLoops(loops, state.tempo, {
      quantize: true,
      quantizeGrid: 0.25,
      smooth: true,
      snapToScale: true,
      scale: 'major',
    })
    updateLoops(enhanced)
    // Check if any loops were drums for specific feedback
    const hasDrums = loops.some(l => l.instrumentType === 'drums')
    const tip = hasDrums && loops.length === 1 
      ? getProducerTip('drums') 
      : getProducerTip('enhance')
    setAiMessage(tip)
    setTimeout(() => setAiMessage(null), 4000)
  }

  const handleQuantize = () => {
    if (loops.length === 0) return
    const quantized = loops.map(loop => ({
      ...loop,
      notes: quantizeNotes(loop.notes, state.tempo, 0.25)
    }))
    updateLoops(quantized)
    setAiMessage(getProducerTip('quantize'))
    setTimeout(() => setAiMessage(null), 4000)
  }

  // Get music suggestions from AI producer
  const suggestions = getSuggestions(loops.map(l => l.instrumentType))
  
  // Find user's melody loop (first non-drum melodic track)
  const userMelodyLoop = loops.find(l => 
    l.instrumentType !== 'drums' && l.notes.length > 3
  )
  
  // Get melody development options if user has a melody
  const melodyDevelopments = userMelodyLoop ? getMelodyDevelopments(userMelodyLoop) : []
  
  // Handle adding a suggested track
  const handleAddSuggestion = (suggestionIndex: number) => {
    const suggestion = suggestions[suggestionIndex]
    if (!suggestion) return
    
    // Use master loop duration if available, otherwise default to 4 bars
    const duration = masterLoopDuration || (60 / state.tempo) * 4 * 2
    const newLoop = createLoopFromSuggestion(suggestion, duration, state.tempo)
    
    updateLoops([...loops, newLoop])
    setAiMessage(`🎹 Lade till ${suggestion.name}! Lyssna och se om du gillar det.`)
    setTimeout(() => setAiMessage(null), 4000)
  }
  
  // Handle adding a melody development (bass/drums/harmony based on user's melody)
  const handleAddMelodyDevelopment = (devIndex: number) => {
    if (!userMelodyLoop) return
    const development = melodyDevelopments[devIndex]
    if (!development) return
    
    const newLoop = createLoopFromMelodyDevelopment(development, userMelodyLoop, state.tempo)
    
    updateLoops([...loops, newLoop])
    setAiMessage(`🎵 ${development.name} tillagd! Baserat på din melodi.`)
    setTimeout(() => setAiMessage(null), 4000)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4">
      {audioError && <p role="alert" className="relative z-30 mt-16 mb-3 rounded-lg bg-red-950 p-3 text-sm text-red-100">{audioError}</p>}
      {/* Header - Left side */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            HumWeave
          </span>
          <Link
            href="/help"
            className="hidden sm:block text-xs px-2 py-1 bg-gray-800/60 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          >
            Help
          </Link>
        </motion.div>
      </div>

      {/* Header - Center controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {/* Mic Toggle */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={toggleMic}
          className={`p-2.5 rounded-full transition-colors ${
            micEnabled 
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' 
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
          title={micEnabled ? 'Microphone ON' : 'Microphone OFF'}
        >
          {micEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </motion.button>

        {loops.length > 0 && (
          <>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowAIPanel(!showAIPanel)}
              aria-label="AI"
              className={`min-h-11 min-w-11 p-2.5 sm:px-3 sm:py-1.5 text-sm rounded-full transition-colors flex items-center justify-center gap-1.5 ${
                showAIPanel 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">AI</span>
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearAllLoops}
              className="p-2.5 sm:px-3 sm:py-1.5 text-sm bg-gray-800 rounded-full text-gray-300 hover:bg-gray-700 transition-colors border border-gray-700"
            >
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Clear</span>
            </motion.button>
          </>
        )}
      </div>

      {/* Pitch Display - only show when mic is enabled */}
      {micEnabled && (
        <PitchDisplay 
          pitch={currentPitch} 
          audioLevel={audioLevel}
          isRecording={state.isRecording} 
          isDrumMode={currentInstrument === 'drums'}
          isVoiceMode={currentInstrument === 'voice'}
          lastDrumType={lastDrumType}
        />
      )}

      {/* AI Producer Panel */}
      <AnimatePresence>
        {showAIPanel && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-4 right-4 z-20 flex justify-center"
          >
            <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-4 max-w-sm w-full">
              {/* Producer Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
                    🎧
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{PRODUCER_PERSONA.name}</div>
                    <div className="text-xs text-purple-400">{PRODUCER_PERSONA.title}</div>
                  </div>
                </div>
                <button onClick={() => setShowAIPanel(false)} className="text-gray-400 hover:text-white p-1">✕</button>
              </div>

              {/* Producer Message */}
              <div className="mb-3 p-3 rounded-xl bg-gray-900/50 border border-gray-700/50">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {loops.length === 0 
                    ? getProducerTip('empty')
                    : userMelodyLoop
                      ? `🎵 Fin melodi! Vill du att jag bygger vidare på den?`
                      : `Spela in en melodi så hjälper jag dig utveckla den med bas, trummor och harmonier.`
                  }
                </p>
              </div>

              {/* Melody Development Suggestions - when user has a melody */}
              {userMelodyLoop && melodyDevelopments.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-purple-400 mb-2 font-medium">🎹 Utveckla din melodi:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {melodyDevelopments.map((dev, index) => (
                      <motion.button
                        key={dev.type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAddMelodyDevelopment(index)}
                        disabled={state.isPlaying}
                        className="p-2 rounded-lg bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 text-left hover:border-green-400/50 transition-colors disabled:opacity-50"
                      >
                        <div className="font-medium text-white text-xs">{dev.name}</div>
                        <div className="text-[10px] text-gray-400 line-clamp-1">{dev.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Add Suggestions - when no melody yet */}
              {!userMelodyLoop && suggestions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-purple-400 mb-2 font-medium">🎵 Eller låt mig skapa något:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.slice(0, 2).map((sug, index) => (
                      <motion.button
                        key={sug.type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAddSuggestion(index)}
                        disabled={state.isPlaying}
                        className="p-2 rounded-lg bg-gray-700/50 border border-gray-600/30 text-left hover:border-gray-500/50 transition-colors disabled:opacity-50"
                      >
                        <div className="font-medium text-white text-xs">{sug.name}</div>
                        <div className="text-[10px] text-gray-400 line-clamp-1">{sug.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Assessment */}
              {loops.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-xs text-gray-500">Kvalitet:</div>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${assessQuality(loops).score}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">
                    {assessQuality(loops).score}%
                  </span>
                </div>
              )}
              
              {/* Enhancement Actions */}
              {loops.length > 0 && (
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={aiLoading || state.isPlaying}
                    onClick={handleEnhanceAll}
                    className="flex-1 p-2 rounded-lg bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 text-center hover:border-purple-400/60 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-white text-xs">🎚️ Polera</div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={aiLoading || state.isPlaying}
                    onClick={handleQuantize}
                    className="flex-1 p-2 rounded-lg bg-gray-700/50 border border-gray-600/30 text-center hover:border-gray-500/50 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-white text-xs">⏱️ Timing</div>
                  </motion.button>
                </div>
              )}

              {state.isPlaying && loops.length > 0 && (
                <div className="mt-3 text-amber-400 text-xs text-center">
                  ⏸️ Stoppa uppspelningen först
                </div>
              )}

              {aiMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-sm text-green-300"
                >
                  {aiMessage}
                </motion.div>
              )}

              {/* Producer tip */}
              {!aiMessage && loops.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 text-xs text-gray-500 text-center"
                >
                  {getProducerTip('suggestion')}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loop Rings */}
      {(() => {
        // Calculate container size based on number of loops
        // Each loop ring has baseRadius = 100 + index * 35
        const maxLoopIndex = Math.max(0, loops.length - 1)
        const maxRingRadius = 100 + maxLoopIndex * 35
        const strokeWidth = 8
        const containerSize = Math.max(320, (maxRingRadius + strokeWidth) * 2 + 20)
        
        return (
          <ResponsiveLoopStage size={containerSize}>
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
                isSelected={selectedLoopId === loop.id}
                onSelect={() => setSelectedLoopId(selectedLoopId === loop.id ? null : loop.id)}
                onDelete={() => deleteLoop(loop.id)}
              />
            ))}

            {/* Loop progress ring - shows when recording to existing loop length */}
            {state.isRecording && masterLoopDuration && (
              <svg
                className="absolute w-36 h-36 -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.3)"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${loopProgress * 289} 289`}
                  className="transition-all duration-100"
                />
              </svg>
            )}

            <RecordButton
              isRecording={state.isRecording}
              isInitialized={state.isInitialized}
              onPress={canAddMoreLoops ? startRecording : undefined}
              onRelease={stopRecording}
              onInitialize={() => micEnabled || currentInstrument === 'memo' ? initializeAudio() : initializeOutput()}
              disabled={loopsAtLimit && state.isInitialized}
            />
          </ResponsiveLoopStage>
        )
      })()}

      {/* Master loop indicator */}
      {masterLoopDuration && !state.isRecording && (
        <div className="text-center text-sm text-purple-400 mb-2 relative z-10">
          Loop length: {masterLoopDuration.toFixed(1)}s
          <span className="text-gray-500 ml-2">
            (set by first track)
          </span>
        </div>
      )}

      {/* Loop Editor Panel */}
      <AnimatePresence>
        {selectedLoop && (
          <div className="mb-4 relative z-10">
            <LoopEditor
              loop={selectedLoop}
              isPlaying={state.isPlaying}
              onVolumeChange={(volume) => setLoopVolume(selectedLoop.id, volume)}
              onTranspose={(semitones) => transposeLoop(selectedLoop.id, semitones)}
              onDelete={() => {
                deleteLoop(selectedLoop.id)
                setSelectedLoopId(null)
              }}
              onClose={() => setSelectedLoopId(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Drum Pads */}
      {currentInstrument === 'drums' && !selectedLoop && (
        <div className="mb-6 relative z-10">
          <DrumPads
            isRecording={state.isRecording}
            lastDrumType={lastDrumType}
            onDrumHit={recordDrumHit}
          />
        </div>
      )}

      {/* Mini Keyboard for melodic instruments */}
      {currentInstrument !== 'drums' && !selectedLoop && (
        <div className="mb-6 relative z-10">
          <MiniKeyboard
            isRecording={state.isRecording}
            onNotePlay={(note) => triggerNote(note, 0.3)}
            onNoteRecord={(note) => recordKeyboardNote(note, 0.3)}
            baseOctave={currentInstrument === 'bass' ? 2 : 4}
          />
        </div>
      )}

      {/* Instrument Selector */}
      {!selectedLoop && (
        <div className="relative z-10">
          <InstrumentSelector
            currentInstrument={currentInstrument}
            onSelect={setCurrentInstrument}
            onCycle={cycleInstrument}
            loadingInstruments={loadingInstruments}
          />
        </div>
      )}

      {/* Metronome */}
      <div className="flex items-center gap-3 mb-4 relative z-10">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.button>
        
        {state.metronomeEnabled && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((beat) => (
                <motion.div
                  key={beat}
                  className={`w-3 h-3 rounded-full ${beat === 0 ? 'bg-amber-500' : 'bg-gray-500'}`}
                  animate={{ scale: state.metronomeBeat === beat ? 1.5 : 1, opacity: state.metronomeBeat === beat ? 1 : 0.4 }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
            <span className="text-sm text-amber-400">{state.tempo} BPM</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMetronomeAudio}
              className={`p-1.5 rounded-full transition-all ${state.metronomeAudible ? 'bg-amber-500/30 text-amber-400' : 'bg-gray-700/50 text-gray-500'}`}
              title={state.metronomeAudible ? 'Ljud på' : 'Ljud av'}
            >
              {state.metronomeAudible ? '🔊' : '🔇'}
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Transport Controls */}
      <TransportControls
        isPlaying={state.isPlaying}
        tempo={state.tempo}
        hasLoops={loops.length > 0}
        canSaveEmpty={initialLoops !== undefined}
        onTogglePlay={togglePlayback}
        onTempoChange={setTempo}
        onSave={handleSave}
        onExport={handleExport}
        isPro={isPro}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        loops={loops}
        tempo={state.tempo}
        isPro={isPro}
      />

      {/* Status */}
      <motion.div
        className="mt-4 mb-4 text-center text-xs text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {state.isInitialized ? (
          state.isRecording ? (
            <><span className="text-red-500">●</span> Recording...</>
          ) : loopsAtLimit ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-yellow-400">
                Loop limit reached ({loops.length}/{FREE_LIMITS.MAX_CONCURRENT_LOOPS})
              </span>
              {!isPro && (
                <Link href="/upgrade" className="text-purple-400 hover:text-purple-300 underline">
                  Upgrade to Pro for unlimited loops
                </Link>
              )}
            </div>
          ) : (
            <><span className="text-green-500">●</span> {loops.length}/{maxLoops} tracks • Click a ring to edit</>
          )
        ) : (
          'Tap the button to start'
        )}
      </motion.div>
    </div>
  )
}


