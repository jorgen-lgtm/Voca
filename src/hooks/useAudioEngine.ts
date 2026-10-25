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

type DrumKit = {
  kick: Tone.MembraneSynth
  snare: Tone.NoiseSynth
  hihat: Tone.MetalSynth
}

function createDrumKit(masterVolume: Tone.Volume): DrumKit {
  const kickReverb = new Tone.Reverb({ decay: 0.5, wet: 0.2 }).connect(masterVolume)
  const snareReverb = new Tone.Reverb({ decay: 0.3, wet: 0.15 }).connect(masterVolume)
  const hihatReverb = new Tone.Reverb({ decay: 0.1, wet: 0.1 }).connect(masterVolume)

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.5 },
  }).connect(kickReverb)
  kick.volume.value = -6

  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 },
  }).connect(snareReverb)
  snare.volume.value = -10

  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(hihatReverb)
  hihat.volume.value = -15

  return { kick, snare, hihat }
}

const SOUNDFONT_URL = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite'

const INSTRUMENT_SOUNDFONTS: Record<InstrumentType, string> = {
  drums: 'synth_drum',
  bass: 'acoustic_bass',
  synth: 'synth_brass_1',
  piano: 'acoustic_grand_piano',
  pad: 'pad_2_warm',
  lead: 'lead_1_square',
}

async function createSampledInstrument(
  type: InstrumentType, 
  masterVolume: Tone.Volume
): Promise<Tone.Sampler | null> {
  if (type === 'drums') {
    return null
  }

  const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).connect(masterVolume)
  const soundfontName = INSTRUMENT_SOUNDFONTS[type]
  
  const notes = ['C2', 'C3', 'C4', 'C5', 'C6']
  const urls: Record<string, string> = {}
  
  notes.forEach(note => {
    const noteForUrl = note.replace('#', 's')
    urls[note] = `${SOUNDFONT_URL}/${soundfontName}-mp3/${noteForUrl}.mp3`
  })

  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls,
      baseUrl: '',
      onload: () => {
        console.log(`Loaded samples for ${type}`)
        resolve(sampler)
      },
      onerror: (err) => {
        console.warn(`Failed to load samples for ${type}, using fallback:`, err)
        resolve(createFallbackSynth(type, masterVolume))
      }
    }).connect(reverb)
  })
}

