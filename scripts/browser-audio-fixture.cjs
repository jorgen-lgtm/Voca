// Standalone acceptance fixture: run from a directory with Playwright installed.
// Starts a local fake Supabase API and the built app. No real account/database/AI call.
const { chromium } = require('playwright')
const http = require('node:http')
const fs = require('node:fs')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const OUT = '/vercel/qa/results'
const USER='10000000-0000-4000-8000-000000000001',PROJECT='20000000-0000-4000-8000-000000000001'
const title='Ett mycket långt projektnamn som aldrig får blockera AI-knappen på en liten telefon '.repeat(3)
const notes=[60,64,67,64].map((pitch,i)=>({pitch,velocity:100,startTime:i*.5,duration:.4}))
const projects=new Map([[PROJECT,{id:PROJECT,user_id:USER,title,tempo:120,revision:0,created_at:new Date().toISOString(),tracks:[{id:'30000000-0000-4000-8000-000000000001',project_id:PROJECT,instrument_type:'piano',midi_data:{notes,duration:2,volume:.6},is_muted:false}]}]])
const user={id:USER,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}}
const jwt=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:USER,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture-signature'
const session={access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user}
let failSave=false,saves=[]
const api=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',req.headers.origin||'*');res.setHeader('Access-Control-Allow-Credentials','true')
 res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,prefer,range');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,HEAD,OPTIONS');res.setHeader('Access-Control-Expose-Headers','content-range')
 if(req.method==='OPTIONS'){res.writeHead(204).end();return}
 let raw='';for await(const chunk of req)raw+=chunk
 const url=new URL(req.url,'http://127.0.0.1:4001');const body=raw?JSON.parse(raw):{}
 const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))}
 const single=String(req.headers.accept).includes('vnd.pgrst.object');const id=url.searchParams.get('id')?.replace(/^eq\./,'')
 if(url.pathname==='/auth/v1/user')return send(user)
 if(url.pathname==='/auth/v1/token')return send(session)
 if(url.pathname==='/rest/v1/users')return send(single?{...user,pro_status:false}:[{...user,pro_status:false}])
 if(url.pathname==='/rest/v1/projects'){
  if(req.method==='HEAD'){res.setHeader('Content-Range','0-0/'+projects.size);res.writeHead(200).end();return}
  if(req.method==='POST'){const p={...body,id:crypto.randomUUID(),revision:0,tracks:[],created_at:new Date().toISOString()};projects.set(p.id,p);return send(single?p:[p],201)}
  if(req.method==='PATCH'){Object.assign(projects.get(id),body);res.writeHead(204).end();return}
  const list=id?[projects.get(id)].filter(Boolean):[...projects.values()];return send(single?list[0]:list)
 }
 if(url.pathname==='/rest/v1/rpc/save_project_snapshot'){
  await new Promise(r=>setTimeout(r,200));if(failSave)return send({code:'XX000',message:'Fixture save failure'},503)
  const p=projects.get(body.p_project_id);if(p.revision!==body.p_expected_revision)return send({code:'40001',message:'Fixture stale revision'},409)
  p.tracks=body.p_tracks;p.tempo=body.p_tempo;p.revision++;saves.push(body);return send(p.revision)
 }
 send({error:'Unexpected fixture endpoint '+url.pathname},404)
})
const results=[],errors=[]
async function check(name,fn){const data=await fn();results.push({name,status:'PASS',data});console.log('PASS '+name)}
async function measure(page){return page.evaluate(async()=>{const a=window.__audioProbe;if(!a)throw Error('No audio probe');const data=new Float32Array(a.fftSize);let peak=0,energy=0,samples=0;for(let i=0;i<100;i++){a.getFloatTimeDomainData(data);for(const value of data){peak=Math.max(peak,Math.abs(value));energy+=value*value;samples++}await new Promise(r=>setTimeout(r,20))}return {rms:Math.sqrt(energy/samples),peak,state:a.context.state}})}
async function start(page){await page.locator('button.w-14.h-14').click();await page.waitForTimeout(180)}
async function stop(page){await page.locator('button.w-14.h-14').click();await page.waitForTimeout(80)}
async function setupContext(browser,viewport,mobile=false){
 const c=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile})
 const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')
 await c.addCookies([{name:'sb-127-auth-token',value,domain:'127.0.0.1',path:'/'}])
 await c.addInitScript(()=>{const probes=new WeakMap();const original=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){const result=original.call(this,destination,...args);if(destination instanceof AudioDestinationNode && this.context instanceof AudioContext){let analyser=probes.get(this.context);if(!analyser){analyser=this.context.createAnalyser();analyser.fftSize=2048;probes.set(this.context,analyser)}original.call(this,analyser);window.__audioProbe=analyser}return result}})
 return c
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});await new Promise(r=>api.listen(4001,'127.0.0.1',r))
 const server=spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3000'],{cwd:'/vercel/app',env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:4001',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon-key'},stdio:['ignore',fs.openSync(OUT+'/server.log','w'),fs.openSync(OUT+'/server-error.log','w')]})
 let browser
 try {
  let ready=false;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:3000');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}assert.ok(ready,'Local app did not start')
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']})
  const c=await setupContext(browser,{width:1440,height:1000});const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));p.on('console',msg=>{if(msg.type()==='warning'||msg.type()==='error')console.log('BROWSER '+msg.type()+' '+msg.text().slice(0,350))})
  await p.goto('http://127.0.0.1:3000/projects/'+PROJECT,{waitUntil:'networkidle'});await p.getByRole('button',{name:'AI',exact:true}).waitFor()
  let initial
  await check('Opened project produces measurable piano audio',async()=>{await start(p);initial=await measure(p);console.log('INITIAL_AUDIO '+JSON.stringify(initial));assert.ok(initial.rms>.0005);assert.ok(initial.peak<1);await stop(p);return initial})
  await check('Existing-project save and resave remain audible without reopening',async()=>{
   const measurements=[]
   for(let i=0;i<2;i++){const r=p.waitForResponse(r=>r.url().includes('/rpc/save_project_snapshot'));await p.getByRole('button',{name:'Save',exact:true}).click();await r;await start(p);const audio=await measure(p);assert.ok(audio.rms>.0005);assert.ok(audio.rms/initial.rms>.5&&audio.rms/initial.rms<2);await stop(p);measurements.push(audio)}
   assert.equal(saves.length,2);assert.equal(JSON.stringify(saves[0].p_tracks[0].midi_data.notes),JSON.stringify(notes));assert.equal(saves[1].p_tracks[0].midi_data.volume,.6);return measurements
  })
  await check('Failed save retains sound, source notes and track volume',async()=>{failSave=true;const response=p.waitForResponse(r=>r.url().includes('/rpc/save_project_snapshot'));await p.getByRole('button',{name:'Save',exact:true}).click();await response;await p.getByRole('alert').filter({hasText:'Could not save'}).waitFor();await start(p);const audio=await measure(p);assert.ok(audio.rms>.0005);await stop(p);failSave=false;return audio})
  await check('Suspended audio context resumes from Play gesture',async()=>{await p.evaluate(()=>window.__audioProbe.context.suspend());await start(p);const audio=await measure(p);assert.equal(audio.state,'running');assert.ok(audio.rms>.0005);await stop(p);return audio})
  await check('Long project-name editing retains a reachable AI target',async()=>{await p.getByRole('button',{name:'Edit project name'}).click();await p.getByLabel('Project name',{exact:true}).fill('X'.repeat(200));await p.getByRole('button',{name:'Save project name'}).click();await p.getByRole('button',{name:'Edit project name'}).waitFor();assert.equal(await p.getByRole('button',{name:'Edit project name'}).getAttribute('title'),'X'.repeat(200))})
  await check('First save from home retains the in-memory piano recording',async()=>{
   await p.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});await p.getByTitle('Microphone ON').click();await p.locator('button.w-28').click();await p.waitForTimeout(350)
   for(const key of ['a','d','g','d','s','f','g','a']){await p.keyboard.press(key);await p.waitForTimeout(200)}await p.locator('button.w-28').click();await p.getByRole('button',{name:'AI',exact:true}).waitFor()
   await start(p);const before=await measure(p);assert.ok(before.rms>.0005);await stop(p)
   await p.getByRole('button',{name:'Save',exact:true}).click();await p.getByLabel('Project Name',{exact:true}).fill('Fixture first save');const rpc=p.waitForResponse(r=>r.url().includes('/rpc/save_project_snapshot'));await p.getByRole('button',{name:'Save Project',exact:true}).click();await rpc;await p.getByText('Project Saved!',{exact:true}).waitFor();await p.waitForTimeout(1700)
   await start(p);const after=await measure(p);assert.ok(after.rms>.0005);assert.ok(after.rms/before.rms>.5&&after.rms/before.rms<2);await stop(p);return {before,after}
  })
  for(const viewport of [{width:320,height:640},{width:375,height:812},{width:390,height:844},{width:844,height:390}]){
   const mobile=await setupContext(browser,viewport,true);const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));m.setDefaultTimeout(10000)
   await check('AI hit-test and tap with long title at '+viewport.width+'x'+viewport.height,async()=>{
    await m.goto('http://127.0.0.1:3000/projects/'+PROJECT,{waitUntil:'networkidle'});const ai=m.getByRole('button',{name:'AI',exact:true});await ai.waitFor();await ai.scrollIntoViewIfNeeded()
    const geometry=await ai.evaluate(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height,reachable:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}})
    assert.ok(geometry.width>=44&&geometry.height>=44);assert.ok(geometry.reachable);assert.ok(geometry.scrollWidth<=geometry.viewport,'Horizontal overflow: '+JSON.stringify(geometry));await ai.tap();await m.getByRole('button',{name:/Polera/}).waitFor();await m.screenshot({path:OUT+'/mobile-'+viewport.width+'.jpg',type:'jpeg',quality:65,fullPage:true});return geometry
   });await mobile.close()
  }
  await check('Browser JavaScript errors',async()=>{assert.equal(errors.length,0);return errors})
 } finally {
  fs.writeFileSync(OUT+'/report.json',JSON.stringify({source:'isolated browser with mocked Supabase HTTP API; real WebAudio output measured',results,errors,notTested:['physical iPhone/Safari','real microphone loudness','live account/database save']},null,2))
  if(browser)await browser.close();server.kill();api.close()
 }
 console.log('BROWSER_PASS '+JSON.stringify({checks:results.length,errors}))
}
main().catch(e=>{console.error(e.stack);process.exitCode=1})
