import {operationDelay} from './replay.js';

// Audio-only interpretation of the engine's selected SIGNAL TREE trace.
// The engine evaluates arms sequentially; only this renderer overlaps logical arms.
const MAX_TEXT=2_000_000, MAX_EVENTS=20000;
function decodeEvents(json) {
  if(json==='COMPACTED_AFTER_RESTORE') throw new Error('This trace was compacted after restore; export a fresh live run.');
  let events;
  try {events=JSON.parse(json)} catch {throw new Error('Invalid SIGNAL TREE JSON. Paste an unmodified debug export.')}
  if(!Array.isArray(events)||!events.length||events.length>MAX_EVENTS||events.some(e=>!e||typeof e!=='object'||typeof e.type!=='string'))throw new Error('Expected a nonempty array of engine events.');
  return events;
}
export function parseSignalTrees(text) {
  if(typeof text!=='string'||text.length>MAX_TEXT)throw new Error('Debug text is missing or too large (2 MB maximum).');
  const traces=[];
  for(const line of text.split(/\r?\n/)){
    const marker=line.match(/^T(\d+) SIGNAL TREE\b.*?\btrace=(.*)$/);
    if(!marker)continue;
    const events=decodeEvents(marker[2].trim());
    traces.push({id:'import-'+traces.length,label:'T'+marker[1]+' · Recorded SIGNAL TREE',move:'T'+marker[1],events,traceSource:'RECORDED SIGNAL TREE',imported:true});
  }
  if(!traces.length){
    const raw=text.trim();
    if(raw.startsWith('['))traces.push({id:'import-0',label:'Recorded SIGNAL TREE',move:'Imported trace',events:decodeEvents(raw),traceSource:'RECORDED SIGNAL TREE',imported:true});
  }
  if(!traces.length)throw new Error('No SIGNAL TREE trace found. Paste a debug export containing "trace=[...]" or a raw event array.');
  return traces;
}
const timbres=['triangle','bell','reed','soft'];
function voice(path) {
  const index=path.length?path[path.length-1]+1:0;
  return {voiceWave:timbres[index%timbres.length],voiceOctave:index===1?-1:index===2?0:index>2?1:0,voiceRelease:index===0?1:index===1?1.15:.65,voiceVolume:index===0?1:index===1?.78:.68,voicePan:index===0?0:index%2===1?-.7:.7};
}
export function renderSignalTree(trace,speed=1) {
  if(!Number.isFinite(speed)||speed<=0)throw new Error('Invalid playback speed.');
  const source=Array.isArray(trace)?trace:trace?.events;
  if(!Array.isArray(source)||source.length>MAX_EVENTS)throw new Error('Missing or oversized trace.');
  const events=[], paths=new Set(), forks=[];
  let cursor=0,opIndex=0,splitCount=0;
  function sequence(start,path,terminator=null) {
    let time=start;
    while(cursor<source.length){
      const event=source[cursor++];
      if(!event||typeof event.type!=='string')throw new Error('Malformed trace event.');
      if(event.type==='signal-start'||event.type==='signal-end'||event.type==='signal-join'||event.type==='signal-merge') {
        if(terminator==='end'&&event.type==='signal-end')return {time,end:event};
        if(terminator==='join'&&(event.type==='signal-join'||event.type==='signal-merge'))return {time,end:event};
        throw new Error('Unbalanced SIGNAL TREE branch markers.');
      }
      if(event.type==='signal-fork'){
        splitCount++;
        const fork=event.piece,armIds=new Set();let maxTime=time,arms=0;
        events.push({type:'split',time,kind:event.splitKind||null,path:path.join('.')});
        while(cursor<source.length&&source[cursor]?.type==='signal-start'){
          const begin=source[cursor++];
          if(begin.fork!==fork||!Number.isInteger(begin.arm)||begin.arm<0||armIds.has(begin.arm))throw new Error('Invalid branch identity.');
          armIds.add(begin.arm);arms++;
          const child=sequence(time,[...path,begin.arm],'end');
          if(child.end.fork!==fork||child.end.arm!==begin.arm)throw new Error('Mismatched branch end.');
          maxTime=Math.max(maxTime,child.time);
        }
        if(arms<2)throw new Error('Fork must contain at least two arms.');
        const join=source[cursor++];
        if(!join||!['signal-join','signal-merge'].includes(join.type)||(join.type==='signal-merge'?join.fork:join.piece)!==fork)throw new Error('Missing matching join or merge.');
        forks.push({piece:fork,arms,path:path.join('.')});
        time=maxTime;
        continue;
      }
      if(event.type==='op'){
        if(!Number.isInteger(event.value)||event.value<0)throw new Error('Operation has no valid pip value.');
        const pip=Math.min(6,event.value),key=path.join('.');
        if(path.length)paths.add(key);
        events.push({type:'note',pip,operand:event.value,time,path:key,arm:path.length?path[0]:null,reverse:!!event.reverse,mod:Number(event.modMultiplier)>1, ...voice(path)});
        time+=operationDelay(opIndex++)/1000/speed;
      }else if(event.type==='rebound'||event.type==='zero-port'){
        events.push({type:event.type==='rebound'?'rebound':'teleport',time,path:path.join('.')});
      }else if(event.type==='core-activate')events.push({type:'core',time,path:path.join('.'),coreId:event.coreId});
    }
    if(terminator)throw new Error('Unterminated SIGNAL TREE branch.');
    return {time};
  }
  const result=sequence(0,[]);
  if(cursor!==source.length)throw new Error('Unexpected trailing events.');
  return {events:events.sort((a,b)=>a.time-b.time),operations:events.filter(e=>e.type==='note').length,duration:result.time+.75,polyphonic:splitCount>0,voices:paths.size,splitCount,paths:[...paths].sort(),forks};
}
