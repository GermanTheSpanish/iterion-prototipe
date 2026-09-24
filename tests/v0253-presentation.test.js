const assert=require('node:assert/strict'),V=require('../presentation.js');
for(const[n,expected]of [[0,'0'],[20,'20'],[999,'999'],[1000,'1,000'],[2500,'2,500'],[999999,'999,999'],[1000000,'1M'],[1250000,'1.25M'],[12400000,'12.4M'],[950000000,'950M'],[1250000000,'1,250M'],[27500000000,'27,500M'],[99999000000,'99,999M'],[100000000000,'100B'],[1500000000000,'1,500B'],[99999000000000,'99,999B'],[100000000000000,'100T'],[4.88e17,'488Qa'],[6.058e19,'60,580Qa'],[1e20,'100Qi'],[1.25e30,'1,250Oc'],[1e33,'1,000No'],[-2500,'-2,500'],[-1250000,'-1.25M'],[Infinity,'Infinity']])assert.equal(V.compact(n),expected);
assert.equal(V.exact(1250000000),'1,250,000,000');
assert.equal(V.scoreDisplay(999999999,1e9).score,'1,000M');
assert.equal(V.scoreDisplay(999999999,1e9).note,'1 to target');
assert.equal(V.scoreDisplay(1e9,1e9).score,'1,000M');
assert.equal(V.scoreDisplay(1e9,1e9).note,'Target reached');
assert.equal(V.scoreDisplay(0,20).note,'Last move');
assert.equal(V.BRAND,'MONOID');
assert.deepEqual(Array.from({length:6},(_,i)=>V.cascadeDelay(i)),[600,600,560,520,480,440]);
assert.equal(V.cascadeDelay(6),320);assert.equal(V.cascadeDelay(1000),60);assert.equal(V.CASCADE.scoreTweenMs,520);assert.equal(V.CASCADE.operationFlashMs,520);assert.equal(V.CASCADE.targetSettleMs,780);assert.equal(V.CASCADE.finalHoldMs,320);assert.equal(V.CASCADE.skipDebounceMs,120);
for(let i=1;i<100;i++){assert(V.cascadeDelay(i)<=V.cascadeDelay(i-1));assert(V.cascadeDelay(i)>=60);assert(V.effectLifetime(i)<=V.effectLifetime(i-1))}
assert.equal(V.CASCADE.maxLabels,8);assert.equal(V.CASCADE.finalMs,500);
const firstThree=Array.from({length:3},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(firstThree>=1700,'first few operations must stay readable for a new player');
const firstSix=Array.from({length:6},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(firstSix>=3200,'rookie cadence must not accelerate away before the arithmetic is readable');
const hundred=Array.from({length:100},(_,i)=>V.cascadeDelay(i)).reduce((a,b)=>a+b,0);assert(hundred<9500,'long machines must still accelerate instead of becoming a slideshow');
assert.deepEqual(V.progressState(500,1000),{stage:'target',progress:.5,next:'TARGET'});
assert.deepEqual(V.progressState(1000,1000),{stage:'clear',progress:1,next:'×1 TARGET'});assert.deepEqual(V.progressState(3000,1000),{stage:'clear',progress:1,next:'×3 TARGET'});assert.deepEqual(V.progressState(5000,1000),{stage:'clear',progress:1,next:'×5 TARGET'});assert.deepEqual(V.progressState(10000,1000),{stage:'clear',progress:1,next:'×10 TARGET'});assert.deepEqual(V.progressState(1000000,1000),{stage:'overdrive',progress:1,next:'×1,000 TARGET'});
assert.equal(V.brandDebugText('NOMON DEBUG v0.28.0\nRun ID: test-run\n'),'MONOID DEBUG v0.28.0\nRun ID: test-run\n');
assert.equal(V.debugFilename('NOMON DEBUG v0.28.0\nRun ID: test-run\n'),'MONOID_DEBUG_v0.28.0_test-run.txt');
assert.equal(V.debugFilename('MONOID PLAYTEST BATCH v1\nVersion: 0.42.4\nBatch ID: B-TEST123\n'),'MONOID_PLAYTEST_v0.42.4_B-TEST123.txt');
console.log('UI compact numbers, target-relative progress, MONOID branding and readable adaptive timing passed');

assert.equal(V.scoreDisplay(1253000000,1254000000).score,'1,253M');
assert.equal(V.scoreDisplay(1253000000,1254000000).note,'1M to target');
for(const type of ['echo-op']){assert.equal(V.operationHalf({type,piece:7},{piece:7,exitHalf:1}),1);assert.equal(V.operationHalf({type,piece:7},{piece:8,exitHalf:1}),undefined)}
assert.equal(V.operationHalf({piece:7,exitHalf:0},{piece:7,exitHalf:1}),0);

const tileState={set:[{id:'d2-2',upgrade:2}],circuitRanks:{'d2-2':3},doubleDoubleTileId:'d2-2',doubleEchoTileId:'d2-2',zeroPortTileIds:[],parityExchangeTileId:null,cornerTileId:null,longLineTileId:null,overloadTileId:null,terminalTileId:null};
assert.deepEqual(V.tileViewModel({id:'d2-2',a:2,b:2,powerMultiplier:3},tileState),{id:'d2-2',upgrade:2,powerMultiplier:3,circuitRank:3,modifiers:[{label:'DD',className:'dd'},{label:'DE',className:'de'}]});
assert.deepEqual(V.longChainViewModel({mods:['long-run'],endlessMode:true,endlessLongRunActivations:3},7),{owned:true,used:3,remaining:4,cap:7,endless:true,visible:true,ratio:4/7,ariaLabel:'Long Chain · 4 of 7 Endless activations remaining'});
const hud=V.hudViewModel({score:1250,round:2,roundTurn:4,coins:12,systemStrain:3,endlessMode:true,endlessLongRunActivations:3,mods:['long-run'],pieces:[{}]},{stage:{index:2,round:2,size:3,total:5},endless:{active:true},powerSets:{generation:2,powerMultiplier:2},availableTileCount:17},{target:2500,maxPlacements:7,totalRounds:15,boardWidth:30,boardHeight:40,longChainCap:7});
assert.equal(hud.score,'1,250');assert.equal(hud.target,'2,500');assert.equal(hud.stage,'2/∞');assert.equal(hud.round,'3/∞');assert.equal(hud.moves,'4/7');assert.equal(hud.movesRemaining,3);assert.equal(hud.stageRound,'ENDLESS · STAGE 2 · ROUND 2/3 · STRAIN 3 · POWER ×2');assert.equal(hud.boardSize,'30 × 40');assert.equal(hud.hint,'Build the machine · 3 moves remaining.');assert.equal(hud.longChain.remaining,4);
const infiniteHud=V.hudViewModel({score:1,round:60,roundTurn:2,coins:0,systemStrain:19,endlessMode:true,pieces:[{}]},{stage:{index:21,round:1,size:3,total:5},endless:{active:true,infinitePhase:true},powerSets:{generation:4,powerMultiplier:4},availableTileCount:9},{target:2,maxPlacements:7,totalRounds:15,boardWidth:51,boardHeight:68,longChainCap:7});
assert.equal(infiniteHud.stage,'∞');assert.equal(infiniteHud.round,'61/∞');assert.equal(infiniteHud.stageRound,'INFINITE · ROUND 1/3 · STRAIN 19 · POWER ×4');assert.equal(infiniteHud.infinitePhase,true);assert.equal(infiniteHud.boardSize,'51 × 68');
