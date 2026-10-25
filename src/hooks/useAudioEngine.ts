'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import * as Pitchfinder from 'pitchfinder'
import type { InstrumentType, MidiNote } from '@/types/database'
import type { AudioEngineState, PitchDetectionResult, RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'

function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69)
}

function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = notes[midi % 12]
  return `${note}${octave}`
}

type DrumKit = {
  kick: Tone.MembraneSynth
  snare: Tone.NoiseSynth
  hihat: Tone.MetalSynth
}

const DRUM_MIDI_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hihat: 42,
}

function createDrumKit(masterVolume: Tone.Volume): DrumKit {
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
  }).connect(masterVolume)
  kick.volume.value = -4

  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
  }).connect(masterVolume)
  snare.volume.value = -8

  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(masterVolume)
  hihat.volume.value = -12

  return { kick, snare, hihat }
}

type InstrumentSynth = Tone.PolySynth | Tone.Sampler

function createInstrumentSynth(type: InstrumentType, masterVolume: Tone.Volume): InstrumentSynth {
  const reverb = new Tone.Reverb({ decay: 1.2, wet: 0.2 }).connect(masterVolume)
  
  switch (type) {
    case 'bass': {
      const synth = new Tone.PolySynth(Tone.MonoSynth).connect(reverb)
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 2 },
      })
      synth.volume.value = -6
      return synth
    }
    case 'piano': {
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 1.2 },
      })
      synth.volume.value = -4
      return synth
    }
    case 'guitar': {
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'fmtriangle' },
        envelope: { attack: 0.002, decay: 0.4, sustain: 0.2, release: 1.0 },
      })
      synth.volume.value = -4
      return synth
    }
    case 'strings': {
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'fatsawtooth', spread: 30, count: 3 },
        envelope: { attack: 0.3, decay: 0.3, sustain: 0.8, release: 1.5 },
      })
      synth.volume.value = -6
      return synth
    }
    case 'brass': {
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.4 },
      })
      synth.volume.value = -4
      return synth
    }
    case 'organ': {
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.3 },
      })
      synth.volume.value = -4
      return synth
    }
    case 'voice': {
      // Voice/choir sound for speech-to-melody
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 },
      })
      synth.volume.value = -2
      return synth
    }
    case 'synth':
    default: {
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set({
        oscillator: { type: 'fatsawtooth', spread: 20, count: 3 },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.5 },
      })
      synth.volume.value = -4
      return synth
    }
  }
}

interface UseAudioEngineProps {
  tempo?: number
  loopBars?: number
  initialLoops?: RecordedLoop[]
}

