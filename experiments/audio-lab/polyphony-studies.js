// Audio-only studies, NOT recorded game runs. Each arm reuses operand phrases
// from the recorded Monstrous SIGNAL TREE (B-1HARM9V). Branch structure here
// is explicitly authored to test polyphony; it is not gameplay telemetry.
const source = Object.freeze({
  A: Object.freeze([5,3,4,6,5,2,0,2,5,6,4,3,5,4,4,1,1,5]),
  B: Object.freeze([2,6,0,6,2,4,4,1,1,5])
});
function study(id,label,arms,lead=[1,1,4,4]) {
  const events=lead.map(pip=>({type:'op',pip,reverse:false}));
  events.push({type:'split',kind:'authored-audio-study'});
  for(let i=0;i<arms.length;i++){
    events.push({type:'arm',arm:i});
    for(let j=0;j<arms[i].length;j++){
      if(j===Math.floor(arms[i].length/2))events.push({type:'rebound'});
      events.push({type:'op',pip:arms[i][j],reverse:j>=Math.floor(arms[i].length/2)});
    }
    events.push({type:'arm-end',arm:i});
  }
  const pips=events.filter(e=>e.type==='op').map(e=>e.pip);
  return Object.freeze({id,label,source:'Monstrous operand excerpts, authored branch topology',run:'Audio study — not a real run',move:'Simulated concurrent branches',operations:pips.length,rebounds:arms.length,events,pips,traceSource:'SIMULATED · recorded operands / authored simultaneous arms',study:true,arms:arms.length});
}
export const POLYPHONY_STUDIES=Object.freeze([
  study('study-dual','Dual Branch',[source.A.slice(0,10),source.B.slice(0,10)]),
  study('study-triple','Triple Branch',[source.A.slice(0,12),source.B.slice(0,10),source.A.slice(6,16)]),
  study('study-dense','Dense Cascade',[source.A,source.B,source.A.slice(3,17),source.B.slice(1,9)],[1,4,4,5,3,4])
]);
