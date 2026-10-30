'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LooperCanvas } from '@/components/looper'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import type { RecordedLoop } from '@/types/audio'

function LoadingSpinner() {
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

function ProjectPageContent() {
  const { user, loading: authLoading, isPro } = useAuth()
  const { loadProject, saveLoopsToProject, updateProjectTitle, currentProject, loading, error, convertTracksToLoops } = useProjects()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [loops, setLoops] = useState<RecordedLoop[]>([])
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && projectId) {
      loadProject(projectId).then((project) => {
        if (project) {
          setEditTitle(project.title)
          setLoops(convertTracksToLoops(project.tracks))
        }
      })
    }
  }, [user, projectId, loadProject, convertTracksToLoops])

  const handleSave = async (newLoops: RecordedLoop[], tempo: number) => {
    if (!currentProject) return
    await saveLoopsToProject(currentProject.id, newLoops, tempo)
  }

  const handleTitleSave = async () => {
    if (!currentProject || !editTitle.trim()) return
    if (await updateProjectTitle(currentProject.id, editTitle.trim())) setIsEditing(false)
  }

  if (authLoading || (loading && !currentProject)) {
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

  if (error && !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Project not found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <motion.button
            onClick={() => router.push('/projects')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium"
          >
            Back to Projects
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (!currentProject) {
    return null
  }

  return (
    <main className="relative min-h-screen">
      {error && <p role="alert" className="relative z-30 bg-red-950 p-3 text-red-100">{error}</p>}
      <header className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <motion.button
          onClick={() => router.push('/projects')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex min-h-11 shrink-0 items-center gap-2 px-3 py-2 rounded-full bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Projects</span>
        </motion.button>

        <div className="min-w-0">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex min-w-0 items-center gap-2"
            >
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                aria-label="Project name"
                className="min-h-11 min-w-0 flex-1 px-3 py-1.5 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <motion.button
                onClick={handleTitleSave}
                aria-label="Save project name"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.button>
              <motion.button
                onClick={() => setIsEditing(false)}
                aria-label="Cancel project name editing"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-gray-700/50 text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="title"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setIsEditing(true)}
              aria-label="Edit project name"
              title={currentProject.title}
              className="flex min-h-11 w-full min-w-0 items-center gap-2 text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              <span className="min-w-0 truncate">{currentProject.title}</span>
              <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
        </div>

        <div className="hidden w-24 sm:block" aria-hidden="true" />
      </header>

      <LooperCanvas
        onSave={handleSave}
        isPro={isPro}
        initialLoops={loops}
        initialTempo={currentProject.tempo}
      />
    </main>
  )
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProjectPageContent />
    </Suspense>
  )
}


