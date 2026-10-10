const assert=require('node:assert/strict');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

assert.equal(D.VERSION,'0.75.0');
assert.equal(D.HAND_SIZE,5);
assert.equal(D.SHOP_HAND_MAX,8);

function create(seed=6701,opts={}){
  E.setBoardSize(18,24);
  return Game.createGame(E,{
    seed,
    STARTING_COINS:250,
    FIRST_TILE_MUST_BE_DOUBLE:false,
    TARGETS:Array(15).fill(1e15),
    ...opts
  })
}

{
  const game=create(6701),s=game.state();
  assert.equal(s.hand.filter(Boolean).length,5);
  assert.equal(game.openShop(),true);
  const offerIds=game.snapshot().shop.tileOffers.map(info=>info.tile.id);
  const bought=offerIds.slice(0,3).map(id=>game.buyShopTileOffer(id));
  assert(bought.every(result=>result.ok),'three purchases may overflow a full 5-tile Hand to 8');
  const purchasedIds=bought.map(result=>result.tile.id);
  assert.equal(s.hand.filter(Boolean).length,8);
  assert.equal(game.shopPurchaseAvailability().handSpace,false);
  assert.equal(game.shopPurchaseAvailability().blockedByHand,true);
  for(const id of purchasedIds){
    assert.equal(s.hand.find(tile=>tile?.id===id)?.shopPinned,true);
    assert.equal(s.set.find(tile=>tile.id===id)?.shopPinned,true);
    assert.equal(s.set.filter(tile=>tile.id===id).length,1,'purchase keeps one persistent physical instance');
  }
  const before={coins:s.coins,inflation:s.inflation,hand:s.hand.filter(Boolean).length};
  const blocked=game.buyShopTileOffer(offerIds[3]);
  assert.equal(blocked.ok,false);assert.equal(blocked.reason,'hand-full');
  assert.deepEqual({coins:s.coins,inflation:s.inflation,hand:s.hand.filter(Boolean).length},before,'ninth tile is rejected without economy mutation');

  const saved=game.exportState(),restored=create(6799);
  assert.equal(restored.restoreState(saved),true);
  assert.equal(restored.state().hand.filter(Boolean).length,8,'save/restore preserves valid purchase overflow');
  for(const id of purchasedIds)assert.equal(restored.state().hand.find(tile=>tile?.id===id)?.shopPinned,true);
  restored.closeShop();
  const beforeReroll=new Set(restored.state().hand.filter(tile=>tile&&!tile.shopPinned).map(tile=>tile.id));
  const reroll=restored.reroll();assert.equal(reroll.ok,true);
  assert.equal(restored.state().hand.filter(Boolean).length,8,'Reroll preserves overflow hand count');
  for(const id of purchasedIds)assert(restored.state().hand.some(tile=>tile?.id===id&&tile.shopPinned),'Reroll preserves every purchased tile');
  assert.equal(restored.state().hand.filter(tile=>tile?.shopPinned).length,3);
  assert(restored.state().hand.filter(tile=>tile&&!tile.shopPinned).some(tile=>!beforeReroll.has(tile.id)),'Reroll still redraws normal Hand tiles');

  const pinIndex=restored.state().hand.findIndex(tile=>tile?.shopPinned);
  const pinId=restored.state().hand[pinIndex].id,candidate=restored.candidatesForIndex(pinIndex)[0];
  assert(candidate,'purchased overflow tile remains immediately playable');
  const ctx=restored.beginPlacement(pinIndex,candidate);assert.equal(ctx.ok,true);assert.equal(ctx.shopPurchaseConsumed,true);
  assert.equal(restored.state().hand.filter(Boolean).length,7,'playing while above base Hand shrinks overflow instead of drawing a replacement');
  assert.equal(restored.state().set.find(tile=>tile.id===pinId).shopPinned,undefined,'pin clears once the physical tile is used');
  restored.finishPlacement(ctx);
}

{
  const game=create(6702,{TARGETS:Array(15).fill(1)}),s=game.state();
  assert.equal(game.openShop(),true);
  const purchased=game.snapshot().shop.tileOffers.slice(0,3).map(info=>game.buyShopTileOffer(info.tile.id).tile.id);
  game.closeShop();
  const normalIndex=s.hand.findIndex(tile=>tile&&!tile.shopPinned&&(tile.a+tile.b)>0),candidate=game.candidatesForIndex(normalIndex)[0];
  const ctx=game.beginPlacement(normalIndex,candidate);assert.equal(ctx.ok,true);assert.equal(s.hand.filter(Boolean).length,7);
  game.finishPlacement(ctx);assert.equal(s.cleared,true);
  assert.equal(game.advance(),true);
  assert.equal(s.hand.filter(Boolean).length,5,'new round returns to normal Hand size when pending purchases fit inside it');
  for(const id of purchased)assert(s.hand.some(tile=>tile?.id===id&&tile.shopPinned),'unused purchases remain directly available next round');
}

console.log('v0.67.0 Tile Shop Hand overflow, Reroll pinning and round normalization regressions passed');
