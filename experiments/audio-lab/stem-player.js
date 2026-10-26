// Isolated MONOID Audio Lab multistem transport.
// One AudioContext and shared scheduled start timestamps: no HTML media drift.
// Each six-second PCM16 WAV window is decoded from local File slices; full
// 7:12 stems are never held as decoded buffers in browser memory.
import {STEMS} from './stem-scenes.js';
import {readPcmHeader,decodePcmSegment} from './pcm-wav-stream.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createStemPlayer(_legacyElements={}, {makeContext=()=>new (window.AudioContext||window.webkitAudioContext)()}={}) {
 const tracks=new Map(STEMS.map(({id})=>[id,{id,file:null,header:null,gain:null,panNode:null,spatialPan:0,level:0,muted:false,solo:false}]));
 const sources=new Set();
 let context=null,master=null,masterLevel=1,timer=null,playing=false,generation=0;
 let acoustic=null,lowpass=null,effects=null,acousticLevel=1,lowpassHz=20000;
 let pack=null,prepared=null,preparing=null,packRevision=0,lastLateSeconds=0,suspended=false;
 let segmentFrames=0,segmentSeconds=0,totalSegments=0,nextIndex=0,startAt=0,busy=false,underruns=0;
 let requestedBpm=80,tempoSegments=[],tempoNextAt=0;
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
   // Native lightweight stereo placement. On older WebKit, keep the dry path.
   track.panNode=typeof context.createStereoPanner==='function'
    ?context.createStereoPanner():context.createGain();
   if(track.panNode.pan)track.panNode.pan.value=track.spatialPan;
   track.gain.connect(track.panNode);track.panNode.connect(master);
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
 function setPack(parsed){
  if(!parsed?.blob||!(parsed.manifest?.stems?.F||parsed.manifest?.variants?.['80']?.stems?.F))throw new Error('Invalid compressed audio pack');
  stop();pack=parsed;prepared=null;preparing=null;packRevision++;
  for(const track of tracks.values()){track.file=null;track.header=null}
  lastError='';return loaded();
 }
 function clearPack(){stop();pack=null;prepared=null;preparing=null;packRevision++}
 function setFile(id,file){
  if(pack)clearPack();
  const track=tracks.get(id);
  if(!track)throw new RangeError('Unknown stem '+id);
  stop();prepared=null;preparing=null;packRevision++;
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
 function setSpatialPans(pans={}, {smooth=true}={}){
  for(const {id} of STEMS){
   if(!Object.hasOwn(pans,id))continue;
   const track=tracks.get(id),pan=Number(pans[id]);
   if(!Number.isFinite(pan))continue;
   track.spatialPan=id==='F'?0:clamp(pan,-.65,.65);
   if(track.panNode?.pan){
    const param=track.panNode.pan,now=context.currentTime;
    param.cancelScheduledValues(now);
    if(smooth)param.setTargetAtTime(track.spatialPan,now,.65);
    else param.setValueAtTime(track.spatialPan,now);
   }
  }
 }
 function spatialPans(){return Object.fromEntries([...tracks].map(([id,t])=>[id,t.spatialPan]))}
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
   suspended=false;
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
 function loaded(){return pack?pack.ids:[...tracks].filter(([,t])=>Boolean(t.file)).map(([id])=>id)}
 function isTempoPack(){return pack?.manifest?.schema==='monoid-audio-pack-v2'}
 function setTempo(bpm){
  const requested=Math.floor(Number(bpm));
  if(!isTempoPack()||!pack.manifest.variants[String(requested)])return false;
  requestedBpm=requested;return true;
 }
 function levels(){return Object.fromEntries([...tracks].map(([id,t])=>[id,t.level]))}
 function stop(){
  generation++;playing=false;busy=false;suspended=false;tempoSegments=[];tempoNextAt=0;
  if(timer!==null){clearInterval(timer);timer=null}
  for(const source of sources){
   try{source.stop()}catch{}
   try{source.disconnect()}catch{}
  }
  sources.clear();
 }
 function suspend(){
  if(!playing||!context||suspended)return;
  suspended=true;
  const pending=context.suspend();
  pending?.catch?.(error=>{lastError=String(error?.message||error)});
 }
 function resume(){
  if(!playing||!context||!(suspended||context.state!=='running'))return;
  suspended=false;
  const pending=context.resume();
  pending?.catch?.(error=>{lastError=String(error?.message||error)});
 }
 async function loadGroup(index,available){
  const segment=index%totalSegments;
  if(pack){
   return Promise.all(available.map(async track=>{
    const part=pack.manifest.stems[track.id].segments[segment];
    const bytes=await pack.blob.slice(pack.offset+part.offset,pack.offset+part.offset+part.bytes).arrayBuffer();
    const decoded=await context.decodeAudioData(bytes);
    if(decoded.numberOfChannels!==2||Math.abs(decoded.duration-segmentSeconds)>.05)
     throw new Error('Invalid compressed segment '+track.id+'/'+segment);
    // AAC encoder priming and trailing padding vary between WebKit and Chromium.
    // All stems are scheduled by the same nominal sample clock, not decoded duration.
    const frames=Math.round(segmentSeconds*decoded.sampleRate);
    let buffer=decoded;
    if(decoded.length<frames){
     buffer=context.createBuffer(2,frames,decoded.sampleRate);
     for(let channel=0;channel<2;channel++)buffer.getChannelData(channel).set(decoded.getChannelData(channel));
    }
    return {track,buffer};
   }));
  }
  const first=segment*segmentFrames;
  return Promise.all(available.map(async track=>({
   track,
   buffer:await decodePcmSegment(context,track.file,track.header,first,segmentFrames)
  })));
 }
 function scheduleGroup(group,index,at,offset=0){
  for(const {track,buffer} of group){
   const source=context.createBufferSource();
   source.buffer=buffer;source.connect(track.gain);
   sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect()};
   if(offset>0)source.start(at,offset,Math.max(.001,segmentSeconds-offset));
   else if(pack)source.start(at,0,segmentSeconds);else source.start(at);
  }
 }
 // Tempo v2 uses 4 musical bars per fragment, with a short encoded
 // outgoing tail so adjacent stems can overlap at a real tempo switch.
 async function loadTempoGroup(index,bpm,available){
  const variant=pack.manifest.variants[String(bpm)],segment=index%pack.manifest.segmentCount;
  const expectedFrames=variant.segmentSamples+variant.overlapSamples;
  return Promise.all(available.map(async track=>{
   const part=variant.stems[track.id].segments[segment];
   const bytes=await pack.blob.slice(pack.offset+part.offset,pack.offset+part.offset+part.bytes).arrayBuffer();
   const decoded=await context.decodeAudioData(bytes);
   const expected=expectedFrames/pack.manifest.sampleRateHz;
   if(decoded.numberOfChannels!==2||Math.abs(decoded.duration-expected)>.10)
    throw new Error('Tempo segment mismatch '+bpm+'/'+track.id+'/'+segment);
   const targetFrames=Math.round(expected*decoded.sampleRate);
   let buffer=decoded;
   if(decoded.length!==targetFrames){
    buffer=context.createBuffer(2,targetFrames,decoded.sampleRate);
    for(let ch=0;ch<2;ch++)
     buffer.getChannelData(ch).set(decoded.getChannelData(ch).subarray(0,targetFrames));
   }
   return {track,buffer};
  }));
 }
 function scheduleTempoGroup(group,index,bpm,at){
  const variant=pack.manifest.variants[String(bpm)];
  const nominal=variant.segmentSamples/pack.manifest.sampleRateHz;
  const overlap=variant.overlapSamples/pack.manifest.sampleRateHz;
  const when=Math.max(at,context.currentTime+.03),late=when-at;
  if(late>.05){underruns++;lastLateSeconds=late}
  for(const {track,buffer} of group){
   const maxDuration=Math.min(buffer.duration,nominal+overlap);
   if(late>=maxDuration)continue;
   const duration=maxDuration-late;
   const fade=Math.min(overlap,track.id==='F'?.03:track.id==='D'?.15:.09);
   const entry=at+fade,exit=at+nominal,finish=exit+fade;
   const gate=context.createGain();
   const nowGain=late<fade?Math.max(.0001,late/Math.max(.001,fade)):
    late>nominal?Math.max(.0001,1-(late-nominal)/Math.max(.001,fade)):1;
   // Even if decoding finished late, start the buffer at silence. AAC packet
   // boundaries need not be zero crossings; a nonzero first sample clicks.
   gate.gain.setValueAtTime(0,when);
   const attackEnd=Math.min(when+.005,Math.max(when+.002,entry));
   gate.gain.linearRampToValueAtTime(nowGain,attackEnd);
   if(entry>attackEnd)gate.gain.linearRampToValueAtTime(1,entry);
   if(exit>Math.max(when,entry))gate.gain.setValueAtTime(1,exit);
   if(finish>when)gate.gain.linearRampToValueAtTime(.0001,finish);
   const source=context.createBufferSource();
   source.buffer=buffer;source.connect(gate);gate.connect(track.gain);
   sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect();gate.disconnect()};
   source.start(when,late,duration);
  }
 }
 function activeTempoSegment(){
  const now=context?.currentTime??0;
  let active=tempoSegments[0]||null;
  for(const item of tempoSegments)if(item.at<=now)active=item;else break;
  return active;
 }
 function prepareTempo(){
  if(!pack)return Promise.resolve(false);
  if(prepared?.bpm===requestedBpm)return Promise.resolve(true);
  if(preparing)return preparing;
  init();
  const revision=packRevision,bpm=requestedBpm;
  const available=[...tracks.values()].filter(t=>Boolean(pack.manifest.variants[String(bpm)]?.stems?.[t.id]));
  preparing=loadTempoGroup(0,bpm,available).then(group=>{
   if(revision!==packRevision)return false;
   prepared={bpm,group};return true;
  }).catch(error=>{
   if(revision===packRevision)lastError=String(error?.message||error);
   return false;
  }).finally(()=>{if(revision===packRevision)preparing=null});
  return preparing;
 }
 async function startTempoPack(available,run){
  const bpm=requestedBpm;
  if(preparing)await preparing;
  const first=prepared?.bpm===bpm?prepared.group:await loadTempoGroup(0,bpm,available);
  prepared=null;
  if(run!==generation)return {loaded:0,errors:['Start cancelled']};
  playing=true;underruns=0;lastLateSeconds=0;lastError='';
  totalSegments=pack.manifest.segmentCount;
  startAt=context.currentTime+.12;
  nextIndex=1;
  tempoSegments=[{index:0,at:startAt,bpm}];
  segmentSeconds=pack.manifest.variants[String(bpm)].segmentSamples/pack.manifest.sampleRateHz;
  tempoNextAt=startAt+segmentSeconds;
  scheduleTempoGroup(first,0,bpm,startAt);
  const pump=async()=>{
   if(!playing||run!==generation||busy)return;
   if(tempoNextAt-context.currentTime>3.5)return;
   busy=true;
   const index=nextIndex,desired=requestedBpm;
   try{
    const group=await loadTempoGroup(index,desired,available);
    if(run!==generation||!playing)return;
    // The timestamp is inherited from the previous (possibly different)
    // tempo. Never restart song phase or advance gameplay RNG.
    const at=tempoNextAt;
    scheduleTempoGroup(group,index,desired,at);
    tempoSegments.push({index,at,bpm:desired});
    if(tempoSegments.length>3)tempoSegments.shift();
    tempoNextAt=at+pack.manifest.variants[String(desired)].segmentSamples/pack.manifest.sampleRateHz;
    nextIndex=index+1;
   }catch(error){
    if(run===generation){stop();lastError=String(error?.message||error)}
   }finally{if(run===generation)busy=false}
  };
  timer=setInterval(()=>{void pump()},100);
  void pump();
  return {loaded:available.length,errors:[],state:context.state,bpm};
 }
 // Predecode only the first pack segment, while on the run entry screen.
 // No playback or browser autoplay is attempted by this preparation.
 function prepare(){
  if(!pack)return Promise.resolve(false);
  if(isTempoPack())return prepareTempo();
  if(prepared)return Promise.resolve(true);
  if(preparing)return preparing;
  init();
  segmentFrames=pack.manifest.segmentSamples;
  totalSegments=pack.manifest.segmentCount;
  segmentSeconds=segmentFrames/pack.manifest.sampleRateHz;
  const revision=packRevision;
  const available=[...tracks.values()].filter(t=>Boolean(pack.manifest.stems[t.id]));
  preparing=loadGroup(0,available).then(group=>{
   if(packRevision!==revision)return false;
   prepared=group;return true;
  }).catch(error=>{
   if(packRevision===revision)lastError=String(error?.message||error);
   return false;
  }).finally(()=>{if(packRevision===revision)preparing=null});
  return preparing;
 }
 async function start(){
  const available=[...tracks.values()].filter(t=>pack?Boolean(isTempoPack()?pack.manifest.variants['80'].stems[t.id]:pack.manifest.stems[t.id]):Boolean(t.file));
  if(!available.length)throw new Error('Select a private audio pack or at least one local Space Drift stem');
  stop();const run=++generation;
  const active=init();
  // Resume is invoked directly from the Play tap, before any await (iOS).
  const resumed=active.resume();
  if(resumed&&typeof resumed.catch==='function')resumed.catch(()=>{});
  if(isTempoPack())return startTempoPack(available,run);
  if(pack){
   segmentFrames=pack.manifest.segmentSamples;
   totalSegments=pack.manifest.segmentCount;
   segmentSeconds=segmentFrames/pack.manifest.sampleRateHz;
  }else{
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
    tracks.get(item.track.id).header=h;
    item.track.header=h;
   }
   const frames=Math.min(...headers.map(x=>x.header.frames));
   segmentFrames=Math.min(reference.sampleRate*6,frames);
   totalSegments=Math.floor(frames/segmentFrames);
   segmentSeconds=segmentFrames/reference.sampleRate;
  }
  if(!totalSegments)throw new Error('No complete audio segments');
  if(pack&&preparing)await preparing;
  const first=pack&&prepared?prepared:await loadGroup(0,available);
  prepared=null;
  if(run!==generation)return {loaded:0,errors:['Start cancelled']};
  playing=true;underruns=0;lastLateSeconds=0;nextIndex=1;lastError='';
  startAt=context.currentTime+(pack ? .08 : .25);
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
    const earliest=context.currentTime+.04;
    if(when<earliest){
     underruns++;
     lastLateSeconds=earliest-when;
     // Never shift the shared musical origin: late fragments resume at the
     // corresponding point within the segment, keeping all stems in phase.
     if(lastLateSeconds>=segmentSeconds){
      nextIndex=Math.max(index+1,Math.ceil((earliest-startAt)/segmentSeconds));
      return;
     }
     scheduleGroup(group,index,earliest,lastLateSeconds);
    }else scheduleGroup(group,index,when);
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
 function playbackSeconds(){
  if(!playing||!context||!totalSegments||!segmentSeconds)return 0;
  if(isTempoPack()){
   const active=activeTempoSegment();
   if(!active)return 0;
   const sourceSeconds=active.index*12+(context.currentTime-active.at)*active.bpm/80;
   return Math.max(0,sourceSeconds%(totalSegments*12));
  }
  return Math.max(0,(context.currentTime-startAt)%(totalSegments*segmentSeconds));
 }
 // A read-only clock for auxiliary percussion. The source timeline never shifts.
 function clock(){
  const tempo=isTempoPack()?activeTempoSegment():null;
  return {context,currentTime:context?.currentTime??0,origin:tempo?.at??startAt,
   bpm:tempo?.bpm??80,nextBoundary:isTempoPack()?tempoSegments.find(s=>s.at>(context?.currentTime??0))?.at??null:null,
   playing,paused:Boolean(suspended||context?.state!=='running'),masterLevel};
 }
  function getDrift(){return 0} // All stem starts use the same AudioContext timestamp.
 function getSyncStatus(){
  const actual=isTempoPack()?activeTempoSegment()?.bpm??requestedBpm:80;
  return {mode:isTempoPack()?'tempo-variant-audio-clock':'shared-audio-clock',
   bpm:actual,requestedBpm:isTempoPack()?requestedBpm:80,tempoAvailable:isTempoPack(),
   underruns,lastLateSeconds,paused:playing&&(suspended||context?.state!=='running'),
   playbackSeconds:playbackSeconds(),error:lastError};
 }
 function dispose(){
  stop();prepared=null;preparing=null;packRevision++;
  for(const t of tracks.values()){t.file=null;t.header=null;t.gain?.disconnect();t.panNode?.disconnect()}
  if(context){const old=context;context=null;old.close().catch(()=>{})}
 }
 return {setFile,setPack,clearPack,setTempo,setLevel,setLevels,setSpatialPans,spatialPans,setMuted,setSolo,setMaster,setAcoustics,activateAudio,prepare,start,stop,suspend,resume,getDrift,
  getSyncStatus,playbackSeconds,clock,loaded,levels,dispose,isPlaying:()=>playing};
}
