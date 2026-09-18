const assert=require('assert');
const E=require('../engine.js'),D=require('../data.js'),G=require('../game.js');

const g=G.createGame(E,{...D,BOARD_SIZES:[[18,24]],ROUND_REROLL_REWARD:0});
const s=g.state();
s.pieces=[E.pieceFrom({a:2,b:2},8,10,0,0,1)];
s.pieces[0].tile={id:'placed-2-2',a:2,b:2,upgrade:0,source:'base'};
s.placedTileIds=['placed-2-2'];
s.hand=[
  {id:'blocked-0-0',a:0,b:0,upgrade:0,source:'base'},
  {id:'blocked-1-1',a:1,b:1,upgrade:0,source:'base'},
  null,null,null
];
s.reserve=[];s.freeReroll=0;s.consumables={move:0,reroll:1,undo:0};s.coins=20;s.inflation=0;s.roundTurn=1;s.turn=1;s.undoFrame=null;
g.assessContinuation();

assert.equal(s.needsReroll,false,'no-legal-moves no longer enters a confirmation state');
assert.equal(s.blocked,true,'the round fails after the available reroll is exhausted without finding a move');
assert.equal(s.failureReason,'no-legal-moves');
assert.equal(s.consumables.reroll,0,'the stored reroll is consumed automatically');
assert.equal(g.recoveryOptions().recoverable,false,'no-legal-moves is final after owned rerolls are exhausted');
assert.equal(g.recoveryOptions().ownedReroll,false);
assert.equal(g.recoveryOptions().shopReroll,true,'debug still reports Shop affordability without making it a rescue path');
assert.equal(g.recoveryOptions().shopRescue,false,'Shop must not reopen the no-legal-moves flow');
assert.equal(g.snapshot().recovery.recoverable,false);
assert.deepEqual(g.handPlacementDiagnostics().map(x=>x.legalPlacements),[0,0]);
let debug=g.debugText();
assert.match(debug,/^MONOID DEBUG v/,'native debug export must use current MONOID branding');
assert.match(debug,/Current hand: #1 \[0\|0\] id=blocked-0-0 legal=0 \| #2 \[1\|1\] id=blocked-1-1 legal=0/);
assert.match(debug,/Recovery: recoverable=no .* ownedReroll=no .* shopReroll=yes@3c/);
assert.match(debug,/Result: ROUND FAILED · no-legal-moves/);
assert.match(debug,/R1 NO LEGAL MOVES after move 1 hand=\[0\|0\] id=blocked-0-0,\[1\|1\] id=blocked-1-1/);
assert.match(debug,/R1 REROLL source=stored AUTO after move 1 stored=0 free=0/);
assert.match(debug,/FAIL no-legal-moves after move 1 hand=/);
const failure=s.events.findLast(e=>e.type==='failure');
assert.deepEqual(new Set(failure.hand.map(t=>t.id)),new Set(['blocked-0-0','blocked-1-1']));

console.log('v0.32 auto-reroll stalled-state debug regression: ok');
