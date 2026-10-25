'use client'

import { motion, useAnimation, PanInfo } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { RecordedLoop } from '@/types/audio'
import type { InstrumentType } from '@/types/database'

interface LoopRingProps {
  loop: RecordedLoop
  index: number
  isPlaying: boolean
  tempo: number
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onDelete: () => void
  onVolumeChange?: (volume: number) => void
}

const INSTRUMENT_ICONS: Record<InstrumentType, string> = {
  drums: '🥁',
  bass: '🎸',
  synth: '🎹',
  piano: '🎼',
  pad: '🌊',
  lead: '🎺',
}

export function LoopRing({
  loop,
  index,
  isPlaying,
  tempo,
  onSwipeLeft,
  onSwipeRight,
  onDelete,
  onVolumeChange,
}: LoopRingProps) {
  const controls = useAnimation()
  const ringRef = useRef<HTMLDivElement>(null)
  const [showVolume, setShowVolume] = useState(false)
  
  const baseRadius = 100 + index * 35
  const strokeWidth = 8
  const circumference = 2 * Math.PI * baseRadius
  
  const rotationDuration = (60 / tempo) * 4 * (loop.duration / 4)

  useEffect(() => {
    if (isPlaying) {
      controls.start({
        rotate: 360,
        transition: {
          duration: rotationDuration,
          repeat: Infinity,
          ease: 'linear',
        },
      })
    } else {
      controls.stop()
    }
  }, [isPlaying, controls, rotationDuration])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    
    if (info.offset.x > threshold) {
      onSwipeRight()
    } else if (info.offset.x < -threshold) {
      onSwipeLeft()
    } else if (info.offset.y < -threshold) {
      onDelete()
    }
  }

  const notePositions = loop.notes.map((note) => {
    const angle = (note.startTime / loop.duration) * 360 - 90
    const radians = (angle * Math.PI) / 180
    const x = baseRadius * Math.cos(radians)
    const y = baseRadius * Math.sin(radians)
    return { x, y, note }
  })

  return (
    <motion.div
      ref={ringRef}
      className="absolute"
      style={{
        width: baseRadius * 2 + strokeWidth * 2,
        height: baseRadius * 2 + strokeWidth * 2,
      }}
      animate={controls}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
    >
      <svg
        width={baseRadius * 2 + strokeWidth * 2}
        height={baseRadius * 2 + strokeWidth * 2}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={`gradient-${loop.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={loop.color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={loop.color} stopOpacity="0.4" />
          </linearGradient>
          <filter id={`glow-${loop.id}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={baseRadius + strokeWidth}
          cy={baseRadius + strokeWidth}
          r={baseRadius}
          fill="none"
          stroke={`url(#gradient-${loop.id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={isPlaying ? `url(#glow-${loop.id})` : undefined}
          opacity={0.6}
        />

        {notePositions.map((pos, i) => (
          <motion.circle
            key={i}
            cx={baseRadius + strokeWidth + pos.x}
            cy={baseRadius + strokeWidth + pos.y}
            r={4}
            fill={loop.color}
            initial={{ scale: 0 }}
            animate={{
              scale: isPlaying ? [1, 1.5, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              delay: i * 0.05,
              repeat: isPlaying ? Infinity : 0,
              repeatDelay: rotationDuration - 0.3,
            }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute flex items-center justify-center text-lg cursor-pointer"
        style={{
          left: baseRadius + strokeWidth - 12,
          top: -8,
          width: 24,
          height: 24,
        }}
        animate={{
          scale: isPlaying ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isPlaying ? Infinity : 0,
        }}
        onClick={(e) => {
          e.stopPropagation()
          setShowVolume(!showVolume)
        }}
        title="Klicka för volymkontroll"
      >
        {INSTRUMENT_ICONS[loop.instrumentType]}
      </motion.div>

      {showVolume && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute z-50 bg-gray-800/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-gray-600/50"
          style={{
            left: baseRadius + strokeWidth + 20,
            top: baseRadius + strokeWidth - 40,
            minWidth: 120,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{INSTRUMENT_ICONS[loop.instrumentType]}</span>
            <span className="text-xs text-gray-300">{Math.round((loop.volume || 1) * 100)}%</span>
          </div>
          
          <input
            type="range"
            min="0"
            max="100"
            value={(loop.volume || 1) * 100}
            onChange={(e) => onVolumeChange?.(parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          
          <div className="flex justify-between mt-2 gap-1">
            <button
              onClick={() => onVolumeChange?.(0)}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              🔇
            </button>
            <button
              onClick={() => onVolumeChange?.(0.5)}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              50%
            </button>
            <button
              onClick={() => onVolumeChange?.(1)}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              100%
            </button>
            <button
              onClick={() => setShowVolume(false)}
              className="px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
