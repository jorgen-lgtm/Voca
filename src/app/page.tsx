'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LooperCanvas } from '@/components/looper'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const { user, profile, loading, signOut, isPro } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    console.log('Saving project...')
  }

  const handleExport = async () => {
    if (!isPro) {
      alert('Export to MIDI requires a Pro subscription')
      return
    }
    console.log('Exporting MIDI...')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <main className="relative min-h-screen">
      {user && (
        <div className="absolute top-4 right-4 z-20">
          <motion.button
            onClick={() => setShowUserMenu(!showUserMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-800/60 border border-gray-700/50"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
              {user.email?.[0].toUpperCase()}
            </div>
            {isPro && (
              <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                PRO
              </span>
            )}
          </motion.button>

          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 w-48 rounded-xl bg-gray-800 border border-gray-700 shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-700">
                <div className="text-sm font-medium text-white truncate">
                  {user.email}
                </div>
                <div className="text-xs text-gray-400">
                  {isPro ? 'Pro Member' : 'Free Plan'}
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => router.push('/projects')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                >
                  My Projects
                </button>
                {!isPro && (
                  <button
                    onClick={() => router.push('/upgrade')}
                    className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-gray-700/50"
                  >
                    Upgrade to Pro
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700/50"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!user && (
        <div className="absolute top-4 right-4 z-20">
          <motion.button
            onClick={() => router.push('/login')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium"
          >
            Sign In
          </motion.button>
        </div>
      )}

      <LooperCanvas onSave={handleSave} isPro={isPro} />
    </main>
  )
}
