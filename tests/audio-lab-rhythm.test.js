const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const src=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/rhythm-study.js'),'utf8');
 const {rhythmStudy,RHYTHM_STUDY}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 assert.equal(RHYTHM_STUDY.bpm,106);
 const replay={duration:1.8,splitCount:2,events:[
  {type:'note',pip:4,time:0,path:'0',arm:0},
  {type:'note',pip:2,time:0,path:'1',arm:1},
  {type:'split',time:.32,path:''},
  {type:'note',pip:6,time:.43,path:'0.0',arm:0},
  {type:'note',pip:3,time:.43,path:'0.1',arm:0},
  {type:'rebound',time:.9,path:'0'}
 ]};
 const study=rhythmStudy(replay);
 assert.deepEqual(study,rhythmStudy(replay));
 assert.equal(study.recordedOperations,4);
 assert.equal(study.splitCount,2);
 assert.equal(study.introDuration,8*60/106);
 assert.equal(study.outroStart,study.introDuration+Math.ceil(1.8/(60/106))*(60/106));
 const notes=study.events.filter(e=>e.type==='note'&&e.phase==='cascade');
 assert.equal(notes.length,4);
 assert.equal(notes[0].time,notes[1].time);
 assert.equal(notes[2].time,notes[3].time);
 assert.ok(notes[2].time>study.introDuration);
 assert.ok(notes[2].time<study.outroStart);
 assert.equal(study.events.filter(e=>e.type==='pulse').length,Math.ceil((study.duration-.6)/(60/106)-1e-8));
 assert.equal(study.events.filter(e=>e.phase==='intro'&&e.type==='note').length,4);
 assert.equal(study.events.filter(e=>e.phase==='outro'&&e.type==='note').length,3);
 assert.equal(study.events.filter(e=>e.type==='split').length,1);
 assert.throws(()=>rhythmStudy(null),/Missing recorded replay/);
 assert.throws(()=>rhythmStudy({events:[{type:'note',time:-1}]}),/timestamp/);
 assert.throws(()=>rhythmStudy(replay,{...RHYTHM_STUDY,bpm:0}),/Invalid rhythm/);
 const html=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/index.html'),'utf8');
 assert.match(html,/rhythmStudy\(renderSignalTree\(trace/);
 assert.match(html,/id="rhythm-traces"/);
 assert.match(html,/instrument\.pulse/);
 console.log('Rhythm Study regressions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
