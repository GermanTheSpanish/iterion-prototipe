const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../experiments/audio-lab');
(async()=>{
 const source=fs.readFileSync(path.join(base,'topology-timbre.js'),'utf8');
 const {CC0_VIBES_URL,createTopologyTimbre}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.match(CC0_VIBES_URL,/sgossner\/VCSL/);
 assert.match(CC0_VIBES_URL,/Vibes_soft_A4_v1_rr1_Main\.wav$/);
 assert.equal(typeof createTopologyTimbre,'function');
 const page=fs.readFileSync(path.join(base,'topology-study.html'),'utf8');
 for(const name of ['machine-level','world-level','timbre','sample-file','sample-status','attack','brightness','note-tail'])
  assert.match(page,new RegExp('id="'+name+'"'));
 assert.match(page,/id="machine-level"[^>]+value="\.2"/);
 assert.match(page,/id="world-level"[^>]+value="\.7"/);
 assert.match(page,/\.16\+\.84\*Math\.min\(1,elapsed\/48\)/);
 assert.match(page,/instrument\.load\(\{file:sampleFile\}\)/);
 assert.match(page,/instrument\.midi\(note\.midi/);
 assert.match(page,/Space Drift/);
 assert.match(page,/SIGNAL TREE/);
 const original=fs.readFileSync(path.join(base,'instrument.js'),'utf8');
 assert.match(original,/export function createInstrument/);
 console.log('Topology timbre controls regressions passed');
})().catch(error=>{console.error(error);process.exitCode=1});
