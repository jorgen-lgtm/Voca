const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
let checks = 0
const check = (value, expected) => { assert.equal(value, expected); checks++ }
function load(file, mocks = {}) {
  const filename = path.join(root, file)
  let code
  try { code = require('typescript').transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:1,target:9}}).outputText }
  catch { code = require('/opt/codex/cua_node/lib/node_modules/playwright/lib/transform/transform.js').transformHook(fs.readFileSync(filename,'utf8'),filename).code }
  const exports = {}
  const stream = {getTracks:()=>[{stop(){}}],getAudioTracks:()=>[{getSettings:()=>({})}]}
  class InputContext {
    state='running';sampleRate=48000
    resume=async()=>{this.state='running'}
    close=async()=>{this.state='closed'}
    createMediaStreamSource=()=>({connect(){}})
    createAnalyser=()=>({fftSize:4096,getFloatTimeDomainData:buffer=>buffer.fill(0)})
  }
  vm.runInNewContext(code,{exports,require(id){
    if (Object.hasOwn(mocks,id)) return mocks[id]
    if(id.startsWith('@/'))return load('src/'+id.slice(2)+'.ts',mocks)
    throw Error('Unexpected import '+id)
  },console:{log(){},warn(){},error(){}},setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  navigator:{userAgent:'iPhone test fixture',mediaDevices:{getUserMedia:async()=>stream}},window:{AudioContext:InputContext},alert(){},
  crypto:require('node:crypto').webcrypto,Float32Array,URL},{filename})
  return exports
}
function harness(renderHook) {
  const slots=[],effects=[];let cursor=0,current
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const react={
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
    useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})},
    useMemo(fn,deps){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={deps,value:fn()};return slots[i].value},
    useCallback(fn,deps){return react.useMemo(()=>fn,deps)},
    useEffect(fn,deps){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){const previous=slots[i];slots[i]={deps,fn,cleanup:previous?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn()})}},
  }
  function render(){cursor=0;current=renderHook(react);while(effects.length)effects.shift()();return current}
  return {react,render,get current(){return current},replayEffects(){for(const slot of slots)if(slot?.fn)slot.cleanup=slot.fn()},cleanup(){for(const slot of slots)if(slot?.cleanup){slot.cleanup();slot.cleanup=null}}}
}
function fixture(engineSource = 'src/hooks/useAudioEngine.ts'){
  const nodes=[],parts=[],triggers=[];let now=0,starts=0,startGate=null
  const context={state:'running',resume:async()=>{context.state='running'}}
  const transport={bpm:{value:120},state:'stopped',position:0,start(){this.state='started'},stop(){this.state='stopped'},scheduleRepeat:()=>1,clear(){}}
  class Node {
    constructor(...args){this.args=args;this.kind=this.constructor.name;this.disposed=false;this.disposals=0;this.volume={value:0,rampTo:v=>{this.volume.value=v}};nodes.push(this)}
    connect(target){this.target=target;return this}toDestination(){this.destination=true;return this}set(value){this.settings=value}start(){}stop(){}releaseAll(){}
    dispose(){if(!this.disposed)this.disposals++;this.disposed=true}
    triggerAttackRelease(...args){if(this.disposed)throw Error('Disposed instrument');triggers.push({node:this,args})}
  }
  class Part extends Node {constructor(callback,events){super();this.callback=callback;this.events=events;parts.push(this)} }
  const Tone={start:()=>{starts++;return startGate??Promise.resolve()},getContext:()=>context,getTransport:()=>transport,now:()=>now,getDraw:()=>({schedule:fn=>fn()}),Part}
  for(const name of ['Volume','Limiter','Synth','PolySynth','MonoSynth','MembraneSynth','NoiseSynth','MetalSynth','Compressor','EQ3','Reverb','Filter','Loop']) {
    Tone[name]={[name]:class extends Node{}}[name]
  }
  const mocks={tone:Tone,pitchfinder:{YIN:()=>()=>null},'@/lib/voice-pitch':{VoicePitchTracker:class{reset(){}update(){return null}},detectVoiceFrequency:()=>null,VOICE_YIN_SETTINGS:{}},'@/config/instruments':{getInstrumentConfig:()=>({color:'blue'})},'@/config/limits':{getMaxProjects:()=>Infinity,FREE_LIMITS:{}}}
  const loop={id:'track',instrumentType:'piano',notes:[{pitch:60,startTime:0,duration:.5,velocity:100}],duration:2,volume:.5,color:'blue'}
  let resolveRpc,saveError=false,revision=0
  mocks['@/lib/supabase/client']={createClient:()=>({rpc:async()=>new Promise(resolve=>{resolveRpc=()=>resolve(saveError?{data:null,error:{code:'42883',message:'fixture failure'}}:{data:++revision,error:null})})})}
  const h=harness(react=>{
    const deps={...mocks,react}
    const projects=load('src/hooks/useProjects.ts',deps).useProjects()
    const engine=load(engineSource,deps).useAudioEngine({initialLoops:[loop],tempo:120})
    return {engine,projects}
  })
  h.render()
  return {h,nodes,parts,triggers,context,loop,Tone,get starts(){return starts},setGate(p){startGate=p},setNow(t){now=t},completeSave(){resolveRpc()},failSave(){saveError=true},fire(){const p=parts.at(-1);for(const [,event]of p.events)p.callback(0,event)}}
}
async function main(){
  const levels=load('src/lib/audio-levels.ts')
  check(levels.PIANO_OUTPUT_DB,-6);check(levels.MASTER_LIMIT_DB,-1)
  check(levels.recordingOutputDb(false),0);check(levels.recordingOutputDb(true),-6)
  check(levels.noteGain(0,1),0);check(levels.noteGain(100,0),0)
  check(levels.noteGain(127,1),.8);check(levels.noteGain(NaN,1),0)
  check(levels.noteGain(100,.5)<levels.noteGain(100,1),true)
  const f=fixture();let engine=f.h.current.engine
  await engine.startPlayback();f.fire();check(f.triggers.length,1)
  const piano=f.triggers[0].node
  check(piano.volume.value,-6);check(f.triggers[0].args[3],levels.noteGain(100,.5))
  const master=f.nodes.find(n=>n.kind==='Volume')
  check(master.target.kind,'Limiter');check(master.target.args[0],-1)
  const count=f.nodes.filter(n=>n.kind!=='Part').length
  for(let i=0;i<2;i++){
    const saving=f.h.current.projects.saveLoopsToProject('project',[f.loop],135)
    f.h.render();check(f.h.current.projects.loading,true)
    check(f.nodes.filter(n=>n.kind!=='Part').length,count);check(piano.disposed,false)
    f.completeSave();check(await saving,true);f.h.render();check(f.h.current.projects.loading,false)
    await f.h.current.engine.startPlayback();f.fire();check(f.triggers.at(-1).node,piano)
    check(f.triggers.at(-1).args[3],levels.noteGain(100,.5))
  }
  f.failSave();const failed=f.h.current.projects.saveLoopsToProject('project',[f.loop],135)
  f.h.render();f.completeSave();check(await failed,false);f.h.render()
  await f.h.current.engine.startPlayback();f.fire();check(f.triggers.at(-1).node,piano)
  f.context.state='suspended';await f.h.current.engine.startPlayback();f.fire();check(f.context.state,'running');check(f.triggers.at(-1).node,piano)
  piano.dispose();await f.h.current.engine.startPlayback();f.fire();check(f.triggers.at(-1).node!==piano,true);check(f.triggers.at(-1).node.disposed,false)
  f.h.cleanup();f.h.replayEffects();f.h.render();await f.h.current.engine.startPlayback();f.fire();check(f.triggers.at(-1).node.disposed,false)
  check(f.h.current.engine.loops[0].id,'track');check(f.h.current.engine.loops[0].volume,.5)
  f.h.cleanup();check(f.nodes.every(n=>n.disposed),true)

  const denied=fixture();denied.context.state='suspended';denied.context.resume=async()=>{throw Error('Fixture resume failure')}
  await denied.h.current.engine.startPlayback();denied.h.render()
  check(denied.h.current.engine.state.isPlaying,false)
  check(typeof denied.h.current.engine.audioError,'string')
  check(denied.h.current.engine.loops[0].id,'track')
  check(denied.parts.length,0)
  denied.context.resume=async()=>{denied.context.state='running'}
  await denied.h.current.engine.startPlayback();denied.fire();denied.h.render()
  check(denied.triggers.length,1);check(denied.h.current.engine.audioError,null);denied.h.cleanup()

  const concurrent=fixture();await Promise.all([concurrent.h.current.engine.initializeOutput(),concurrent.h.current.engine.initializeOutput()])
  check(concurrent.starts,1);check(concurrent.nodes.filter(n=>n.kind==='Volume').length,1);concurrent.h.cleanup()
  const cancelled=fixture();let release;cancelled.setGate(new Promise(r=>{release=r}))
  const pending=cancelled.h.current.engine.startPlayback();cancelled.h.current.engine.stopPlayback();release();await pending
  check(cancelled.parts.length,0);cancelled.h.cleanup()
  const unmounted=fixture();let resume;unmounted.setGate(new Promise(r=>{resume=r}))
  const init=unmounted.h.current.engine.initializeOutput();unmounted.h.cleanup();resume();check(await init,false);check(unmounted.nodes.length,0)

  for(const mic of [false,true]){
    const record=fixture();if(!mic)record.h.current.engine.toggleMic()
    record.h.render();await record.h.current.engine.startRecording()
    const volume=record.nodes.find(n=>n.kind==='Volume')
    check(volume.volume.value,mic?-6:0)
    await record.h.current.engine.startPlayback();check(volume.volume.value,mic?-6:0)
    record.setNow(1);record.h.current.engine.recordKeyboardNote(60,.3);record.setNow(2)
    record.h.current.engine.stopRecording();check(volume.volume.value,0)
    record.h.cleanup()
  }
  console.log(`PASS audio regressions: ${checks} checks; actual hooks, mocked audio/DB: save/resave/failure, output recovery, gain staging, cancellation, teardown and microphone modes. Not a hardware listening test.`)
}
module.exports = { fixture }
if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1})
