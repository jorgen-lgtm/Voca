'use client'

import { motion, useAnimation, useDragControls, PanInfo } from 'framer-motion'
import { useEffect, useRef, useCallback } from 'react'
import type { RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'

interface LoopRingProps {
  loop: RecordedLoop
  index: number
  isPlaying: boolean
  tempo: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export function LoopRing({
  loop,
  index,
  isPlaying,
  tempo,
  isSelected,
  onSelect,
  onDelete,
}: LoopRingProps) {
  const controls = useAnimation()
  const dragControls = useDragControls()
  const didDragRef = useRef(false)
  const ringRef = useRef<HTMLDivElement>(null)
  
  const baseRadius = 100 + index * 35
  const strokeWidth = 8
  const hitAreaWidth = 24 // Wider hit area for easier tapping
  
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
    if (info.offset.y < -80) {
      onDelete()
    }
  }

  // Only the stroke and icon initiate a drag; empty ring interiors stay transparent.
  const handlePointerDown = (event: React.PointerEvent) => {
    didDragRef.current = false
    dragControls.start(event)
  }

  // Handle click on the ring itself
  const handleRingClick = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    if (!didDragRef.current) onSelect()
  }, [onSelect])

  const notePositions = loop.notes.map((note) => {
    const angle = (note.startTime / loop.duration) * 360 - 90
    const radians = (angle * Math.PI) / 180
    const x = baseRadius * Math.cos(radians)
    const y = baseRadius * Math.sin(radians)
    return { x, y, note }
  })

  const opacity = (loop.volume ?? 1) === 0 ? 0.3 : 1

  return (
    <motion.div
      ref={ringRef}
      className="absolute"
      style={{
        width: baseRadius * 2 + strokeWidth * 2,
        height: baseRadius * 2 + strokeWidth * 2,
        opacity,
        willChange: isPlaying ? 'transform' : 'auto',
        pointerEvents: 'none', // Container doesn't capture clicks
      }}
      animate={controls}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      onDragStart={() => { didDragRef.current = true }}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
    >
      <svg
        width={baseRadius * 2 + strokeWidth * 2}
        height={baseRadius * 2 + strokeWidth * 2}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
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

        {/* Invisible hit area - wider stroke for easier tapping */}
        <circle
          role="button"
          tabIndex={0}
          aria-label={`Edit ${getInstrumentConfig(loop.instrumentType).name} track ${index + 1}`}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect()
            }
          }}
          cx={baseRadius + strokeWidth}
          cy={baseRadius + strokeWidth}
          r={baseRadius}
          fill="none"
          stroke="transparent"
          strokeWidth={hitAreaWidth}
          style={{ pointerEvents: 'stroke', cursor: 'pointer', touchAction: 'none' }}
          onClick={handleRingClick}
          onPointerDown={handlePointerDown}
        />

        {/* Visible ring */}
        <circle
          cx={baseRadius + strokeWidth}
          cy={baseRadius + strokeWidth}
          r={baseRadius}
          fill="none"
          stroke={isSelected ? '#a855f7' : `url(#gradient-${loop.id})`}
          strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
          strokeLinecap="round"
          filter={isPlaying || isSelected ? `url(#glow-${loop.id})` : undefined}
          opacity={0.8}
          style={{ pointerEvents: 'none' }}
        />

        {notePositions.map((pos, i) => (
          <circle
            key={i}
            cx={baseRadius + strokeWidth + pos.x}
            cy={baseRadius + strokeWidth + pos.y}
            r={4}
            fill={loop.color}
            opacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
        ))}
      </svg>

      {/* Instrument icon - also clickable */}
      <div
        className="absolute flex items-center justify-center text-lg select-none cursor-pointer"
        style={{
          left: baseRadius + strokeWidth - 12,
          top: -8,
          width: 24,
          height: 24,
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
        onClick={handleRingClick}
        onPointerDown={handlePointerDown}
      >
        {getInstrumentConfig(loop.instrumentType).icon}
      </div>
    </motion.div>
  )
}


