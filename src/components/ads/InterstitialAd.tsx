'use client'

import { useEffect } from 'react'

interface InterstitialAdProps {
  isOpen: boolean
  onClose: () => void
  isPro: boolean
}

// Never display an ad-only interruption in the recording/navigation workflow.
export function InterstitialAd({ isOpen, onClose }: InterstitialAdProps) {
  useEffect(() => {
    if (isOpen) onClose()
  }, [isOpen, onClose])
  return null
}
