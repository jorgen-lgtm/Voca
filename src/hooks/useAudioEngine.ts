'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import PitchFinder from 'pitchfinder'
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

function createInstrument(type: InstrumentType): Tone.PolySynth | Tone.MembraneSynth {
  const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).toDestination()
  
  switch (type) {
    case 'drums':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
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
  const [state, setState] = useState<AudioEngineState>({
    isInitialized: false,
    isRecording: false,
    isPlaying: false,
    currentBeat: 0,
    tempo,
    loopLength: loopBars * 4,
  })

  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null)
  const [loops, setLoops] = useState<RecordedLoop[]>(initialLoops)
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('synth')

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const lowPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const highPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const pitchDetectorRef = useRef<ReturnType<typeof PitchFinder.Macleod> | null>(null)
  const instrumentsRef = useRef<Map<InstrumentType, Tone.PolySynth | Tone.MembraneSynth>>(new Map())
  const recordingNotesRef = useRef<MidiNote[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const lastNoteRef = useRef<{ midi: number; startTime: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const loopPartRef = useRef<Tone.Part | null>(null)
  const transportCallbackIdRef = useRef<number | null>(null)

  const initializeAudio = useCallback(async () => {
    try {
      await Tone.start()
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream

      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      highPassFilterRef.current = audioContextRef.current.createBiquadFilter()
      highPassFilterRef.current.type = 'highpass'
      highPassFilterRef.current.frequency.value = 80
      highPassFilterRef.current.Q.value = 0.7
      
      lowPassFilterRef.current = audioContextRef.current.createBiquadFilter()
      lowPassFilterRef.current.type = 'lowpass'
      lowPassFilterRef.current.frequency.value = 1200
      lowPassFilterRef.current.Q.value = 0.7
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.5
      
      source.connect(highPassFilterRef.current)
      highPassFilterRef.current.connect(lowPassFilterRef.current)
      lowPassFilterRef.current.connect(analyserRef.current)

      pitchDetectorRef.current = PitchFinder.Macleod({
        sampleRate: audioContextRef.current.sampleRate,
        cutoff: 0.9,
      })

      const instruments: InstrumentType[] = ['drums', 'bass', 'synth', 'piano', 'pad', 'lead']
      instruments.forEach((type) => {
        instrumentsRef.current.set(type, createInstrument(type))
      })

      Tone.getTransport().bpm.value = tempo

      setState((prev) => ({ ...prev, isInitialized: true }))
      return true
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      return false
    }
  }, [tempo])

  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !pitchDetectorRef.current || !audioContextRef.current) {
      return null
    }

    const bufferLength = analyserRef.current.fftSize
    const buffer = new Float32Array(bufferLength)
    analyserRef.current.getFloatTimeDomainData(buffer)

    let rms = 0
    let maxAmplitude = 0
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(buffer[i])
      rms += buffer[i] * buffer[i]
      if (abs > maxAmplitude) maxAmplitude = abs
    }
    rms = Math.sqrt(rms / buffer.length)

    const minVolume = 0.002
    if (rms < minVolume) {
      setCurrentPitch(null)
      return null
    }

    const pitchResult = pitchDetectorRef.current(buffer)

    if (pitchResult && pitchResult.freq > 60 && pitchResult.freq < 1500 && pitchResult.probability > 0.5) {
      const frequency = pitchResult.freq
      const midiNote = frequencyToMidi(frequency)
      const noteName = midiToNoteName(midiNote)
      const clarity = Math.min(rms * 12, 1)

      const result: PitchDetectionResult = {
        frequency,
        clarity,
        midiNote,
        noteName,
      }

      setCurrentPitch(result)
      return result
    }

    setCurrentPitch(null)
    return null
  }, [])

  const triggerNote = useCallback((midiNote: number, duration: number = 0.3) => {
    const instrument = instrumentsRef.current.get(currentInstrument)
    if (instrument) {
      const noteName = midiToNoteName(midiNote)
      if ('triggerAttackRelease' in instrument) {
        instrument.triggerAttackRelease(noteName, duration)
      }
    }
  }, [currentInstrument])

  const startRecording = useCallback(() => {
    if (!state.isInitialized) return

    recordingNotesRef.current = []
    recordingStartTimeRef.current = Tone.now()
    lastNoteRef.current = null
    isRecordingRef.current = true

    setState((prev) => ({ ...prev, isRecording: true }))

    const analyzeLoop = () => {
      if (!isRecordingRef.current) return

      const pitch = detectPitch()

      if (pitch && pitch.midiNote && pitch.clarity > 0.01) {
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

      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyzeLoop)
      }
    }

    analyzeLoop()
  }, [state.isInitialized, detectPitch, triggerNote])

  const stopRecording = useCallback((): RecordedLoop | null => {
    if (!isRecordingRef.current) return null

    isRecordingRef.current = false
    setState((prev) => ({ ...prev, isRecording: false }))

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
  }, [state.isRecording, currentInstrument])

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
      if (instrument && 'triggerAttackRelease' in instrument) {
        instrument.triggerAttackRelease(event.note, event.duration, time)
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
  }
}
