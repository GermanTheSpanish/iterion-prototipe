const assert=require('node:assert/strict');
const S=require('../playtest-batch-store.js');
(async()=>{
  const store=S.create({indexedDB:null});assert.equal(store.backend(),'memory');
  assert((await store.archive({runId:'a',playerId:'p',runSequence:1,debugText:'A'})).ok);assert((await store.archive({runId:'b',playerId:'p',runSequence:2,debugText:'B'})).ok);
  let pending=await store.pending('p');assert.deepEqual(pending.map(x=>x.runId),['a','b']);
  await store.markExported(['a'],'batch-1');pending=await store.pending('p');assert.deepEqual(pending.map(x=>x.runId),['b']);
  await store.markExported(['b'],'batch-2');const all=await store.all();assert.deepEqual(all.map(x=>x.runId),['b'],'only the latest exported batch is retained for recovery');
  await store.clear();assert.equal((await store.all()).length,0);console.log('Playtest IndexedDB batch archive regressions passed');
})().catch(error=>{console.error(error);process.exitCode=1});
