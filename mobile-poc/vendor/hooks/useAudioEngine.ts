'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import * as Pitchfinder from 'pitchfinder'
import { VoicePitchTracker, detectVoiceFrequency, VOICE_YIN_SETTINGS } from '@/lib/voice-pitch'
import type { InstrumentType, MidiNote } from '@/types/database'
import type { AudioEngineState, PitchDetectionResult, RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'

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
  effects: Tone.ToneAudioNode[]
}

const DRUM_MIDI_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hihat: 42,
}

function createDrumKit(masterVolume: Tone.Volume): DrumKit {
  // Professional drum bus with compression and limiting
  const drumCompressor = new Tone.Compressor({
    threshold: -20,
    ratio: 4,
    attack: 0.003,
    release: 0.1,
  }).connect(masterVolume)
  const drumLimiter = new Tone.Limiter(-3).connect(drumCompressor)
  
  // EQ for drums
  const drumEQ = new Tone.EQ3({
    low: 2,
    mid: 0,
    high: 1,
    lowFrequency: 100,
    highFrequency: 8000,
  }).connect(drumLimiter)
  
  const drumBaseVolume = -10
  
  // Kick drum - punchy with sub bass
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
  }).connect(drumEQ)
  kick.volume.value = drumBaseVolume

  // Snare - layered noise with body
  const snare = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0.02, release: 0.1 },
  }).connect(drumEQ)
  snare.volume.value = drumBaseVolume - 1

  // Hi-hat - crisp and tight
  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 5000,
    octaves: 1.5,
  }).connect(drumEQ)
  hihat.volume.value = drumBaseVolume - 3

  return { kick, snare, hihat, effects: [drumEQ, drumLimiter, drumCompressor] }
}

type InstrumentSynth = Tone.PolySynth | Tone.Sampler

