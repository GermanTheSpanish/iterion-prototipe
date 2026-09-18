const assert=require('node:assert/strict');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function blockedGame(seed=3201){
  E.setBoardSize(18,24);
  const g=Game.createGame(E,{...D,seed});
  const s=g.state(),root={id:'placed-2-2',a:2,b:2,upgrade:0,source:'test'};
  const p=E.pieceFrom(root,8,10,0,0,1);p.tile={...root};
  s.pieces=[p];s.placedTileIds=[root.id];s.turn=1;s.roundTurn=1;s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.undoFrame={sentinel:true};
  return g
}

{
  const g=blockedGame(32011),s=g.state();
  s.hand=[
    {id:'blocked-0-0',a:0,b:0,upgrade:0,source:'test'},
    {id:'blocked-1-1',a:1,b:1,upgrade:0,source:'test'},null,null,null
  ];
  s.reserve=[
    {id:'legal-2-0',a:2,b:0,upgrade:0,source:'test'},
    {id:'legal-2-1',a:2,b:1,upgrade:0,source:'test'},
    {id:'legal-2-3',a:2,b:3,upgrade:0,source:'test'},
    {id:'legal-2-4',a:2,b:4,upgrade:0,source:'test'},
    {id:'legal-2-5',a:2,b:5,upgrade:0,source:'test'}
  ];
  s.freeReroll=1;s.consumables={move:0,reroll:2,undo:1};
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls.length,1,'one automatic reroll should recover a legal hand');
  assert.equal(result.autoRerolls[0].source,'free','the free round reroll is spent before stored rerolls');
  assert.equal(result.autoRerolls[0].automatic,true);
  assert.equal(s.freeReroll,0);assert.equal(s.consumables.reroll,2);
  assert.equal(s.needsReroll,false,'automatic recovery must never leave a confirmation state');
  assert.equal(s.blocked,false);assert.equal(s.failureReason,null);
  assert.equal(g.hasLegal(),true);
  assert.equal(s.undoFrame,null,'automatic reroll has the same undo boundary as a manual reroll');
  const event=s.events.findLast(e=>e.type==='reroll');
  assert.equal(event.automatic,true);
  assert.match(g.debugText(),/AUTO REROLL source=free/);
}

{
  const g=blockedGame(32012),s=g.state();
  const blocked=[
    {id:'blocked-a',a:0,b:0,upgrade:0,source:'test'},
    {id:'blocked-b',a:1,b:1,upgrade:0,source:'test'},
    {id:'blocked-c',a:3,b:3,upgrade:0,source:'test'},
    {id:'blocked-d',a:4,b:4,upgrade:0,source:'test'},
    {id:'blocked-e',a:5,b:5,upgrade:0,source:'test'}
  ];
  s.hand=blocked.slice(0,2);s.reserve=blocked.slice(2);
  s.freeReroll=1;s.consumables={move:0,reroll:1,undo:2};s.coins=999;
  const result=g.assessContinuation();
  assert.equal(result.autoRerolls.length,2,'automatic recovery should consume all available rerolls while hands remain illegal');
  assert.deepEqual(result.autoRerolls.map(x=>x.source),['free','stored']);
  assert.equal(s.freeReroll,0);assert.equal(s.consumables.reroll,0);
  assert.equal(s.blocked,true);assert.equal(s.failureReason,'no-legal-moves');
  assert.equal(s.needsReroll,false);
  assert.equal(g.canUseReroll(),false);
  assert.equal(g.canUndo(),false,'no-legal failure is terminal once automatic rerolls are exhausted');
  assert.equal(g.canOpenShop(),false,'Shop cannot rescue a no-legal failure after automatic rerolls are exhausted');
  assert.equal(g.recoveryOptions().recoverable,false);
  assert.match(g.debugText(),/AUTO REROLL source=free/);
  assert.match(g.debugText(),/AUTO REROLL source=stored/);
  assert.match(g.debugText(),/FAIL no-legal-moves/);
}

{
  const g=blockedGame(32013),s=g.state();
  s.hand=[{id:'blocked-0',a:0,b:0,upgrade:0,source:'test'}];s.reserve=[];
  s.freeReroll=0;s.consumables={move:0,reroll:0,undo:3};
  const result=g.assessContinuation();
  assert.deepEqual(result.autoRerolls,[]);
  assert.equal(s.blocked,true);assert.equal(s.failureReason,'no-legal-moves');
  assert.equal(g.recoveryOptions().recoverable,false,'no reroll means the run ends immediately');
}

console.log('Automatic no-legal Reroll regression tests passed');
