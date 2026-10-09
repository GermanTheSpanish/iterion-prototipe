const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const load = async name => import('data:text/javascript;base64,' + readFileSync(join(__dirname,'../experiments/audio-lab/',name),'base64'));
(async () => {
 const {PLAYTEST_CASCADES} = await load('playtest-cascades.js');
 const {replayEvents,operationDelay} = await load('replay.js');
 assert.deepEqual(Array.from({length:9},(_,i)=>operationDelay(i)),[600,600,560,520,480,440,320,224,157]);
 for(const fixture of PLAYTEST_CASCADES) {
   const replay=replayEvents(fixture);
   assert.equal(replay.operations,fixture.operations);
   assert.ok(replay.events.every((event,i,arr)=>!i||event.time>=arr[i-1].time));
   assert.ok(replay.duration>0);
   assert.equal(replayEvents(fixture,2).duration,replay.duration/2);
 }
 const long=replayEvents(PLAYTEST_CASCADES[2]);
 assert.ok(long.events.some(e=>e.reverse));
 const monster=replayEvents(PLAYTEST_CASCADES[3]);
 assert.equal(monster.events.filter(e=>e.type==='split').length,1);
 assert.equal(monster.events.filter(e=>e.type==='rebound').length,2);
 assert.deepEqual(monster.events.filter(e=>e.type==='arm').map(e=>e.arm),[0,1]);
 assert.throws(()=>replayEvents(PLAYTEST_CASCADES[0],0),RangeError);
 console.log('Audio Lab cascade replay timing passed');
})().catch(e=>{console.error(e);process.exitCode=1});
