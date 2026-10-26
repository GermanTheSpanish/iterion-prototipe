const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const src=fs.readFileSync('music-director.js','utf8');
 const {SOURCE_BPM,marketTargetBpm,describePressure,pulsePattern,isTargetReached}=
  await import('data:text/javascript,'+encodeURIComponent(src));
 assert.equal(SOURCE_BPM,80);
 assert.deepEqual(Array.from({length:7},(_,n)=>marketTargetBpm(n)),[80,84,88,92,96,96,96]);
 const state=(roundTurn,hand=[{id:'1',a:2,b:4}])=>({roundTurn,marketCount:0,score:20,scoreExact:'20',hand});
 const steady=describePressure(state(1),{maxPlacements:6,targetReached:false});
 assert.equal(steady.mood,'steady');
 assert.equal(steady.movesLeft,5);
 const lowMoves=describePressure(state(4),{maxPlacements:6,targetReached:false});
 assert.equal(lowMoves.mood,'critical','two remaining moves must cause urgency');
 assert(lowMoves.intensity>steady.intensity);
 assert.equal(describePressure({...state(4),cleared:true},{maxPlacements:6}).mood,'steady');
 assert.equal(describePressure({...state(4),shopOpen:true},{maxPlacements:6}).mood,'steady');
 assert.equal(describePressure({...state(4),running:true},{maxPlacements:6}).mood,'steady');
 const won=describePressure(state(4),{maxPlacements:6,targetReached:true});
 assert.equal(won.mood,'steady','already reached target must not pressure the player');
 const zeroHand=state(2,[{id:'a',a:0,b:3},{id:'b',a:6,b:0}]);
 const uncertainty=describePressure(zeroHand,{maxPlacements:6,legalMask:[true,false]});
 assert.equal(uncertainty.mood,'uncertainty');
 assert.equal(uncertainty.zeroOnly,true);
 assert.equal(uncertainty.legalOptions,1);
 assert.equal(describePressure(zeroHand,{maxPlacements:6,legalMask:[true,true]}).mood,'steady');
 assert.equal(describePressure(zeroHand,{maxPlacements:6,legalMask:null}).zeroConstrained,false);
 assert.equal(describePressure({...zeroHand,marketCount:3},{maxPlacements:6,legalMask:[true,false]}).targetBpm,92);
 assert.equal(isTargetReached({scoreExact:'9007199254740999'},'9007199254740998'),true);
 assert.equal(isTargetReached({scoreExact:'9007199254740997'},'9007199254740998'),false);
 const sparse=pulsePattern({intensity:0});
 const busy=pulsePattern({intensity:4,mood:'critical'});
 assert.equal(sparse.length,4);assert.equal(busy.length,16);
 assert(busy.length>sparse.length,'increasing density must add audible notes');
 assert(!pulsePattern({intensity:4,mood:'uncertainty'}).some(x=>x.step===4),
  'constrained zero hand should have a syncopated gap');
 assert(!pulsePattern({intensity:4,mood:'release'}).some(x=>x.step<4),
  'exceptional beat of silence should signal resolution');
 assert.deepEqual(pulsePattern({intensity:4,mood:'critical'}),
  pulsePattern({intensity:4,mood:'critical'}),'audio cues are deterministic');
 assert.doesNotMatch(src,/Math\.random/);
 const perc=fs.readFileSync('music-percussion.js','utf8');
 assert.match(perc,/player\.clock\(\)/,'layer must share original audio clock');
 assert.match(perc,/clock\.bpm/,'subdivisions read real tempo from shared audio clock');
 assert.match(perc,/60\/bpm\/4/,'drum subdivisions adjust with pitch-preserved market tempo');
 assert.match(perc,/duck=acousticMode/,'respect physical cascade audio');
 assert.doesNotMatch(perc,/Math\.random/);
 assert.match(fs.readFileSync('music-runtime.js','utf8'),/describePressure/);
 console.log('Music director market tiers, urgency, zero-hand uncertainty, critical release and sample-clock percussion passed');
})().catch(error=>{console.error(error);process.exitCode=1});
