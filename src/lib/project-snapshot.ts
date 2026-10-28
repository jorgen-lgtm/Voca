import type { RecordedLoop } from '@/types/audio'

export function buildProjectSnapshot(projectId: string, loops: RecordedLoop[]) {
  if (loops.some(loop => loop.instrumentType === 'memo')) {
    throw new Error('Memo audio cannot yet be saved to projects. Your recording remains in this session; no tracks were changed.')
  }
  if (new Set(loops.map(loop => loop.id)).size !== loops.length) {
    throw new Error('Duplicate loop IDs; no tracks were changed.')
  }
  return loops.map(loop => ({
    id: loop.id,
    project_id: projectId,
    instrument_type: loop.instrumentType,
    midi_data: { notes: loop.notes, duration: loop.duration, volume: loop.volume ?? 1 },
    is_muted: (loop.volume ?? 1) === 0,
  }))
}
