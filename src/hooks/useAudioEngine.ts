'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import * as Pitchfinder from 'pitchfinder'
import type { InstrumentType, MidiNote } from '@/types/database'
import type { AudioEngineState, PitchDetectionResult, RecordedLoop } from '@/types/audio'
import { SOUNDFONT_BASE_URL, INSTRUMENT_MAP, DRUM_SAMPLES, getInstrumentConfig } from '@/config/instruments'

function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69)
}

function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = notes[midi % 12]
  return `${note}${octave}`
}

type DrumSampler = {
  sampler: Tone.Sampler
  loaded: boolean
}

async function createDrumSampler(masterVolume: Tone.Volume): Promise<DrumSampler> {
  const reverb = new Tone.Reverb({ decay: 0.8, wet: 0.15 }).connect(masterVolume)
  const compressor = new Tone.Compressor(-20, 4).connect(reverb)
  
  const urls: Record<string, string> = {}
  
  Object.entries(DRUM_SAMPLES).forEach(([name, config]) => {
    const noteName = midiToNoteName(config.midiNote)
    urls[noteName] = config.url
  })

  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls,
      onload: () => {
        console.log('Drum sampler loaded')
        resolve({ sampler, loaded: true })
      },
      onerror: (err) => {
        console.warn('Failed to load drum samples:', err)
        resolve({ sampler, loaded: false })
      }
    }).connect(compressor)
  })
}

async function createInstrumentSampler(
  type: InstrumentType, 
  masterVolume: Tone.Volume
): Promise<Tone.Sampler> {
  if (type === 'drums') {
    const drumSampler = await createDrumSampler(masterVolume)
    return drumSampler.sampler
  }

  const config = getInstrumentConfig(type)
  const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.25 }).connect(masterVolume)
  const compressor = new Tone.Compressor(-15, 3).connect(reverb)
  
  const notesToLoad = ['C2', 'E2', 'G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6']
  const urls: Record<string, string> = {}
  
  notesToLoad.forEach(note => {
    const noteForUrl = note.replace('#', 's')
    urls[note] = `${SOUNDFONT_BASE_URL}/${config.soundfont}-mp3/${noteForUrl}.mp3`
  })

  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls,
      baseUrl: '',
      release: type === 'guitar' ? 1.5 : 1,
      onload: () => {
        console.log(`Loaded ${type} sampler`)
        resolve(sampler)
      },
      onerror: (err) => {
        console.warn(`Failed to load ${type} samples:`, err)
        resolve(createFallbackSynth(type, compressor))
      }
    }).connect(compressor)
  })
}

