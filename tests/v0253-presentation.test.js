const assert=require('node:assert/strict'),V=require('../presentation.js');
for(const[n,expected]of [[0,'0'],[20,'20'],[999,'999'],[1000,'1K'],[2500,'2.5K'],[1250000,'1.25M'],[1e9,'1B'],[1.25e12,'1.25T'],[999999,'1M'],[250e9,'250B'],[1e15,'1e15'],[1.25e30,'1.25e30'],[-2500,'-2.5K'],[Infinity,'Infinity']])assert.equal(V.compact(n),expected);
assert.equal(V.exact(1250000000),'1,250,000,000');
assert.equal(V.scoreDisplay(999999999,1e9).score,'1B');
assert.equal(V.scoreDisplay(999999999,1e9).note,'1 to target');
assert.equal(V.scoreDisplay(1e9,1e9).score,'1B');
assert.equal(V.scoreDisplay(1e9,1e9).note,'Target reached');
assert.equal(V.scoreDisplay(0,20).note,'Last move');
assert.equal(V.cascadeDelay(0),600);assert.equal(V.cascadeDelay(1000),100);
for(let i=1;i<100;i++){assert(V.cascadeDelay(i)<=V.cascadeDelay(i-1));assert(V.cascadeDelay(i)>=100);assert(V.effectLifetime(i)<=V.effectLifetime(i-1))}
assert.equal(V.CASCADE.maxLabels,8,'concurrent T/Echo presentation needs room for simultaneous labels');assert.equal(V.CASCADE.finalMs,1000);
console.log('UI compact/exact numbers, near-target distinction and bounded cascade timing passed');

assert.equal(V.scoreDisplay(1253000000,1254000000).score,'1.25B');
assert.equal(V.scoreDisplay(1253000000,1254000000).note,'1M to target');
for(const type of ['echo-op','zero-memory']){
  assert.equal(V.operationHalf({type,piece:7},{piece:7,exitHalf:1}),1);
  assert.equal(V.operationHalf({type,piece:7},{piece:8,exitHalf:1}),undefined);
}
assert.equal(V.operationHalf({piece:7,exitHalf:0},{piece:7,exitHalf:1}),0);
