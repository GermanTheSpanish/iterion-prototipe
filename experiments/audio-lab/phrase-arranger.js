// Audio Lab only: bar-aligned phrase experiments, independent of gameplay RNG.
// Harmonic groups are editorial labels; no automatic key/chord claims are made.
export const STEM_PHRASE_BARS=Object.freeze({A:4,B:4,C:4,D:8,E:4,F:2});
export const ARRANGER_SCHEMA='monoid-phrase-map-v1';
const IDS=Object.freeze(['A','B','C','D','E','F']);
const assert=(v,message)=>{if(!v)throw new Error(message)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function secondsPerBar(bpm){assert(Number.isFinite(bpm)&&bpm>=50&&bpm<=200,'BPM out of range (50–200)');return 240/bpm}
// Estimate BPM from recurring drum energy on several musical scales.
// Very syncopated drums can produce misleading one-beat onset autocorrelation
// (Space Drift's original F Drum was misread as ~115 BPM). Bar, 4-bar and
// 8-bar recurrence provide a much stronger estimate for this particular track.
// Time signature and first downbeat still require editorial listening review.
export function estimateTempo(energies,hopSeconds,{minBpm=65,maxBpm=155}={}){
 assert(energies&&energies.length>40&&hopSeconds>0&&hopSeconds<=.15,'Not enough drum-envelope data');
 assert(Number.isFinite(minBpm)&&Number.isFinite(maxBpm)&&minBpm>=50&&maxBpm<=220&&maxBpm>minBpm,
  'Invalid tempo search range');
 const mean=Array.from(energies).reduce((sum,value)=>sum+(Number(value)||0),0)/energies.length;
 const data=Float32Array.from(energies,x=>(Number(x)||0)-mean);
 function recurrence(seconds){
  const lag=Math.round(seconds/hopSeconds);
  if(lag<2||lag>data.length*.70)return 0;
  let aa=0,bb=0,cross=0;
  for(let i=lag;i<data.length;i++){
   const a=data[i],b=data[i-lag];aa+=a*a;bb+=b*b;cross+=a*b;
  }
  return aa>0&&bb>0?cross/Math.sqrt(aa*bb):0;
 }
 const candidates=[];
 for(let bpm=Math.ceil(minBpm);bpm<=Math.floor(maxBpm);bpm++){
  const beat=60/bpm;
  const weights=[[1,.10],[4,.25],[16,.30],[32,.35]];
  let sum=0,active=0;
  for(const [beats,weight] of weights){
   if(Math.round(beats*beat/hopSeconds)>data.length*.70)continue;
   sum+=Math.max(-1,recurrence(beats*beat))*weight;active+=weight;
  }
  if(!active)continue;
  candidates.push({bpm,confidence:sum/active});
 }
 candidates.sort((a,b)=>b.confidence-a.confidence||a.bpm-b.bpm);
 const best=candidates[0];
 return {bpm:best?.bpm??null,confidence:best?.confidence??0,
  candidates:candidates.filter(x=>x===best||Math.abs(x.bpm-best.bpm)>=3).slice(0,5)};
}
export function createCatalogue({durationSeconds,bpm,offsetSeconds=0,groups=[]}){
 const bar=secondsPerBar(bpm);
 assert(Number.isFinite(durationSeconds)&&durationSeconds>0,'Invalid stem length');
 assert(Number.isFinite(offsetSeconds)&&offsetSeconds>=0&&offsetSeconds<bar,'Downbeat offset must fit inside one bar');
 const sceneSeconds=bar*8,count=Math.floor((durationSeconds-offsetSeconds+1e-7)/sceneSeconds);
 assert(count>=1,'Recording is too short for one 8-bar phrase');
 return Object.freeze(Array.from({length:Math.min(64,count)},(_,i)=>Object.freeze({
  id:i,from:offsetSeconds+i*sceneSeconds,to:offsetSeconds+(i+1)*sceneSeconds,
  // Unique by default: do not assume different sections use compatible chords.
  group:String(groups[i]||'SECTION_'+String(i+1).padStart(2,'0')).trim().slice(0,50)
 })));
}
function rng(seed){let s=(Number(seed)>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}}
export function buildArrangement({catalogue,bpm,mode='original',count=4,startScene=0,seed=1,lead='A',events=[]}){
 assert(Array.isArray(catalogue)&&catalogue.length>0,'Catalogue required');
 assert(['original','rearranged','adaptive'].includes(mode),'Unknown audition mode');
 assert(IDS.includes(lead)&&lead!=='D'&&lead!=='F','Invalid lead stem');
 assert(Number.isInteger(startScene)&&startScene>=0&&startScene<catalogue.length,'Invalid starting scene');
 assert(Number.isInteger(count)&&count>=1&&count<=12,'Invalid scene count');
 const bar=secondsPerBar(bpm),draw=rng(seed),phrases=[],scenes=[];
 const leadForEvent=Object.freeze({steady:'A',build:'E',branch:'B',circuit:'C',rest:'A'});
 for(let dest=0;dest<count;dest++){
  const anchor=catalogue[(startScene+dest)%catalogue.length];
  const compatible=catalogue.filter(x=>x.group===anchor.group);
  const source=mode==='original'?anchor:compatible[Math.floor(draw()*compatible.length)];
  const event=String(events[dest%Math.max(1,events.length)]||'steady');
  const voice=mode==='adaptive'?leadForEvent[event]||lead:lead;
  // Each 8-bar destination scene is cut at one shared musical grid.
  const base=dest*8*bar;
  const shuffleDrums=mode!=='original';
  const drumOrder=[0,1,2,3];
  if(shuffleDrums)for(let i=drumOrder.length-1;i>0;i--){const j=Math.floor(draw()*(i+1));[drumOrder[i],drumOrder[j]]=[drumOrder[j],drumOrder[i]]}
  for(let step=0;step<4;step++)phrases.push({scene:dest,stem:'F',sourceScene:source.id,
   sourceSeconds:source.from+drumOrder[step]*2*bar,destinationSeconds:base+step*2*bar,durationSeconds:2*bar,bars:2});
  phrases.push({scene:dest,stem:'D',sourceScene:source.id,
   sourceSeconds:source.from,destinationSeconds:base,durationSeconds:8*bar,bars:8});
  for(let half=0;half<2;half++){
   // Never borrow unrelated harmony. Only same user-approved group and aligned half.
   const bank=mode==='original'?source:compatible[Math.floor(draw()*compatible.length)];
   phrases.push({scene:dest,stem:voice,sourceScene:bank.id,
    sourceSeconds:bank.from+half*4*bar,destinationSeconds:base+half*4*bar,durationSeconds:4*bar,bars:4});
  }
  scenes.push({index:dest,group:anchor.group,sourceScene:source.id,lead:voice,event,
   alternativeCount:compatible.length});
 }
 return Object.freeze({schema:ARRANGER_SCHEMA,mode,bpm,seed,barSeconds:bar,sceneSeconds:8*bar,
  durationSeconds:8*bar*count,scenes,phrases:phrases.sort((a,b)=>a.destinationSeconds-b.destinationSeconds||a.stem.localeCompare(b.stem))});
}
export function validatePhraseMap(value){
 assert(value&&value.schema===ARRANGER_SCHEMA,'Invalid phrase map schema');
 const catalogue=createCatalogue({durationSeconds:value.durationSeconds,bpm:value.bpm,
  offsetSeconds:value.offsetSeconds,groups:value.groups});
 assert(Number.isSafeInteger(value.seed)&&value.seed>=0,'Invalid phrase seed');
 return {schema:ARRANGER_SCHEMA,bpm:value.bpm,offsetSeconds:value.offsetSeconds,
  durationSeconds:value.durationSeconds,seed:value.seed,groups:catalogue.map(x=>x.group)};
}
