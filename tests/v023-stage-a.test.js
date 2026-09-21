const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function piece(tile,x,id){const p=E.pieceFrom(tile,x,0,0,0,id);p.tile={...tile};return p}
function prepareMarket(game,round=2){const s=game.state();s.cleared=true;s.round=round;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;s.shopOffers=[];return s}

assert.strictEqual(D.VERSION,'0.42.4','build must identify as the current release');
assert.strictEqual(D.ENGINE_VERSION,'0.15.0-l-split','build must identify the current engine release');
assert.strictEqual(D.MARKET_OFFER_COUNT,3);
assert.strictEqual(D.MARKET_PURCHASE_LIMIT,1);

{
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:2301,STARTING_COINS:100}),s=game.state(),by=id=>s.set.find(t=>t.id===id);
  const placedDouble=by('d3-3'),handOnlyDouble=by('d5-5'),zeroDouble=by('d0-0');
  s.pieces=[piece(placedDouble,0,101),piece(zeroDouble,8,102)];s.placedTileIds=[placedDouble.id,zeroDouble.id];
  s.hand=[handOnlyDouble,null,null,null,null];s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id)&&t.id!==handOnlyDouble.id);
  s.coins=100;s.inflation=2;prepareMarket(game);
  assert.strictEqual(game.openIntermission(),true);s.shopOffers=['double-double'];
  const info=game.marketOfferInfo('double-double');
  assert.strictEqual(info.targetCount,1,'only the placed non-zero double is eligible');
  assert.strictEqual(info.price,10,'global Inflation applies to the Market price');
  assert.strictEqual(info.canBuy,true);
  const buy=game.buyDoubleDouble();
  assert.strictEqual(buy.ok,true);assert.strictEqual(buy.pending,true);
  assert.strictEqual(s.doubleDoubleTileId,null,'buying DD must not randomly assign it');
  assert.strictEqual(s.shopOpen,false,'buying a tile Mod closes the Market before targeting');
  const assign=game.chooseMarketModTile(placedDouble.id);assert.strictEqual(assign.ok,true);
  assert.strictEqual(assign.tile.id,placedDouble.id,'hand/reserve doubles and [0|0] must never be selectable');
  assert.strictEqual(s.doubleDoubleTileId,placedDouble.id);
  assert.strictEqual(s.marketBuys.length,1);
  assert.strictEqual(s.inflation,3);
  assert.strictEqual(game.buyDoubleDouble().reason,'shop','the closed Market cannot accept a second purchase');
  const purchaseEvent=s.events.find(e=>e.type==='market-mod-buy'&&e.mod==='double-double');
  const assignEvent=s.events.find(e=>e.type==='market-mod-assign'&&e.mod==='double-double');
  assert.strictEqual(purchaseEvent.cost,10);assert.strictEqual(purchaseEvent.inflationBefore,2);assert.strictEqual(purchaseEvent.inflationAfter,3);
  assert.strictEqual(assignEvent.targetTileId,placedDouble.id);

  const secondDouble=piece(handOnlyDouble,12,103);s.pieces.push(secondDouble);s.placedTileIds.push(handOnlyDouble.id);s.coins=100;prepareMarket(game,5);
  assert.strictEqual(game.openIntermission(),true);s.shopOffers=['double-double'];
  assert.strictEqual(game.marketTargetCount('double-double'),1,'the current Double Double target is excluded when transferring');
  const transfer=game.buyDoubleDouble();
  assert.strictEqual(transfer.ok,true);assert.strictEqual(transfer.previousTileId,placedDouble.id);
  assert(game.chooseMarketModTile(handOnlyDouble.id).ok,'a later Market transfers Double Double to the chosen placed double');
  assert.strictEqual(s.doubleDoubleTileId,handOnlyDouble.id);
}
{
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:2302,STARTING_COINS:100}),s=game.state(),by=id=>s.set.find(t=>t.id===id);
  const dd=by('d3-3'),free=by('d5-5');
  s.pieces=[piece(dd,0,201),piece(free,8,202)];s.placedTileIds=[dd.id,free.id];s.doubleDoubleTileId=dd.id;
  s.hand=[null,null,null,null,null];s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id));s.coins=100;prepareMarket(game);
  assert.strictEqual(game.openIntermission(),true);s.shopOffers=['double-echo'];
  const info=game.marketOfferInfo('double-echo');
  assert.deepStrictEqual(info.targetTiles.map(t=>t.id),[free.id],'a DD double must be absent from DE targets');
  const buy=game.buyMarketMod('double-echo');assert.strictEqual(buy.ok,true);assert.strictEqual(buy.pending,true);
  assert(game.chooseMarketModTile(free.id).ok);assert.strictEqual(s.doubleEchoTileId,free.id);
  assert.notStrictEqual(s.doubleDoubleTileId,s.doubleEchoTileId,'DD and DE must never share a physical double');
  s.coins=100;prepareMarket(game,5);assert.strictEqual(game.openIntermission(),true);
  assert.strictEqual(game.marketTargetCount('double-double'),0,'both assigned doubles must be excluded from later DD assignment');
  assert.strictEqual(game.marketTargetCount('double-echo'),0,'both assigned doubles must be excluded from later DE assignment');
}
{
  E.setBoardSize(18,24);
  const entry=E.pieceFrom({a:1,b:5},0,0,0,0,3);entry.tile={id:'entry',a:1,b:5,upgrade:0,source:'test'};
  const dd=E.pieceFrom({a:5,b:5},4,0,0,0,1);dd.tile={id:'dd',a:5,b:5,upgrade:0,source:'test'};
  const zero=E.pieceFrom({a:5,b:0},8,0,0,0,2);zero.tile={id:'zero',a:5,b:0,upgrade:0,source:'test'};
  const boosted=E.bestSignal(entry.id,[entry,dd,zero],{initialOutput:6,doubleDoublePieceId:dd.id});
  assert.strictEqual(boosted.output,3750,'Double Double scoring must remain unchanged');
  const ddOps=boosted.events.filter(e=>e.type==='op'&&e.piece===dd.id);
  assert.strictEqual(ddOps.length,2);
  assert.strictEqual(ddOps[0].factor,25);
  assert.strictEqual(ddOps[0].doubleDouble,true);
  assert.strictEqual(ddOps[1].factor,5);
  assert.strictEqual(ddOps[1].doubleDouble,false);
}

console.log('v0.23 Stage A Market / Double Double regression tests passed');
