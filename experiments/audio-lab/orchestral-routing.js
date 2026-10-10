// Audio Lab only. Branch overlap is a rendering decision, never a gameplay change.
// A trace without arm markers remains sequential; do not synthesize missing branches.
export function orchestralReplay(replay) {
  if (!replay || !Array.isArray(replay.events)) throw new TypeError('Missing replay events');
  const events = replay.events;
  const firstArm = events.findIndex(e => e.type === 'arm');
  if (firstArm < 0) return {...replay, events:events.map(e=>({...e})), polyphonic:false, voices:0};
  const split = events.slice(0,firstArm).filter(e=>e.type==='split').at(-1);
  if (!split) return {...replay,events:events.map(e=>({...e})),polyphonic:false,voices:0};
  const entry = split.time;
  const starts = new Map();
  let active = null, activeStart = null;
  const result = [];
  for (const event of events) {
    if (event.type === 'arm') {
      active = String(event.arm);
      activeStart = null;
      if (!starts.has(active)) starts.set(active,starts.size);
      result.push({...event,time:entry,voiceId:active});
      continue;
    }
    if (event.type === 'arm-end') {active=null;activeStart=null;continue;}
    if (active!==null && event.type==='note' && activeStart===null) activeStart=event.time;
    const relative=active!==null && activeStart!==null ? Math.max(0,event.time-activeStart) : 0;
    const time=active!==null ? entry+relative : event.time;
    const index=active===null?0:starts.get(active)+1;
    // Related timbres, distinct register and envelope. Branches share the same pitch vocabulary.
    const timbres=['triangle','soft','sine','triangle'];
    result.push({...event,time,voiceId:active,voiceWave:timbres[index%timbres.length],
      voiceOctave:index===0?0:index===1?-1:index===2?0:1,
      voiceRelease:index===0?1:index===1?1.15:.65,
      voiceVolume:index===0?1:index===1?.66:.52});
  }
  return {events:result,operations:replay.operations,duration:Math.max(0,...result.map(e=>e.time||0))+.75,
    polyphonic:true,voices:starts.size};
}
