const assert=require('assert');
const D=require('../data.js'),E=require('../engine.js'),Game=require('../game.js');

// Late-run fixtures isolate progression. Placements use the real engine;
// only their final Output is supplied to avoid coupling these tests to balance.
function fixture(seed=2401){
  const game=Game.createGame(E,{seed,STARTING_COINS:100});
  const s=game.state();
  E.setBoardSize(30,40);s.boardStage=4;s.round=14;
  s.consumables={move:2,reroll:3,undo:2};
  assert(game.openShop());const bought=game.buyShopRandomTile();assert(bought.ok);assert(game.closeShop());
  const i=s.hand.findIndex(t=>t&&t.a===t.b&&t.a>0);
  assert(i>=0);
  const ctx=game.beginPlacement(i,game.candidatesForIndex(i)[0]);assert(ctx.ok);
  ctx.sim.output=game.target();assert(game.finishPlacement(ctx).cleared);
  return{game,bought};
}
function physicalIds(game){
  const s=game.state(),ids=[...s.placedTileIds,...s.hand.filter(Boolean).map(t=>t.id),...s.reserve.map(t=>t.id)];
  assert.strictEqual(new Set(ids).size,ids.length,'each physical tile occupies exactly one location');
  assert.deepStrictEqual(ids.sort(),s.set.map(t=>t.id).sort());
}
function clearNext(game){
  const s=game.state();
  for(let i=0;i<s.hand.length;i++){
    const candidates=game.candidatesForIndex(i);if(!candidates.length)continue;
    const ctx=game.beginPlacement(i,candidates[0]);assert(ctx.ok);
    ctx.sim.output=game.target();assert(game.finishPlacement(ctx).cleared);return;
  }
  throw new Error('fixture needs a legal continuation');
}

{
  const g=Game.createGame(E,{seed:2401});
  D.TARGETS.forEach((target,i)=>assert.strictEqual(g.targetForRound(i),target));
  assert.strictEqual(g.targetForRound(15),250000000000);
  assert.strictEqual(g.targetForRound(16),1250000000000);
  assert.strictEqual(g.targetForRound(17),6250000000000);
  assert.strictEqual(g.targetForRound(30),D.TARGETS[14]*5**16);
  assert(!g.startEndless());
}
{
  const{game:g,bought}=fixture(),s=g.state();
  assert.strictEqual(g.snapshot().status,'COMPLETE');assert(g.canStartEndless());
  assert(!g.advance(),'standard victory cannot auto-advance');
  assert(!g.openIntermission(),'Market is optional until Endless is chosen');
  const before=g.snapshot();physicalIds(g);
  assert(g.startEndless());assert(!g.startEndless(),'double opt-in cannot reroll offers');
  assert.strictEqual(s.round,14,'R16 waits for the R15 Market');
  assert.strictEqual(s.shopType,'market');assert(s.shopOpen);
  assert(!g.advance());assert(!g.canUndo(),'committing to the stage transition seals the old move');
  assert.deepStrictEqual(g.snapshot().board,before.board);
  const offer=s.shopOffers[0],price=g.marketModPrice(offer),buy=g.buyMarketMod(offer);assert(buy.ok);
  assert.strictEqual(s.coins,before.coins-price);assert.strictEqual(s.inflation,before.inflation+1);
  assert.strictEqual(g.buyMarketMod(offer).reason,'limit');
  const afterMarket=g.snapshot();
  assert(g.closeMarket());assert(g.advance());
  assert.strictEqual(s.round,15);assert.strictEqual(g.target(),250000000000);
  assert.deepStrictEqual(g.snapshot().board,afterMarket.board,'coordinates and exact modifier targets persist');
  assert.deepStrictEqual(g.snapshot().set,afterMarket.set);
  assert.deepStrictEqual(g.snapshot().consumables,before.consumables);
  assert(s.set.some(t=>t.id===bought.tile.id));physicalIds(g);
  assert.strictEqual(s.score,0);assert.strictEqual(s.roundTurn,0);
  assert.strictEqual(g.maxPlacements(),D.MAX_PLACEMENTS);
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40});
  for(let round=16;round<=21;round++){
    clearNext(g);assert.strictEqual(s.round+1,round);
    assert.strictEqual(s.nextShopType,round%3===0?'market':'none');
    if(round%3===0){assert(!g.advance());assert(g.openIntermission());assert(g.closeMarket());}
    const board=g.snapshot().board;assert(g.advance());
    assert.deepStrictEqual(g.snapshot().board,board,'logical stages never reposition the capped board');physicalIds(g);
  }
  s.hand=Array(D.HAND_SIZE).fill(null);s.reserve=[];g.assessContinuation();
  assert.strictEqual(g.snapshot().status,'ENDLESS FAILED');assert(g.snapshot().endless.baseComplete);
  assert.match(g.debugText(),/baseComplete=yes/);
  g.fresh(2401);assert(!g.snapshot().endless.baseComplete);assert(!g.snapshot().endless.active);
}
{
  const{game:g}=fixture();assert(g.useUndo().ok);
  assert(g.snapshot().endless.baseComplete,'Undo never revokes the standard achievement');
  assert.strictEqual(g.snapshot().status,'IN PROGRESS','achievement does not claim the undone round is currently clear');
  assert(!g.canStartEndless());
  clearNext(g);assert(g.canStartEndless());
  assert.strictEqual(g.state().events.filter(e=>e.type==='run-complete').length,1);
  assert(g.startEndless());const coins=g.state().coins;
  assert(g.closeMarket());assert(g.advance());assert.strictEqual(g.state().coins,coins,'buying nothing is valid');
  clearNext(g);assert(g.useUndo().ok);assert(g.snapshot().endless.baseComplete);assert(g.snapshot().endless.active);
}
{
  const g=Game.createGame(E,{seed:2403}),s=g.state();
  E.setBoardSize(30,40);s.round=14;s.boardStage=4;s.cleared=true;s.standardComplete=true;
  const double=s.set.find(t=>t.id==='d5-5'),zero=s.set.find(t=>t.id==='d0-5');
  s.pieces=[E.pieceFrom(double,4,0,0,0,1),E.pieceFrom(zero,8,0,0,2,2)];
  s.pieces[0].tile={...double};s.pieces[1].tile={...zero};s.placedTileIds=[double.id,zero.id];
  s.hand=Array(D.HAND_SIZE).fill(null);s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id));
  s.mods=['long-run'];s.doubleDoubleTileId=double.id;s.doubleEchoTileId=double.id;s.zeroMemoryTileId=zero.id;
  const before=g.snapshot();assert(g.startEndless());assert(g.closeMarket());assert(g.advance());
  const after=g.snapshot();
  for(const key of ['board','set','mods','doubleDoubleTileId','doubleEchoTileId','zeroMemoryTileId'])assert.deepStrictEqual(after[key],before[key],key+' survives Endless');
  physicalIds(g);
}
console.log('v0.24 Endless progression, identity, Market and victory regression tests passed');
