// Deterministic, bounded serial arrangement of existing physical-topology voices.
// Music alone interprets the structure; it does not influence game/routing/scoring.
const SERIES=Object.freeze([0,2,1,3,0,4,2,1]);
export const MUSIC_PROFILES=Object.freeze(['calm','motion','complex']);
const ACTIVE=Object.freeze({
 calm:Object.freeze(['line']),
 motion:Object.freeze(['line','turn','cycle']),
 complex:Object.freeze(['line','turn','cycle','junction'])
});
const SCALE=Object.freeze({calm:.85,motion:1,complex:1.05});
export function composeSerialMachine(topology,harmony,profile='motion'){
 if(!MUSIC_PROFILES.includes(profile))throw new RangeError('Unknown musical profile');
 if(!topology||!Array.isArray(topology.events)||!Array.isArray(topology.voices))throw new TypeError('Missing physical-topology arrangement');
 if(!harmony||!Array.isArray(harmony.notes)||harmony.notes.length<4||!Array.isArray(harmony.chord)||harmony.chord.length!==3)throw new TypeError('Missing harmonic palette');
 const allowed=new Set(ACTIVE[profile]),events=[];
 const voiceOrder=['line','turn','cycle','junction'];
 const byVoice=new Map(voiceOrder.map(v=>[v,0]));
 const duration=Number(topology.beatsPerLoop)||8;
 const bpm=Number(harmony.bpm)||80;
 // Every physical voice has its own transform of an authored serial sequence.
 // Line: direct; turn: retrograde; cycle: inversion; junction: harmonic triad.
 for(const source of topology.events){
  if(!allowed.has(source.voice))continue;
  const index=byVoice.get(source.voice)||0;byVoice.set(source.voice,index+1);
  if(profile==='calm'&&source.voice==='line'&&index%2!==0)continue;
  if(profile==='motion'&&source.voice==='cycle'&&index%2!==0)continue;
  const palette=harmony.notes;
  const original=(Number(source.pip)+SERIES[index%SERIES.length])%palette.length;
  let pitch;
  if(source.voice==='junction')pitch=harmony.chord[index%3]+12;
  else if(source.voice==='turn')pitch=palette[(Number(source.pip)+SERIES[(SERIES.length-1-index%SERIES.length)])%palette.length]+12;
  else if(source.voice==='cycle')pitch=palette[palette.length-1-original]-12;
  else pitch=palette[original];
  const voiceGain={line:.24,turn:.105,cycle:.13,junction:.09}[source.voice];
  const release={line:.52,turn:.30,cycle:1.25,junction:2.1}[source.voice];
  const pan={line:0,turn:-.28,cycle:.26,junction:0}[source.voice];
  const at=Math.max(0,Number(source.beat)||0);
  if(at>=duration)continue;
  events.push({voice:source.voice,beat:at,midi:pitch,volume:voiceGain*SCALE[profile],
    attack:source.voice==='junction'?.085:.012,release,pan});
 }
 // Limit density even for large machines. In particular a junction is a chord,
 // not an oscillator per neighbour or an additive unbounded set of notes.
 const MAX_NOTES=18;
 return {profile,center:harmony.center,events:events.slice(0,MAX_NOTES).sort((a,b)=>a.beat-b.beat||voiceOrder.indexOf(a.voice)-voiceOrder.indexOf(b.voice)),voices:[...new Set(events.map(e=>e.voice))],bpm,beatsPerLoop:duration};
}
