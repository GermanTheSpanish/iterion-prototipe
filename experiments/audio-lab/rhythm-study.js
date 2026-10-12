// Audio Lab only. All timestamps derive from recorded trace events, never gameplay state.
// Two-bar pickup, soft sixteenth-note attraction, subtle quarter-note pulse, one-bar cadence.
export const RHYTHM_STUDY = Object.freeze({bpm:106,beatsPerBar:4,introBars:2,outroBars:1,quantization:.32,pulse:'subtle'});
export function rhythmStudy(replay,config=RHYTHM_STUDY) {
  if(!replay||!Array.isArray(replay.events))throw new TypeError('Missing recorded replay');
  const {bpm,beatsPerBar,introBars,outroBars,quantization}=config;
  if(![bpm,beatsPerBar,introBars,outroBars,quantization].every(Number.isFinite)||bpm<=0||beatsPerBar<=0||introBars<0||outroBars<0||quantization<0||quantization>1)throw new RangeError('Invalid rhythm settings');
  const beat=60/bpm, intro=beat*beatsPerBar*introBars, grid=beat/4;
  const source=replay.events.filter(e=>e.type==='note');
  const maxNote=Math.max(0,...source.map(e=>e.time));
  const cascadeDuration=Math.max(maxNote+beat/2,Number(replay.duration)||0);
  const outroStart=intro+Math.ceil(cascadeDuration/beat)*beat;
  const total=outroStart+beat*beatsPerBar*outroBars;
  const events=[];
  for(const e of replay.events) {
    if(!Number.isFinite(e.time)||e.time<0)throw new RangeError('Invalid event timestamp');
    const snapped=Math.round(e.time/grid)*grid;
    events.push({...e,time:intro+e.time+(snapped-e.time)*quantization,phase:'cascade'});
  }
  // Sparse pitched framing. Pips are a fixed musical arrangement, not inferred gameplay operations.
  const pickup=[{beat:0,pip:0},{beat:2,pip:3},{beat:4,pip:4},{beat:6,pip:3}];
  for(const n of pickup)if(n.beat<beatsPerBar*introBars)events.push({type:'note',pip:n.pip,time:n.beat*beat,phase:'intro',voiceWave:'soft',voiceVolume:.27,voiceRelease:.6,voiceOctave:-1});
  const cadence=[{beat:0,pip:4},{beat:2,pip:3},{beat:3,pip:0}];
  for(const n of cadence)if(n.beat<beatsPerBar*outroBars)events.push({type:'note',pip:n.pip,time:outroStart+n.beat*beat,phase:'outro',voiceWave:'soft',voiceVolume:.34,voiceRelease:1.2,voiceOctave:-1});
  // Percussion stays intentionally quiet; quarter-note beats never alter operation ordering.
  for(let index=0;index<Math.ceil(total/beat-1e-8);index++)events.push({type:'pulse',time:index*beat,phase:index*beat<intro?'intro':index*beat<outroStart?'cascade':'outro',accent:index%4===0});
  return {events:events.map((e,i)=>({...e,order:i})).sort((a,b)=>a.time-b.time||a.order-b.order),duration:total+.6,introDuration:intro,outroStart,beat,recordedOperations:source.length,splitCount:replay.splitCount||0,source:'RECORDED SIGNAL TREE · RHYTHM STUDY'};
}
