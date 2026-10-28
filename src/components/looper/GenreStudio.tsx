'use client'

import { useEffect, useRef, useState } from 'react'
import type { RecordedLoop } from '@/types/audio'
import { getInstrumentConfig } from '@/config/instruments'
import {
  ARRANGEMENT_PARTS, MUSIC_GENRES, isArrangementPart, isMusicGenre,
  localGenrePlan, parseGenrePlan, parseGenreRequest, renderGenrePlan,
  type ArrangementPart, type GenrePlan, type GenreRequest, type MusicGenre,
} from '@/lib/genre-arrangement'

interface Props {
  loops: RecordedLoop[]
  tempo: number
  duration: number
  disabled: boolean
  canAdd: boolean
  onAdd: (loop: RecordedLoop) => void
}

export function GenreStudio({ loops, tempo, duration, disabled, canAdd, onAdd }: Props) {
  const [genre, setGenre] = useState<MusicGenre | 'auto'>('pop')
  const [part, setPart] = useState<ArrangementPart>('drums')
  const [action, setAction] = useState<'generate' | 'improve'>('generate')
  const [sourceId, setSourceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ plan: GenrePlan; input: GenreRequest; sourceId?: string; signature?: string; external: boolean } | null>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const sources = loops.filter(loop => loop.instrumentType !== 'memo' && loop.notes.length > 0)
  const source = sources.find(loop => loop.id === sourceId) ?? sources[0]
  const locked = disabled || busy
  const controls = 'w-full p-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm disabled:opacity-50'

  function makeInput(): GenreRequest {
    if (genre === 'auto' && !source) throw new Error('Spela in ett MIDI-spår först så att AI har ett musikaliskt underlag för genrevalet.')
    if (action === 'improve' && !source) throw new Error('Spela in ett MIDI-spår att förbättra först.')
    const actualPart = action === 'improve' && source
      ? source.instrumentType === 'drums' ? 'drums' : source.instrumentType === 'bass' ? 'bass'
        : source.instrumentType === 'strings' || source.instrumentType === 'organ' ? 'harmony' : 'melody'
      : part
    return parseGenreRequest({ genre, part: actualPart, action, tempo, duration: source?.duration ?? duration, notes: source?.notes ?? [] })
  }

  async function suggest(external: boolean) {
    if (locked || controller.current) return
    setError(null)
    setPreview(null)
    try {
      const input = makeInput()
      const sourceSnapshot = source ? JSON.stringify(source) : undefined
      if (!external) {
        setPreview({ plan: localGenrePlan(input), input, sourceId: source?.id, signature: sourceSnapshot, external })
        return
      }
      const abort = new AbortController()
      controller.current = abort
      setBusy(true)
      const response = await fetch('/api/genre-arrangement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input), signal: abort.signal,
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Logga in för att använda extern AI.'
          : response.status === 403 ? 'Bekräfta din e-post för att använda extern AI.'
          : response.status === 429 ? 'AI-gränsen är nådd. Prova senare eller välj ett lokalt mönster.'
          : response.status === 503 ? 'Extern AI är inte tillgänglig just nu. Du kan välja genre och skapa ett lokalt mönster.'
          : 'AI-förslaget kunde inte hämtas. Dina spår är oförändrade.')
      }
      const plan = parseGenrePlan(result, input)
      if (!abort.signal.aborted) setPreview({ plan, input, sourceId: source?.id, signature: sourceSnapshot, external })
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) setError(err instanceof Error ? err.message : 'Förslaget kunde inte skapas.')
    } finally {
      controller.current = null
      setBusy(false)
    }
  }

  function addVariant() {
    if (!preview || locked || !canAdd) return
    if (tempo !== preview.input.tempo || (!preview.sourceId && duration !== preview.input.duration)
      || (preview.sourceId && JSON.stringify(loops.find(l => l.id === preview.sourceId)) !== preview.signature)) {
      setError('Underlaget har ändrats. Skapa ett nytt förslag innan du lägger till det.')
      setPreview(null)
      return
    }
    const instrument = preview.input.action === 'improve' && preview.sourceId
      ? loops.find(l => l.id === preview.sourceId)!.instrumentType : ARRANGEMENT_PARTS[preview.input.part].instrument
    const config = getInstrumentConfig(instrument)
    onAdd({ id: crypto.randomUUID(), instrumentType: instrument, notes: renderGenrePlan(preview.plan, preview.input), duration: preview.input.duration, volume: .75, color: config.color })
    setPreview(null)
  }

  return (
    <section aria-label="Genre och arrangemang" className="mb-4 space-y-3 border-b border-gray-700 pb-4">
      <h3 className="font-medium text-white text-sm">Genre och arrangemang</h3>
      <label className="block text-xs text-gray-300">Musikgenre
        <select className={controls} value={genre} disabled={locked} onChange={e => { if (e.target.value === 'auto' || isMusicGenre(e.target.value)) { setGenre(e.target.value); setPreview(null) } }}>
          <option value="auto">Låt extern AI välja</option>
          {Object.entries(MUSIC_GENRES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="block text-xs text-gray-300">Vad vill du göra?
        <select className={controls} value={action} disabled={locked} onChange={e => { setAction(e.target.value === 'improve' ? 'improve' : 'generate'); setPreview(null) }}>
          <option value="generate">Skapa kompletterande spår</option>
          <option value="improve">Förbättra ett spår i vald genre</option>
        </select>
      </label>
      {sources.length > 0 && <label className="block text-xs text-gray-300">{action === 'improve' ? 'Spår att förbättra' : 'Musikaliskt underlag'}
        <select className={controls} value={source?.id ?? ''} disabled={locked} onChange={e => { setSourceId(e.target.value); setPreview(null) }}>
          {sources.map((loop, i) => <option key={loop.id} value={loop.id}>{i + 1}. {getInstrumentConfig(loop.instrumentType).name} ({loop.notes.length} noter)</option>)}
        </select>
      </label>}
      {action === 'generate' && <label className="block text-xs text-gray-300">Nytt spår
        <select className={controls} value={part} disabled={locked} onChange={e => { if (isArrangementPart(e.target.value)) { setPart(e.target.value); setPreview(null) } }}>
          {Object.entries(ARRANGEMENT_PARTS).map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}
        </select>
      </label>}
      <p className="text-xs text-gray-400">Extern AI får MIDI-noter och tempo, aldrig mikrofonljud. Genreförslag är en musikalisk tolkning. Originalspåret behålls.</p>
      <div className="flex gap-2">
        <button type="button" disabled={locked || !canAdd} onClick={() => suggest(true)} className="flex-1 p-2 rounded-lg bg-purple-600 text-white text-sm disabled:opacity-50">{busy ? 'AI arbetar…' : 'Skapa med extern AI'}</button>
        <button type="button" disabled={locked || !canAdd || genre === 'auto'} onClick={() => suggest(false)} className="flex-1 p-2 rounded-lg bg-gray-700 text-white text-sm disabled:opacity-50">Lokalt mönster</button>
      </div>
      {busy && <button type="button" className="text-sm text-gray-300 underline" onClick={() => controller.current?.abort()}>Avbryt väntan</button>}
      {!canAdd && <p className="text-xs text-amber-300">Ta bort ett spår innan du lägger till en variant.</p>}
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      {preview && <div role="status" className="rounded-lg bg-purple-900/30 p-3 space-y-2">
        <p className="text-sm text-white">{preview.external ? 'AI-förslag' : 'Lokalt mönster'}: {MUSIC_GENRES[preview.plan.genre]}</p>
        <p className="text-xs text-gray-300">{preview.plan.description}</p>
        <p className="text-xs text-gray-400">Ett fyrslagsmotiv upprepas över spårets längd. Lägg till som nytt spår och lyssna med uppspelningsknappen.</p>
        <button type="button" disabled={locked || !canAdd} onClick={addVariant} className="p-2 rounded-lg bg-green-700 text-white text-sm disabled:opacity-50">Lägg till variant</button>
        <button type="button" disabled={busy} onClick={() => setPreview(null)} className="ml-3 text-sm text-gray-300 underline">Kasta förslag</button>
      </div>}
    </section>
  )
}
