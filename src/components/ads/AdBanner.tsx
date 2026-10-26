'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AD_CONFIG } from '@/config/ads'
import Link from 'next/link'

interface AdBannerProps {
  isPro: boolean
  position?: 'top' | 'bottom'
  className?: string
}

export function AdBanner({ isPro, position = 'bottom', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const [adLoaded, setAdLoaded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show ads to Pro users
    if (isPro) return
    
    // In production with AdSense configured, load the ad
    if (!AD_CONFIG.testMode && typeof window !== 'undefined') {
      try {
        // @ts-expect-error - AdSense global
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        setAdLoaded(true)
      } catch (e) {
        console.warn('AdSense not loaded:', e)
      }
    } else {
      // Test mode - show placeholder
      setAdLoaded(true)
    }
  }, [isPro])

  // Don't render for Pro users
  if (isPro || dismissed) return null

  const positionClasses = position === 'top' 
    ? 'top-0 pt-safe' 
    : 'bottom-0 pb-safe'

  return (
    <AnimatePresence>
      {adLoaded && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          className={`fixed left-0 right-0 ${positionClasses} z-40 ${className}`}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 px-4 py-2">
            {AD_CONFIG.testMode ? (
              // Placeholder ad for development
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                      ⭐
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">
                        Uppgradera till Pro - Ingen reklam + obegränsade loopar
                      </p>
                      <p className="text-xs text-gray-400">
                        Stöd utvecklingen och lås upp alla funktioner
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/upgrade"
                      className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Uppgradera
                    </Link>
                    <button
                      onClick={() => setDismissed(true)}
                      className="p-1.5 text-gray-500 hover:text-white transition-colors"
                      aria-label="Stäng"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Real AdSense ad
              <div className="max-w-4xl mx-auto">
                <ins
                  ref={adRef}
                  className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client={AD_CONFIG.adsensePublisherId}
                  data-ad-slot={AD_CONFIG.slots.banner}
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
