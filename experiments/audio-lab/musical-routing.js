// Audio-only interpretation of recorded cascade events. Does not alter game routing.
export function musicalReplay(replay,{rhythm=false,power=false,ascending=false,separation=0.5,powerLevel=1}={}) {
  const notes=replay.events.filter(e=>e.type==='note');
  const hasStructure=replay.events.some(e=>['arm','rebound','split'].includes(e.type));
  const groups=[];let current=[];
  for(const event of replay.events) {
    if(event.type==='note') current.push(event);
    else if(['arm','rebound','split'].includes(event.type) && current.length){groups.push(current);current=[];}
  }
  if(current.length)groups.push(current);
  const noteInfo=new Map();
  let offset=0,idx=0;
  for(const group of groups){
    const count=group.length;
    const beat=count===1?2:count===2?1:count===3?0.5:0.25;
    const step=beat*0.24;
    const base=group[0].time;
    for(let i=0;i<count;i++){
      const event=group[i];
      const time=rhythm&&hasStructure?offset+i*step:event.time;
      const octave=(power?Math.max(0,Math.min(2,Math.floor(Math.log2(Math.max(1,powerLevel))))):0)
        +(ascending?Math.min(2,Math.floor(idx/12)):0);
      const armOffset=event.arm==null?0:(Math.abs(Number(event.arm)||1)%2?1:0);
      noteInfo.set(event,{...event,time,octave:Math.min(3,octave),armOffset,releaseScale:Math.max(0.15,1-separation*0.72),volumeScale:event.arm==null?1:1-separation*0.4});
      idx++;
    }
    offset=(rhythm&&hasStructure?offset+count*step:group[group.length-1].time+0.12);
  }
  const mapped=replay.events.map(e=>noteInfo.get(e)||e);
  // Preserve marker ordering and timing; group-based timing is available only when structural markers exist.
  return {events:mapped,duration:Math.max(replay.duration,...mapped.map(e=>e.time||0))+0.1,operations:replay.operations,structuralRhythm:hasStructure};
}