function createFallbackSynth(type: InstrumentType, output: Tone.ToneAudioNode): Tone.Sampler {
  const synth = new Tone.PolySynth(Tone.Synth).connect(output)
  
  switch (type) {
    case 'bass':
      synth.set({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 } })
      break
    case 'piano':
      synth.set({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.5 } })
      break
    case 'guitar':
      synth.set({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.2, release: 1.2 } })
      break
    case 'strings':
      synth.set({ oscillator: { type: 'sine' }, envelope: { attack: 0.4, decay: 0.3, sustain: 0.8, release: 2 } })
      break
    case 'brass':
      synth.set({ oscillator: { type: 'square' }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.4 } })
      break
    case 'organ':
      synth.set({ oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3 } })
      break
    case 'drums':
      synth.set({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 } })
      break
    case 'synth':
    default:
      synth.set({ oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5 } })
  }

  return synth as unknown as Tone.Sampler
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
  const [lastDrumType, setLastDrumType] = useState<'kick' | 'snare' | 'hihat' | null>(null)
  const [loops, setLoops] = useState<RecordedLoop[]>(initialLoops)
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('piano')
  const [loadingInstruments, setLoadingInstruments] = useState<Set<InstrumentType>>(new Set())

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const pitchDetectorRef = useRef<((buffer: Float32Array) => number | null) | null>(null)
  const instrumentsRef = useRef<Map<InstrumentType, Tone.Sampler>>(new Map())
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

  const loadInstrument = useCallback(async (type: InstrumentType) => {
    if (instrumentsRef.current.has(type) || !masterVolumeRef.current) return

    setLoadingInstruments(prev => new Set(prev).add(type))
    
    try {
      const sampler = await createInstrumentSampler(type, masterVolumeRef.current)
      instrumentsRef.current.set(type, sampler)
    } catch (err) {
      console.error(`Failed to load instrument ${type}:`, err)
    }
    
    setLoadingInstruments(prev => {
      const next = new Set(prev)
      next.delete(type)
      return next
    })
  }, [])

  const initializeAudio = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported')
        alert('Din webbläsare stöder inte mikrofon-åtkomst. Prova Chrome eller Safari.')
        return false
      }

      await Tone.start()
      console.log('Tone.js started')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      })
      console.log('Got media stream')
      mediaStreamRef.current = stream

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass({ sampleRate: 44100 })
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      console.log('AudioContext state:', audioContextRef.current.state, 'Sample rate:', audioContextRef.current.sampleRate)
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.1
      source.connect(analyserRef.current)
      
      const sampleRate = audioContextRef.current.sampleRate
      console.log('Creating YIN pitch detector with sample rate:', sampleRate)
      
      pitchDetectorRef.current = Pitchfinder.YIN({ 
        sampleRate, 
        threshold: 0.2,
        probabilityThreshold: 0.1 
      })
      
      console.log('YIN pitch detector initialized')

      masterVolumeRef.current = new Tone.Volume(0).toDestination()

      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination()
      metronomeSynthRef.current.volume.value = -12

      const coreInstruments: InstrumentType[] = ['drums', 'bass', 'piano', 'guitar']
      
      setLoadingInstruments(new Set(coreInstruments))
      
      const loadPromises = coreInstruments.map(async (type) => {
        const instrument = await createInstrumentSampler(type, masterVolumeRef.current!)
        instrumentsRef.current.set(type, instrument)
      })
      
      await Promise.all(loadPromises)
      console.log('Core instruments loaded')
      
      setLoadingInstruments(new Set())

      Tone.getTransport().bpm.value = tempo

      setState((prev) => ({ ...prev, isInitialized: true }))
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

  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current || !pitchDetectorRef.current) {
      return null
    }

    const bufferLength = analyserRef.current.fftSize
    const buffer = new Float32Array(bufferLength)
    analyserRef.current.getFloatTimeDomainData(buffer)

    let rms = 0
    let maxVal = 0
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i]
      maxVal = Math.max(maxVal, Math.abs(buffer[i]))
    }
    rms = Math.sqrt(rms / buffer.length)

    const minVolume = 0.005
    if (rms < minVolume) {
      lastDetectedPitchRef.current = null
      pitchStabilityCountRef.current = 0
      setCurrentPitch(null)
      return null
    }

    const frequency = pitchDetectorRef.current(buffer)

    if (frequency && frequency > 65 && frequency < 1000) {
      const midiNote = frequencyToMidi(frequency)
      
      if (lastDetectedPitchRef.current === midiNote) {
        pitchStabilityCountRef.current++
      } else {
        pitchStabilityCountRef.current = 1
        lastDetectedPitchRef.current = midiNote
      }

      if (pitchStabilityCountRef.current >= 2) {
        const noteName = midiToNoteName(midiNote)
        const clarity = Math.min(rms * 15, 1)

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
          clarity: Math.min(rms * 15, 1),
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
  }, [])

  const triggerNote = useCallback((midiNote: number, duration: number = 0.3) => {
    const instrument = instrumentsRef.current.get(currentInstrument)
    if (instrument && 'triggerAttackRelease' in instrument) {
      const noteName = midiToNoteName(midiNote)
      instrument.triggerAttackRelease(noteName, duration)
    }
  }, [currentInstrument])

  const triggerDrumHit = useCallback((drumType: 'kick' | 'snare' | 'hihat' = 'snare') => {
    const drumSampler = instrumentsRef.current.get('drums')
    if (!drumSampler) return

    const drumConfig = DRUM_SAMPLES[drumType]
    const noteName = midiToNoteName(drumConfig.midiNote)
    drumSampler.triggerAttackRelease(noteName, '8n')
  }, [])

  const recordDrumHit = useCallback((drumType: 'kick' | 'snare' | 'hihat') => {
    if (!isRecordingRef.current) return
    
    const currentTime = Tone.now() - recordingStartTimeRef.current
    const drumConfig = DRUM_SAMPLES[drumType]
    
    recordingNotesRef.current.push({
      pitch: drumConfig.midiNote,
      velocity: 100,
      startTime: currentTime,
      duration: 0.1,
    })
    
    setLastDrumType(drumType)
    setTimeout(() => setLastDrumType(null), 200)
    
    triggerDrumHit(drumType)
  }, [triggerDrumHit])

  const startRecording = useCallback(() => {
    if (!state.isInitialized) return

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
  }, [state.isInitialized, state.isPlaying, currentInstrument, detectPitch, triggerNote])

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

  const startPlayback = useCallback(() => {
    if (loops.length === 0) return

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
      
      if (velocity <= 0) {
        return
      }
      
      const instrument = instrumentsRef.current.get(event.instrument as InstrumentType)
      if (instrument && 'triggerAttackRelease' in instrument) {
        instrument.triggerAttackRelease(event.note, event.duration, time, velocity)
      }
    }, partEvents.map((e) => [e.time, e]))

    const maxDuration = Math.max(...loops.map((l) => l.duration), 4)
    loopPartRef.current.loop = true
    loopPartRef.current.loopEnd = maxDuration

    loopPartRef.current.start(0)
    transport.start()

    setState((prev) => ({ ...prev, isPlaying: true }))
  }, [loops])

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

  const handleSetInstrument = useCallback(async (type: InstrumentType) => {
    setCurrentInstrument(type)
    if (!instrumentsRef.current.has(type) && masterVolumeRef.current) {
      await loadInstrument(type)
    }
  }, [loadInstrument])

  const cycleInstrument = useCallback((direction: 'next' | 'prev') => {
    const instruments: InstrumentType[] = ['drums', 'bass', 'piano', 'guitar', 'synth', 'strings', 'brass', 'organ']
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
    toggleMetronome,
    toggleMetronomeAudio,
    setLoopVolume,
    transposeLoop,
    updateLoops,
  }
}
