const assert=require('node:assert/strict');
const T=require('../playtest-telemetry.js');

function storage(){
  const map=new Map();
  return{getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),map}
}
let now=1000;const store=storage(),clock=()=>now,telemetry=T.create({storage:store,now:clock,randomUint32:()=>0x1234abcd});
let snap=telemetry.bindRun({runId:'run-a',round:1,stage:1});
assert.match(snap.playerId,/^P-[0-9A-Z]{7}$/);assert.equal(snap.runSequence,1);const playerId=snap.playerId;
telemetry.resume();telemetry.startDecision();now+=5000;assert.equal(telemetry.recordDecision(),5000);telemetry.recordCascade(1200);
telemetry.openMarket({offers:['foundation','knot','mint']});now+=3000;assert.equal(telemetry.closeMarket({outcome:'buy:knot'}),3000);
telemetry.setContext(2,1);now+=2000;telemetry.startDecision();now+=4000;telemetry.recordDecision();telemetry.recordCascade(800);telemetry.pause();
snap=telemetry.snapshot();assert.equal(snap.activePlayMs,14000);assert.equal(snap.decisionTotalMs,9000);assert.equal(snap.cascadeTotalMs,2000);assert.equal(snap.markets.length,1);assert.equal(snap.markets[0].durationMs,3000);assert.equal(snap.rounds['1'].placements,1);assert.equal(snap.rounds['2'].placements,1);assert.equal(snap.stages['1'].markets,1);
const activeBefore=snap.activePlayMs;now+=20000;snap=telemetry.snapshot();assert.equal(snap.activePlayMs,activeBefore,'background/closed time must not count as active play');assert.equal(snap.wallClockMs,34000);
const same=T.create({storage:store,now:clock,randomUint32:()=>0});snap=same.bindRun({runId:'run-a',round:2,stage:1});assert.equal(snap.playerId,playerId);assert.equal(snap.runSequence,1);assert.equal(snap.sessions,2);
const next=T.create({storage:store,now:clock,randomUint32:()=>0});snap=next.bindRun({runId:'run-b',round:1,stage:1});assert.equal(snap.playerId,playerId);assert.equal(snap.runSequence,2);
const text=next.text();assert.match(text,/PLAYTEST TELEMETRY/);assert.match(text,new RegExp(playerId));assert.match(text,/Run #2/);assert.match(text,/Active play:/);assert.match(text,/Round timing:/);assert.match(text,/Market visits:/);
console.log('Playtest identity and timing telemetry regressions passed');
