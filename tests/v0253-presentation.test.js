const assert=require('node:assert/strict'),V=require('../presentation.js');
for(const[n,expected]of [[0,'0'],[20,'20'],[999,'999'],[1000,'1K'],[2500,'2.5K'],[1250000,'1.25M'],[1e9,'1B'],[1.25e12,'1.25T'],[999999,'1M'],[250e9,'250B'],[1e15,'1Qa'],[4.88e17,'488Qa'],[6.058e19,'60.6Qi'],[1.25e30,'1.25No'],[1e33,'1Dc'],[-2500,'-2.5K'],[Infinity,'Infinity']])assert.equal(V.compact(n),expected);
assert.equal(V.exact(1250000000),'1,250,000,000');
assert.equal(V.scoreDisplay(999999999,1e9).score,'1B');
assert.equal(V.scoreDisplay(999999999,1e9).note,'1 to target');
assert.equal(V.scoreDisplay(1e9,1e9).score,'1B');
assert.equal(V.scoreDisplay(1e9,1e9).note,'Target reached');
assert.equal(V.scoreDisplay(0,20).note,'Last move');
assert.equal(V.BRAND,'MONOID');
assert.equal(V.cascadeDelay(0),600);assert.equal(V.cascadeDelay(1),432);assert.equal(V.cascadeDelay(2),311);assert.equal(V.cascadeDelay(1000),60);
for(let i=1;i<100;i++){assert(V.cascadeDelay(i)<=V.cascadeDelay(i-1));assert(V.cascadeDelay(i)>=60);assert(V.effectLifetime(i)<=V.effectLifetime(i-1))}
assert.equal(V.CASCADE.maxLabels,8);assert.equal(V.CASCADE.finalMs,450);
const firstThree=Array.from({length:3},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(firstThree>=1300,'first few operations must stay readable for a new player');
const hundred=Array.from({length:100},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(hundred<8000,'long machines must still accelerate instead of becoming a slideshow');
assert.deepEqual(V.progressState(500,1000),{stage:'target',progress:.5,next:'TARGET'});
assert.equal(V.progressState(1000,1000).stage,'clear');assert.equal(V.progressState(3000,1000).stage,'star1');assert.equal(V.progressState(5000,1000).stage,'star2');assert.equal(V.progressState(10000,1000).stage,'star3');
assert.equal(V.brandDebugText('NOMON DEBUG v0.28.0\nRun ID: test-run\n'),'MONOID DEBUG v0.28.0\nRun ID: test-run\n');
assert.equal(V.debugFilename('NOMON DEBUG v0.28.0\nRun ID: test-run\n'),'MONOID_DEBUG_v0.28.0_test-run.txt');
console.log('UI compact numbers, progress tiers, MONOID branding and adaptive timing passed');

assert.equal(V.scoreDisplay(1253000000,1254000000).score,'1.25B');
assert.equal(V.scoreDisplay(1253000000,1254000000).note,'1M to target');
for(const type of ['echo-op','zero-memory']){assert.equal(V.operationHalf({type,piece:7},{piece:7,exitHalf:1}),1);assert.equal(V.operationHalf({type,piece:7},{piece:8,exitHalf:1}),undefined)}
assert.equal(V.operationHalf({piece:7,exitHalf:0},{piece:7,exitHalf:1}),0);
