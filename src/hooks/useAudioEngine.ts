'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import * as tf from '@tensorflow/tfjs'
import type { InstrumentType, MidiNote } from '@/types/database'
import type { AudioEngineState, PitchDetectionResult, RecordedLoop } from '@/types/audio'

const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  drums: '#ef4444',
  bass: '#f97316',
  synth: '#8b5cf6',
  piano: '#3b82f6',
  pad: '#10b981',
  lead: '#ec4899',
}

function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69)
}

function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = notes[midi % 12]
  return `${note}${octave}`
}

function createInstrument(type: InstrumentType, masterVolume: Tone.Volume): Tone.PolySynth | Tone.MembraneSynth | Tone.NoiseSynth {
  const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).connect(masterVolume)
  
  switch (type) {
    case 'drums':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(reverb)
    case 'bass':
      return new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 2 },
      }).connect(reverb)
    case 'synth':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', spread: 20, count: 3 },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5 },
      }).connect(reverb)
    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 1.5 },
      }).connect(reverb)
    case 'pad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.9, release: 3 },
      }).connect(reverb)
    case 'lead':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
      }).connect(reverb)
    default:
      return new Tone.PolySynth(Tone.Synth).connect(reverb)
  }
}

interface UseAudioEngineProps {
  tempo?: number
  loopBars?: number
  initialLoops?: RecordedLoop[]
}

