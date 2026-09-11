const assert=require('node:assert/strict'),V=require('../presentation.js');
for(const[n,expected]of [[0,'0'],[20,'20'],[999,'999'],[1000,'1,000'],[2500,'2,500'],[999999,'999,999'],[1000000,'1M'],[1250000,'1.25M'],[12400000,'12.4M'],[950000000,'950M'],[1250000000,'1,250M'],[27500000000,'27,500M'],[99999000000,'99,999M'],[100000000000,'100B'],[1500000000000,'1,500B'],[99999000000000,'99,999B'],[100000000000000,'100T'],[4.88e17,'488Qa'],[6.058e19,'60,580Qa'],[1e20,'100Qi'],[1.25e30,'1,250Oc'],[1e33,'1,000No'],[-2500,'-2,500'],[-1250000,'-1.25M'],[Infinity,'Infinity']])assert.equal(V.compact(n),expected);
assert.equal(V.exact(1250000000),'1,250,000,000');
assert.equal(V.scoreDisplay(999999999,1e9).score,'999.9M');
assert.equal(V.scoreDisplay(999999999,1e9).note,'1 to target');
assert.equal(V.scoreDisplay(1e9,1e9).score,'1,000M');
assert.equal(V.scoreDisplay(1e9,1e9).note,'Target reached');
assert.equal(V.scoreDisplay(0,20).note,'Last move');
assert.equal(V.BRAND,'MONOID');
assert.deepEqual(Array.from({length:6},(_,i)=>V.cascadeDelay(i)),[600,600,560,520,480,440]);
assert.equal(V.cascadeDelay(6),320);assert.equal(V.cascadeDelay(1000),60);assert.equal(V.CASCADE.scoreTweenMs,360);
for(let i=1;i<100;i++){assert(V.cascadeDelay(i)<=V.cascadeDelay(i-1));assert(V.cascadeDelay(i)>=60);assert(V.effectLifetime(i)<=V.effectLifetime(i-1))}
assert.equal(V.CASCADE.maxLabels,8);assert.equal(V.CASCADE.finalMs,500);
const firstThree=Array.from({length:3},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(firstThree>=1700,'first few operations must stay readable for a new player');
const firstSix=Array.from({length:6},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(firstSix>=3200,'rookie cadence must not accelerate away before the arithmetic is readable');
const hundred=Array.from({length:100},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(hundred<9500,'long machines must still accelerate instead of becoming a slideshow');
assert.deepEqual(V.progressState(500,1000),{stage:'target',progress:.5,next:'TARGET'});
assert.equal(V.progressState(1000,1000).stage,'clear');assert.equal(V.progressState(3000,1000).stage,'star1');assert.equal(V.progressState(5000,1000).stage,'star2');assert.equal(V.progressState(10000,1000).stage,'star3');
assert.equal(V.brandDebugText('NOMON DEBUG v0.28.0\nRun ID: test-run\n'),'MONOID DEBUG v0.28.0\nRun ID: test-run\n');
assert.equal(V.debugFilename('NOMON DEBUG v0.28.0\nRun ID: test-run\n'),'MONOID_DEBUG_v0.28.0_test-run.txt');
console.log('UI compact numbers, progress tiers, MONOID branding and readable adaptive timing passed');

assert.equal(V.scoreDisplay(1253000000,1254000000).score,'1,253M');
assert.equal(V.scoreDisplay(1253000000,1254000000).note,'1M to target');
for(const type of ['echo-op','zero-memory']){assert.equal(V.operationHalf({type,piece:7},{piece:7,exitHalf:1}),1);assert.equal(V.operationHalf({type,piece:7},{piece:8,exitHalf:1}),undefined)}
assert.equal(V.operationHalf({piece:7,exitHalf:0},{piece:7,exitHalf:1}),0);
