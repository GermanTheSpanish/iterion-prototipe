// Local-only interactive phrase audition. No assets are uploaded or included in the PWA.
// Original Space Drift WAVs remain in the browser File handles, not in app persistence.
import {readPcmHeader,decodePcmSegment} from './pcm-wav-stream.js';
import {identifyStem} from './stem-scenes.js';
import {estimateTempo,createCatalogue,buildArrangement,validatePhraseMap,ARRANGER_SCHEMA} from './phrase-arranger.js';

const byId=id=>document.getElementById(id);
const info=byId('phrase-status'),filesByStem=new Map(),headers=new Map(),sources=new Set();
const notes=byId('analysis'),catalogueTable=byId('catalogue'),bpmInput=byId('bpm'),offsetInput=byId('offset');
let catalogue=[],ctx=null,master=null,timer=null,generation=0,plan=null,startedAt=0,pending=false,scheduled=new Set(),underruns=0;
const show=s=>{info.textContent=s};
const number=(id,fallback)=>{const n=Number(byId(id).value);return Number.isFinite(n)?n:fallback};
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const basename=f=>String(f?.name||'');
function stop(){
 generation++;pending=false;scheduled.clear();
 if(timer!==null){clearInterval(timer);timer=null}
 for(const source of sources){try{source.stop()}catch{}try{source.disconnect()}catch{}}
 sources.clear();master?.disconnect();master=null;
 if(ctx){const old=ctx;ctx=null;old.close().catch(()=>{})}
 byId('stop-preview').disabled=true;
}
async function load(files){
 stop();filesByStem.clear();headers.clear();catalogue=[];
 const ignored=[],duplicate=[];
 for(const file of files){
  const id=identifyStem(file.name);
  if(!id||!/\.wav$/i.test(file.name)){ignored.push(file.name);continue}
  if(filesByStem.has(id)){duplicate.push(id);continue}
  filesByStem.set(id,file);
 }
 try{
  for(const [id,file] of filesByStem)headers.set(id,await readPcmHeader(file));
  if(headers.size!==6)throw new Error('Select all six original A–F PCM16 WAV stems.');
  const ref=headers.get('F');
  for(const [id,h] of headers)if(h.sampleRate!==ref.sampleRate||h.channels!==ref.channels||
   Math.abs(h.frames-ref.frames)>ref.sampleRate*.04)throw new Error('Stem '+id+' is not aligned with F Drum');
  show('Six aligned WAV stems loaded locally · '+fmt(ref.frames/ref.sampleRate)+' · '+ignored.length+' ignored · '+duplicate.length+' duplicates.');
  await analyzeDrums();
  refreshCatalogue();
 }catch(e){
  show('Cannot prepare stems: '+String(e.message||e));
  notes.textContent='Use the six original stereo PCM16 WAV stems, not the full mix or compressed variants.';
 }
}
async function analyzeDrums(){
 const h=headers.get('F'),f=filesByStem.get('F');
 const frames=Math.min(h.frames,Math.floor(h.sampleRate*48)),step=Math.max(1,Math.floor(h.sampleRate*.02));
 const data=await f.slice(h.dataOffset,h.dataOffset+frames*h.blockAlign).arrayBuffer();
 const view=new DataView(data),energies=[];
 for(let start=0;start+step<=frames;start+=step){
  let sum=0,n=0;
  for(let frame=start;frame<start+step;frame+=6){
   const s=view.getInt16(frame*h.blockAlign,true)/32768;sum+=s*s;n++;
  }
  energies.push(Math.sqrt(sum/Math.max(1,n)));
 }
 const result=estimateTempo(energies,step/h.sampleRate);
 notes.textContent='Drum onset estimate: '+(result.bpm||'?')+' BPM · correlation '+result.confidence.toFixed(2)+
  '. This is NOT a verified musical tempo or downbeat. Confirm by ear and adjust both fields.';
 if(result.confidence>.10&&result.bpm)bpmInput.value=String(result.bpm);
}
function refreshCatalogue(){
 const h=headers.get('F');if(!h)return;
 try{
  const prev=catalogue.map(c=>c.group);
  catalogue=createCatalogue({durationSeconds:h.frames/h.sampleRate,bpm:number('bpm',106),
   offsetSeconds:number('offset',0),groups:prev});
 }catch(error){notes.textContent=String(error.message||error);return}
 catalogueTable.replaceChildren();
 for(const item of catalogue){
  const row=document.createElement('tr');
  const range=document.createElement('td');range.textContent='S'+(item.id+1)+' · '+fmt(item.from)+'–'+fmt(item.to);
  const group=document.createElement('td'),input=document.createElement('input');
  input.value=item.group;input.maxLength=50;input.setAttribute('aria-label','Harmonic group for scene '+(item.id+1));
  input.addEventListener('change',()=>{
   const value=input.value.trim();
   if(!value){input.value=item.group;return}
   catalogue=catalogue.map(x=>x.id===item.id?{...x,group:value}:x);
  });
  group.appendChild(input);row.append(range,group);catalogueTable.appendChild(row);
 }
 byId('scene-count').max=Math.min(12,catalogue.length);
 byId('start-scene').max=catalogue.length-1;
 show('Phrase catalogue: '+catalogue.length+' eight-bar scenes. Default harmony groups are intentionally unique until reviewed.');
}
function makePlan(mode){
 const count=Math.min(catalogue.length,number('scene-count',4));
 return buildArrangement({catalogue,bpm:number('bpm',106),mode,count,
  startScene:number('start-scene',0),seed:number('seed',1),lead:byId('lead').value,
  events:byId('events').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)});
}
function printPlan(current){
 byId('phrase-plan').textContent=current.scenes.map(s=>
  'Scene '+(s.index+1)+' → source '+(s.sourceScene+1)+' · '+s.group+
  ' · lead '+s.lead+' · '+s.event+' · compatible '+s.alternativeCount).join('\n');
}
async function scheduleScene(scene,run){
 if(!ctx||run!==generation||scheduled.has(scene))return;
 scheduled.add(scene);
 const phrases=plan.phrases.filter(x=>x.scene===scene);
 const rate=headers.get('F').sampleRate;
 try{
  const prepared=await Promise.all(phrases.map(async phrase=>{
   const h=headers.get(phrase.stem),file=filesByStem.get(phrase.stem);
   const first=Math.round(phrase.sourceSeconds*rate),last=Math.round((phrase.sourceSeconds+phrase.durationSeconds)*rate);
   if(first<0||last>h.frames)throw new Error('Clip out of bounds: '+phrase.stem);
   const buffer=await decodePcmSegment(ctx,file,h,first,last-first);
   return {phrase,buffer};
  }));
  if(run!==generation||!ctx)return;
  for(const {phrase,buffer} of prepared){
   const originalAt=startedAt+phrase.destinationSeconds,now=ctx.currentTime+.035;
   const offset=Math.max(0,now-originalAt);
   if(offset>=buffer.duration){underruns++;continue}
   if(offset>.05)underruns++;
   const at=Math.max(originalAt,now),duration=buffer.duration-offset;
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   const target=phrase.stem==='F'?.46:phrase.stem==='D'?.23:.38;
   const fade=Math.min(phrase.stem==='F'?.018:phrase.stem==='D'?.20:.085,duration/4);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.linearRampToValueAtTime(target,at+fade);
   gain.gain.setValueAtTime(target,Math.max(at+fade,at+duration-fade));
   gain.gain.linearRampToValueAtTime(.0001,at+duration);
   source.buffer=buffer;source.connect(gain);gain.connect(master);
   sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect()};
   source.start(at,offset,duration);
  }
  const elapsed=Math.max(0,ctx.currentTime-startedAt);
  show('PLAYING '+plan.mode.toUpperCase()+' · '+plan.scenes.length+' scenes · '+fmt(elapsed)+' / '+fmt(plan.durationSeconds)+
   ' · underruns '+underruns);
 }catch(error){show('Clip loading error: '+String(error.message||error));stop()}
}
async function play(mode){
 if(headers.size!==6||!catalogue.length){show('Load the six original WAV stems first.');return}
 stop();
 plan=makePlan(mode);printPlan(plan);scheduled=new Set();underruns=0;
 const run=generation;
 try{
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  // Resume within this trusted tap before the first file read (iOS).
  const resume=ctx.resume();resume?.catch?.(()=>{});
  const limiter=ctx.createDynamicsCompressor();
  limiter.threshold.value=-7;limiter.knee.value=4;limiter.ratio.value=8;
  master=ctx.createGain();master.gain.value=Math.min(1,number('master-volume',70)/100);
  master.connect(limiter);limiter.connect(ctx.destination);
  pending=true;
  // Decode the first scene before setting the musical clock; no first-note underrun.
  const first=plan.phrases.filter(x=>x.scene===0);
  const rate=headers.get('F').sampleRate;
  const prepared=await Promise.all(first.map(async phrase=>{
   const h=headers.get(phrase.stem),frame=Math.round(phrase.sourceSeconds*rate);
   const last=Math.round((phrase.sourceSeconds+phrase.durationSeconds)*rate);
   return {phrase,buffer:await decodePcmSegment(ctx,filesByStem.get(phrase.stem),h,frame,last-frame)};
  }));
  if(run!==generation)return;
  startedAt=ctx.currentTime+.20;
  pending=false;byId('stop-preview').disabled=false;
  // First scene's clips are already decoded; subsequent scenes are streamed.
  for(const {phrase,buffer} of prepared){
   const at=startedAt+phrase.destinationSeconds,source=ctx.createBufferSource(),gain=ctx.createGain();
   const value=phrase.stem==='F'?.46:phrase.stem==='D'?.23:.38;
   const fade=phrase.stem==='F'?.018:phrase.stem==='D'?.20:.085;
   gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(value,at+fade);
   gain.gain.setValueAtTime(value,at+buffer.duration-fade);
   gain.gain.linearRampToValueAtTime(.0001,at+buffer.duration);
   source.buffer=buffer;source.connect(gain);gain.connect(master);
   sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect()};
   source.start(at);
  }
  scheduled.add(0);
  const pump=()=>{
   if(run!==generation||!ctx)return;
   const elapsed=ctx.currentTime-startedAt,scene=Math.floor(Math.max(0,elapsed)/plan.sceneSeconds);
   if(elapsed>=plan.durationSeconds+.15){stop();show('Preview finished · '+plan.mode+' · underruns '+underruns);return}
   // Load only one upcoming eight-bar scene at a time; bounded memory usage.
   const next=scene+1;
   if(next<plan.scenes.length&&!scheduled.has(next)&&
    startedAt+next*plan.sceneSeconds-ctx.currentTime<=8)void scheduleScene(next,run);
  };
  timer=setInterval(pump,250);pump();
  show('PLAYING '+mode.toUpperCase()+' · F drums / D pads / selected lead · '+plan.scenes.length+' scenes');
 }catch(error){stop();show('Cannot play: '+String(error?.message||error))}
}
function download(text,filename){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
byId('files').addEventListener('change',event=>{void load([...event.target.files]);});
byId('folder').addEventListener('change',event=>{void load([...event.target.files]);});
bpmInput.addEventListener('change',refreshCatalogue);
offsetInput.addEventListener('change',refreshCatalogue);
for(const mode of ['original','rearranged','adaptive'])byId('play-'+mode).addEventListener('click',()=>{void play(mode)});
byId('stop-preview').addEventListener('click',()=>{stop();show('Stopped')});
byId('export-phrases').addEventListener('click',()=>{
 if(!catalogue.length){show('Load the WAVs before exporting');return}
 const map={schema:ARRANGER_SCHEMA,bpm:number('bpm',106),offsetSeconds:number('offset',0),
  durationSeconds:headers.get('F').frames/headers.get('F').sampleRate,
  groups:catalogue.map(x=>x.group),seed:number('seed',1)};
 download(JSON.stringify({...map,preview:{mode:plan?.mode||'none',plan}},null,2),'MONOID_Phrase_Map.json');
 show('Phrase map exported · JSON contains editing metadata only, never music audio');
});
byId('import-phrases').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(!headers.size)throw new Error('Load the original WAVs before importing a phrase map');
  const settings=validatePhraseMap(JSON.parse(await file.text()));
  const duration=headers.get('F').frames/headers.get('F').sampleRate;
  if(Math.abs(settings.durationSeconds-duration)>.05)throw new Error('Map does not match WAV length');
  bpmInput.value=settings.bpm;offsetInput.value=settings.offsetSeconds;byId('seed').value=settings.seed;
  catalogue=createCatalogue({...settings,groups:settings.groups});
  refreshCatalogue();show('Phrase map imported · review harmonic groups before audition');
 }catch(error){show('Map import rejected: '+error.message)}
 finally{event.target.value=''}
});
window.addEventListener('pagehide',stop,{once:true});
