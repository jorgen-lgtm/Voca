import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useAudioEngine } from '../vendor/hooks/useAudioEngine'
import { exportLoopsToMidi } from '../vendor/lib/midi-export'
import type { RecordedLoop } from '../vendor/types/audio'
import type { InstrumentType } from '../vendor/types/database'
import { exportFile } from './export'
import './style.css'

const samples: RecordedLoop[] = ['piano','guitar'].map((type,i)=>({id:`poc-${i}`,instrumentType:type as InstrumentType,duration:2,color:'#6cf',volume:0.7,notes:[0,0.5,1,1.5].map((startTime,j)=>({pitch:60+i*7+j*2,startTime,duration:0.2,velocity:80}))}))

function Engine({log}:{log:(s:string)=>void}) {
  const engine=useAudioEngine({initialLoops:samples,tempo:120})
  const [busy,setBusy]=useState(false)
  const [recording,setRecording]=useState(false)
  const [clip,setClip]=useState<string>()
  const recorder=useRef<MediaRecorder|null>(null)
  const stream=useRef<MediaStream|null>(null)
  const disposed=useRef(false)
  const clipRef=useRef<string|undefined>(undefined)
  const pending=useRef(false)
  useEffect(()=>()=>{
    disposed.current=true
    if(recorder.current?.state==='recording') recorder.current.stop()
    stream.current?.getTracks().forEach(t=>t.stop())
    if(clipRef.current) URL.revokeObjectURL(clipRef.current)
  },[])
  async function run(action:()=>Promise<unknown>) {
    if(pending.current) return
    pending.current=true;setBusy(true)
    try {await action()} catch(e){log(`ERROR: ${e instanceof Error?e.message:String(e)}`)}
    finally {pending.current=false;if(!disposed.current)setBusy(false)}
  }
  async function record() {
    const started=performance.now()
    const input=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})
    if(disposed.current){input.getTracks().forEach(t=>t.stop());return}
    stream.current=input
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t))
    try {
      const rec=new MediaRecorder(input,mime?{mimeType:mime}:undefined)
      recorder.current=rec
      const chunks:Blob[]=[]
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
      rec.onstart=()=>log(`Microphone JS readiness: ${(performance.now()-started).toFixed(1)} ms; permission prompt included`)
      rec.onerror=()=>{log('Recorder error');input.getTracks().forEach(t=>t.stop());if(!disposed.current)setRecording(false)}
      rec.onstop=()=>{
        input.getTracks().forEach(t=>t.stop())
        if(disposed.current)return
        if(clipRef.current)URL.revokeObjectURL(clipRef.current)
        const url=URL.createObjectURL(new Blob(chunks,{type:rec.mimeType}))
        clipRef.current=url;setClip(url);setRecording(false);log(`Raw recording stopped: ${rec.mimeType}`)
      }
      input.getTracks().forEach(t=>t.onended=()=>{log('Microphone track ended');if(rec.state==='recording')rec.stop()})
      rec.start();setRecording(true)
    }catch(e){input.getTracks().forEach(t=>t.stop());throw e}
  }
  return <section>
    <p>Engine: {engine.state.isInitialized?'initialized':'idle'} · pitch: {engine.currentPitch?.noteName??'—'}</p>
    <select disabled={busy||recording||engine.state.isRecording} value={engine.currentInstrument} onChange={e=>engine.setCurrentInstrument(e.target.value as InstrumentType)}>{['piano','guitar','bass','strings','brass','organ','voice'].map(s=><option key={s}>{s}</option>)}</select>
    <button disabled={busy||recording} onClick={()=>void run(async()=>{await engine.triggerNote(60,0.3);log('Note requested; acoustic latency NOT measured')})}>Play C4</button>
    <button disabled={busy||recording||engine.state.isRecording} onClick={()=>void run(()=>engine.startPlayback())}>Start two loops</button>
    <button onClick={()=>engine.stopPlayback()}>Stop loops</button>
    <button disabled={busy||recording||engine.state.isRecording} onClick={()=>void run(async()=>{engine.stopPlayback();await record()})}>Record raw microphone</button>
    <button disabled={!recording} onClick={()=>recorder.current?.stop()}>Stop raw recording</button>
    {clip&&<audio controls src={clip}/>}
    <button disabled={busy||recording||engine.state.isRecording} onClick={()=>void run(async()=>{engine.stopPlayback();await engine.startRecording();log('Pitch capture requested; permission/engine errors may appear in native console')})}>Record pitched notes</button>
    <button disabled={!engine.state.isRecording} onClick={()=>{engine.stopRecording();log('Pitch recording stopped')}}>Stop pitched notes</button>
    <button disabled={busy||recording||engine.state.isRecording} onClick={()=>void run(()=>exportFile(exportLoopsToMidi(engine.loops,120),'humweave-poc.mid','audio/midi'))}>Export MIDI</button>
    <p>{engine.loops.length} loops. Raw audio and pitched-note capture are separate experiments. Use headphones.</p>
  </section>
}

function Prototype() {
  const [active,setActive]=useState(true)
  const [logs,setLogs]=useState<string[]>([])
  const log=(s:string)=>setLogs(old=>[...old.slice(-199),`${new Date().toISOString()} ${s}`])
  useEffect(()=>{
    const suspend=(reason:string)=>{setActive(false);log(`${reason}: engine unmounted; tap Resume to recreate. Unsaved session cleared.`)}
    const visibility=()=>{if(document.hidden)suspend('Document hidden')}
    document.addEventListener('visibilitychange',visibility)
    const listener=Capacitor.isNativePlatform()?NativeApp.addListener('appStateChange',({isActive})=>{if(!isActive)suspend('App inactive')}):null
    return()=>{document.removeEventListener('visibilitychange',visibility);void listener?.then(h=>h.remove())}
  },[])
  return <main><h1>HumWeave Mobile POC</h1><p>Local experimental audio only. No accounts, backend or AI. Device compatibility NOT VERIFIED.</p>
    {active?<Engine log={log}/>:<button onClick={()=>setActive(true)}>Resume with fresh engine</button>}
    <button onClick={()=>setActive(false)}>Release microphone / reset session</button>
    <button onClick={()=>void exportFile(new TextEncoder().encode(logs.join('\n')),'humweave-poc-log.txt','text/plain').catch(e=>log(String(e)))}>Export diagnostic log</button>
    <pre>{logs.join('\n')}</pre></main>
}
createRoot(document.getElementById('root')!).render(<Prototype/> )
