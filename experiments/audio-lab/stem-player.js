// Isolated MONOID Audio Lab multistem transport.
// One AudioContext and shared scheduled start timestamps: no HTML media drift.
// Each six-second PCM16 WAV window is decoded from local File slices; full
// 7:12 stems are never held as decoded buffers in browser memory.
import {STEMS} from './stem-scenes.js';
import {readPcmHeader,decodePcmSegment} from './pcm-wav-stream.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createStemPlayer(_legacyElements={}, {makeContext=()=>new (window.AudioContext||window.webkitAudioContext)()}={}) {
 const tracks=new Map(STEMS.map(({id})=>[id,{file:null,header:null,gain:null,level:0,muted:false,solo:false}]));
 const sources=new Set();
 let context=null,master=null,masterLevel=1,timer=null,playing=false,generation=0;
 let acoustic=null,lowpass=null,effects=null,acousticLevel=1,lowpassHz=20000;
 let segmentFrames=0,segmentSeconds=0,totalSegments=0,nextIndex=0,startAt=0,busy=false,underruns=0;
 function init(){
  if(context)return context;
  context=makeContext();
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-5;limiter.knee.value=5;limiter.ratio.value=8;
  limiter.attack.value=.005;limiter.release.value=.2;
  master=context.createGain();master.gain.value=masterLevel;
  lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=lowpassHz;
  acoustic=context.createGain();acoustic.gain.value=acousticLevel;
  effects=context.createGain();effects.gain.value=1;
  master.connect(lowpass);lowpass.connect(acoustic);acoustic.connect(limiter);
  effects.connect(limiter);limiter.connect(context.destination);
  for(const track of tracks.values()){
   track.gain=context.createGain();
   track.gain.gain.value=audibleLevel(track);
   track.gain.connect(master);
  }
  return context;
 }
 function audibleLevel(track){
  const anySolo=[...tracks.values()].some(t=>t.solo);
  return track.muted||(anySolo&&!track.solo)?0:track.level;
 }
 function applyLevel(track,smooth=true){
  if(!track.gain)return;
  const param=track.gain.gain,value=audibleLevel(track),at=context.currentTime;
  param.cancelScheduledValues(at);
  if(smooth)param.setTargetAtTime(value,at,1.25);
  else param.setValueAtTime(value,at);
 }
 function setFile(id,file){
  const track=tracks.get(id);
  if(!track)throw new RangeError('Unknown stem '+id);
  stop();
  track.file=file||null;track.header=null;
  return Boolean(track.file);
 }
 function setLevel(id,value,{smooth=true}={}){
  const track=tracks.get(id),parsed=Number(value);
  if(!track||!Number.isFinite(parsed))throw new RangeError('Invalid stem level');
  track.level=clamp(parsed,0,1.5);applyLevel(track,smooth);
  return track.level;
 }
 function setLevels(levels,options){
  for(const {id} of STEMS)if(Object.hasOwn(levels,id))setLevel(id,levels[id],options);
 }
 function setMuted(id,value){
  const track=tracks.get(id);if(!track)throw new RangeError('Unknown stem');
  track.muted=Boolean(value);for(const t of tracks.values())applyLevel(t);
 }
 function setSolo(id,value){
  const track=tracks.get(id);if(!track)throw new RangeError('Unknown stem');
  track.solo=Boolean(value);for(const t of tracks.values())applyLevel(t);
 }
 function setMaster(value){
  const parsed=Number(value);if(!Number.isFinite(parsed))throw new RangeError('Invalid WORLD master');
  masterLevel=clamp(parsed,0,2);
  if(master){
   const at=context.currentTime;master.gain.cancelScheduledValues(at);
   master.gain.setTargetAtTime(masterLevel,at,.025);
  }
  return masterLevel;
 }
 function activateAudio(){
  const active=init();
  // Called synchronously from the first valid board pointer interaction (iOS).
  if(active.state!=='running'){
   const resumed=active.resume();
   if(resumed?.catch)resumed.catch(()=>{});
  }
  return {context:active,effects};
 }
 function setAcoustics({level=1,lowpass:frequency=20000,fadeMs=200}={}){
  acousticLevel=clamp(Number(level),0,1);lowpassHz=clamp(Number(frequency),300,20000);
  if(acoustic){
   const at=context.currentTime,tau=Math.max(.01,Number(fadeMs)/3000);
   acoustic.gain.cancelScheduledValues(at);acoustic.gain.setTargetAtTime(acousticLevel,at,tau);
   lowpass.frequency.cancelScheduledValues(at);lowpass.frequency.setTargetAtTime(lowpassHz,at,tau);
  }
 }
 function loaded(){return [...tracks].filter(([,t])=>Boolean(t.file)).map(([id])=>id)}
 function levels(){return Object.fromEntries([...tracks].map(([id,t])=>[id,t.level]))}
 function stop(){
  generation++;playing=false;busy=false;
  if(timer!==null){clearInterval(timer);timer=null}
  for(const source of sources){
   try{source.stop()}catch{}
   try{source.disconnect()}catch{}
  }
  sources.clear();
 }
 async function loadGroup(index,available){
  const segment=index%totalSegments;
  const first=segment*segmentFrames;
  return Promise.all(available.map(async track=>({
   track,
   buffer:await decodePcmSegment(context,track.file,track.header,first,segmentFrames)
  })));
 }
 function scheduleGroup(group,index,at){
  for(const {track,buffer} of group){
   const source=context.createBufferSource();
   source.buffer=buffer;source.connect(track.gain);
   sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect()};
   source.start(at);
  }
 }
 async function start(){
  const available=[...tracks.values()].filter(t=>t.file);
  if(!available.length)throw new Error('Select at least one local Space Drift stem');
  stop();const run=++generation;
  const active=init();
  // Resume is invoked directly from the Play tap, before any await (iOS).
  const resumed=active.resume();
  if(resumed&&typeof resumed.catch==='function')resumed.catch(()=>{});
  const headers=await Promise.all(available.map(async t=>({track:t,header:await readPcmHeader(t.file)})));
  if(run!==generation)return {loaded:0,errors:['Start cancelled']};
  const reference=headers[0].header;
  for(const item of headers){
   const h=item.header;
   if(h.sampleRate!==reference.sampleRate||h.channels!==reference.channels||
      h.bitsPerSample!==reference.bitsPerSample)
    throw new Error('Stem format mismatch: all files must share sample rate and channel format');
   if(Math.abs(h.frames-reference.frames)>h.sampleRate*.02)
    throw new Error('Stem duration mismatch: choose the six aligned A–F stems, not alternate mixes');
   item.track.header=h;
  }
  const frames=Math.min(...headers.map(x=>x.header.frames));
  segmentFrames=Math.min(reference.sampleRate*6,frames);
  totalSegments=Math.floor(frames/segmentFrames);
  segmentSeconds=segmentFrames/reference.sampleRate;
  if(!totalSegments)throw new Error('No complete audio segments');
  const first=await loadGroup(0,available);
  if(run!==generation)return {loaded:0,errors:['Start cancelled']};
  playing=true;underruns=0;nextIndex=1;
  startAt=context.currentTime+.25;
  scheduleGroup(first,0,startAt);
  const pump=async()=>{
   if(!playing||run!==generation||busy)return;
   const due=startAt+nextIndex*segmentSeconds;
   if(due-context.currentTime>Math.min(3,segmentSeconds*.8))return;
   busy=true;
   const index=nextIndex;
   try{
    const group=await loadGroup(index,available);
    if(!playing||run!==generation)return;
    let when=startAt+index*segmentSeconds;
    if(when<context.currentTime+.04){
     underruns++;
     when=context.currentTime+.12;
     startAt=when-index*segmentSeconds;
    }
    scheduleGroup(group,index,when);
    nextIndex=index+1;
   }catch(error){
    if(run===generation){stop();lastError=String(error.message||error)}
   }finally{if(run===generation)busy=false}
  };
  timer=setInterval(()=>{void pump()},250);
  void pump();
  return {loaded:available.length,errors:[],state:context.state};
 }
 let lastError='';
 function getDrift(){return 0} // All stem starts use the same AudioContext timestamp.
 function getSyncStatus(){return {mode:'shared-audio-clock',underruns,error:lastError}}
 function dispose(){
  stop();
  for(const t of tracks.values()){t.file=null;t.header=null;t.gain?.disconnect()}
  if(context){const old=context;context=null;old.close().catch(()=>{})}
 }
 return {setFile,setLevel,setLevels,setMuted,setSolo,setMaster,setAcoustics,activateAudio,start,stop,getDrift,
  getSyncStatus,loaded,levels,dispose,isPlaying:()=>playing};
}
