// Audio Lab composition layer. No gameplay state, random sampling, or external audio assets.
// Telemetry maps to a stable harmonic identity. The layer persists between cascades.
const SCALE=[0,3,5,7,10];
export function ambientIdentity(fixture) {
  const pips=Array.isArray(fixture?.pips)?fixture.pips:[];
  let hash=2166136261;
  for(const pip of pips) hash=Math.imul(hash ^ (Number(pip)&255),16777619)>>>0;
  const root=43+(hash%5)*2;
  const depth=Math.min(1,(Number(fixture?.operations)||0)/64);
  const complexity=Math.min(1,((Number(fixture?.rebounds)||0)+Math.max(0,(fixture?.events||[]).filter(e=>e.type==='arm').length-1))/5);
  return {root,intervals:[0,SCALE[(hash>>>8)%5]+12,19+SCALE[(hash>>>16)%5]],depth,complexity};
}
export function createAmbient(context,destination) {
  const gain=context.createGain();gain.gain.value=0;gain.connect(destination);
  const voices=[0,1,2].map((i)=>{
    const osc=context.createOscillator(),tone=context.createGain();
    osc.type=i===0?'sine':'triangle';
    tone.gain.value=[.58,.20,.12][i];
    osc.connect(tone);tone.connect(gain);osc.start();
    return {osc,tone};
  });
  let enabled=false;
  function update(fixture,at=context.currentTime) {
    const identity=ambientIdentity(fixture);
    voices.forEach(({osc},i)=>{
      const midi=identity.root+identity.intervals[i]-(i===0?12:0);
      const freq=440*Math.pow(2,(midi-69)/12);
      osc.frequency.cancelScheduledValues(at);
      osc.frequency.setTargetAtTime(freq,at,.8+i*.5);
    });
    return identity;
  }
  function level(value,at=context.currentTime,fade=1.8) {
    const target=enabled?Math.max(0,Math.min(.09,value)) : 0;
    gain.gain.cancelScheduledValues(at);
    gain.gain.setTargetAtTime(target,at,Math.max(.05,fade)/3);
  }
  return {
    update,
    start(fixture,at=context.currentTime){enabled=true;const id=update(fixture,at);level(.023+id.depth*.012,at,2);return id;},
    cascade(fixture,start,duration){const id=update(fixture,start);level(.036+id.depth*.018+id.complexity*.008,start,1.2);level(.023+id.depth*.012,start+duration,3);return id;},
    mute(at=context.currentTime){enabled=false;level(0,at,.3);},
    dispose(){enabled=false;voices.forEach(({osc,tone})=>{try{osc.stop()}catch{}osc.disconnect();tone.disconnect()});gain.disconnect();}
  };
}
