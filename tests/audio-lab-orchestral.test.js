const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/index.html'),'utf8');
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(inline,'Audio Lab must contain a module script');
 const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:inline[1],encoding:'utf8'});
 assert.equal(check.status,0,check.stderr||'Audio Lab inline module failed syntax check');
 assert.match(inline[1],/ambient\.cascade\(fixture/);
 assert.match(inline[1],/String\(event\.arm\)/);
 const fixtures=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/playtest-cascades.js'),'utf8');
 assert.match(fixtures,/"label": "Monstrous"/);
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
 assert.notEqual(notes[1].voiceOctave,notes[3].voiceOctave);assert.equal(notes[1].voiceWave,'bell');assert.equal(notes[3].voiceWave,'reed');assert.ok(notes[1].voicePan<0 && notes[3].voicePan>0);
 assert.equal(a.events.find(e=>e.type==='rebound').time,1.4);
 assert.deepEqual(original.events.filter(e=>e.type==='note').map(e=>e.time),[0,1,2,3,4]);
 const fallback=orchestralReplay({events:[{type:'note',time:0,pip:1},{type:'note',time:.5,pip:2}],operations:2,duration:1});
 assert.equal(fallback.polyphonic,false);assert.equal(fallback.events[1].time,.5);
 assert.equal(orchestralReplay({events:[{type:'arm',arm:0,time:0},{type:'note',pip:1,time:0,arm:0}],operations:1,duration:1}).polyphonic,false);
 const ambientSource=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/ambient-composition.js'),'utf8');const {ambientIdentity,createAmbient}=await import('data:text/javascript;base64,'+Buffer.from(ambientSource).toString('base64'));const fixture={pips:[1,2,3,4],operations:32,rebounds:1,events:[{type:'arm',arm:0},{type:'arm',arm:1}]};assert.deepEqual(ambientIdentity(fixture),ambientIdentity(fixture));assert.notDeepEqual(ambientIdentity(fixture),ambientIdentity({...fixture,pips:[1,2,3,5]}));let starts=0,stops=0;const param=()=>({value:0,setTargetAtTime(){},cancelScheduledValues(){}});const node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){},start(){starts++},stop(){stops++}});const ctx={currentTime:0,createGain:node,createOscillator:node};const ambient=createAmbient(ctx,node());assert.equal(starts,3);ambient.start(fixture);ambient.cascade(fixture,2,5);ambient.mute();assert.equal(stops,0);ambient.dispose();assert.equal(stops,3);console.log('Orchestral and ambient scheduling passed');
})().catch(e=>{console.error(e);process.exitCode=1});
