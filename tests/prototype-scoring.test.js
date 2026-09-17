const assert=require('assert');
const P=require('../prototype-scoring.js');

function score(events,initial=0,classicOutput=0){return P.replayDeferredScoring({output:classicOutput,events},initial)}

// Core experiment: operation order no longer changes the final arithmetic.
const ordered=score([
  {type:'op',piece:1,value:6,op:'add',add:6,factor:0},
  {type:'op',piece:2,value:3,op:'multiply',add:0,factor:3},
  {type:'op',piece:3,value:4,op:'add',add:4,factor:0},
  {type:'op',piece:4,value:5,op:'multiply',add:0,factor:5}
],12,290);
assert.strictEqual(ordered.output,330,'(12 + 6 + 4) × 3 × 5');
assert.strictEqual(ordered.classicOutput,290);
assert.strictEqual(ordered.scoringModel,'deferred-v1');
assert.strictEqual(ordered.deferredScoring.routeSelection,'classic-comparator');
const reordered=score([
  {type:'op',piece:2,value:3,op:'multiply',factor:3},
  {type:'op',piece:4,value:5,op:'multiply',factor:5},
  {type:'op',piece:1,value:6,op:'add',add:6},
  {type:'op',piece:3,value:4,op:'add',add:4}
],12,999);
assert.strictEqual(reordered.output,ordered.output,'same terms must resolve to the same deferred result');

// T split: the accumulated state is copied to both arms, each arm resolves,
// and the two resolved signals are added at JOIN.
const split=score([
  {type:'op',piece:1,value:2,op:'add',add:2},
  {type:'signal-fork',piece:10},
  {type:'signal-start',fork:10,arm:0},
  {type:'op',piece:2,value:3,op:'multiply',factor:3},
  {type:'signal-end',fork:10,arm:0},
  {type:'signal-start',fork:10,arm:1},
  {type:'op',piece:3,value:4,op:'add',add:4},
  {type:'signal-end',fork:10,arm:1},
  {type:'signal-join',piece:10}
],10,40);
assert.strictEqual(split.output,52,'arm A=(10+2)×3=36; arm B=10+2+4=16; JOIN=52');
assert.deepStrictEqual(split.events.filter(e=>e.type==='signal-end').map(e=>e.output),[36,16]);
assert.strictEqual(split.events.find(e=>e.type==='signal-join').output,52);

// Zero Memory remains a repeated term in the accumulator rather than forcing
// an immediate arithmetic resolution.
const zm=score([
  {type:'op',piece:1,value:4,op:'add',add:4},
  {type:'zero-memory',piece:9,sourcePiece:1,sourceValue:4,op:'add',add:4},
  {type:'op',piece:2,value:3,op:'multiply',factor:3}
],10,66);
assert.strictEqual(zm.output,54,'(10 + 4 + 4) × 3');
assert.strictEqual(zm.events.find(e=>e.type==='zero-memory').deferredAdd,8);

// Double Echo copies the deferred state at activation, then resolves Main and
// Echo independently before adding them, preserving the current signal model.
const echo=score([
  {type:'op',piece:1,value:2,op:'add',add:2},
  {type:'double-echo-start',piece:1,startOutput:12},
  {type:'op',piece:2,value:3,op:'multiply',factor:3},
  {type:'echo-op',piece:2,value:3,op:'multiply',factor:3},
  {type:'double-echo-result',piece:1,mainOutput:36,echoOutput:36,finalOutput:72}
],10,72);
assert.strictEqual(echo.mainOutput,36);
assert.strictEqual(echo.echoOutput,36);
assert.strictEqual(echo.output,72);
assert.deepStrictEqual(echo.events.find(e=>e.type==='double-echo-result'),assert.objectContaining?{}:{});
const echoResult=echo.events.find(e=>e.type==='double-echo-result');
assert.strictEqual(echoResult.mainOutput,36);assert.strictEqual(echoResult.echoOutput,36);assert.strictEqual(echoResult.finalOutput,72);

// Classic remains opt-out; only the prototype mode (or an explicit scoring
// override in tests) is wrapped.
const rootClassic={__monoidActiveMode:'classic'};
const rootPrototype={__monoidActiveMode:'prototype'};
assert.strictEqual(P.shouldUsePrototype(rootClassic,{}),false);
assert.strictEqual(P.shouldUsePrototype(rootPrototype,{}),true);
assert.strictEqual(P.shouldUsePrototype(rootPrototype,{seed:3100}),false,'tutorial/configured games stay canonical');
assert.strictEqual(P.shouldUsePrototype(rootClassic,{SCORING_MODEL:P.MODEL}),true);

// The engine adapter must leave route selection to the canonical engine and
// only replay the already-selected result.
let calls=0;
const baseEngine={bestSignal(_id,_pieces,opts){calls++;return{output:290,events:[{type:'op',piece:1,value:6,op:'add',add:6},{type:'op',piece:2,value:3,op:'multiply',factor:3},{type:'op',piece:3,value:4,op:'add',add:4},{type:'op',piece:4,value:5,op:'multiply',factor:5}],search:{starts:1,leaves:1,expanded:4}}}};
const deferredEngine=P.createDeferredEngine(baseEngine),adapted=deferredEngine.bestSignal(1,[],{initialOutput:12});
assert.strictEqual(calls,1);assert.strictEqual(adapted.output,330);assert.strictEqual(adapted.search.expanded,4);

console.log('prototype deferred scoring regression tests passed');
