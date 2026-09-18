const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../data.js');
const E=require('../engine.js');
const G=require('../game.js');

function configureBlockedGame({rerolls,handSize,reserve=[]}){
  E.setBoardSize(18,24);
  const g=G.createGame(E,{...D,BOARD_SIZES:[[18,24]],ROUND_REROLL_REWARD:0,HAND_SIZE:handSize});
  const s=g.state(),placed={id:'placed-2-2',a:2,b:2,upgrade:0,source:'base'};
  const p=E.pieceFrom(placed,8,10,0,0,1);p.tile={...placed};
  s.pieces=[p];s.placedTileIds=[placed.id];
  s.hand=[
    {id:'blocked-0-0',a:0,b:0,upgrade:0,source:'base'},
    {id:'blocked-1-1',a:1,b:1,upgrade:0,source:'base'},
    ...Array(Math.max(0,handSize-2)).fill(null)
  ];
  s.reserve=reserve.map(t=>({...t}));
  s.freeReroll=0;s.consumables={move:0,reroll:rerolls,undo:1};
  s.coins=99;s.inflation=0;s.roundTurn=1;s.turn=1;s.undoFrame={sentinel:true};
  s.blocked=false;s.needsReroll=false;s.failureReason=null;s.cleared=false;s.running=false;s.shopOpen=false;s.pendingCircuit=null;
  return g
}

{
  const legal={id:'legal-2-3',a:2,b:3,upgrade:0,source:'base'};
  const g=configureBlockedGame({rerolls:2,handSize:3,reserve:[legal]}),s=g.state();
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls,1,'one blocked hand should consume exactly one reroll when that reroll restores a legal move');
  assert.equal(s.consumables.reroll,1);
  assert.equal(s.needsReroll,false);
  assert.equal(s.blocked,false);
  assert.equal(s.failureReason,null);
  assert.equal(g.hasLegal(),true);
  const autos=s.events.filter(e=>e.type==='reroll'&&e.automatic);
  assert.equal(autos.length,1);
  assert.equal(autos[0].source,'stored');
  assert.equal(s.events.filter(e=>e.type==='recovery-needed').at(-1)?.automatic,true);
}

{
  const g=configureBlockedGame({rerolls:2,handSize:2}),s=g.state();
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls,2,'automatic recovery should keep consuming rerolls until none remain');
  assert.equal(s.consumables.reroll,0);
  assert.equal(s.needsReroll,false);
  assert.equal(s.blocked,true);
  assert.equal(s.failureReason,'no-legal-moves');
  assert.equal(s.events.filter(e=>e.type==='reroll'&&e.automatic).length,2);
  const recovery=g.recoveryOptions();
  assert.equal(recovery.recoverable,false,'Shop and Undo must not turn exhausted no-legal-moves into another confirmation path');
  assert.equal(recovery.shopRescue,false);
  assert.equal(recovery.undo,false,'automatic reroll consumption clears the prior Undo frame just like a manual reroll');
}

{
  const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
  assert.doesNotMatch(ui,/function showNoMoves\(\)/);
  assert.doesNotMatch(ui,/else if\(s\.needsReroll\)/);
  assert.match(ui,/NO LEGAL MOVES · AUTO REROLL/);
}

console.log('v0.32 automatic no-legal-moves reroll regression: ok');
