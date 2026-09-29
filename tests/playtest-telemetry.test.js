const assert=require('node:assert/strict');
const T=require('../playtest-telemetry.js');
function storage(){const map=new Map();return{getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),map}}
let now=1000;const store=storage(),clock=()=>now,ids=(()=>{let n=0x1234abcd;return()=>n++})(),telemetry=T.create({storage:store,now:clock,randomUint32:ids});
let snap=telemetry.bindRun({runId:'run-a',round:1,stage:1});
assert.match(snap.playerId,/^P-[0-9A-Z]{7}$/);assert.equal(snap.runSequence,1);assert.match(snap.batchId,/^B-[0-9A-Z]{7}$/);const playerId=snap.playerId,batchId=snap.batchId;
telemetry.resume();telemetry.startDecision();now+=5000;assert.equal(telemetry.recordDecision(),5000);telemetry.recordCascade(1200);
telemetry.recordPlacement({turn:1,chosenOutput:90,bestLegalOutput:100,chosenVsBestRatio:.9,legalPlacementCount:8,evaluatedPlacementCount:8,evaluationComplete:true,evaluationMs:3,coverageTarget:80,clearCoverageSampleCount:8,clearCoverageClearCount:5,clearCoverage:.625,clearCoverageComplete:true,outputDistribution:{min:12,median:70,p90:100,max:100},deckAfter:{generation:2,remainingTiles:17,handCount:5,reserveCount:12},topologyAfter:{machineSize:4,cycleRank:1,tJunctionCount:1,crossCount:0,doubleCount:1,zeroCount:1,zeroLeafCount:1,maxDegree:3},context:{rebounds:1,splits:1,newCircuits:1,operationCount:9,uniqueVisitedPieceCount:6,reentryOperationCount:3,retraceMoveCount:2,zeroReturnCount:1}});
telemetry.openMarket({offers:['foundation','knot','mint']});now+=3000;assert.equal(telemetry.closeMarket({outcome:'buy:knot'}),3000);
telemetry.startDecision();now+=1000;telemetry.setContext(2,1);now+=4000;assert.equal(telemetry.recordDecision(),0,'decision timing must not leak across a round boundary');
telemetry.startDecision();now+=2000;assert.equal(telemetry.recordDecision(),2000);telemetry.recordCascade(800);telemetry.pause();
snap=telemetry.snapshot();assert.equal(snap.activePlayMs,15000);assert.equal(snap.decisionTotalMs,7000);assert.equal(snap.cascadeTotalMs,2000);assert.equal(snap.placements.length,1);assert(snap.rounds['2'].decisionMs<=snap.rounds['2'].activeMs,'round decision time cannot exceed active time');
const telemetryText=telemetry.text();
assert.match(telemetryText,/clear=62\.5%\(5\/8 exact\)/);
assert.match(telemetryText,/reentry=3\/9/);
assert.match(telemetryText,/zeroReturn=1/);
assert.match(telemetryText,/deck=g2,remaining:17/);
assert.match(telemetryText,/Zleaf:1/);
const finalized=telemetry.finalizeCurrent('abandoned',{reason:'new-run'});assert.equal(finalized.status,'abandoned');assert.equal(telemetry.batchInfo().runs.length,1);
const same=T.create({storage:store,now:clock,randomUint32:()=>0});snap=same.bindRun({runId:'run-a',round:2,stage:1});assert.equal(snap.playerId,playerId);assert.equal(snap.runSequence,1);assert.equal(snap.sessions,2);
const next=T.create({storage:store,now:clock,randomUint32:()=>0});snap=next.bindRun({runId:'run-b',round:1,stage:1});assert.equal(snap.playerId,playerId);assert.equal(snap.runSequence,2);assert.equal(snap.batchId,batchId);
const text=next.text();assert.match(text,/PLAYTEST TELEMETRY/);assert.match(text,new RegExp(playerId));assert.match(text,/Placement decisions:/);
const exportResult=next.markBatchExported({includedRunIds:['run-a','run-b']});assert.equal(exportResult.exported.batchId,batchId);assert.notEqual(exportResult.next.batchId,batchId);assert.equal(next.batchInfo().runs.length,0);assert.equal(next.snapshot().batchId,exportResult.next.batchId);


{
  let ouroNow=2000;const ouroStore=storage(),ouro=T.create({storage:ouroStore,now:()=>ouroNow,randomUint32:()=>0x55667788});
  ouro.bindRun({runId:'ouro-run',round:40,stage:14});ouro.resume();ouro.startDecision();
  ouro.recordPlacement({turn:84,chosenOutput:1000,routeTileIds:['a','b','c','d'],routeLength:4});
  ouroNow+=1200;ouro.recordOuroborosRebuild({tileId:'a',from:{x:2,y:2,rr:0},to:{x:2,y:2,rr:1}});
  ouroNow+=800;ouro.recordOuroborosRebuild({tileId:'b',from:{x:4,y:2,rr:0},to:{x:8,y:6,rr:0}});
  ouroNow+=1000;const decisionMs=ouro.recordDecision('ouroboros');
  const fire=ouro.recordOuroborosFire({decisionMs,turn:85,tileId:'b',output:500,selectionOutput:200,routeLength:3,routeTileIds:['b','c','e'],operationCount:8,uniqueVisitedPieceCount:3,reentryOperationCount:5,retraceMoveCount:2,layout:[{tileId:'a',x:2,y:2,rr:1},{tileId:'b',x:8,y:6,rr:0}]});
  assert.equal(decisionMs,3000);assert.equal(fire.rebuildCount,2);assert.equal(fire.rotationCount,1);assert.equal(fire.relocationCount,1);assert.equal(fire.rebuildTileCount,2);assert.equal(fire.bestHistoricalOutput,1000);assert.equal(fire.routeOverlapCount,2);assert.equal(fire.bestRouteCoverage,.5);assert.match(fire.layoutSignature,/^[0-9a-f]{8}$/);
  ouro.startDecision();ouroNow+=500;const secondDecision=ouro.recordDecision('ouroboros');const second=ouro.recordOuroborosFire({decisionMs:secondDecision,turn:86,tileId:'a',output:2000,routeLength:4,routeTileIds:['a','b','c','d'],operationCount:6,uniqueVisitedPieceCount:4,reentryOperationCount:2,retraceMoveCount:1,layout:[{tileId:'a',x:2,y:2,rr:1},{tileId:'b',x:8,y:6,rr:1}]});
  assert.equal(second.layoutChangedTiles,1);assert.equal(ouro.snapshot().ouroborosDecisionTotalMs,3500);assert.equal(ouro.snapshot().ouroborosFires.length,2);assert.match(ouro.text(),/Ouroboros decision time: total=00:04 fires=2 rebuilds=2/);assert.match(ouro.text(),/bestCoverage=50\.0%/);
}

console.log('Playtest coverage, re-entry, deck, identity, Ouroboros and timing telemetry regressions passed');
