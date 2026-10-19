const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../experiments/audio-lab');
async function esm(file){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
}
(async()=>{
 const {harmonyAt,SPACE_DRIFT_LENGTH,SPACE_DRIFT_BPM}=await esm('space-drift-harmony.js');
 const {composeSerialMachine,MUSIC_PROFILES}=await esm('serial-composition.js');
 const {TOPOLOGY_STUDIES}=await esm('topology-fixtures.js');
 const {interpretTopology}=await esm('topology-composition.js');
 assert.equal(SPACE_DRIFT_LENGTH,432);
 assert.equal(SPACE_DRIFT_BPM,80);
 assert.equal(harmonyAt(0).center,'C');
 assert.equal(harmonyAt(36).center,'Bb');
 assert.equal(harmonyAt(120).center,'Eb');
 assert.equal(harmonyAt(132).center,'Bb');
 assert.equal(harmonyAt(432).center,'C');
 assert.deepEqual(harmonyAt(432+36),harmonyAt(36));
 assert.equal(harmonyAt(431.9).index,35);
 assert.throws(()=>harmonyAt(-1),RangeError);
 assert.throws(()=>harmonyAt(NaN),RangeError);
 assert.deepEqual(MUSIC_PROFILES,['calm','motion','complex']);
 for(const study of TOPOLOGY_STUDIES){
  const topology=interpretTopology(study.pieces);
  for(const centerTime of [0,36,120,132]){
   const harmonic=harmonyAt(centerTime);
   for(const profile of MUSIC_PROFILES){
    const original=JSON.stringify(topology);
    const score=composeSerialMachine(topology,harmonic,profile);
    assert.deepEqual(score,composeSerialMachine(structuredClone(topology),structuredClone(harmonic),profile));
    assert.equal(JSON.stringify(topology),original);
    assert.ok(score.events.length<=18);
    assert.equal(score.bpm,80);
    const compatible=new Set([...harmonic.notes,...harmonic.chord].map(p=>p%12));
    for(const note of score.events){
     assert.ok(Number.isInteger(note.midi)&&note.midi>=24&&note.midi<=96);
     assert.ok(compatible.has(note.midi%12),'Unexpected pitch class '+note.midi);
     assert.ok(note.beat>=0&&note.beat<8);
     assert.ok(note.volume>0&&note.volume<1);
    }
   }
  }
 }
 const network=interpretTopology(TOPOLOGY_STUDIES[2].pieces),h=harmonyAt(0);
 const calm=composeSerialMachine(network,h,'calm');
 const motion=composeSerialMachine(network,h,'motion');
 const complex=composeSerialMachine(network,h,'complex');
 assert.ok(calm.events.length<motion.events.length && motion.events.length<complex.events.length);
 assert.deepEqual(calm.voices,['line']);
 assert.equal(complex.voices.length,4);
 assert.throws(()=>composeSerialMachine(network,h,'wrong'),RangeError);
 assert.throws(()=>composeSerialMachine(null,h),TypeError);
 assert.throws(()=>composeSerialMachine(network,null),TypeError);
 const html=fs.readFileSync(path.join(root,'topology-study.html'),'utf8');
 const instrument=fs.readFileSync(path.join(root,'instrument.js'),'utf8');
 assert.match(html,/id="music-profile"/);
 assert.match(html,/harmonyAt\(localTime\)/);
 assert.match(html,/composeSerialMachine\(topology,harmonic/);
 assert.match(html,/instrument\.midi\(/);
 assert.match(instrument,/midi\(midi,at,/);
 console.log('Space Drift harmonic serial composition regressions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
