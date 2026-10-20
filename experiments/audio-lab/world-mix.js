// Audio Lab only: a reusable gain stage for a local, licensed WORLD recording.
// HTMLMediaElement.volume cannot amplify beyond 1, so keep one persistent
// MediaElementAudioSourceNode and AudioContext across MACHINE play/stop cycles.
// No game state or scoring dependencies.
export const WORLD_DEFAULT_LEVEL=1.25;
export const WORLD_MAX_LEVEL=2;
export function createWorldMix(element,makeContext=()=>new (window.AudioContext||window.webkitAudioContext)()){
 let context=null, gain=null, level=WORLD_DEFAULT_LEVEL;
 function setLevel(value){
  const parsed=Number(value);
  if(!Number.isFinite(parsed))throw new RangeError('Invalid WORLD level');
  level=Math.max(0,Math.min(WORLD_MAX_LEVEL,parsed));
  if(gain){
   gain.gain.cancelScheduledValues(context.currentTime);
   gain.gain.setTargetAtTime(level,context.currentTime,.018);
  }else {
   // Before first Web Audio activation, preserve normal media-element playback.
   element.volume=Math.min(1,level);
  }
  return level;
 }
 function ensure(){
  if(context)return context;
  const created=makeContext();
  const source=created.createMediaElementSource(element);
  const volume=created.createGain();
  const peakGuard=created.createDynamicsCompressor();
  peakGuard.threshold.value=-4.5;
  peakGuard.knee.value=3;
  peakGuard.ratio.value=12;
  peakGuard.attack.value=.003;
  peakGuard.release.value=.17;
  volume.gain.value=level;
  element.volume=1;
  source.connect(volume);
  volume.connect(peakGuard);
  peakGuard.connect(created.destination);
  context=created;gain=volume;
  return context;
 }
 function activate(){
  const active=ensure();
  return active.resume();
 }
 function dispose(){
  if(context){const active=context;context=null;gain=null;active.close().catch(()=>{})}
 }
 setLevel(level);
 return {setLevel,activate,dispose,getLevel:()=>level,getState:()=>context?.state||'uninitialised'};
}
