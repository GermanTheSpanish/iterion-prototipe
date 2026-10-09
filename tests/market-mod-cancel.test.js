const assert=require('node:assert/strict');
const E=require('../engine.js');
const Game=require('../game.js');

function marketFixture({broker=false}={}){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:2072026}),s=game.state();
  const tile=s.set.find(tile=>tile.id==='d2-2');
  assert(tile);
  const piece=E.pieceFrom(tile,4,8,0,0,1);piece.tile={...tile};
  s.pieces=[piece];s.placedTileIds=[tile.id];s.idc=1;s.anchorId=tile.id;
  s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;
  s.coins=60;s.inflation=2;s.undoFrame={prior:'turn-6'};
  s.brokerPreparedMarket=broker;s.brokerDiscountStored=broker?4:0;
  assert.equal(game.openIntermission(),true);
  s.shopOffers=['double-double','corner','overload'];
  return{game,tile}
}
function ledger(game){
  const s=game.state();return{
    coins:s.coins,inflation:s.inflation,offers:[...s.shopOffers],marketBuys:structuredClone(s.marketBuys),
    brokerPreparedMarket:s.brokerPreparedMarket,brokerDiscountStored:s.brokerDiscountStored,
    undoFrame:structuredClone(s.undoFrame),nextShopType:s.nextShopType,
    intermissionResolved:s.intermissionResolved,events:s.events.length,
    pieceIds:s.pieces.map(p=>p.tile.id)
  }
}
for(const broker of [false,true]){
  const {game,tile}=marketFixture({broker}),before=ledger(game);
  const purchased=game.buyMarketMod('double-double');assert.equal(purchased.ok,true);assert.equal(purchased.pending,true);
  assert.equal(game.state().shopOpen,false);
  assert.equal(game.state().coins,before.coins-purchased.cost);
  assert.equal(game.state().pendingModPlacement?.eligibleTileIds.includes(tile.id),true);
  if(broker)assert.equal(game.state().brokerDiscountStored,0);
  const restored=Game.createGame(E,{seed:123456});
  assert.equal(restored.restoreState(game.exportState()),true,'pending purchase must survive save/restore');
  const cancelled=restored.cancelMarketModPurchase();
  assert.equal(cancelled.ok,true);assert.equal(cancelled.refund,purchased.cost);
  const after=ledger(restored);
  for(const key of ['coins','inflation','offers','marketBuys','brokerPreparedMarket','brokerDiscountStored','undoFrame','nextShopType','intermissionResolved','pieceIds'])assert.deepEqual(after[key],before[key],key+' must roll back');
  assert.equal(after.events,before.events+1,'cancel adds one event without retaining uncommitted purchase events');
  assert.match(restored.debugText(),/MARKET MOD DOUBLE-DOUBLE CANCEL REFUND/);
  assert.equal(restored.state().shopType,'market');
  assert.equal(restored.state().pendingModPlacement,null);
  assert.equal(restored.cancelMarketModPurchase().ok,false,'cannot refund twice');
  assert.equal(restored.marketOfferInfo('double-double').price,purchased.cost,'offer has original cost');
  const repurchased=restored.buyMarketMod('double-double');assert.equal(repurchased.ok,true);
  const assigned=restored.chooseMarketModTile(tile.id);assert.equal(assigned.ok,true);
  assert.equal(restored.state().doubleDoubleTileId,tile.id);
  assert.equal(restored.cancelMarketModPurchase().ok,false,'committed assignment cannot be cancelled');
}
{
  const {game}=marketFixture();
  const s=game.state(),zeros=['d0-0','d0-1','d0-2'].map(id=>s.set.find(tile=>tile.id===id));
  assert(zeros.every(Boolean));let id=2;
  for(const tile of zeros){const piece=E.pieceFrom(tile,4+id*2,14,0,0,id++);piece.tile={...tile};s.pieces.push(piece);s.placedTileIds.push(tile.id)}
  s.zeroPortTileIds=zeros.slice(0,2).map(tile=>tile.id);
  s.shopOffers=['zero-port','corner','overload'];
  const original=[...s.zeroPortTileIds],before=ledger(game);
  const purchase=game.buyMarketMod('zero-port');assert.equal(purchase.pending,true);
  assert.equal(game.state().pendingModPlacement.stage,'source');
  const selected=game.chooseMarketModTile(original[0]);assert.equal(selected.pending,true);
  assert.equal(game.state().pendingModPlacement.stage,'target');
  assert.equal(game.cancelMarketModPurchase().ok,true);
  assert.deepEqual(game.state().zeroPortTileIds,original,'partial source choice does not mutate installed Zero Ports');
  assert.deepEqual(game.state().shopOffers,before.offers);
  assert.equal(game.state().coins,before.coins);
}
console.log('Market Mod cancellation, refund, Broker, save/restore and Zero Port regressions passed');
