// Lightweight physical percussion accompanying Space Drift's already-aligned
// 80 BPM transport. Samples are synthesised locally; no copyrighted files shipped.
// Explicitly NOT a pitch-preserving song tempo change: that requires a new pack.
import {SOURCE_BPM,pulsePattern} from './music-director.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function createPressurePercussion(player){
 let timer=null,origin=null,nextStep=0,group=null,ctx=null,noise=null,drumState={intensity:0,mood:'steady'},duck=1,volume=1;
 const sources=new Set();
 function buffer(context){
  if(noise)return noise;
  noise=context.createBuffer(1,Math.round(context.sampleRate*.08),context.sampleRate);
  const pcm=noise.getChannelData(0);
  // Fixed deterministic low-cost noise: separate from gameplay randomness.
  let state=0x9e3779b9;
  for(let i=0;i<pcm.length;i++){
   state^=state<<13;state^=state>>>17;state^=state<<5;
   pcm[i]=((state>>>0)/2147483648-1)*Math.exp(-i/(pcm.length*.27));
  }
  return noise;
 }
 function strike(at,step,voice){
  if(!ctx||!group)return;
  const strength=clamp(drumState.intensity/4,0,1);
  if(strength<=0)return;
  const env=ctx.createGain(),amp=.12*strength*voice.velocity*duck*volume;
  const tone=ctx.createOscillator();
  tone.type='sine';tone.frequency.setValueAtTime(voice.kind==='thump'?104:voice.kind==='tick'?420:900,at);
  if(voice.kind==='thump')tone.frequency.exponentialRampToValueAtTime(55,at+.085);
  const decay=voice.kind==='thump'?.16:voice.kind==='tick'?.045:.024;
  env.gain.setValueAtTime(.0001,at);
  env.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),at+.006);
  env.gain.exponentialRampToValueAtTime(.0001,at+decay);
  tone.connect(env);env.connect(group);
  sources.add(tone);tone.onended=()=>{sources.delete(tone);tone.disconnect();env.disconnect()};
  tone.start(at);tone.stop(at+decay+.012);
  if(voice.kind!=='thump'){
   const hiss=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),hissEnv=ctx.createGain();
   hiss.buffer=buffer(ctx);filter.type='highpass';filter.frequency.value=2200;
   hissEnv.gain.setValueAtTime(Math.max(.0002,amp*.42),at);
   hissEnv.gain.exponentialRampToValueAtTime(.0001,at+.028);
   hiss.connect(filter);filter.connect(hissEnv);hissEnv.connect(group);
   sources.add(hiss);hiss.onended=()=>{sources.delete(hiss);hiss.disconnect();filter.disconnect();hissEnv.disconnect()};
   hiss.start(at);hiss.stop(at+.036);
  }
 }
 function tick(){
  const clock=player.clock();
  volume=clamp(Number(clock.masterLevel)||0,0,1.5);
  if(!clock.playing||clock.paused||!clock.context||!Number.isFinite(clock.origin))return;
  const bpm=Number.isFinite(clock.bpm)?clock.bpm:SOURCE_BPM;
  if(origin!==clock.origin){
   origin=clock.origin;nextStep=Math.max(0,Math.floor((clock.currentTime-origin)/(60/bpm/4)));
  }
  const stepLength=60/bpm/4,now=clock.currentTime,limit=now+.26;
  // Bounded scheduling with one shared audio origin, never gameplay timers.
  let safety=0;
  while(origin+nextStep*stepLength<limit&&safety++<24){
   const when=origin+nextStep*stepLength,bar=Math.floor(nextStep/16),step=nextStep%16;
   if(when>=now+.008){
    const voice=pulsePattern({...drumState,barIndex:bar%8}).find(v=>v.step===step);
    if(voice)strike(when,step,voice);
   }
   nextStep++;
  }
 }
 function start(){
  if(timer)return;
  const audio=player.activateAudio();
  ctx=audio.context;
  group=ctx.createGain();group.gain.value=1;
  group.connect(audio.effects);
  noise=null;origin=null;nextStep=0;
  timer=setInterval(tick,80);
  tick();
 }
 function update(state,acousticMode='game'){
  drumState={intensity:clamp(state?.intensity||0,0,4),mood:state?.mood||'steady'};
  // Respect cascade and shop ducking: never overpower physical dominoes.
  duck=acousticMode==='menu'?0:acousticMode==='cascade'?.22:acousticMode==='shop'?.5:1;
 }
 function stop(){
  if(timer!==null){clearInterval(timer);timer=null}
  for(const source of sources){try{source.stop()}catch{}try{source.disconnect()}catch{}}
  sources.clear();group?.disconnect();group=null;ctx=null;noise=null;origin=null;nextStep=0;
 }
 return {start,stop,update,snapshot:()=>({...drumState,duck,active:timer!==null,origin})};
}
