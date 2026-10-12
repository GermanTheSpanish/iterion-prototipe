const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/signal-tree-import.js'),'utf8');
 const replay=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/replay.js'),'utf8');
 // Import both modules without changing the repository's module type.
 const replayUrl='data:text/javascript;base64,'+Buffer.from(replay).toString('base64');
 const parserUrl='data:text/javascript;base64,'+Buffer.from(source.replace("from './replay.js'","from '"+replayUrl+"'")).toString('base64');
 const {parseSignalTrees,renderSignalTree}=await import(parserUrl);
 const op=(value)=>({type:'op',value,modMultiplier:1});
 const recorded=[
  {type:'start'},
  {type:'signal-fork',piece:10},
  {type:'echo-signal-fork',piece:10},
  {type:'signal-start',fork:10,arm:0},
  {type:'echo-signal-start',fork:10,arm:0},
  op(3),{type:'echo-op',value:3},
  {type:'signal-end',fork:10,arm:0},
  {type:'echo-signal-end',fork:10,arm:0},
  {type:'signal-start',fork:10,arm:1},
  {type:'echo-signal-start',fork:10,arm:1},
  op(4),{type:'echo-op',value:4},
  {type:'signal-end',fork:10,arm:1},
  {type:'echo-signal-end',fork:10,arm:1},
  {type:'signal-join',piece:10},
  {type:'echo-signal-join',piece:10}
 ];
 const debug='MONOID PLAYTEST BATCH v1\nRuns: 1\n===== RUN 1/1 · ACTIVE · Run #109 · qa-mu66e4fp-116me8o =====\nMONOID DEBUG v0.77.0\nMode: CLASSIC\nT31 SIGNAL TREE splits=1 base=24 selection=24 trace='+JSON.stringify(recorded)+'\n';
 const traces=parseSignalTrees(debug);
 assert.equal(traces.length,1);
 assert.equal(traces[0].run.number,109);
 assert.equal(traces[0].run.mode,'CLASSIC');
 assert.equal(traces[0].move,'T31');
 assert.match(traces[0].label,/Run #109.*CLASSIC.*T31/);
 const result=renderSignalTree(traces[0]);
 assert.equal(result.splitCount,1);
 assert.equal(result.operations,2);
 assert.equal(result.voices,2);
 assert.equal(result.events.filter(e=>e.type==='note')[0].time,result.events.filter(e=>e.type==='note')[1].time);
 assert.deepEqual(renderSignalTree(traces[0]),result);
 assert.throws(()=>renderSignalTree([{type:'signal-fork',piece:1},{type:'signal-start',fork:1,arm:0},op(2)]),/Unterminated/);
 assert.equal(parseSignalTrees(JSON.stringify([op(1)] )).length,1);
 // Real playtest batches can exceed 2 MB even when their SIGNAL TREE traces are small.
 const largeDebug=debug+'Unrelated telemetry: '+('x'.repeat(2_100_000))+'\n';
 assert.ok(largeDebug.length>2_000_000);
 assert.equal(parseSignalTrees(largeDebug).length,1);
 assert.throws(()=>parseSignalTrees('x'.repeat(20_000_001)),/20 MB maximum/);
 console.log('Audio Lab Double Echo debug importer regression passed');
})().catch(e=>{console.error(e);process.exitCode=1});