export function useAudioEngine({ tempo = 120, loopBars = 4, initialLoops = [] }: UseAudioEngineProps = {}) {
  const [state, setState] = useState<AudioEngineState & { metronomeEnabled: boolean; metronomeAudible: boolean; metronomeBeat: number }>({
    isInitialized: false,
    isRecording: false,
    isPlaying: false,
    currentBeat: 0,
    tempo,
    loopLength: loopBars * 4,
    metronomeEnabled: false,
    metronomeAudible: false,
    metronomeBeat: 0,
  })

  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [lastDrumType, setLastDrumType] = useState<'kick' | 'snare' | 'hihat' | null>(null)
  const [loops, setLoops] = useState<RecordedLoop[]>(initialLoops)
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('piano')
  const [loadingInstruments] = useState<Set<InstrumentType>>(new Set())

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const pitchDetectorRef = useRef<((buffer: Float32Array) => number | null) | null>(null)
  const instrumentsRef = useRef<Map<InstrumentType, InstrumentSynth>>(new Map())
  const drumKitRef = useRef<DrumKit | null>(null)
  const masterVolumeRef = useRef<Tone.Volume | null>(null)
  const recordingNotesRef = useRef<MidiNote[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const lastNoteRef = useRef<{ midi: number; startTime: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const lastDetectedPitchRef = useRef<number | null>(null)
  const pitchStabilityCountRef = useRef<number>(0)
  const wasPlayingBeforeRecordRef = useRef<boolean>(false)
  const loopPartRef = useRef<Tone.Part | null>(null)
  const transportCallbackIdRef = useRef<number | null>(null)
  const metronomeSynthRef = useRef<Tone.Synth | null>(null)
  const metronomeLoopRef = useRef<Tone.Loop | null>(null)
  const metronomeEnabledRef = useRef<boolean>(false)
  const metronomeAudibleRef = useRef<boolean>(false)
  const isInitializedRef = useRef<boolean>(false)

  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) {
      // Even if initialized, ensure contexts are running (mobile can suspend them)
      try {
        if (Tone.getContext().state !== 'running') {
          await Tone.getContext().resume()
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'running') {
          await audioContextRef.current.resume()
        }
      } catch (e) {
        console.warn('Failed to resume contexts:', e)
      }
      return true
    }

    try {
      console.log('Starting audio initialization...')
      
      // Check for microphone support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported')
        alert('Din webbläsare stöder inte mikrofon-åtkomst. Prova Chrome eller Safari.')
        return false
      }

      // Create audio context FIRST (needed for iOS)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass({ sampleRate: 44100 })
      console.log('AudioContext created, state:', audioContextRef.current.state)
      
      // Resume immediately (iOS requires this in user gesture)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
        console.log('AudioContext resumed, state:', audioContextRef.current.state)
      }

      // Start Tone.js
      await Tone.start()
      console.log('Tone.js started, context state:', Tone.getContext().state)
      
      // Ensure Tone context is running
      if (Tone.getContext().state !== 'running') {
        await Tone.getContext().resume()
        console.log('Tone context resumed, state:', Tone.getContext().state)
      }

      // Get microphone access with iOS-friendly constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,  // Disable - can interfere with pitch detection
          autoGainControl: true,
          sampleRate: { ideal: 44100 },
        },
      })
      console.log('Got media stream with tracks:', stream.getAudioTracks().length)
      mediaStreamRef.current = stream
      
      // Verify the stream is active
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        console.log('Audio track settings:', audioTrack.getSettings())
      }
      
      // Double-check context is still running after getUserMedia
      if (audioContextRef.current.state !== 'running') {
        await audioContextRef.current.resume()
      }
      console.log('AudioContext state after getUserMedia:', audioContextRef.current.state)
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.1
      source.connect(analyserRef.current)
      
      // Initialize pitch detector with settings optimized for humming
      const sampleRate = audioContextRef.current.sampleRate
      pitchDetectorRef.current = Pitchfinder.YIN({ 
        sampleRate, 
        threshold: 0.1,        // Lower = more sensitive to pitch
        probabilityThreshold: 0.05  // Lower = accept less certain pitches
      })
      console.log('YIN pitch detector initialized with sample rate:', sampleRate)

      // Create master volume
      masterVolumeRef.current = new Tone.Volume(0).toDestination()
      console.log('Master volume created')

      // Create metronome
      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination()
      metronomeSynthRef.current.volume.value = -12

      // Create drum kit
      drumKitRef.current = createDrumKit(masterVolumeRef.current)
      console.log('Drum kit created')

      // Create all instruments immediately (synths are fast to create)
      const allInstruments: InstrumentType[] = ['bass', 'piano', 'guitar', 'synth', 'strings', 'brass', 'organ', 'voice']
      allInstruments.forEach(type => {
        const synth = createInstrumentSynth(type, masterVolumeRef.current!)
        instrumentsRef.current.set(type, synth)
      })
      console.log('All instruments created')

      // Set tempo
      Tone.getTransport().bpm.value = tempo

      isInitializedRef.current = true
      setState((prev) => ({ ...prev, isInitialized: true }))
      console.log('Audio initialization complete!')
      
      return true
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          alert('Mikrofon-åtkomst nekad. Tillåt mikrofon i webbläsarens inställningar och ladda om sidan.')
        } else if (error.name === 'NotFoundError') {
          alert('Ingen mikrofon hittades. Anslut en mikrofon och ladda om sidan.')
        } else {
          alert(`Kunde inte starta ljud: ${error.message}`)
        }
      }
      
      return false
    }
  }, [tempo])

  // Snap MIDI note to C major scale (can be expanded to other scales)
  const snapToScale = useCallback((midiNote: number): number => {
    const scaleNotes = [0, 2, 4, 5, 7, 9, 11] // C major scale intervals
    const noteInOctave = midiNote % 12
    const octave = Math.floor(midiNote / 12)
    
    // Find closest scale note
    let closest = scaleNotes[0]
    let minDist = Math.abs(noteInOctave - scaleNotes[0])
    
    for (const scaleNote of scaleNotes) {
      const dist = Math.abs(noteInOctave - scaleNote)
      if (dist < minDist) {
        minDist = dist
        closest = scaleNote
      }
    }
    
    return octave * 12 + closest
  }, [])

  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current || !pitchDetectorRef.current) {
      return null
    }

    const bufferLength = analyserRef.current.fftSize
    const buffer = new Float32Array(bufferLength)
    analyserRef.current.getFloatTimeDomainData(buffer)

    let rms = 0
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i]
    }
    rms = Math.sqrt(rms / buffer.length)

    // Update audio level for visual feedback (0-1 scale, amplified for visibility)
    const level = Math.min(rms * 50, 1)
    setAudioLevel(level)

    const isVoiceMode = currentInstrument === 'voice'
    const minVolume = isVoiceMode ? 0.002 : 0.001
    
    if (rms < minVolume) {
      lastDetectedPitchRef.current = null
      pitchStabilityCountRef.current = 0
      setCurrentPitch(null)
      return null
    }

    const frequency = pitchDetectorRef.current(buffer)

    // For voice mode, we also try to detect based on volume/energy
    // to create rhythm even when pitch isn't clear
    if (isVoiceMode && !frequency && rms > 0.01) {
      // Use volume to trigger notes when pitch isn't detected
      // Map volume to a pitch range (louder = higher)
      const volumeBasedPitch = Math.floor(48 + (rms * 200)) // C3 to ~C5
      const snappedPitch = snapToScale(Math.min(72, volumeBasedPitch))
      
      if (lastDetectedPitchRef.current !== snappedPitch) {
        lastDetectedPitchRef.current = snappedPitch
        pitchStabilityCountRef.current = 1
        
        const noteName = midiToNoteName(snappedPitch)
        const result: PitchDetectionResult = {
          frequency: null,
          clarity: Math.min(rms * 20, 1),
          midiNote: snappedPitch,
          noteName,
        }
        setCurrentPitch(result)
        return result
      }
      return null
    }

    const minFreq = isVoiceMode ? 80 : 50
    const maxFreq = isVoiceMode ? 500 : 800
    
    if (frequency && frequency > minFreq && frequency < maxFreq) {
      let midiNote = frequencyToMidi(frequency)
      
      // In voice mode, snap to musical scale for more pleasing results
      if (isVoiceMode) {
        midiNote = snapToScale(midiNote)
      }
      
      // Voice mode: more tolerance for pitch changes
      const pitchTolerance = isVoiceMode ? 3 : 2
      const lastPitch = lastDetectedPitchRef.current
      const isStable = lastPitch !== null && Math.abs(midiNote - lastPitch) <= pitchTolerance
      
      if (isStable || lastDetectedPitchRef.current === midiNote) {
        pitchStabilityCountRef.current++
      } else {
        pitchStabilityCountRef.current = 1
      }
      
      lastDetectedPitchRef.current = midiNote

      if (pitchStabilityCountRef.current >= 1) {
        const noteName = midiToNoteName(midiNote)
        const clarity = Math.min(rms * 30, 1)

        const result: PitchDetectionResult = {
          frequency,
          clarity,
          midiNote,
          noteName,
        }

        setCurrentPitch(result)
        return result
      } else {
        setCurrentPitch({
          frequency,
          clarity: Math.min(rms * 30, 1),
          midiNote: null,
          noteName: null,
        })
        return null
      }
    }

    lastDetectedPitchRef.current = null
    pitchStabilityCountRef.current = 0
    setCurrentPitch(null)
    return null
  }, [currentInstrument, snapToScale])

  const triggerNote = useCallback((midiNote: number, duration: number = 0.3) => {
    const instrument = instrumentsRef.current.get(currentInstrument)
    if (instrument && 'triggerAttackRelease' in instrument) {
      const noteName = midiToNoteName(midiNote)
      try {
        instrument.triggerAttackRelease(noteName, duration)
      } catch (e) {
        console.warn('Failed to trigger note:', e)
      }
    }
  }, [currentInstrument])

  const triggerDrumHit = useCallback((drumType: 'kick' | 'snare' | 'hihat' = 'snare') => {
    if (!drumKitRef.current) return

    try {
      switch (drumType) {
        case 'kick':
          drumKitRef.current.kick.triggerAttackRelease('C1', '8n')
          break
        case 'snare':
          drumKitRef.current.snare.triggerAttackRelease('8n')
          break
        case 'hihat':
          drumKitRef.current.hihat.triggerAttackRelease('C6', '32n')
          break
      }
    } catch (e) {
      console.warn('Failed to trigger drum hit:', e)
    }
  }, [])

  const recordDrumHit = useCallback((drumType: 'kick' | 'snare' | 'hihat') => {
    if (!isRecordingRef.current) return
    
    const currentTime = Tone.now() - recordingStartTimeRef.current
    const midiNote = DRUM_MIDI_MAP[drumType]
    
    recordingNotesRef.current.push({
      pitch: midiNote,
      velocity: 100,
      startTime: currentTime,
      duration: 0.1,
    })
    
    setLastDrumType(drumType)
    setTimeout(() => setLastDrumType(null), 200)
    
    triggerDrumHit(drumType)
  }, [triggerDrumHit])

  const recordKeyboardNote = useCallback((midiNote: number, duration: number = 0.3) => {
    // Play the note
    triggerNote(midiNote, duration)
    
    // Record if recording
    if (!isRecordingRef.current) return
    
    const currentTime = Tone.now() - recordingStartTimeRef.current
    
    recordingNotesRef.current.push({
      pitch: midiNote,
      velocity: 100,
      startTime: currentTime,
      duration: duration,
    })
  }, [triggerNote])

  const startRecording = useCallback(async () => {
    if (!state.isInitialized) {
      const success = await initializeAudio()
      if (!success) return
    }

    // Ensure audio context is running (mobile fix)
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume()
    }

    wasPlayingBeforeRecordRef.current = state.isPlaying
    
    if (masterVolumeRef.current) {
      masterVolumeRef.current.volume.rampTo(-14, 0.1)
    }

    recordingNotesRef.current = []
    recordingStartTimeRef.current = Tone.now()
    lastNoteRef.current = null
    isRecordingRef.current = true

    const transport = Tone.getTransport()
    if (transport.state !== 'started' && metronomeEnabledRef.current) {
      transport.start()
    }

    setState((prev) => ({ ...prev, isRecording: true }))

    const analyzeLoop = () => {
      if (!isRecordingRef.current) return

      if (currentInstrument !== 'drums') {
        const pitch = detectPitch()

        if (pitch && pitch.midiNote) {
          const currentTime = Tone.now() - recordingStartTimeRef.current

          if (!lastNoteRef.current || lastNoteRef.current.midi !== pitch.midiNote) {
            if (lastNoteRef.current) {
              const duration = currentTime - lastNoteRef.current.startTime
              recordingNotesRef.current.push({
                pitch: lastNoteRef.current.midi,
                velocity: 100,
                startTime: lastNoteRef.current.startTime,
                duration: Math.max(duration, 0.1),
              })
            }

            lastNoteRef.current = { midi: pitch.midiNote, startTime: currentTime }
            triggerNote(pitch.midiNote)
          }
        } else if (lastNoteRef.current) {
          const currentTime = Tone.now() - recordingStartTimeRef.current
          const duration = currentTime - lastNoteRef.current.startTime
          recordingNotesRef.current.push({
            pitch: lastNoteRef.current.midi,
            velocity: 100,
            startTime: lastNoteRef.current.startTime,
            duration: Math.max(duration, 0.1),
          })
          lastNoteRef.current = null
        }
      }

      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyzeLoop)
      }
    }

    analyzeLoop()
  }, [state.isInitialized, state.isPlaying, currentInstrument, detectPitch, triggerNote, initializeAudio])

  const stopRecording = useCallback((): RecordedLoop | null => {
    if (!isRecordingRef.current) return null

    isRecordingRef.current = false
    setState((prev) => ({ ...prev, isRecording: false }))

    if (masterVolumeRef.current) {
      masterVolumeRef.current.volume.rampTo(0, 0.1)
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (lastNoteRef.current) {
      const currentTime = Tone.now() - recordingStartTimeRef.current
      const duration = currentTime - lastNoteRef.current.startTime
      recordingNotesRef.current.push({
        pitch: lastNoteRef.current.midi,
        velocity: 100,
        startTime: lastNoteRef.current.startTime,
        duration: Math.max(duration, 0.1),
      })
    }

    const recordingDuration = Tone.now() - recordingStartTimeRef.current

    if (recordingNotesRef.current.length === 0) {
      return null
    }

    const config = getInstrumentConfig(currentInstrument)
    
    const newLoop: RecordedLoop = {
      id: crypto.randomUUID(),
      instrumentType: currentInstrument,
      notes: [...recordingNotesRef.current],
      duration: recordingDuration,
      color: config.color,
      volume: 1,
    }

    setLoops((prev) => [...prev, newLoop])
    
    return newLoop
  }, [currentInstrument])

  const playDrumNote = useCallback((midiNote: number, time: number, velocity: number) => {
    if (!drumKitRef.current || velocity <= 0) return

    const midiToDrum: Record<number, 'kick' | 'snare' | 'hihat'> = {
      36: 'kick',
      38: 'snare',
      42: 'hihat',
    }
    const drumType = midiToDrum[midiNote] || 'snare'

    try {
      switch (drumType) {
        case 'kick':
          drumKitRef.current.kick.triggerAttackRelease('C1', '8n', time, velocity)
          break
        case 'snare':
          drumKitRef.current.snare.triggerAttackRelease('8n', time, velocity)
          break
        case 'hihat':
          drumKitRef.current.hihat.triggerAttackRelease('C6', '32n', time, velocity)
          break
      }
    } catch (e) {
      console.warn('Failed to play drum note:', e)
    }
  }, [])

  const startPlayback = useCallback(async () => {
    if (loops.length === 0) return

    // Ensure audio context is running
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume()
    }

    const transport = Tone.getTransport()
    
    if (loopPartRef.current) {
      loopPartRef.current.dispose()
    }

    const allEvents: Array<{ time: number; note: string; duration: number; instrument: InstrumentType; midiNote: number; volume: number }> = []

    loops.forEach((loop) => {
      if (loop.notes.length > 0) {
        loop.notes.forEach((note) => {
          allEvents.push({
            time: note.startTime,
            note: midiToNoteName(note.pitch),
            duration: note.duration,
            instrument: loop.instrumentType,
            midiNote: note.pitch,
            volume: loop.volume,
          })
        })
      }
    })

    const partEvents = allEvents.map((e) => ({
      time: e.time,
      note: e.note,
      duration: e.duration,
      instrument: e.instrument,
      midiNote: e.midiNote,
      volume: e.volume,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loopPartRef.current = new Tone.Part((time: number, event: any) => {
      const velocity = event.volume ?? 1
      
      if (velocity <= 0) return
      
      if (event.instrument === 'drums') {
        playDrumNote(event.midiNote, time, velocity)
      } else {
        const instrument = instrumentsRef.current.get(event.instrument as InstrumentType)
        if (instrument && 'triggerAttackRelease' in instrument) {
          try {
            instrument.triggerAttackRelease(event.note, event.duration, time, velocity)
          } catch (e) {
            console.warn('Playback note error:', e)
          }
        }
      }
    }, partEvents.map((e) => [e.time, e]))

    const maxDuration = Math.max(...loops.map((l) => l.duration), 4)
    loopPartRef.current.loop = true
    loopPartRef.current.loopEnd = maxDuration

    loopPartRef.current.start(0)
    transport.start()

    setState((prev) => ({ ...prev, isPlaying: true }))
  }, [loops, playDrumNote])

  const stopPlayback = useCallback(() => {
    const transport = Tone.getTransport()
    transport.stop()
    transport.position = 0

    if (loopPartRef.current) {
      loopPartRef.current.stop()
    }

    setState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const togglePlayback = useCallback(() => {
    if (state.isPlaying) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }, [state.isPlaying, startPlayback, stopPlayback])

  const deleteLoop = useCallback((loopId: string) => {
    setLoops((prev) => prev.filter((loop) => loop.id !== loopId))
  }, [])

  const setLoopVolume = useCallback((loopId: string, volume: number) => {
    setLoops((prev) => prev.map((loop) => 
      loop.id === loopId ? { ...loop, volume: Math.max(0, Math.min(1, volume)) } : loop
    ))
  }, [])

  const transposeLoop = useCallback((loopId: string, semitones: number) => {
    setLoops((prev) => prev.map((loop) => {
      if (loop.id !== loopId) return loop
      if (loop.instrumentType === 'drums') return loop
      
      return {
        ...loop,
        notes: loop.notes.map(note => ({
          ...note,
          pitch: Math.max(0, Math.min(127, note.pitch + semitones))
        }))
      }
    }))
  }, [])

  const updateLoops = useCallback((newLoops: RecordedLoop[]) => {
    setLoops(newLoops)
  }, [])

  const clearAllLoops = useCallback(() => {
    stopPlayback()
    setLoops([])
  }, [stopPlayback])

  const setTempo = useCallback((newTempo: number) => {
    Tone.getTransport().bpm.value = newTempo
    setState((prev) => ({ ...prev, tempo: newTempo }))
  }, [])

  const handleSetInstrument = useCallback((type: InstrumentType) => {
    setCurrentInstrument(type)
  }, [])

  const cycleInstrument = useCallback((direction: 'next' | 'prev') => {
    const instruments: InstrumentType[] = ['drums', 'bass', 'piano', 'guitar', 'synth', 'strings', 'brass', 'organ', 'voice']
    const currentIndex = instruments.indexOf(currentInstrument)
    let newIndex: number

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % instruments.length
    } else {
      newIndex = (currentIndex - 1 + instruments.length) % instruments.length
    }

    handleSetInstrument(instruments[newIndex])
  }, [currentInstrument, handleSetInstrument])

  const toggleMetronome = useCallback(() => {
    const newEnabled = !metronomeEnabledRef.current
    metronomeEnabledRef.current = newEnabled
    setState((prev) => ({ ...prev, metronomeEnabled: newEnabled }))

    if (newEnabled) {
      if (metronomeLoopRef.current) {
        metronomeLoopRef.current.dispose()
      }

      let beatCount = 0
      metronomeLoopRef.current = new Tone.Loop((time) => {
        if (metronomeEnabledRef.current) {
          const currentBeat = beatCount % 4
          
          Tone.getDraw().schedule(() => {
            setState((prev) => ({ ...prev, metronomeBeat: currentBeat }))
          }, time)
          
          if (metronomeAudibleRef.current && metronomeSynthRef.current) {
            const isDownbeat = currentBeat === 0
            const note = isDownbeat ? 'C6' : 'G5'
            metronomeSynthRef.current.triggerAttackRelease(note, '64n', time)
          }
        }
        beatCount++
      }, '4n')

      metronomeLoopRef.current.start(0)

      if (!state.isPlaying && !state.isRecording) {
        Tone.getTransport().start()
      }
    } else {
      if (metronomeLoopRef.current) {
        metronomeLoopRef.current.stop()
        metronomeLoopRef.current.dispose()
        metronomeLoopRef.current = null
      }

      setState((prev) => ({ ...prev, metronomeBeat: 0 }))

      if (!state.isPlaying && !state.isRecording) {
        Tone.getTransport().stop()
      }
    }
  }, [state.isPlaying, state.isRecording])

  const toggleMetronomeAudio = useCallback(() => {
    const newAudible = !metronomeAudibleRef.current
    metronomeAudibleRef.current = newAudible
    setState((prev) => ({ ...prev, metronomeAudible: newAudible }))
  }, [])

  useEffect(() => {
    const transport = Tone.getTransport()
    
    transportCallbackIdRef.current = transport.scheduleRepeat((time) => {
      Tone.getDraw().schedule(() => {
        const position = transport.position
        if (typeof position === 'string') {
          const [bars, beats] = position.split(':').map(Number)
          const totalBeats = bars * 4 + beats
          setState((prev) => ({ ...prev, currentBeat: totalBeats % prev.loopLength }))
        }
      }, time)
    }, '4n')

    return () => {
      if (transportCallbackIdRef.current !== null) {
        transport.clear(transportCallbackIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      instrumentsRef.current.forEach((instrument) => instrument?.dispose())
      if (drumKitRef.current) {
        drumKitRef.current.kick.dispose()
        drumKitRef.current.snare.dispose()
        drumKitRef.current.hihat.dispose()
      }
      if (loopPartRef.current) {
        loopPartRef.current.dispose()
      }
      if (masterVolumeRef.current) {
        masterVolumeRef.current.dispose()
      }
      if (metronomeSynthRef.current) {
        metronomeSynthRef.current.dispose()
      }
      if (metronomeLoopRef.current) {
        metronomeLoopRef.current.dispose()
      }
    }
  }, [])

  return {
    state,
    currentPitch,
    audioLevel,
    lastDrumType,
    loops,
    currentInstrument,
    loadingInstruments,
    initializeAudio,
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    togglePlayback,
    deleteLoop,
    clearAllLoops,
    setTempo,
    cycleInstrument,
    setCurrentInstrument: handleSetInstrument,
    triggerNote,
    triggerDrumHit,
    recordDrumHit,
    recordKeyboardNote,
    toggleMetronome,
    toggleMetronomeAudio,
    setLoopVolume,
    transposeLoop,
    updateLoops,
  }
}
