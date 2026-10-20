// Isolated Audio Lab multistem player. Files remain in the user's browser.
// Stream WAVs via HTMLAudioElement rather than decoding six 7:12 WAVs into RAM.
// Media elements are NOT sample-accurately synchronized: this is a listening
// prototype. Use prealigned shorter encoded segments + AudioBuffer scheduling
// before shipping a production-quality stem engine.
import {STEMS} from './stem-scenes.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createStemPlayer(elements,{makeContext=()=>new (window.AudioContext||window.webkitAudioContext)()}={}){
 const tracks=new Map();
 for(const {id} of STEMS){
  const element=elements[id];
  if(!element)throw new Error('Missing stem audio element '+id);
  element.preload='auto';element.loop=true;element.volume=1;
  tracks.set(id,{element,source:null,gain:null,objectURL:null,level:0});
 }
 let context=null,master=null,playing=false,masterLevel=.72;
 function init(){
  if(context)return context;
  context=makeContext();
  const compressor=context.createDynamicsCompressor();
  compressor.threshold.value=-5;compressor.knee.value=5;compressor.ratio.value=8;
  compressor.attack.value=.005;compressor.release.value=.2;
  master=context.createGain();master.gain.value=masterLevel;
  master.connect(compressor);compressor.connect(context.destination);
  return context;
 }
 function attach(track){
  if(track.source||!track.objectURL)return;
  track.source=context.createMediaElementSource(track.element);
  track.gain=context.createGain();
  track.gain.gain.value=track.level;
  track.source.connect(track.gain);track.gain.connect(master);
 }
 function setFile(id,file){
  const track=tracks.get(id);if(!track)throw new Error('Unknown stem '+id);
  if(playing)stop();
  if(track.objectURL)URL.revokeObjectURL(track.objectURL);
  track.objectURL=file?URL.createObjectURL(file):null;
  track.element.removeAttribute('src');
  if(track.objectURL)track.element.src=track.objectURL;
  track.element.load();
  return Boolean(track.objectURL);
 }
 function setLevel(id,value,{smooth=true}={}){
  const t=tracks.get(id),n=Number(value);
  if(!t||!Number.isFinite(n))throw new RangeError('Invalid stem level');
  t.level=clamp(n,0,1.5);
  if(t.gain){
   t.gain.gain.cancelScheduledValues(context.currentTime);
   if(smooth)t.gain.gain.setTargetAtTime(t.level,context.currentTime,1.25);
   else t.gain.gain.setValueAtTime(t.level,context.currentTime);
  }
  return t.level;
 }
 function setLevels(levels,options){
  for(const {id} of STEMS)if(Object.hasOwn(levels,id))setLevel(id,levels[id],options);
 }
 function setMaster(value){
  const n=Number(value);if(!Number.isFinite(n))throw new RangeError('Invalid master');
  const v=clamp(n,0,1.5);
  masterLevel=v;
  if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(v,context.currentTime,.025)}
  return v;
 }
 function start(){
  const available=[...tracks.values()].filter(t=>t.objectURL);
  if(!available.length)throw new Error('Load at least one Space Drift stem first');
  init();
  for(const t of available)attach(t);
  for(const t of available){try{t.element.currentTime=0}catch{}}
  playing=true;
  // Both the resume and ALL media play calls must originate in the same tap.
  // Do not await resume before HTMLMediaElement.play() on iOS Safari.
  const resume=context.resume();
  const results=[];
  for(let i=0;i<available.length;i++){
   try{results[i]=available[i].element.play()}
   catch(error){results[i]=Promise.reject(error)}
  }
  return Promise.allSettled([resume,...results]).then(outcomes=>{
   const errors=outcomes.filter(r=>r.status==='rejected');
   return {loaded:available.length,errors:errors.map(r=>String(r.reason)),state:context.state};
  });
 }
 function stop(){
  playing=false;
  for(const t of tracks.values())t.element.pause();
 }
 function reference(){
  return tracks.get('D')?.objectURL?tracks.get('D').element:
   [...tracks.values()].find(t=>t.objectURL)?.element||null;
 }
 function getDrift(){
  const base=reference();
  if(!base||!playing)return 0;
  return Math.max(0,...[...tracks.values()].filter(t=>t.objectURL&&t.element!==base&&!t.element.paused)
   .map(t=>Math.abs(t.element.currentTime-base.currentTime)));
 }
 function levels(){return Object.fromEntries([...tracks].map(([id,t])=>[id,t.level]))}
 function loaded(){return [...tracks].filter(([,t])=>t.objectURL).map(([id])=>id)}
 function dispose(){
  stop();
  for(const t of tracks.values()){
   t.element.removeAttribute('src');t.element.load();
   if(t.objectURL)URL.revokeObjectURL(t.objectURL);
   t.objectURL=null;t.source?.disconnect();t.gain?.disconnect();
  }
  if(context){const old=context;context=null;old.close().catch(()=>{})}
 }
 return {setFile,setLevel,setLevels,setMaster,start,stop,getDrift,loaded,levels,dispose,isPlaying:()=>playing};
}
