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
  canEditVolume?: boolean
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
  canEditVolume = true,
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
        className="absolute flex items-center justify-center text-lg cursor-pointer select-none"
        style={{
          left: baseRadius + strokeWidth - 12,
          top: -8,
          width: 32,
          height: 32,
          zIndex: 100,
        }}
        animate={{
          scale: isPlaying ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isPlaying ? Infinity : 0,
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onTouchStart={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setShowVolume(!showVolume)
        }}
        onTap={() => {
          setShowVolume(!showVolume)
        }}
        whileTap={{ scale: 0.9 }}
        title="Klicka för volymkontroll"
      >
        {INSTRUMENT_ICONS[loop.instrumentType]}
      </motion.div>

      {showVolume && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed z-[1000] bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-purple-500/50"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: 200,
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{INSTRUMENT_ICONS[loop.instrumentType]}</span>
              <span className="text-lg font-bold text-white">{Math.round((loop.volume ?? 1) * 100)}%</span>
            </div>
            <button
              onClick={() => setShowVolume(false)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          {!canEditVolume ? (
            <div className="text-center py-4 text-amber-400 text-sm">
              ⏸️ Stoppa uppspelningen för att ändra volym
            </div>
          ) : (
            <>
              <input
                type="range"
                min="0"
                max="100"
                value={(loop.volume ?? 1) * 100}
                onChange={(e) => onVolumeChange?.(parseInt(e.target.value) / 100)}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 touch-none"
                style={{ WebkitAppearance: 'none' }}
              />
              
              <div className="flex justify-between mt-4 gap-2">
                <button
                  onClick={() => onVolumeChange?.(0)}
                  className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg transition-colors"
                >
                  🔇 Mute
                </button>
                <button
                  onClick={() => onVolumeChange?.(0.5)}
                  className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => onVolumeChange?.(1)}
                  className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg transition-colors"
                >
                  100%
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
