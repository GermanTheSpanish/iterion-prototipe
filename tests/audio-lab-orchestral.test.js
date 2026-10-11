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
 const studiesSource=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/polyphony-studies.js'),'utf8');
 const {POLYPHONY_STUDIES}=await import('data:text/javascript;base64,'+Buffer.from(studiesSource).toString('base64'));
 assert.equal(POLYPHONY_STUDIES.length,3);
 assert.deepEqual(POLYPHONY_STUDIES.map(study=>study.arms),[2,3,4]);
 assert.match(inline[1],/POLYPHONY_STUDIES/);
 for(const study of POLYPHONY_STUDIES){
  assert.equal(study.study,true);
  assert.match(study.traceSource,/SIMULATED/);
  assert.equal(study.operations,study.events.filter(e=>e.type==='op').length);
  const orchestral=orchestralReplay((await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/replay.js'),'utf8')).toString('base64'))).replayEvents(study));
  assert.equal(orchestral.voices,study.arms);
  assert.equal(orchestral.polyphonic,true);
  const arms=new Map();
  for(const note of orchestral.events.filter(e=>e.type==='note'&&e.arm!==null)){
   if(!arms.has(note.arm))arms.set(note.arm,note.time);
  }
  assert.equal(arms.size,study.arms);
  assert.equal(new Set(arms.values()).size,1,'all branches must begin simultaneously');
  assert.deepEqual(orchestral,orchestralReplay((await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/replay.js'),'utf8')).toString('base64'))).replayEvents(study)));
 }

 const importSource=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/signal-tree-import.js'),'utf8');
 const replaySource=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/replay.js'),'utf8');
 const {parseSignalTrees,renderSignalTree}=await import('data:text/javascript;base64,'+Buffer.from(importSource.replace("import {operationDelay} from './replay.js';",replaySource)).toString('base64'));
 assert.match(inline[1],/parseSignalTrees/);assert.match(inline[1],/renderSignalTree/);
 const op=(value,piece)=>({type:'op',value,piece,reverse:false,after:value});
 const tree=[op(1,10),{type:'signal-fork',piece:20,splitKind:'centered'},
 {type:'signal-start',fork:20,arm:0},op(2,21),
 {type:'signal-fork',piece:30,splitKind:'triple-double'},
 {type:'signal-start',fork:30,arm:0},op(3,31),{type:'signal-end',fork:30,arm:0},
 {type:'signal-start',fork:30,arm:1},op(4,32),{type:'signal-end',fork:30,arm:1},
 {type:'signal-start',fork:30,arm:2},op(5,33),{type:'signal-end',fork:30,arm:2},
 {type:'signal-join',piece:30}, {type:'signal-end',fork:20,arm:0},
 {type:'signal-start',fork:20,arm:1},op(6,22),{type:'signal-end',fork:20,arm:1},
 {type:'signal-join',piece:20}];
 const debug='Header\\nT22 SIGNAL TREE splits=2 base=42 selection=42 trace='+JSON.stringify(tree)+'\\n';
 const traces=parseSignalTrees(debug);assert.equal(traces.length,1);assert.equal(traces[0].move,'T22');
 const rendered=renderSignalTree(traces[0]);
 assert.deepEqual(rendered,renderSignalTree(traces[0]));
 assert.equal(rendered.operations,6);assert.equal(rendered.splitCount,2);assert.equal(rendered.voices,5);
 assert.deepEqual(rendered.paths,['0','0.0','0.1','0.2','1']);
 const importedNotes=rendered.events.filter(e=>e.type==='note');
 assert.equal(importedNotes.find(e=>e.path==='0').time,importedNotes.find(e=>e.path==='1').time);
 assert.equal(importedNotes.find(e=>e.path==='0.0').time,importedNotes.find(e=>e.path==='0.1').time);
 assert.equal(importedNotes.find(e=>e.path==='0.1').time,importedNotes.find(e=>e.path==='0.2').time);
 assert.equal(renderSignalTree(tree,2).operations,6);
 assert.throws(()=>parseSignalTrees('T2 SIGNAL TREE trace=COMPACTED_AFTER_RESTORE'),/compacted/);
 assert.throws(()=>parseSignalTrees('T2 SIGNAL TREE trace=broken'),/Invalid SIGNAL TREE JSON/);
 assert.throws(()=>renderSignalTree([{type:'signal-fork',piece:1}]),/Fork must contain/);
 assert.throws(()=>renderSignalTree([{type:'signal-start',fork:1,arm:0}]),/Unbalanced/);
 assert.throws(()=>renderSignalTree([{type:'op',piece:1}]),/pip value/);
 assert.equal(parseSignalTrees(JSON.stringify(tree)).length,1);
 const ambientSource=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/ambient-composition.js'),'utf8');const {ambientIdentity,createAmbient}=await import('data:text/javascript;base64,'+Buffer.from(ambientSource).toString('base64'));const fixture={pips:[1,2,3,4],operations:32,rebounds:1,events:[{type:'arm',arm:0},{type:'arm',arm:1}]};assert.deepEqual(ambientIdentity(fixture),ambientIdentity(fixture));assert.notDeepEqual(ambientIdentity(fixture),ambientIdentity({...fixture,pips:[1,2,3,5]}));let starts=0,stops=0;const param=()=>({value:0,setTargetAtTime(){},cancelScheduledValues(){}});const node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){},start(){starts++},stop(){stops++}});const ctx={currentTime:0,createGain:node,createOscillator:node};const ambient=createAmbient(ctx,node());assert.equal(starts,3);ambient.start(fixture);ambient.cascade(fixture,2,5);ambient.mute();assert.equal(stops,0);ambient.dispose();assert.equal(stops,3);console.log('Orchestral and ambient scheduling passed');
})().catch(e=>{console.error(e);process.exitCode=1});
