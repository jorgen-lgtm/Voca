'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MidiData, InstrumentType } from '@/types/database'
import type { RecordedLoop } from '@/types/audio'

interface Project {
  id: string
  user_id: string
  title: string
  tempo: number
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
  
  const supabase = createClient()

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

  const createProject = useCallback(async (title: string, tempo: number = 120): Promise<Project | null> => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to create a project')
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
    loops: RecordedLoop[]
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const tracksToInsert = loops.map((loop) => ({
      project_id: projectId,
      instrument_type: loop.instrumentType,
      midi_data: {
        notes: loop.notes,
        duration: loop.duration,
      } as MidiData,
      is_muted: false,
    }))

    const { error: insertError } = await supabase
      .from('tracks')
      .insert(tracksToInsert as never)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return false
    }

    setLoading(false)
    return true
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
  const colors: Record<InstrumentType, string> = {
    drums: '#ef4444',
    bass: '#f97316',
    synth: '#8b5cf6',
    piano: '#3b82f6',
    pad: '#10b981',
    lead: '#ec4899',
  }
  return colors[type]
}