export function useAudioEngine({ tempo = 120, loopBars = 4, initialLoops = [] }: UseAudioEngineProps = {}) {
  const [state, setState] = useState<AudioEngineState & { metronomeEnabled: boolean }>({
    isInitialized: false,
    isRecording: false,
    isPlaying: false,
    currentBeat: 0,
    tempo,
    loopLength: loopBars * 4,
    metronomeEnabled: false,
  })

  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null)
  const [loops, setLoops] = useState<RecordedLoop[]>(initialLoops)
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('synth')

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const lowPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const highPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const aiReadyRef = useRef<boolean>(false)
  const instrumentsRef = useRef<Map<InstrumentType, Tone.PolySynth | Tone.MembraneSynth | Tone.NoiseSynth>>(new Map())
  const masterVolumeRef = useRef<Tone.Volume | null>(null)
  const recordingNotesRef = useRef<MidiNote[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const lastDrumHitTimeRef = useRef<number>(0)
  const prevRmsRef = useRef<number>(0)
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

  const initializeAudio = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported')
        alert('Din webbläsare stöder inte mikrofon-åtkomst. Prova Chrome eller Firefox.')
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream

      await Tone.start()
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      highPassFilterRef.current = audioContextRef.current.createBiquadFilter()
      highPassFilterRef.current.type = 'highpass'
      highPassFilterRef.current.frequency.value = 100
      highPassFilterRef.current.Q.value = 1.0
      
      lowPassFilterRef.current = audioContextRef.current.createBiquadFilter()
      lowPassFilterRef.current.type = 'lowpass'
      lowPassFilterRef.current.frequency.value = 800
      lowPassFilterRef.current.Q.value = 1.0
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.5
      
      source.connect(highPassFilterRef.current)
      highPassFilterRef.current.connect(lowPassFilterRef.current)
      lowPassFilterRef.current.connect(analyserRef.current)

      await tf.ready()
      console.log('TensorFlow.js ready:', tf.getBackend())
      aiReadyRef.current = true

      masterVolumeRef.current = new Tone.Volume(0).toDestination()

      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination()
      metronomeSynthRef.current.volume.value = -6

      const instruments: InstrumentType[] = ['drums', 'bass', 'synth', 'piano', 'pad', 'lead']
      instruments.forEach((type) => {
        instrumentsRef.current.set(type, createInstrument(type, masterVolumeRef.current!))
      })

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
    if (!analyserRef.current || !audioContextRef.current) {
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

    const minVolume = 0.025
    if (rms < minVolume) {
      lastDetectedPitchRef.current = null
      pitchStabilityCountRef.current = 0
      setCurrentPitch(null)
      return null
    }

    const frequency = autoCorrelate(buffer, audioContextRef.current.sampleRate)

    if (frequency > 0 && frequency > 80 && frequency < 800) {
      const midiNote = frequencyToMidi(frequency)
      
      if (lastDetectedPitchRef.current === midiNote) {
        pitchStabilityCountRef.current++
      } else {
        pitchStabilityCountRef.current = 1
        lastDetectedPitchRef.current = midiNote
      }

      if (pitchStabilityCountRef.current >= 3) {
        const noteName = midiToNoteName(midiNote)
        const clarity = Math.min(rms * 10, 1)

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
          clarity: Math.min(rms * 10, 1),
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
    if (instrument) {
      if (currentInstrument === 'drums' && instrument instanceof Tone.NoiseSynth) {
        instrument.triggerAttackRelease('8n')
      } else if ('triggerAttackRelease' in instrument) {
        const noteName = midiToNoteName(midiNote)
        ;(instrument as Tone.PolySynth).triggerAttackRelease(noteName, duration)
      }
    }
  }, [currentInstrument])

  const detectDrumHit = useCallback((): boolean => {
    if (!analyserRef.current || !audioContextRef.current) {
      return false
    }

    const bufferLength = analyserRef.current.fftSize
    const buffer = new Float32Array(bufferLength)
    analyserRef.current.getFloatTimeDomainData(buffer)

    let rms = 0
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i]
    }
    rms = Math.sqrt(rms / buffer.length)

    const prevRms = prevRmsRef.current
    prevRmsRef.current = rms

    const currentTime = Tone.now()
    const timeSinceLastHit = currentTime - lastDrumHitTimeRef.current
    const minTimeBetweenHits = 0.08

    if (timeSinceLastHit < minTimeBetweenHits) {
      return false
    }

    const volumeThreshold = 0.05
    const spikeRatio = 2.0

    if (rms > volumeThreshold && rms > prevRms * spikeRatio) {
      lastDrumHitTimeRef.current = currentTime
      return true
    }

    return false
  }, [])

  const triggerDrumHit = useCallback(() => {
    const instrument = instrumentsRef.current.get('drums')
    if (instrument && instrument instanceof Tone.NoiseSynth) {
      instrument.triggerAttackRelease('8n')
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!state.isInitialized) return

    wasPlayingBeforeRecordRef.current = state.isPlaying
    
    if (masterVolumeRef.current) {
      masterVolumeRef.current.volume.rampTo(-14, 0.1)
    }

    recordingNotesRef.current = []
    recordingStartTimeRef.current = Tone.now()
    lastNoteRef.current = null
    lastDrumHitTimeRef.current = 0
    prevRmsRef.current = 0
    isRecordingRef.current = true

    setState((prev) => ({ ...prev, isRecording: true }))

    const analyzeLoop = () => {
      if (!isRecordingRef.current) return

      if (currentInstrument === 'drums') {
        const isHit = detectDrumHit()
        if (isHit) {
          const currentTime = Tone.now() - recordingStartTimeRef.current
          recordingNotesRef.current.push({
            pitch: 36,
            velocity: 100,
            startTime: currentTime,
            duration: 0.1,
          })
          triggerDrumHit()
        }
      } else {
        const pitch = detectPitch()

        if (pitch && pitch.midiNote && pitch.clarity > 0.1) {
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
  }, [state.isInitialized, state.isPlaying, currentInstrument, detectPitch, detectDrumHit, triggerNote, triggerDrumHit])

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

    const newLoop: RecordedLoop = {
      id: crypto.randomUUID(),
      instrumentType: currentInstrument,
      notes: [...recordingNotesRef.current],
      duration: recordingDuration,
      color: INSTRUMENT_COLORS[currentInstrument],
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

    const allEvents: Array<{ time: number; note: string; duration: number; instrument: InstrumentType }> = []

    loops.forEach((loop) => {
      if (loop.notes.length > 0) {
        loop.notes.forEach((note) => {
          allEvents.push({
            time: note.startTime,
            note: midiToNoteName(note.pitch),
            duration: note.duration,
            instrument: loop.instrumentType,
          })
        })
      }
    })

    const partEvents = allEvents.map((e) => ({
      time: e.time,
      note: e.note,
      duration: e.duration,
      instrument: e.instrument,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loopPartRef.current = new Tone.Part((time: number, event: any) => {
      const instrument = instrumentsRef.current.get(event.instrument as InstrumentType)
      if (instrument) {
        if (event.instrument === 'drums' && instrument instanceof Tone.NoiseSynth) {
          instrument.triggerAttackRelease('8n', time)
        } else if ('triggerAttackRelease' in instrument) {
          ;(instrument as Tone.PolySynth).triggerAttackRelease(event.note, event.duration, time)
        }
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

  const clearAllLoops = useCallback(() => {
    stopPlayback()
    setLoops([])
  }, [stopPlayback])

  const setTempo = useCallback((newTempo: number) => {
    Tone.getTransport().bpm.value = newTempo
    setState((prev) => ({ ...prev, tempo: newTempo }))
  }, [])

  const cycleInstrument = useCallback((direction: 'next' | 'prev') => {
    const instruments: InstrumentType[] = ['drums', 'bass', 'synth', 'piano', 'pad', 'lead']
    const currentIndex = instruments.indexOf(currentInstrument)
    let newIndex: number

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % instruments.length
    } else {
      newIndex = (currentIndex - 1 + instruments.length) % instruments.length
    }

    setCurrentInstrument(instruments[newIndex])
  }, [currentInstrument])

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
        if (metronomeSynthRef.current && metronomeEnabledRef.current) {
          const isDownbeat = beatCount % 4 === 0
          const note = isDownbeat ? 'C6' : 'G5'
          metronomeSynthRef.current.triggerAttackRelease(note, '32n', time)
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

      if (!state.isPlaying && !state.isRecording) {
        Tone.getTransport().stop()
      }
    }
  }, [state.isPlaying, state.isRecording])

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
      instrumentsRef.current.forEach((instrument) => instrument.dispose())
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
    loops,
    currentInstrument,
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
    setCurrentInstrument,
    triggerNote,
    toggleMetronome,
  }
}

function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length
  const MAX_SAMPLES = Math.floor(SIZE / 2)
  let bestOffset = -1
  let bestCorrelation = 0
  let foundGoodCorrelation = false
  const correlations = new Float32Array(MAX_SAMPLES)

  let rms = 0
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i]
  }
  rms = Math.sqrt(rms / SIZE)

  if (rms < 0.02) return -1

  let lastCorrelation = 1
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset])
    }
    correlation = 1 - correlation / MAX_SAMPLES
    correlations[offset] = correlation

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestOffset = offset
      }
    } else if (foundGoodCorrelation) {
      const shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset]
      return sampleRate / (bestOffset + 8 * shift)
    }
    lastCorrelation = correlation
  }

  if (bestCorrelation > 0.01) {
    return sampleRate / bestOffset
  }

  return -1
}
