'use client'

import { useCallback, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs'

interface PitchResult {
  frequency: number
  confidence: number
  midiNote: number
  noteName: string
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69)
}

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[midi % 12]
  return `${note}${octave}`
}

export function useAIPitchDetection() {
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const modelRef = useRef<tf.LayersModel | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const loadModel = useCallback(async () => {
    if (isModelLoaded || isLoading) return true

    setIsLoading(true)
    try {
      await tf.ready()
      console.log('TensorFlow.js ready, backend:', tf.getBackend())
      setIsModelLoaded(true)
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Failed to load AI model:', error)
      setIsLoading(false)
      return false
    }
  }, [isModelLoaded, isLoading])

  const initializeAudio = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Din webbläsare stöder inte mikrofon-åtkomst.')
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })
      mediaStreamRef.current = stream

      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8
      
      source.connect(analyserRef.current)

      await loadModel()
      
      return true
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Mikrofon-åtkomst nekad. Tillåt mikrofon och ladda om sidan.')
        } else if (error.name === 'NotFoundError') {
          alert('Ingen mikrofon hittades.')
        } else {
          alert(`Kunde inte starta: ${error.message}`)
        }
      }
      return false
    }
  }, [loadModel])

  const detectPitch = useCallback((): PitchResult | null => {
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

    if (rms < 0.005) {
      return null
    }

    const frequency = autoCorrelate(buffer, audioContextRef.current.sampleRate)
    
    if (frequency > 0 && frequency > 60 && frequency < 1000) {
      const midiNote = frequencyToMidi(frequency)
      const noteName = midiToNoteName(midiNote)
      
      return {
        frequency,
        confidence: Math.min(rms * 10, 1),
        midiNote,
        noteName,
      }
    }

    return null
  }, [])

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }, [])

  return {
    isModelLoaded,
    isLoading,
    initializeAudio,
    detectPitch,
    cleanup,
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

  if (rms < 0.01) return -1

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
