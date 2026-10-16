const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const P=require('../presentation.js'),S=require('../score.js');

const target='9007199254740993';
const oneShort=S.subtract(target,'1');
const approx=Number(target);
assert.equal(Number(oneShort),approx,'fixture collapses to the same unsafe Number');
const below=P.scoreDisplay(Number(oneShort),approx,oneShort,target);
assert.equal(below.note,'1 to target','exact shortfall must not be reported as clear');
assert.equal(below.overdrive,false);
assert.equal(below.note,'1 to target','near-target hint must use the exact deficit');
assert.equal(P.progressState(Number(oneShort),approx,oneShort,target).stage,'target');
const cleared=P.scoreDisplay(approx,approx,target,target);
assert.equal(cleared.note,'Target reached');
assert.equal(P.progressState(approx,approx,target,target).stage,'clear');

const x1000=S.multiply(target,'1000'),justShort=S.subtract(x1000,'1');
assert.equal(Number(x1000),Number(justShort),'overdrive fixture is indistinguishable as Number');
assert.equal(P.scoreDisplay(Number(justShort),approx,justShort,target).overdrive,false);
assert.equal(P.scoreDisplay(Number(x1000),approx,x1000,target).overdrive,true);
assert.equal(P.progressState(Number(justShort),approx,justShort,target).stage,'clear');
assert.equal(P.progressState(Number(x1000),approx,x1000,target).stage,'overdrive');
assert.equal(P.exact(target),'9,007,199,254,740,993','exact inspector formatting preserves every digit');

const hud=P.hudViewModel({score:Number(oneShort),scoreExact:oneShort,round:1,roundTurn:0,pieces:[{id:1}],consumables:{},gameMode:'classic'},{
  stage:{index:1,round:2,size:4,total:4},endless:{active:false},powerSets:{generation:1,powerMultiplier:1},signal:{enabled:false},availableTileCount:3
},{target:approx,targetExact:target,maxPlacements:3,totalRounds:12,boardWidth:18,boardHeight:24});
assert.equal(hud.scoreExact,'9,007,199,254,740,992');
assert.equal(hud.targetExact,'9,007,199,254,740,993');
assert.equal(hud.scoreOverdrive,false);
assert.equal(hud.note,'1 to target');

assert(P.CASCADE.playbackStepLimit>=18&&P.CASCADE.playbackStepLimit<=36,'first signal operations stay readable with an upper limit');
assert(P.CASCADE.acceleratedContributions>=3&&P.CASCADE.acceleratedContributions<=8,'deep-run settlement groups contributions');
assert(P.CASCADE.playbackEventThreshold>P.CASCADE.playbackStepLimit,'small cascades retain normal summary');
const branches=Array.from({length:100},(_,i)=>({family:'main',path:String(i),output:i+1,pieceIds:[i]}));
const grouped=P.groupCascadeContributions(branches,P.CASCADE.acceleratedContributions);
assert.equal(grouped.length,P.CASCADE.acceleratedContributions);
assert.equal(grouped.reduce((sum,item)=>sum+item.output,0),5050,'visual grouping does not change the represented total');
assert(grouped.some(item=>item.grouped),'low-contributing branches have a grouped visual card');

const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
assert.match(ui,/renderedSteps>=V\.CASCADE\.playbackStepLimit/);
assert.match(ui,/cascadeControl\.skipCascade\|\|/,'skip exits the event loop without emitting further FX');
assert.match(ui,/await settleCascadeScore\(sim\.events\|\|\[\],sim\.output\?\?trigger,finalOutput,p\.id\)/,'settlement uses full authoritative simulation');
assert.match(ui,/V\.scoreDisplay\(s\.score,target,s\.scoreExact,targetExact\)/);
assert.match(ui,/targetExact:GAME\.targetExact\(\)/);
console.log('P1 cascade playback and exact HUD regressions passed');
