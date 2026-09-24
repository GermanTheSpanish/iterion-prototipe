const assert=require('node:assert/strict');
const E=require('../engine.js');
const G=require('../game.js');
const D=require('../data.js');

function game(seed=44201){
  E.setBoardSize(18,24);
  return G.createGame(E,{...D,seed,FIRST_TILE_MUST_BE_DOUBLE:false,STARTING_COINS:100,STARTING_MOVE_CONSUMABLES:0,STARTING_REROLL_CONSUMABLES:0,STARTING_UNDO_CONSUMABLES:0,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)})
}

{
  const g=game(),s=g.state(),coins=s.coins,inflation=s.inflation,quote=g.toolPurchaseQuote('move',1);
  assert(g.canUsePurchasedTool('move'));
  const buy=g.buyTool('move',1,{intent:'buy-use'});
  assert.equal(buy.ok,true);
  assert.equal(buy.quantity,1);
  assert.equal(buy.intent,'buy-use');
  assert.equal(s.coins,coins-quote.total);
  assert.equal(s.inflation,inflation+1);
  assert.equal(s.consumables.move,1);
  const used=g.useMove();
  assert.equal(used.ok,true);
  assert.equal(s.consumables.move,0,'BUY & USE must execute exactly one normal Move-tool action');
  assert.equal(s.extraPlacements,1);
  assert.equal(s.events.filter(e=>e.type==='shop-buy'&&e.item==='move').length,1);
  assert.equal(s.events.filter(e=>e.type==='consume'&&e.item==='move').length,1);
  assert.match(g.debugText(),/SHOP BUY move intent=buy-use/);
}

{
  const g=game(44202),s=g.state(),quote=g.toolPurchaseQuote('move',2),coins=s.coins;
  const buy=g.buyTool('move',2,{intent:'store'});
  assert.equal(buy.ok,true);
  assert.equal(s.coins,coins-quote.total);
  assert.equal(s.consumables.move,2,'BUY must store without executing');
  assert.equal(s.extraPlacements,0);
  assert.equal(s.events.filter(e=>e.type==='consume'&&e.item==='move').length,0);
  assert.equal(s.events.filter(e=>e.type==='shop-buy'&&e.item==='move').length,2);
}

{
  const g=game(44203),s=g.state(),root=s.set.find(t=>t.id==='d2-2'),p=E.pieceFrom(root,8,10,0,0,1);p.tile={...root};
  s.pieces=[p];s.placedTileIds=[root.id];s.hand=[s.set.find(t=>t.id==='d0-0'),s.set.find(t=>t.id==='d1-1'),null,null,null];s.reserve=[s.set.find(t=>t.id==='d2-3')];s.turn=1;s.roundTurn=1;s.freeReroll=0;s.consumables.reroll=0;s.blocked=true;s.failureReason='no-legal-moves';s.needsReroll=false;s.coins=100;
  const quote=g.toolPurchaseQuote('reroll',1),coins=s.coins;
  assert.equal(g.recoveryOptions().rerollRescue,true,'blocked no-legal-moves must expose a purchasable Reroll rescue');
  assert.equal(g.canUsePurchasedTool('reroll'),true);
  const buy=g.buyTool('reroll',1,{intent:'buy-use'});
  assert.equal(buy.ok,true);assert.equal(s.coins,coins-quote.total);assert.equal(s.consumables.reroll,1);
  const reroll=g.reroll();assert.equal(reroll.ok,true);assert.equal(s.consumables.reroll,0);assert.equal(s.blocked,false);assert.equal(s.failureReason,null);
  assert.equal(s.events.filter(e=>e.type==='shop-buy'&&e.item==='reroll').length,1);
  assert.equal(s.events.filter(e=>e.type==='reroll'&&!e.automatic).length,1);
}

console.log('tool BUY / BUY & USE state regressions: ok');
