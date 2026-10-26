'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AD_CONFIG } from '@/config/ads'
import Link from 'next/link'

interface InterstitialAdProps {
  isOpen: boolean
  onClose: () => void
  isPro: boolean
}

export function InterstitialAd({ isOpen, onClose, isPro }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(5)
  const [canClose, setCanClose] = useState(false)

  useEffect(() => {
    if (!isOpen || isPro) return

    setCountdown(5)
    setCanClose(false)

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanClose(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, isPro])

  // Don't show to Pro users
  if (isPro) {
    if (isOpen) onClose()
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden border border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-b border-gray-700">
              <span className="text-xs text-gray-500">Annons</span>
              {canClose ? (
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Stäng ✕
                </button>
              ) : (
                <span className="text-xs text-gray-500">
                  Stäng om {countdown}s
                </span>
              )}
            </div>

            {/* Ad Content */}
            <div className="p-6">
              {!AD_CONFIG.hasRealAds ? (
                // Placeholder interstitial
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl">
                    🎵
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Gillar du HumWeave?
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Uppgradera till Pro för att ta bort reklam, få obegränsade loopar och stöd utvecklingen!
                  </p>
                  
                  <div className="space-y-3">
                    <Link
                      href="/upgrade"
                      onClick={onClose}
                      className="block w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-colors"
                    >
                      ⭐ Uppgradera till Pro
                    </Link>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span>✓</span> Ingen reklam
                      </div>
                      <div className="flex items-center gap-1">
                        <span>✓</span> Obegränsade loopar
                      </div>
                      <div className="flex items-center gap-1">
                        <span>✓</span> Export
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Real AdSense interstitial
                <div className="min-h-[250px] flex items-center justify-center">
                  <ins
                    className="adsbygoogle"
                    style={{ display: 'block', width: '100%', height: '250px' }}
                    data-ad-client={AD_CONFIG.adsensePublisherId}
                    data-ad-slot={AD_CONFIG.slots.interstitial}
                    data-ad-format="auto"
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
