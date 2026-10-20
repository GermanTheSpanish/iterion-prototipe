// Optional in-game Space Drift music. Purchased audio files never leave the user's device.
// The existing sample-locked Audio Lab transport is shared; gameplay state is read-only.
import {createStemPlayer} from './experiments/audio-lab/stem-player.js';
import {STEMS,identifyStem} from './experiments/audio-lab/stem-scenes.js';
import {analyseMachine,mixForMachine} from './music-morphology.js';

function installMusic(){
 const menu=document.getElementById('gameMenu');
 if(!menu||document.getElementById('musicSettings'))return;
 const player=createStemPlayer();
 const section=document.createElement('fieldset');
 section.id='musicSettings';section.className='routePreviewSetting';
 section.innerHTML=
  '<legend>Music · Space Drift</legend>'+
  '<p class="musicHelp">Adaptive local stems · F Drum leads the machine. Original WAVs remain on this device.</p>'+
  '<div class="musicActions">'+
  '<button type="button" id="musicFolderButton">FOLDER</button>'+
  '<button type="button" id="musicFilesButton">WAV FILES</button>'+
  '<button type="button" id="musicPlay">PLAY</button>'+
  '<button type="button" id="musicStop">STOP</button></div>'+
  '<label class="musicMaster">VOLUME <input type="range" id="musicVolume" min="0" max="100" value="55" step="5" aria-label="Music volume"></label>'+
  '<p id="musicStatus" class="musicStatus" role="status" aria-live="polite">Off · choose your local A–F WAV stems.</p>'+
  '<small>Music is optional. Choose files again after reloading the game.</small>';
 const style=document.createElement('style');style.id='monoid-music-styles';
 style.textContent=
  '#gameMenu>#musicSettings{order:7;display:none!important;margin:2px 0 6px;padding:6px 13px 12px;border:0}'+
  '#gameMenu[data-open-section="system"]>#musicSettings{display:block!important}'+
  '#musicSettings{text-align:left}'+
  '#musicSettings .musicHelp{font-size:10px;line-height:1.4;margin:5px 0 9px;opacity:.8}'+
  '#musicSettings .musicActions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}'+
  '#musicSettings .musicActions button{font:inherit;font-size:10px;font-weight:800;min-height:39px;min-width:0;padding:4px 2px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit}'+
  '#musicSettings .musicMaster{font-size:10px;display:flex;align-items:center;gap:12px;margin:10px 0}'+
  '#musicSettings .musicMaster input{min-width:0;flex:1}'+
  '#musicSettings .musicStatus{font-size:10px;line-height:1.4;min-height:28px;margin:6px 0}'+
  '#gameMenu>#musicSettings{order:8;display:none!important;margin:2px 0 6px;padding:6px 13px 12px;border:0}'+
  '#gameMenu[data-open-section="system"]>#musicSettings{display:block!important}';
 document.head.appendChild(style);
 const anchor=document.getElementById('gameSelectionButton');
 if(anchor)menu.insertBefore(section,anchor);else menu.appendChild(section);
 const files=document.createElement('input'),folder=document.createElement('input');
 for(const input of [files,folder]){
  input.type='file';input.accept='.wav,audio/wav';input.multiple=true;input.hidden=true;
  input.setAttribute('aria-label',input===folder?'Select stem folder':'Select WAV stems');
  section.appendChild(input);
 }
 files.id='musicFileInput';folder.id='musicFolderInput';
 folder.setAttribute('webkitdirectory','');folder.setAttribute('directory','');
 folder.webkitdirectory=true;
 const $=id=>section.querySelector('#'+id);
 const volume=$('musicVolume'),status=$('musicStatus');
 const show=text=>{status.textContent=text};
 let enabled=false,roundKey='',thinkingSeconds=0,lastSample=performance.now(),lastMix=null,lastValues=null,lastTelemetryAt=0;
 const current=()=>window.__monoidGame?.state?.()||null;
 const flow=()=>window.__monoidFlow?.screen||'entry';
 function diagnostic(type,detail={}){
  try{window.MonoidTelemetryEvents?.record?.(type,detail)}catch(_){}
 }
 function stop(reason='Stopped · stems remain loaded'){
  const wasPlaying=enabled||player.isPlaying();
  enabled=false;player.stop();show(reason);
  if(wasPlaying)diagnostic('music-stopped',{reason});
 }
 function available(){return new Set(player.loaded())}
 function load(list){
  stop();
  const found=new Map(),ignored=[],duplicates=[];
  for(const file of Array.from(list||[])){
   if(!/\.wav$/i.test(file.name)){ignored.push(file.name);continue}
   const id=identifyStem(file.name);
   if(!id){ignored.push(file.name);continue}
   if(found.has(id)){duplicates.push(id);continue}
   found.set(id,file);
  }
  for(const {id} of STEMS)player.setFile(id,found.get(id)||null);
  const present=player.loaded(),missing=STEMS.filter(s=>!present.includes(s.id)).map(s=>s.id);
  show(present.length+'/6 stems · '+(present.join(', ')||'none')+
   (missing.length?' · missing '+missing.join(', '):'')+
   (duplicates.length?' · duplicates '+duplicates.join(', '):'')+
   (ignored.length?' · ignored '+ignored.length:'')+
   (!found.has('F')?' · F Drum required to play':' · ready'));
  diagnostic('music-stems-selected',{loaded:present,missing,ignoredCount:ignored.length,duplicateCount:duplicates.length});
 }
 async function play(){
  if(flow()!=='game'){show('Start a run before playing music.');return}
  if(!available().has('F')){show('Load F Drum first (the A–F stem folder or individual WAVs).');return}
  try{
   enabled=true;update(true);
   show('Preparing sample-locked WAV stems…');
   const result=await player.start(); // Direct user click unlocks AudioContext on iOS.
   if(!enabled)return;
   if(result.errors?.length)throw new Error(result.errors.join('; '));
   if(!player.isPlaying())throw new Error('Audio did not start');
   diagnostic('music-started',{loaded:player.loaded(),volume:Number(volume.value)/100});
   update(true);
  }catch(error){stop('Music unavailable: '+String(error?.message||error))}
 }
 function canCountTime(state){
  return flow()==='game'&&!document.hidden&&!menu.open&&
   !document.getElementById('overlay')?.classList.contains('show')&&
   !state.running&&!state.shopOpen&&!state.pendingCircuit&&!state.pendingModPlacement&&
   !state.blocked&&!state.cleared&&Boolean(window.__monoidGame?.canInteract?.());
 }
 function update(force=false){
  const now=performance.now(),state=current(),screen=flow(),delta=Math.max(0,Math.min(2,(now-lastSample)/1000));
  lastSample=now;
  if(!state||screen!=='game'){
   if(enabled)stop('Paused outside a run · press Play to resume.');
   return;
  }
  const key=String(state.runId||'')+':'+String(state.round??0);
  if(key!==roundKey){roundKey=key;thinkingSeconds=0;lastValues=null;force=true}
  if(canCountTime(state))thinkingSeconds+=delta;
  if(!enabled||!player.isPlaying()&& !force)return;
  const topology=analyseMachine(state.pieces||[]),mix=mixForMachine(topology,thinkingSeconds);
  if(force||!lastValues||Object.keys(mix.db).some(id=>{
   const a=mix.db[id],b=lastValues[id];
   return a!==b&&(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>.35);
  })){
   player.setLevels(mix.levels,{smooth:!force});
   lastValues={...mix.db};lastMix=mix;
   if(enabled&&now-lastTelemetryAt>15000){
    diagnostic('music-mix',{round:(Number(state.round)||0)+1,thinkingSeconds:Math.round(thinkingSeconds),
     topology,db:Object.fromEntries(Object.entries(mix.db).map(([id,db])=>[id,Number.isFinite(db)?Math.round(db*10)/10:null]))});
    lastTelemetryAt=now;
   }
  }
  if(enabled){
   const health=player.getSyncStatus();
   if(health.error){stop('Audio interrupted: '+health.error);return}
   show('PLAYING · F Drum · '+topology.tiles+' tiles · '+Math.floor(thinkingSeconds)+'s decision time'+
    (health.underruns?' · '+health.underruns+' buffer underrun(s)':''));
  }
 }
 $('musicFolderButton').addEventListener('click',()=>folder.click());
 $('musicFilesButton').addEventListener('click',()=>files.click());
 for(const input of [files,folder])input.addEventListener('change',()=>{load(input.files);input.value=''});
 $('musicPlay').addEventListener('click',()=>{void play()});
 $('musicStop').addEventListener('click',()=>stop());
 volume.addEventListener('input',()=>{player.setMaster(Number(volume.value)/100)});
 player.setMaster(Number(volume.value)/100);
 const poll=setInterval(()=>update(),1500);
 document.addEventListener('visibilitychange',()=>{
  lastSample=performance.now();
  if(document.hidden&&enabled)stop('Stopped while the game was in background · press Play to resume.');
 });
 window.addEventListener('pagehide',()=>{clearInterval(poll);player.dispose()},{once:true});
 window.__monoidMusic=Object.freeze({
  snapshot:()=>({playing:enabled&&player.isPlaying(),loaded:player.loaded(),
   thinkingSeconds,topology:lastMix?.topology||null,db:lastMix?.db||null,
   transport:player.getSyncStatus()}),
  stop:()=>stop()
 });
 update();
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMusic,{once:true});
 else installMusic();
}