function createInstrumentSynth(type: InstrumentType, masterVolume: Tone.Volume, effects: Tone.ToneAudioNode[]): InstrumentSynth {
  // Simple, reliable effects chain
  const limiter = new Tone.Limiter(-3).connect(masterVolume)
  const reverbSettings = type === 'piano' ? { decay: 1.8, wet: 0.22 }
    : type === 'strings' ? { decay: 2.5, wet: 0.3 }
    : type === 'voice' ? { decay: 2, wet: 0.25 }
    : { decay: 1.2, wet: 0.15 }
  const reverb = new Tone.Reverb(reverbSettings).connect(limiter)
  effects.push(reverb, limiter)
  
  const baseVolume = -12
  
  switch (type) {
    case 'bass': {
      // Simple but warm bass
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3 },
        filterEnvelope: { 
          attack: 0.01, 
          decay: 0.2, 
          sustain: 0.3, 
          release: 0.3, 
          baseFrequency: 150, 
          octaves: 2 
        },
      }).connect(reverb)
      synth.volume.value = baseVolume
      return synth as unknown as InstrumentSynth
    }
    case 'piano': {
      // Soft hammer piano: triangle + long ringing decay (clearly not a pluck)
      const pianoFilter = new Tone.Filter({ type: 'lowpass', frequency: 5200, Q: 0.5 }).connect(reverb)
      effects.push(pianoFilter)
      const synth = new Tone.PolySynth(Tone.Synth).connect(pianoFilter)
      synth.maxPolyphony = 6
      synth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 1.5, sustain: 0.04, release: 1.3 },
      })
      synth.volume.value = baseVolume
      return synth
    }
    case 'guitar': {
      // Nylon-ish pluck: sawtooth through a tighter filter + short decay
      const guitarFilter = new Tone.Filter({ type: 'lowpass', frequency: 2400, Q: 1.4 }).connect(reverb)
      effects.push(guitarFilter)
      const synth = new Tone.PolySynth(Tone.Synth).connect(guitarFilter)
      synth.maxPolyphony = 6
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.008, decay: 0.32, sustain: 0.12, release: 0.4 },
      })
      synth.volume.value = baseVolume - 1
      return synth
    }
    case 'strings': {
      // Soft strings
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.maxPolyphony = 6
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.3, decay: 0.3, sustain: 0.6, release: 1.0 },
      })
      synth.volume.value = baseVolume - 3
      return synth
    }
    case 'brass': {
      // Punchy brass
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.maxPolyphony = 4
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
      })
      synth.volume.value = baseVolume - 2
      return synth
    }
    case 'organ': {
      // Simple organ
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.maxPolyphony = 6
      synth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
      })
      synth.volume.value = baseVolume
      return synth
    }
    case 'voice': {
      // Soft voice/choir
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.maxPolyphony = 4
      synth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.5, release: 0.4 },
      })
      synth.volume.value = baseVolume
      return synth
    }
    case 'synth':
    default: {
      // Classic synth
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.maxPolyphony = 4
      synth.set({
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.3 },
      })
      synth.volume.value = baseVolume - 3
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
  const [micEnabled, setMicEnabled] = useState<boolean>(true)
  const micEnabledRef = useRef<boolean>(true)
  const [lastDrumType, setLastDrumType] = useState<'kick' | 'snare' | 'hihat' | null>(null)
  const [loops, setLoops] = useState<RecordedLoop[]>(initialLoops)
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('piano')
  const initialDuration = initialLoops.length ? Math.max(...initialLoops.map(loop => loop.duration)) : null
  const [masterLoopDuration, setMasterLoopDuration] = useState<number | null>(initialDuration)
  const [loopProgress, setLoopProgress] = useState<number>(0)
  const masterLoopDurationRef = useRef<number | null>(initialDuration)
  const [loadingInstruments] = useState<Set<InstrumentType>>(new Set())

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const pitchDetectorRef = useRef<((buffer: Float32Array) => number | null) | null>(null)
  const instrumentsRef = useRef<Map<InstrumentType, InstrumentSynth>>(new Map())
  const instrumentEffectsRef = useRef<Tone.ToneAudioNode[]>([])
  const drumKitRef = useRef<DrumKit | null>(null)
  const masterVolumeRef = useRef<Tone.Volume | null>(null)
  const recordingNotesRef = useRef<MidiNote[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const lastNoteRef = useRef<{ midi: number; startTime: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const voiceTrackerRef = useRef(new VoicePitchTracker())
  const pitchBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)
  const normalizedPitchBufferRef = useRef<Float32Array | null>(null)
  const wasPlayingBeforeRecordRef = useRef<boolean>(false)
  const loopPartRef = useRef<Tone.Part | null>(null)
  const transportCallbackIdRef = useRef<number | null>(null)
  const metronomeSynthRef = useRef<Tone.Synth | null>(null)
  const metronomeLoopRef = useRef<Tone.Loop | null>(null)
  const metronomeEnabledRef = useRef<boolean>(false)
  const metronomeAudibleRef = useRef<boolean>(false)
  const isInitializedRef = useRef<boolean>(false)
  
  // Memo recording (raw audio)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const memoAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  const initializeOutput = useCallback(async () => {
    try {
      await Tone.start()
      if (masterVolumeRef.current) {
        if (Tone.getContext().state !== 'running') await Tone.getContext().resume()
        return true
      }
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
      const synth = createInstrumentSynth(type, masterVolumeRef.current!, instrumentEffectsRef.current)
      instrumentsRef.current.set(type, synth)
    })
    console.log('All instruments created')

    // Set tempo
    Tone.getTransport().bpm.value = tempo
    setState(prev => ({ ...prev, isInitialized: true }))

      return true
    } catch (error) {
      console.warn('Could not start audio output:', error)
      return false
    }
  }, [tempo])

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
      if (!await initializeOutput()) return false
      console.log('Starting audio initialization...')
      
      // Check for microphone support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported')
        alert('Your browser does not support microphone access. Try Chrome or Safari.')
        return false
      }

      // Create audio context FIRST (needed for iOS)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      // Don't force sampleRate on mobile - let browser choose optimal rate
      audioContextRef.current = new AudioContextClass()
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

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported in this browser')
      }

      // Detect mobile/iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      console.log('Device detection - iOS:', isIOS, 'Mobile:', isMobile)

      // Get microphone access with mobile-friendly constraints
      // Simpler constraints work better on mobile
      const audioConstraints = isMobile 
        ? { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }
        : {
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: true,
            },
          }
      
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints)
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
      analyserRef.current.fftSize = 4096  // Larger buffer for better pitch detection
      analyserRef.current.smoothingTimeConstant = 0.2  // Slight smoothing for stability
      source.connect(analyserRef.current)
      
      // Initialize pitch detector optimized for singing voices
      const sampleRate = audioContextRef.current.sampleRate
      pitchDetectorRef.current = Pitchfinder.YIN({ 
        sampleRate, 
        ...VOICE_YIN_SETTINGS
      })
      console.log('YIN pitch detector initialized with sample rate:', sampleRate)

      isInitializedRef.current = true
      setState((prev) => ({ ...prev, isInitialized: true }))
      console.log('Audio initialization complete!')
      
      return true
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          alert('Microphone access denied. Allow microphone in browser settings and reload the page.')
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Connect a microphone and reload the page.')
        } else {
          alert(`Could not start audio: ${error.message}`)
        }
      }
      
      return false
    }
  }, [tempo, initializeOutput])

  const detectPitch = useCallback(() => {
    if (!micEnabledRef.current || !analyserRef.current || !audioContextRef.current || !pitchDetectorRef.current) {
      voiceTrackerRef.current.reset()
      return null
    }
    const analyser = analyserRef.current
    if (!pitchBufferRef.current || pitchBufferRef.current.length !== analyser.fftSize) {
      pitchBufferRef.current = new Float32Array(analyser.fftSize)
      normalizedPitchBufferRef.current = new Float32Array(analyser.fftSize)
    }
    const buffer = pitchBufferRef.current
    analyser.getFloatTimeDomainData(buffer)
    let energy = 0
    for (const value of buffer) energy += value * value
    const rms = Math.sqrt(energy / buffer.length)
    setAudioLevel(Math.min(rms * 50, 1))
    const frequency = detectVoiceFrequency(buffer, normalizedPitchBufferRef.current!, pitchDetectorRef.current)
    const pitch = voiceTrackerRef.current.update(buffer, audioContextRef.current.sampleRate, frequency, Tone.now())
    const result: PitchDetectionResult | null = pitch ? {
      ...pitch,
      noteName: midiToNoteName(pitch.midiNote),
    } : null
    setCurrentPitch(result)
    return result
  }, [])

  const triggerNote = useCallback(async (midiNote: number, duration: number = 0.3) => {
    if (!await initializeOutput()) return
    const instrument = instrumentsRef.current.get(currentInstrument)
    if (instrument && 'triggerAttackRelease' in instrument) {
      const noteName = midiToNoteName(midiNote)
      try {
        instrument.triggerAttackRelease(noteName, duration)
      } catch (e) {
        console.warn('Failed to trigger note:', e)
      }
    }
  }, [currentInstrument, initializeOutput])

  const triggerDrumHit = useCallback(async (drumType: 'kick' | 'snare' | 'hihat' = 'snare') => {
    if (!await initializeOutput() || !drumKitRef.current) return

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
  }, [initializeOutput])

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

  const stopRecordingInternal = useCallback((): RecordedLoop | null => {
    if (!isRecordingRef.current) return null

    isRecordingRef.current = false
    setState((prev) => ({ ...prev, isRecording: false }))
    setLoopProgress(0)

    if (masterVolumeRef.current) {
      masterVolumeRef.current.volume.rampTo(0, 0.1)
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    let recordingDuration = Tone.now() - recordingStartTimeRef.current

    // MEMO MODE: Handle audio recording
    if (currentInstrument === 'memo' && mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current
      
      // Stop the recorder and wait for final data
      recorder.stop()
      
      // Create the loop asynchronously when all data is collected
      const loopId = crypto.randomUUID()
      const config = getInstrumentConfig('memo')
      
      // Handle the recorded data
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        console.log('Memo recording complete:', audioBlob.size, 'bytes')
        
        // Determine duration
        const finalDuration = masterLoopDurationRef.current || recordingDuration
        if (!masterLoopDurationRef.current) {
          masterLoopDurationRef.current = recordingDuration
          setMasterLoopDuration(recordingDuration)
        }
        
        const memoLoop: RecordedLoop = {
          id: loopId,
          instrumentType: 'memo',
          notes: [], // Memos don't have MIDI notes
          duration: finalDuration,
          color: config.color,
          volume: 1,
          audioBlob,
          audioUrl,
        }
        
        // Create audio element for playback
        const audio = new Audio(audioUrl)
        audio.loop = true
        memoAudioElementsRef.current.set(loopId, audio)
        
        setLoops((prev) => [...prev, memoLoop])
      }
      
      mediaRecorderRef.current = null
      return null // Loop will be added asynchronously
    }

    if (lastNoteRef.current) {
      const currentTime = Tone.now() - recordingStartTimeRef.current
      const duration = currentTime - lastNoteRef.current.startTime
      recordingNotesRef.current.push({
        pitch: lastNoteRef.current.midi,
        velocity: 100,
        startTime: lastNoteRef.current.startTime,
        duration: Math.max(duration, 0),
      })
    }

    if (recordingNotesRef.current.length === 0) {
      return null
    }

    // If this is the first loop, it sets the master duration
    // Otherwise, use the master duration
    const isFirstLoop = masterLoopDurationRef.current === null
    if (isFirstLoop) {
      // First loop - set it as master
      masterLoopDurationRef.current = recordingDuration
      setMasterLoopDuration(recordingDuration)
    } else {
      // Subsequent loops - use master duration
      recordingDuration = masterLoopDurationRef.current!
    }

    // Preserve the sung melody: no forced scale, interval removal, or merging
    // of different pitches. The tracker handles unstable input before recording.
    const cleanedNotes = currentInstrument === 'drums'
      ? [...recordingNotesRef.current]
      : recordingNotesRef.current.filter(note => note.duration >= 0.08)

    const config = getInstrumentConfig(currentInstrument)
    
    const newLoop: RecordedLoop = {
      id: crypto.randomUUID(),
      instrumentType: currentInstrument,
      notes: cleanedNotes,
      duration: recordingDuration,
      color: config.color,
      volume: 1,
    }

    setLoops((prev) => [...prev, newLoop])
    
    return newLoop
  }, [currentInstrument])

  const startRecording = useCallback(async () => {
    const ready = micEnabledRef.current || currentInstrument === 'memo'
      ? await initializeAudio() : await initializeOutput()
    if (!ready) return

    // Ensure audio context is running (mobile fix)
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume()
    }

    wasPlayingBeforeRecordRef.current = state.isPlaying
    
    if (masterVolumeRef.current) {
      masterVolumeRef.current.volume.rampTo(-14, 0.1)
    }

    recordingNotesRef.current = []
    voiceTrackerRef.current.reset()
    recordingStartTimeRef.current = Tone.now()
    lastNoteRef.current = null
    isRecordingRef.current = true

    const transport = Tone.getTransport()
    if (transport.state !== 'started' && metronomeEnabledRef.current) {
      transport.start()
    }

    setState((prev) => ({ ...prev, isRecording: true }))
    setLoopProgress(0)

    // MEMO MODE: Start MediaRecorder for raw audio capture
    if (currentInstrument === 'memo' && mediaStreamRef.current) {
      audioChunksRef.current = []
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, { mimeType })
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }
        
        mediaRecorderRef.current.start(100) // Collect data every 100ms
        console.log('Memo recording started')
      } catch (e) {
        console.error('Failed to start memo recording:', e)
      }
    }

    const analyzeLoop = () => {
      if (!isRecordingRef.current) return

      const currentTime = Tone.now() - recordingStartTimeRef.current
      
      // Update loop progress
      if (masterLoopDurationRef.current) {
        const progress = Math.min(currentTime / masterLoopDurationRef.current, 1)
        setLoopProgress(progress)
        
        // Auto-stop when master loop duration is reached
        if (currentTime >= masterLoopDurationRef.current) {
          // Use setTimeout to avoid calling stopRecording from within analyzeLoop
          setTimeout(() => {
            if (isRecordingRef.current) {
              stopRecordingInternal()
            }
          }, 0)
          return
        }
      }

      // MEMO MODE: Just track time, no pitch detection
      if (currentInstrument === 'memo') {
        if (isRecordingRef.current) {
          animationFrameRef.current = requestAnimationFrame(analyzeLoop)
        }
        return
      }

      // Only do pitch detection if mic is enabled and not drums
      if (currentInstrument !== 'drums' && micEnabledRef.current) {
        const pitch = detectPitch()

        if (pitch && pitch.midiNote) {
          if (!lastNoteRef.current || lastNoteRef.current.midi !== pitch.midiNote) {
            if (lastNoteRef.current) {
              const duration = currentTime - lastNoteRef.current.startTime
              recordingNotesRef.current.push({
                pitch: lastNoteRef.current.midi,
                velocity: 100,
                startTime: lastNoteRef.current.startTime,
                duration: Math.max(duration, 0),
              })
            }

            lastNoteRef.current = { midi: pitch.midiNote, startTime: currentTime }
            triggerNote(pitch.midiNote)
          }
        } else if (lastNoteRef.current) {
          const duration = currentTime - lastNoteRef.current.startTime
          recordingNotesRef.current.push({
            pitch: lastNoteRef.current.midi,
            velocity: 100,
            startTime: lastNoteRef.current.startTime,
            duration: Math.max(duration, 0),
          })
          lastNoteRef.current = null
        }
      }

      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyzeLoop)
      }
    }

    analyzeLoop()
  }, [state.isInitialized, state.isPlaying, currentInstrument, detectPitch, triggerNote, initializeAudio, initializeOutput, stopRecordingInternal])

  const stopRecording = useCallback((): RecordedLoop | null => {
    return stopRecordingInternal()
  }, [stopRecordingInternal])

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

  // Release all held notes to prevent voice buildup
  const releaseAllNotes = useCallback(() => {
    instrumentsRef.current.forEach((instrument) => {
      if (instrument && 'releaseAll' in instrument) {
        try {
          (instrument as Tone.PolySynth).releaseAll()
        } catch (e) {
          console.warn('Failed to release notes:', e)
        }
      }
    })
  }, [])

  const startPlayback = useCallback(async () => {
    if (loops.length === 0 || !await initializeOutput()) return

    // Ensure audio context is running
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume()
    }

    const transport = Tone.getTransport()
    
    // Release any hanging notes
    releaseAllNotes()
    
    // Stop and dispose previous part
    if (loopPartRef.current) {
      loopPartRef.current.stop()
      loopPartRef.current.dispose()
      loopPartRef.current = null
    }
    
    // Reset transport
    transport.stop()
    transport.position = 0

    // Small delay to let audio settle
    await new Promise(resolve => setTimeout(resolve, 50))

    const allEvents: Array<{ time: number; note: string; duration: number; instrument: InstrumentType; midiNote: number; volume: number; loopId: string }> = []

    // Collect all events from all loops (skip memo loops - they use audio playback)
    loops.forEach((loop) => {
      // Skip memo loops - they're handled separately
      if (loop.instrumentType === 'memo') return
      
      console.log(`Processing loop ${loop.id} (${loop.instrumentType}): ${loop.notes.length} notes, volume: ${loop.volume}`)
      if (loop.notes.length > 0 && (loop.volume ?? 1) > 0) {
        loop.notes.forEach((note) => {
          // Limit note duration to prevent long sustains
          const maxDuration = Math.min(note.duration, 2)
          allEvents.push({
            time: note.startTime,
            note: midiToNoteName(note.pitch),
            duration: maxDuration,
            instrument: loop.instrumentType,
            midiNote: note.pitch,
            volume: (loop.volume ?? 1) * 0.8, // Reduce overall volume
            loopId: loop.id,
          })
        })
      }
    })

    // Sort events by time for proper scheduling
    allEvents.sort((a, b) => a.time - b.time)
    
    const maxDuration = Math.max(...loops.map((l) => l.duration))
    console.log(`Loop duration: ${maxDuration}s, MIDI events: ${allEvents.length}`)

    // Start memo audio loops
    loops.forEach((loop) => {
      if (loop.instrumentType === 'memo' && loop.audioUrl) {
        let audio = memoAudioElementsRef.current.get(loop.id)
        if (!audio) {
          audio = new Audio(loop.audioUrl)
          audio.loop = true
          memoAudioElementsRef.current.set(loop.id, audio)
        }
        audio.volume = loop.volume ?? 1
        audio.currentTime = 0
        audio.play().catch(e => console.warn('Failed to play memo:', e))
      }
    })

    // If we only have memo loops, we still need to track state
    if (allEvents.length === 0) {
      console.log('No MIDI events - memo-only playback')
      transport.start()
      setState((prev) => ({ ...prev, isPlaying: true }))
      return
    }

    // Create Part with all events
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
            instrument.triggerAttackRelease(event.note, event.duration, time, velocity * 0.7)
          } catch (e) {
            console.warn('Playback note error:', e)
          }
        }
      }
    }, allEvents.map((e) => [e.time, e]))

    console.log(`Loop duration: ${maxDuration}s`)
    
    loopPartRef.current.loop = true
    loopPartRef.current.loopEnd = maxDuration

    loopPartRef.current.start(0)
    transport.start()

    setState((prev) => ({ ...prev, isPlaying: true }))
  }, [loops, playDrumNote, releaseAllNotes, initializeOutput])

  const stopPlayback = useCallback(() => {
    const transport = Tone.getTransport()
    
    // Release all held notes
    releaseAllNotes()
    
    // Stop all memo audio elements
    memoAudioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    
    if (loopPartRef.current) {
      loopPartRef.current.stop()
      loopPartRef.current.dispose()
      loopPartRef.current = null
    }
    
    transport.stop()
    transport.position = 0

    setState((prev) => ({ ...prev, isPlaying: false }))
  }, [releaseAllNotes])

  const togglePlayback = useCallback(() => {
    if (state.isPlaying) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }, [state.isPlaying, startPlayback, stopPlayback])

  const deleteLoop = useCallback((loopId: string) => {
    // Clean up memo audio element if exists
    const audio = memoAudioElementsRef.current.get(loopId)
    if (audio) {
      audio.pause()
      URL.revokeObjectURL(audio.src)
      memoAudioElementsRef.current.delete(loopId)
    }
    
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
    
    // Clean up all memo audio elements
    memoAudioElementsRef.current.forEach((audio) => {
      audio.pause()
      URL.revokeObjectURL(audio.src)
    })
    memoAudioElementsRef.current.clear()
    
    setLoops([])
    // Reset master loop duration so next recording starts fresh
    masterLoopDurationRef.current = null
    setMasterLoopDuration(null)
    setLoopProgress(0)
  }, [stopPlayback])

  const setTempo = useCallback((newTempo: number) => {
    Tone.getTransport().bpm.value = newTempo
    setState((prev) => ({ ...prev, tempo: newTempo }))
  }, [])

  const handleSetInstrument = useCallback((type: InstrumentType) => {
    setCurrentInstrument(type)
  }, [])

  const cycleInstrument = useCallback((direction: 'next' | 'prev') => {
    const instruments: InstrumentType[] = ['drums', 'bass', 'piano', 'guitar', 'synth', 'strings', 'brass', 'organ', 'voice', 'memo']
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

  const toggleMic = useCallback(() => {
    setMicEnabled(prev => {
      const newValue = !prev
      micEnabledRef.current = newValue
      if (!newValue) {
        setCurrentPitch(null)
        setAudioLevel(0)
      }
      return newValue
    })
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
      instrumentsRef.current.clear()
      instrumentEffectsRef.current.forEach((effect) => effect.dispose())
      instrumentEffectsRef.current = []
      if (drumKitRef.current) {
        drumKitRef.current.kick.dispose()
        drumKitRef.current.snare.dispose()
        drumKitRef.current.hihat.dispose()
        drumKitRef.current.effects.forEach(effect => effect.dispose())
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
    masterLoopDuration,
    loopProgress,
    initializeAudio,
    initializeOutput,
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
    toggleMic,
    micEnabled,
    setLoopVolume,
    transposeLoop,
    updateLoops,
  }
}




