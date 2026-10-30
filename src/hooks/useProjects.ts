'use client'

import { useCallback, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildProjectSnapshot } from '@/lib/project-snapshot'
import type { MidiData, InstrumentType } from '@/types/database'
import type { RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'
import { getMaxProjects, FREE_LIMITS } from '@/config/limits'

interface Project {
  id: string
  user_id: string
  title: string
  tempo: number
  revision: number
  created_at: string
}

interface Track {
  id: string
  project_id: string
  instrument_type: InstrumentType
  midi_data: MidiData
  is_muted: boolean
  created_at: string
}

interface ProjectWithTracks extends Project {
  tracks: Track[]
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithTracks[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectWithTracks | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = useMemo(() => createClient(), [])
  const revisionsRef = useRef(new Map<string, number>())
  const savingRef = useRef(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        tracks (*)
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProjects(data as unknown as ProjectWithTracks[])
    }

    setLoading(false)
  }, [supabase])

  const createProject = useCallback(async (
    title: string, 
    tempo: number = 120,
    isPro: boolean = false
  ): Promise<Project | null> => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to create a project')
      setLoading(false)
      return null
    }

    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      setError(countError.message)
      setLoading(false)
      return null
    }

    const maxProjects = getMaxProjects(isPro)
    if ((count ?? 0) >= maxProjects) {
      setError(`Project limit reached (${FREE_LIMITS.MAX_PROJECTS}). Upgrade to Pro for unlimited projects.`)
      setLoading(false)
      return null
    }

    const { data, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title,
        tempo,
      } as never)
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return null
    }

    setLoading(false)
    return data as unknown as Project
  }, [supabase])

  const saveLoopsToProject = useCallback(async (
    projectId: string,
    loops: RecordedLoop[],
    tempo: number = 120
  ): Promise<boolean> => {
    if (savingRef.current) return false
    savingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const tracks = buildProjectSnapshot(projectId, loops)
      const { data, error: saveError } = await supabase.rpc('save_project_snapshot' as never, {
        p_project_id: projectId,
        p_tracks: tracks,
        p_tempo: tempo,
        p_expected_revision: revisionsRef.current.get(projectId) ?? 0,
        p_save_id: crypto.randomUUID(),
      } as never)
      if (saveError) {
        throw new Error(saveError.code === '40001'
          ? 'This project changed in another tab. Your edits remain here; reload the project separately before replacing them.'
          : 'Could not save. Your edits remain here and existing tracks were not replaced. ' + saveError.message)
      }
      if (!Number.isSafeInteger(data) || Number(data) < 0) throw new Error('Invalid save response. Reload before retrying.')
      revisionsRef.current.set(projectId, Number(data))
      setCurrentProject(prev => prev?.id === projectId ? { ...prev, tempo, revision: Number(data) } : prev)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project')
      return false
    } finally {
      savingRef.current = false
      setLoading(false)
    }
  }, [supabase])

  const loadProject = useCallback(async (projectId: string): Promise<ProjectWithTracks | null> => {
    setLoading(true)
    setError(null)

    const { data, error: loadError } = await supabase
      .from('projects')
      .select(`
        *,
        tracks (*)
      `)
      .eq('id', projectId)
      .single()

    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return null
    }

    const project = data as unknown as ProjectWithTracks
    revisionsRef.current.set(projectId, project.revision ?? 0)
    setCurrentProject(project)
    setLoading(false)
    return project
  }, [supabase])

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return false
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    setLoading(false)
    return true
  }, [supabase])

  const updateProjectTitle = useCallback(async (
    projectId: string,
    title: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('projects')
      .update({ title } as never)
      .eq('id', projectId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return false
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, title } : p))
    )
    setCurrentProject(prev => prev?.id === projectId ? { ...prev, title } : prev)
    setLoading(false)
    return true
  }, [supabase])

  const convertTracksToLoops = useCallback((tracks: Track[]): RecordedLoop[] => {
    return tracks.map((track) => ({
      id: track.id,
      instrumentType: track.instrument_type,
      notes: track.midi_data.notes,
      duration: track.midi_data.duration,
      color: getInstrumentColor(track.instrument_type),
      volume: track.is_muted ? 0 : track.midi_data.volume ?? 1,
    }))
  }, [])

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    createProject,
    saveLoopsToProject,
    loadProject,
    deleteProject,
    updateProjectTitle,
    convertTracksToLoops,
  }
}

function getInstrumentColor(type: InstrumentType): string {
  return getInstrumentConfig(type).color
}


