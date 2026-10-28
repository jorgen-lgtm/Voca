'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LooperCanvas } from '@/components/looper'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { AdBanner } from '@/components/ads'
import { shouldShowAds } from '@/config/limits'
import { FREE_BETA_MODE } from '@/config/beta'
import { buildProjectSnapshot } from '@/lib/project-snapshot'
import type { RecordedLoop } from '@/types/audio'

export default function HomePage() {
  const { user, loading, signOut, isPro } = useAuth()
  const { createProject, saveLoopsToProject, loading: saving, error: saveError } = useProjects()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [pendingLoops, setPendingLoops] = useState<RecordedLoop[]>([])
  const [pendingTempo, setPendingTempo] = useState(120)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const confirmingSaveRef = useRef(false)
  const router = useRouter()

  const handleSave = async (loops: RecordedLoop[], tempo: number) => {
    if (!user) {
      router.push('/login')
      return
    }

    setPendingProjectId(null)
    setSnapshotError(null)
    setPendingLoops(loops)
    setPendingTempo(tempo)
    setProjectTitle(`Loop Session ${new Date().toLocaleDateString('sv-SE')}`)
    setShowSaveModal(true)
  }

  const handleConfirmSave = async () => {
    if (confirmingSaveRef.current) return
    confirmingSaveRef.current = true
    try {
    if (!projectTitle.trim()) return

    try { buildProjectSnapshot('', pendingLoops) } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : 'Cannot save project')
      return
    }
    const project = pendingProjectId ? { id: pendingProjectId } : await createProject(projectTitle.trim(), pendingTempo, isPro)
    if (project) {
      setPendingProjectId(project.id)
      const success = await saveLoopsToProject(project.id, pendingLoops, pendingTempo)
      if (success) {
        setSaveSuccess(true)
        setTimeout(() => {
          setShowSaveModal(false)
          setSaveSuccess(false)
          setProjectTitle('')
        }, 1500)
      }
    }
    } finally {
      confirmingSaveRef.current = false
    }
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
            {(FREE_BETA_MODE || isPro) && (
              <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                {FREE_BETA_MODE ? 'BETA' : 'PRO'}
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
                  {FREE_BETA_MODE ? 'Free Beta' : isPro ? 'Pro Member' : 'Free Plan'}
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => router.push('/projects')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                >
                  My Projects
                </button>
                {!FREE_BETA_MODE && !isPro && (
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

      {/* Ad Banner for free users */}
      {!FREE_BETA_MODE && shouldShowAds(isPro) && (
        <AdBanner isPro={isPro} position="bottom" />
      )}

      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {saveSuccess ? (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h3 className="text-lg font-medium text-white">Project Saved!</h3>
                  <p className="text-sm text-gray-400 mt-1">Your loops have been saved successfully.</p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Save Project</h2>
                    <button
                      onClick={() => setShowSaveModal(false)}
                      disabled={saving}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="project-title" className="block text-sm font-medium text-gray-300 mb-2">
                        Project Name
                      </label>
                      <input
                        id="project-title"
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="Enter project name..."
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        disabled={saving}
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        {pendingLoops.length} {pendingLoops.length === 1 ? 'track' : 'tracks'}
                      </span>
                      <span>•</span>
                      <span>{pendingTempo} BPM</span>
                    </div>

                    {snapshotError && <p role="alert" className="text-red-300">{snapshotError}</p>}
                    {saveError && (
                      <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                        <p className="text-sm text-red-300">{saveError}</p>
                        {saveError.includes('limit') && !FREE_BETA_MODE && !isPro && (
                          <button
                            onClick={() => router.push('/upgrade')}
                            className="mt-2 text-xs font-medium text-purple-400 hover:text-purple-300"
                          >
                            Upgrade to Pro →
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <motion.button
                        onClick={() => setShowSaveModal(false)}
                        disabled={saving}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gray-700/50 text-gray-300 font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={handleConfirmSave}
                        disabled={saving || !projectTitle.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <motion.div
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            Saving...
                          </>
                        ) : (
                          'Save Project'
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

