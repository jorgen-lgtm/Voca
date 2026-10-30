'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'

interface RecordButtonProps {
  isRecording: boolean
  isInitialized: boolean
  onPress?: () => void
  onRelease: () => void
  onInitialize: () => Promise<boolean>
  disabled?: boolean
}

export function RecordButton({
  isRecording,
  isInitialized,
  onPress,
  onRelease,
  onInitialize,
  disabled = false,
}: RecordButtonProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isHandlingRef = useRef(false)

  const handleInteraction = useCallback(async (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent double-handling
    if (isHandlingRef.current) return
    isHandlingRef.current = true
    setTimeout(() => { isHandlingRef.current = false }, 100)
    
    setError(null)
    
    if (!isInitialized) {
      setIsInitializing(true)
      try {
        const success = await onInitialize()
        if (success && onPress) {
          setTimeout(() => onPress(), 100)
        } else if (!success) {
          setError('Could not start audio')
        }
      } catch (err) {
        console.error('Init error:', err)
        setError('Allow microphone access')
      } finally {
        setIsInitializing(false)
      }
      return
    }

    if (isRecording) {
      onRelease()
    } else if (!disabled && onPress) {
      onPress()
    }
  }, [isInitialized, isRecording, onInitialize, onPress, onRelease, disabled])

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        style={{
          background: isRecording
            ? 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
        }}
        animate={{
          scale: isRecording ? [1, 1.3, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isRecording ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />

      <motion.button
        onPointerUp={handleInteraction}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        disabled={isInitializing || (disabled && !isRecording)}
        className={`relative w-28 h-28 rounded-full flex items-center justify-center touch-none select-none ${
          isInitializing
            ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
            : isRecording
              ? 'bg-gradient-to-br from-red-500 to-red-700'
              : disabled
                ? 'bg-gradient-to-br from-gray-500 to-gray-700'
                : 'bg-gradient-to-br from-purple-500 to-purple-700'
        } shadow-2xl disabled:opacity-60`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: isRecording
            ? [
                '0 0 20px rgba(239,68,68,0.5)',
                '0 0 40px rgba(239,68,68,0.8)',
                '0 0 20px rgba(239,68,68,0.5)',
              ]
            : disabled
              ? '0 0 10px rgba(100,100,100,0.3)'
              : '0 0 20px rgba(139,92,246,0.5)',
        }}
        transition={{
          boxShadow: {
            duration: 1,
            repeat: isRecording ? Infinity : 0,
          },
        }}
      >
        <div className="absolute inset-1 rounded-full bg-gray-900/30" />
        
        <motion.div
          className="relative z-10"
          animate={{
            scale: isRecording ? [1, 0.9, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: isRecording ? Infinity : 0,
          }}
        >
          {isRecording ? (
            <motion.div
              className="w-8 h-8 bg-white rounded-sm"
              initial={{ borderRadius: '4px' }}
            />
          ) : (
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </motion.div>

        {!isInitialized && !error && (
          <div className="absolute -bottom-8 text-xs text-gray-400 whitespace-nowrap">
            Tap to start
          </div>
        )}
        
        {error && (
          <div className="absolute -bottom-8 text-xs text-red-400 whitespace-nowrap">
            {error}
          </div>
        )}
        
        {isInitializing && (
          <div className="absolute -bottom-8 text-xs text-yellow-400 whitespace-nowrap animate-pulse">
            Starting...
          </div>
        )}

        {disabled && isInitialized && !isRecording && (
          <div className="absolute -bottom-8 text-xs text-yellow-400 whitespace-nowrap">
            Loop limit reached
          </div>
        )}
      </motion.button>
    </div>
  )
}