function createFallbackSynth(type: InstrumentType, masterVolume: Tone.Volume): Tone.Sampler {
  const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).connect(masterVolume)
  
  const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
  
  switch (type) {
    case 'bass':
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
      })
      break
    case 'piano':
      synth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.5 },
      })
      break
    case 'pad':
      synth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.9, release: 3 },
      })
      break
    case 'lead':
      synth.set({
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
      })
      break
    case 'synth':
    default:
      synth.set({
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5 },
      })
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
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('synth')

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const drumAnalyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const lowPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const highPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const aiReadyRef = useRef<boolean>(false)
  const instrumentsRef = useRef<Map<InstrumentType, Tone.Sampler | Tone.PolySynth | null>>(new Map())
  const drumKitRef = useRef<DrumKit | null>(null)
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
  const metronomeAudibleRef = useRef<boolean>(false)

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
      audioContextRef.current = new AudioContextClass()
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      console.log('AudioContext state:', audioContextRef.current.state)
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      // Filtered path for pitch detection (voice)
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
      
      // Unfiltered path for drum detection (full frequency range)
      drumAnalyserRef.current = audioContextRef.current.createAnalyser()
      drumAnalyserRef.current.fftSize = 4096
      drumAnalyserRef.current.smoothingTimeConstant = 0.3
      source.connect(drumAnalyserRef.current)
      
      console.log('Audio analysers initialized: pitch + drums')

      await tf.ready()
      console.log('TensorFlow.js ready:', tf.getBackend())
      aiReadyRef.current = true

      masterVolumeRef.current = new Tone.Volume(0).toDestination()

      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination()
      metronomeSynthRef.current.volume.value = -12

      drumKitRef.current = createDrumKit(masterVolumeRef.current)

      const instruments: InstrumentType[] = ['drums', 'bass', 'synth', 'piano', 'pad', 'lead']
      
      const loadPromises = instruments.map(async (type) => {
        const instrument = await createSampledInstrument(type, masterVolumeRef.current!)
        instrumentsRef.current.set(type, instrument)
      })
      
      await Promise.all(loadPromises)
      console.log('All instruments loaded')

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
    if (instrument && 'triggerAttackRelease' in instrument) {
      const noteName = midiToNoteName(midiNote)
      instrument.triggerAttackRelease(noteName, duration)
    }
  }, [currentInstrument])

  const detectDrumHit = useCallback((): { hit: boolean; drumType: 'kick' | 'snare' | 'hihat' | null } => {
    if (!drumAnalyserRef.current || !audioContextRef.current) {
      return { hit: false, drumType: null }
    }

    const bufferLength = drumAnalyserRef.current.fftSize
    const buffer = new Float32Array(bufferLength)
    drumAnalyserRef.current.getFloatTimeDomainData(buffer)

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
      return { hit: false, drumType: null }
    }

    const volumeThreshold = 0.03
    const spikeRatio = 1.5

    if (rms > volumeThreshold && rms > prevRms * spikeRatio) {
      lastDrumHitTimeRef.current = currentTime

      const freqData = new Uint8Array(drumAnalyserRef.current.frequencyBinCount)
      drumAnalyserRef.current.getByteFrequencyData(freqData)

      const sampleRate = audioContextRef.current.sampleRate
      const binSize = sampleRate / drumAnalyserRef.current.fftSize

      let lowEnergy = 0    // 20-250 Hz (kick)
      let midEnergy = 0    // 250-4000 Hz (snare)
      let highEnergy = 0   // 4000-12000 Hz (hihat/cymbal)

      for (let i = 0; i < freqData.length; i++) {
        const freq = i * binSize
        const energy = freqData[i] * freqData[i] // Square for emphasis

        if (freq >= 20 && freq < 250) {
          lowEnergy += energy
        } else if (freq >= 250 && freq < 4000) {
          midEnergy += energy
        } else if (freq >= 4000 && freq < 12000) {
          highEnergy += energy
        }
      }

      const total = lowEnergy + midEnergy + highEnergy
      if (total === 0) {
        return { hit: true, drumType: 'snare' }
      }

      const lowRatio = lowEnergy / total
      const midRatio = midEnergy / total
      const highRatio = highEnergy / total

      console.log(`Drum freq analysis - Low: ${(lowRatio*100).toFixed(1)}%, Mid: ${(midRatio*100).toFixed(1)}%, High: ${(highRatio*100).toFixed(1)}%`)

      let drumType: 'kick' | 'snare' | 'hihat'
      
      if (lowRatio > 0.4) {
        drumType = 'kick'
      } else if (highRatio > 0.25) {
        drumType = 'hihat'
      } else {
        drumType = 'snare'
      }

      console.log(`Detected: ${drumType}`)
      return { hit: true, drumType }
    }

    return { hit: false, drumType: null }
  }, [])

  const triggerDrumHit = useCallback((drumType: 'kick' | 'snare' | 'hihat' = 'snare') => {
    if (!drumKitRef.current) return

    switch (drumType) {
      case 'kick':
        drumKitRef.current.kick.triggerAttackRelease('C1', '8n')
        break
      case 'snare':
        drumKitRef.current.snare.triggerAttackRelease('8n')
        break
      case 'hihat':
        drumKitRef.current.hihat.triggerAttackRelease('C4', '32n')
        break
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
        const { hit, drumType } = detectDrumHit()
        if (hit && drumType) {
          const currentTime = Tone.now() - recordingStartTimeRef.current
          
          const drumMidiMap = { kick: 36, snare: 38, hihat: 42 }
          const midiNote = drumMidiMap[drumType]
          
          setLastDrumType(drumType)
          setTimeout(() => setLastDrumType(null), 300)
          
          recordingNotesRef.current.push({
            pitch: midiNote,
            velocity: 100,
            startTime: currentTime,
            duration: 0.1,
          })
          triggerDrumHit(drumType)
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
      const velocity = event.volume || 1
      
      if (event.instrument === 'drums' && drumKitRef.current) {
        const midiToDrum: Record<number, 'kick' | 'snare' | 'hihat'> = {
          36: 'kick',
          38: 'snare',
          42: 'hihat',
        }
        const drumType = midiToDrum[event.midiNote] || 'snare'
        
        const currentVolume = drumKitRef.current[drumType].volume.value
        drumKitRef.current[drumType].volume.value = currentVolume + (20 * Math.log10(velocity))
        
        switch (drumType) {
          case 'kick':
            drumKitRef.current.kick.triggerAttackRelease('C1', '8n', time)
            break
          case 'snare':
            drumKitRef.current.snare.triggerAttackRelease('8n', time)
            break
          case 'hihat':
            drumKitRef.current.hihat.triggerAttackRelease('C4', '32n', time)
            break
        }
        
        drumKitRef.current[drumType].volume.value = currentVolume
      } else {
        const instrument = instrumentsRef.current.get(event.instrument as InstrumentType)
        if (instrument && 'triggerAttackRelease' in instrument) {
          instrument.triggerAttackRelease(event.note, event.duration, time, velocity)
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

  const setLoopVolume = useCallback((loopId: string, volume: number) => {
    setLoops((prev) => prev.map((loop) => 
      loop.id === loopId ? { ...loop, volume: Math.max(0, Math.min(1, volume)) } : loop
    ))
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
    lastDrumType,
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
    toggleMetronomeAudio,
    setLoopVolume,
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
