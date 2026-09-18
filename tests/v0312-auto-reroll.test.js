const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const Game=require('../game.js');

function base(seed=3120){
  E.setBoardSize(18,24);
  const g=Game.createGame(E,{...D,BOARD_SIZES:[[18,24]],seed,ROUND_REROLL_REWARD:0});
  const s=g.state(),tile=s.set.find(t=>t.id==='d2-2'),piece=E.pieceFrom(tile,8,10,0,0,1);piece.tile={...tile};
  s.pieces=[piece];s.placedTileIds=[tile.id];s.turn=1;s.roundTurn=1;s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;
  return{g,s}
}

{
  const {g,s}=base(3121);
  s.hand=[{id:'blocked-0-0',a:0,b:0,upgrade:0,source:'base'},null,null,null,null];
  s.reserve=[{id:'legal-2-3',a:2,b:3,upgrade:0,source:'base'}];
  s.freeReroll=1;s.consumables={move:0,reroll:2,undo:1};s.undoFrame={turn:1};
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls.length,1);
  assert.equal(result.autoRerolls[0].source,'free','free reroll is always consumed first');
  assert.equal(s.freeReroll,0);assert.equal(s.consumables.reroll,2);
  assert.equal(s.needsReroll,false);assert.equal(s.blocked,false);assert.equal(s.failureReason,null);
  assert.equal(s.undoFrame,null,'automatic reroll has the same undo invalidation as a manual reroll');
  assert.equal(g.hasLegal(),true);
  assert(s.events.some(e=>e.type==='reroll'&&e.automatic&&e.source==='free'));
}

{
  const {g,s}=base(3122);
  s.hand=[{id:'blocked-0-0',a:0,b:0,upgrade:0,source:'base'},{id:'blocked-1-1',a:1,b:1,upgrade:0,source:'base'},null,null,null];
  s.reserve=[];s.freeReroll=1;s.consumables={move:0,reroll:1,undo:1};s.undoFrame={turn:1};
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls.length,2,'automatic recovery keeps spending available rerolls until legal or exhausted');
  assert.deepEqual(result.autoRerolls.map(r=>r.source),['free','stored']);
  assert.equal(s.freeReroll,0);assert.equal(s.consumables.reroll,0);
  assert.equal(s.blocked,true);assert.equal(s.failureReason,'no-legal-moves');assert.equal(s.needsReroll,false);
  assert.equal(g.recoveryOptions().recoverable,false);
  assert.equal(g.canOpenShop(),false);assert.equal(g.canUndo(),false);
}

{
  const {g,s}=base(3123);
  s.hand=[{id:'blocked-0-0',a:0,b:0,upgrade:0,source:'base'},null,null,null,null];
  s.reserve=[{id:'legal-2-3',a:2,b:3,upgrade:0,source:'base'}];
  s.freeReroll=1;s.consumables={move:0,reroll:1,undo:0};s.roundTurn=g.maxPlacements();
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls.length,0,'placement-limit remains a separate failure and must not spend rerolls');
  assert.equal(s.freeReroll,1);assert.equal(s.consumables.reroll,1);
  assert.equal(s.failureReason,'placement-limit');
}

{
  const {g,s}=base(3124);
  s.hand=[{id:'blocked-0-0',a:0,b:0,upgrade:0,source:'base'},null,null,null,null];
  s.reserve=[{id:'legal-2-3',a:2,b:3,upgrade:0,source:'base'}];
  s.freeReroll=1;s.consumables={move:0,reroll:0,undo:0};s.needsReroll=true;
  const saved=g.exportState();
  const restored=Game.createGame(E,{...D,BOARD_SIZES:[[18,24]],seed:999,ROUND_REROLL_REWARD:0});
  assert.equal(restored.restoreState(saved),true);
  assert.equal(restored.state().needsReroll,false,'legacy waiting saves are normalized on load');
  assert.equal(restored.state().freeReroll,0);
  assert.equal(restored.state().blocked,false);
  assert.equal(restored.hasLegal(),true);
  assert(restored.state().events.some(e=>e.type==='reroll'&&e.automatic));
}

console.log('automatic no-legal reroll regressions passed');
