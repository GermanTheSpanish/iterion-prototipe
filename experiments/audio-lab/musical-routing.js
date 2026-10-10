// Audio-only deterministic interpretation; recorded route order and operations are unchanged.
export function musicalReplay(replay,{rhythm=false,power=false,ascending=false,separation=0.5,powerLevel=1}={}) {
  if(!replay || !Array.isArray(replay.events)) throw new TypeError('Missing replay events');
  const notes=replay.events.filter(e=>e.type==='note');
  const groups=[];let current=[],previous=null;
  function flush(){if(current.length)groups.push(current);current=[];}
  for(const event of replay.events){
    if(event.type==='note'){
      // Reversal is recorded even in older fixtures without explicit rebound markers.
      if(previous && (event.reverse!==previous.reverse || event.arm!==previous.arm))flush();
      current.push(event);previous=event;
    }else if(['arm','arm-end','rebound','split'].includes(event.type)){flush();previous=null;}
  }
  flush();
  const mapped=new Map();
  const speed=notes.length>1?Math.max(.25,Math.min(2,(notes[1].time-notes[0].time)/.6)):1;
  let cursor=0,index=0;
  for(const group of groups){
    const count=group.length;
    const beats=count===1?2:count===2?1:count===3?.5:.25;
    const step=beats*.42*speed;
    const start=cursor;
    for(let i=0;i<count;i++){
      const e=group[i];
      const level=power?Math.max(0,Math.min(3,Math.round(powerLevel)-1)):0;
      const rise=ascending?Math.min(2,Math.floor(index/Math.max(1,Math.ceil(notes.length/3)))):0;
      // Alternate branch registers; arm zero is a real branch, not an absent value.
      const branch=e.arm==null?0:(Math.abs(Number(e.arm)||0)%2?1:0);
      mapped.set(e,{...e,time:rhythm?start+i*step:e.time,octave:Math.min(3,level+rise),armOffset:branch,releaseScale:Math.max(.12,1-separation*.8),volumeScale:e.arm==null?1:1-separation*.5});
      index++;
    }
    cursor=rhythm?start+count*step+step*.4:group[group.length-1].time+.12;
  }
  // Map structural effects to the next note in the trace so they follow the new rhythm.
  const events=replay.events.map((event,i)=>{
    if(mapped.has(event))return mapped.get(event);
    if(!rhythm)return event;
    const next=replay.events.slice(i+1).find(e=>mapped.has(e));
    return {...event,time:next?mapped.get(next).time:cursor};
  });
  const last=Math.max(0,...events.map(e=>e.time||0));
  return {events,duration:last+.35,operations:replay.operations,structuralRhythm:replay.events.some(e=>['arm','rebound','split'].includes(e.type)),rhythmicGroups:groups.map(g=>g.length)};
}
