// Audio Lab diagnostics only. These are scheduling observations, not proof of audibility.
export const AUDIO_TRACE_SCHEMA=1;
export function createAudioTelemetry({limit=512}={}){
  if(!Number.isInteger(limit)||limit<1)throw new RangeError('Invalid audio diagnostic limit');
  const events=[],counts={};let dropped=0,sequence=0,playback=0;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function record(type,detail={}){
    const entry={schema:AUDIO_TRACE_SCHEMA,id:'audio:'+ ++sequence,playback,type,...clone(detail)};
    events.push(entry);if(events.length>limit){events.shift();dropped++}
    counts[type]=(counts[type]||0)+1;return entry
  }
  function begin(source,interpretation){
    playback++;record('playback-start',{source:String(source||'unknown'),interpretation:String(interpretation||'original')});return playback
  }
  function cue(kind,scheduledAt,context,detail={}){
    const gain=Number(detail.gain);
    const status=Number.isFinite(gain)&&gain<=0?'muted':context?.state==='suspended'?'context-suspended':'scheduled';
    return record('cue',{kind,status,scheduledAt:Number.isFinite(scheduledAt)?scheduledAt:null,contextTime:Number.isFinite(context?.currentTime)?context.currentTime:null,contextState:context?.state||'unavailable',...detail})
  }
  function cancel(currentTime){record('playback-stop',{contextTime:Number.isFinite(currentTime)?currentTime:null})}
  function snapshot(){return{schema:AUDIO_TRACE_SCHEMA,source:'audio-lab',totalEvents:sequence,dropped,counts:{...counts},events:clone(events)}}
  return Object.freeze({record,begin,cue,cancel,snapshot});
}
