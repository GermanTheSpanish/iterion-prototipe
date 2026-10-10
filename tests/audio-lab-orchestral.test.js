const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/orchestral-routing.js'),'utf8');
 const {orchestralReplay}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const original={operations:5,duration:5,events:[
 {type:'note',pip:1,time:0,arm:null},{type:'split',time:1},
 {type:'arm',arm:0,time:1},{type:'note',pip:2,time:1,arm:0},{type:'note',pip:3,time:2,arm:0},
 {type:'arm',arm:1,time:3},{type:'note',pip:4,time:3,arm:1},{type:'rebound',time:3.4},
 {type:'note',pip:5,time:4,arm:1}]};
 const a=orchestralReplay(original),again=orchestralReplay(original);
 assert.deepEqual(a,again);assert.equal(a.polyphonic,true);assert.equal(a.voices,2);
 const notes=a.events.filter(e=>e.type==='note');
 assert.deepEqual(notes.map(e=>e.time),[0,1,2,1,2]);
 assert.notEqual(notes[1].voiceWave,notes[3].voiceWave);
 assert.notEqual(notes[1].voiceOctave,notes[3].voiceOctave);
 assert.equal(a.events.find(e=>e.type==='rebound').time,1.4);
 assert.deepEqual(original.events.filter(e=>e.type==='note').map(e=>e.time),[0,1,2,3,4]);
 const fallback=orchestralReplay({events:[{type:'note',time:0,pip:1},{type:'note',time:.5,pip:2}],operations:2,duration:1});
 assert.equal(fallback.polyphonic,false);assert.equal(fallback.events[1].time,.5);
 assert.equal(orchestralReplay({events:[{type:'arm',arm:0,time:0},{type:'note',pip:1,time:0,arm:0}],operations:1,duration:1}).polyphonic,false);
 console.log('Orchestral branch scheduling passed');
})().catch(e=>{console.error(e);process.exitCode=1});
