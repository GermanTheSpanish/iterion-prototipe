const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');

function fixture({stored=0,free=0,legalReserve=false,undo=0}={}){
  E.setBoardSize(18,24);
  const g=Game.createGame(E,{seed:320001}),s=g.state(),root=s.set.find(t=>t.id==='d2-2'),piece=E.pieceFrom(root,8,10,0,0,1);piece.tile={...root};
  s.pieces=[piece];s.placedTileIds=[root.id];s.idc=1;s.turn=1;s.roundTurn=1;
  const invalid=['d0-0','d1-1','d3-3','d4-4','d5-5'].map(id=>s.set.find(t=>t.id===id));
  s.hand=invalid.slice();
  s.reserve=legalReserve?['d2-3','d2-4','d2-5','d2-6'].map(id=>s.set.find(t=>t.id===id)):[];
  s.freeReroll=free;s.consumables.reroll=stored;s.consumables.undo=undo;
  if(undo)s.undoFrame={};
  g.assessContinuation();
  return g
}

{
  const g=fixture({free:1,legalReserve:true});
  assert.strictEqual(g.state().needsReroll,true,'no-legal hand should enter required-reroll state');
  const result=g.resolveRequiredRerolls();
  assert.strictEqual(result.ok,true);assert.strictEqual(result.rerolls,1);assert.deepStrictEqual(result.sources,['free']);
  assert.strictEqual(g.state().freeReroll,0);assert.strictEqual(g.state().consumables.reroll,0);
  assert.strictEqual(g.state().blocked,false);assert.strictEqual(g.state().needsReroll,false);assert(g.legalHandMask().some(Boolean),'automatic reroll should stop as soon as a legal hand exists');
  const reroll=g.state().events.find(e=>e.type==='reroll');assert(reroll?.automatic,'reroll telemetry must identify automatic consumption');
  assert.match(g.debugText(),/AUTO REROLL source=free/);
}

{
  const g=fixture({free:1,stored:1,undo:1});
  assert.strictEqual(g.state().needsReroll,true);
  const result=g.resolveRequiredRerolls();
  assert.strictEqual(result.rerolls,2,'all available rerolls should be consumed while the hand remains dead');
  assert.deepStrictEqual(result.sources,['free','stored']);
  assert.strictEqual(g.state().blocked,true);assert.strictEqual(g.state().failureReason,'no-legal-moves');assert.strictEqual(g.state().needsReroll,false);
  assert.strictEqual(g.state().freeReroll,0);assert.strictEqual(g.state().consumables.reroll,0);
  const recovery=g.recoveryOptions();assert.strictEqual(recovery.recoverable,false,'exhausted no-legal state is terminal');assert.strictEqual(recovery.undo,false,'Undo does not reopen a terminal no-legal state');assert.strictEqual(recovery.shopRescue,false,'Shop cannot rescue a terminal no-legal state');
  assert.strictEqual(g.state().events.filter(e=>e.type==='reroll'&&e.automatic).length,2);
  assert.match(g.debugText(),/AUTO REROLL source=free/);assert.match(g.debugText(),/AUTO REROLL source=stored/);assert.match(g.debugText(),/FAIL no-legal-moves/);
}

console.log('automatic no-legal reroll regressions passed');
