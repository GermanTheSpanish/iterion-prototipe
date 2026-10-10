const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const dir=join(__dirname,'../experiments/audio-lab');
(async()=>{
 const source=readFileSync(join(dir,'instrument.js'),'utf8');
 assert.match(source,/wave==='soft'/);
 assert.match(source,/freq\*2/);
 assert.match(source,/freq\*3\.01/);
 for(const type of ['rebound','split','mod','coin']) assert.ok(source.includes("type==='"+type+"'"));
 const file=readFileSync(join(dir,'playtest-cascades.js'),'utf8');
 const {PLAYTEST_CASCADES}=await import('data:text/javascript;base64,'+Buffer.from(file).toString('base64'));
 const monster=PLAYTEST_CASCADES.find(x=>x.id==='monstrous');
 assert.equal(monster.events.filter(e=>e.mint).length,2);
 assert.ok(PLAYTEST_CASCADES.some(x=>x.id==='extended'&&x.mint&&x.coins===1));
 assert.ok(PLAYTEST_CASCADES.some(x=>x.id==='extreme'&&x.coins===1));
 console.log('Audio Lab distinct timbre and recorded economy metadata passed');
})().catch(e=>{console.error(e);process.exitCode=1});
